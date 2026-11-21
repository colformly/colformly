import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { supabaseAuthMiddleware, type AuthUser } from './middleware/auth';
import { explainWrongAnswer, generateExamQuestions, type AiEnv } from './ai';
import { gradeStudentPaper, type GradingEnv } from './services/grading';
import {
  incrementOrgUsageAsync,
  reportSystemIncidentAsync,
  type TelemetryEnv,
} from './services/telemetry';
import {
  provisionOrganization,
  handoverOrganization,
  type ProvisionOrgParams,
  type HandoverOrgParams,
} from './services/superAdmin';
import { exchangeGoogleCode, buildGoogleAuthUrl } from './lib/googleAuth';
import { encryptToken } from './lib/crypto';
import {
  syncTestToGoogleForm,
  verifyTestSheetLink,
  forwardSubmissionToGoogleFormAsync,
} from './lib/googleSync';

export type Bindings = {
  SUPABASE_URL: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SECRET_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  GROQ_API_KEYS?: string;
  GROQ_API_KEY?: string;
  GEMINI_API_KEYS?: string;
  GEMINI_API_KEY?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  TOKEN_ENCRYPTION_KEY?: string;
};

export type Variables = {
  user: AuthUser;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ── Strict Multi-Origin CORS ────────────────────────────────────
const ALLOWED_ORIGINS = [
  'https://colformly.pages.dev',
  'https://colformly-org.pages.dev',
  'https://colformly-super-admin.pages.dev',
];

app.use(
  '*',
  cors({
    origin: (origin) => {
      if (!origin) return ALLOWED_ORIGINS[0];
      if (ALLOWED_ORIGINS.includes(origin)) return origin;
      if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return origin;
      if (/^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) return origin;
      return null;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'apikey'],
    maxAge: 86400,
    credentials: true,
  }),
);

// ── Public Health & Root Endpoints ──────────────────────────────
app.get('/', (c) => {
  return c.json({
    status: 'online',
    service: 'colformly-worker',
    runtime: 'Cloudflare Workers (Hono)',
    version: '3.0.0-prime',
    region: 'ap-south-1',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health/keep-alive', async (c) => {
  const targetUrls = [
    'https://colformly-ga4-service.onrender.com/health',
    'https://colformly-ga4.onrender.com/health',
  ];
  const results = await Promise.allSettled(
    targetUrls.map(async (url) => {
      const start = Date.now();
      const res = await fetch(url, { headers: { 'User-Agent': 'Colformly-Worker-Keeper/1.0' } });
      const text = await res.text();
      return { url, status: res.status, durationMs: Date.now() - start, response: text };
    }),
  );
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    results: results.map((r) => (r.status === 'fulfilled' ? r.value : { error: String(r.reason) })),
  });
});

// ── Helper to resolve Supabase Admin Credentials ────────────────
function getSupabaseAdmin(c: any) {
  const supabaseUrl = (c.env.SUPABASE_URL || 'https://crprffwlfngyiyztwgwb.supabase.co').replace(/\/$/, '');
  const secretKey =
    c.env.SUPABASE_SECRET_KEY ||
    c.env.SUPABASE_SERVICE_ROLE_KEY ||
    c.env.SUPABASE_PUBLISHABLE_KEY ||
    c.env.SUPABASE_ANON_KEY ||
    'sb_publishable_t9dfV3HzxY50ZwkiumiD_w_RurnQuC4';
  return { supabaseUrl, secretKey };
}

// ── Protected API Routes ────────────────────────────────────────
app.use('/api/*', supabaseAuthMiddleware);

// 0. POST /api/auth/resolve-session (Multi-Tenant Domain Gate & Auto-Enrollment)
app.post('/api/auth/resolve-session', async (c) => {
  const user = c.get('user');
  const { supabaseUrl, secretKey } = getSupabaseAdmin(c);

  try {
    const userEmail = (user.email || '').trim().toLowerCase();
    if (!userEmail) {
      return c.json({ authorized: false, reason: 'INVALID_SESSION' }, 400);
    }

    // 1. Check existing active membership in public.org_users
    const orgUserRes = await fetch(
      `${supabaseUrl}/rest/v1/org_users?user_id=eq.${encodeURIComponent(user.id)}&is_active=eq.true&select=id,org_id,role,onboarding_completed,organizations(id,name,slug,org_type,tier,is_active,onboarding_status,student_auth_mode,teacher_auth_mode,student_allowed_domains,teacher_allowed_domains,feature_flags)&order=created_at.desc&limit=1`,
      { headers: { apikey: secretKey, Authorization: `Bearer ${secretKey}` } },
    );

    if (orgUserRes.ok) {
      const orgUsers = (await orgUserRes.json().catch(() => [])) as any[];
      if (orgUsers.length > 0) {
        const row = orgUsers[0];
        const org = row.organizations;
        if (org) {
          if (org.is_active === false || org.onboarding_status === 'SUSPENDED') {
            return c.json({
              authorized: false,
              reason: 'WORKSPACE_SUSPENDED',
              message: `The workspace for "${org.name}" is currently suspended. Please contact your institution administrator.`,
            });
          }
          return c.json({
            authorized: true,
            role: row.role,
            orgId: row.org_id,
            org,
            isNewMember: false,
          });
        }
      }
    }

    // 2. Check for unclaimed invite in public.org_invites
    const inviteRes = await fetch(
      `${supabaseUrl}/rest/v1/org_invites?email=eq.${encodeURIComponent(userEmail)}&claimed_at=is.null&select=id,org_id,role,full_name,department,section_id,course_id,organizations(id,name,slug,org_type,tier,is_active,onboarding_status,student_auth_mode,teacher_auth_mode,feature_flags)&limit=1`,
      { headers: { apikey: secretKey, Authorization: `Bearer ${secretKey}` } },
    );

    if (inviteRes.ok) {
      const invites = (await inviteRes.json().catch(() => [])) as any[];
      if (invites.length > 0) {
        const invite = invites[0];
        const org = invite.organizations;
        if (org && (org.is_active === false || org.onboarding_status === 'SUSPENDED')) {
          return c.json({
            authorized: false,
            reason: 'WORKSPACE_SUSPENDED',
            message: `The workspace for "${org.name}" is currently suspended.`,
          });
        }

        // Link invite to org_users
        await fetch(`${supabaseUrl}/rest/v1/org_users`, {
          method: 'POST',
          headers: {
            apikey: secretKey,
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates',
          },
          body: JSON.stringify({
            org_id: invite.org_id,
            user_id: user.id,
            role: invite.role,
            invited_email: userEmail,
            invited_name: invite.full_name || userEmail.split('@')[0],
            section_id: invite.section_id || null,
            course_id: invite.course_id || null,
            is_active: true,
            onboarding_completed: true,
          }),
        });

        // Mark invite claimed
        await fetch(`${supabaseUrl}/rest/v1/org_invites?id=eq.${encodeURIComponent(invite.id)}`, {
          method: 'PATCH',
          headers: {
            apikey: secretKey,
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ claimed_at: new Date().toISOString() }),
        });

        // Update public.users
        await fetch(`${supabaseUrl}/rest/v1/users`, {
          method: 'POST',
          headers: {
            apikey: secretKey,
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates',
          },
          body: JSON.stringify({
            id: user.id,
            email: userEmail,
            full_name: invite.full_name || userEmail.split('@')[0],
            global_role: invite.role,
          }),
        });

        return c.json({
          authorized: true,
          role: invite.role,
          orgId: invite.org_id,
          org,
          isNewMember: true,
          source: 'INVITE',
        });
      }
    }

    // 3. Match email domain against student_allowed_domains
    const domain = userEmail.split('@')[1];
    if (domain) {
      const activeOrgsRes = await fetch(
        `${supabaseUrl}/rest/v1/organizations?is_active=eq.true&select=id,name,slug,org_type,tier,is_active,onboarding_status,student_auth_mode,teacher_auth_mode,student_allowed_domains,teacher_allowed_domains,feature_flags`,
        { headers: { apikey: secretKey, Authorization: `Bearer ${secretKey}` } },
      );

      if (activeOrgsRes.ok) {
        const activeOrgs = (await activeOrgsRes.json().catch(() => [])) as any[];
        const matchedOrg = activeOrgs.find((o) =>
          Array.isArray(o.student_allowed_domains) && o.student_allowed_domains.includes(domain),
        );

        if (matchedOrg) {
          if (matchedOrg.onboarding_status === 'SUSPENDED') {
            return c.json({
              authorized: false,
              reason: 'WORKSPACE_SUSPENDED',
              message: `The workspace for "${matchedOrg.name}" is currently suspended.`,
            });
          }

          // Auto-join as STUDENT
          await fetch(`${supabaseUrl}/rest/v1/org_users`, {
            method: 'POST',
            headers: {
              apikey: secretKey,
              Authorization: `Bearer ${secretKey}`,
              'Content-Type': 'application/json',
              Prefer: 'resolution=merge-duplicates',
            },
            body: JSON.stringify({
              org_id: matchedOrg.id,
              user_id: user.id,
              role: 'STUDENT',
              invited_email: userEmail,
              invited_name: userEmail.split('@')[0],
              is_active: true,
              onboarding_completed: false,
            }),
          });

          await fetch(`${supabaseUrl}/rest/v1/users`, {
            method: 'POST',
            headers: {
              apikey: secretKey,
              Authorization: `Bearer ${secretKey}`,
              'Content-Type': 'application/json',
              Prefer: 'resolution=merge-duplicates',
            },
            body: JSON.stringify({
              id: user.id,
              email: userEmail,
              global_role: 'STUDENT',
            }),
          });

          return c.json({
            authorized: true,
            role: 'STUDENT',
            orgId: matchedOrg.id,
            org: matchedOrg,
            isNewMember: true,
            source: 'DOMAIN_RULE',
          });
        }
      }
    }

    // 4. Super Admin check
    if (user.role === 'SUPER_ADMIN' || userEmail === 'core@edgecors.com') {
      return c.json({
        authorized: true,
        role: 'SUPER_ADMIN',
        orgId: null,
        org: null,
      });
    }

    // 5. Rejection: Domain not authorized
    return c.json(
      {
        authorized: false,
        reason: 'DOMAIN_NOT_AUTHORIZED',
        email: userEmail,
        domain: domain || '',
        message: `Your email domain (@${domain || 'unknown'}) is not authorized for any active campus workspace.`,
      },
      403,
    );
  } catch (err: any) {
    console.error('Error in /api/auth/resolve-session:', err);
    return c.json({ authorized: false, error: err.message || 'Failed to resolve session' }, 500);
  }
});

// 0b. POST /api/org/teachers/add (Faculty Provisioning via Invite or Password)
app.post('/api/org/teachers/add', async (c) => {
  const user = c.get('user');
  const { supabaseUrl, secretKey } = getSupabaseAdmin(c);

  if (user.role !== 'ORG_ADMIN' && user.role !== 'SUPER_ADMIN') {
    return c.json({ error: 'Forbidden: Organization Administrator or Super Admin privileges required' }, 403);
  }

  try {
    const body = await c.req.json<{
      orgId?: string;
      email: string;
      fullName?: string;
      department?: string;
      sectionId?: string;
      authMode: 'GOOGLE' | 'PASSWORD';
      password?: string;
    }>();

    const targetOrgId = (user.role === 'SUPER_ADMIN' && body.orgId) ? body.orgId : user.orgId;
    if (!targetOrgId) {
      return c.json({ error: 'Missing target organization ID' }, 400);
    }

    const email = (body.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      return c.json({ error: 'A valid email address is required' }, 400);
    }

    // Fetch org details to enforce policy
    const orgRes = await fetch(
      `${supabaseUrl}/rest/v1/organizations?id=eq.${encodeURIComponent(targetOrgId)}&select=id,name,teacher_auth_mode,teacher_allowed_domains,is_active,onboarding_status`,
      { headers: { apikey: secretKey, Authorization: `Bearer ${secretKey}` } },
    );

    if (!orgRes.ok) {
      return c.json({ error: 'Failed to lookup organization' }, 500);
    }

    const orgs = (await orgRes.json().catch(() => [])) as any[];
    const org = orgs[0];
    if (!org) {
      return c.json({ error: 'Organization not found' }, 404);
    }

    const teacherAuthMode = org.teacher_auth_mode || 'BOTH';
    if (teacherAuthMode === 'GOOGLE_ONLY' && body.authMode === 'PASSWORD') {
      return c.json({ error: 'Institution policy requires Google SSO for faculty accounts. Password creation is disabled.' }, 400);
    }
    if (teacherAuthMode === 'EMAIL_PASSWORD' && body.authMode === 'GOOGLE') {
      return c.json({ error: 'Institution policy requires Email/Password authentication for faculty accounts. Google SSO is disabled.' }, 400);
    }

    // Check teacher domain restriction
    const allowedTeacherDomains = Array.isArray(org.teacher_allowed_domains) ? org.teacher_allowed_domains : [];
    const domain = email.split('@')[1];
    if (allowedTeacherDomains.length > 0 && !allowedTeacherDomains.includes(domain)) {
      return c.json({
        error: `Domain @${domain} is not in the authorized teacher domains for this institution. Allowed domains: ${allowedTeacherDomains.join(', ')}`,
      }, 400);
    }

    const fullName = (body.fullName || '').trim() || email.split('@')[0];

    if (body.authMode === 'GOOGLE') {
      // Upsert into org_invites
      await fetch(`${supabaseUrl}/rest/v1/org_invites`, {
        method: 'POST',
        headers: {
          apikey: secretKey,
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify({
          org_id: targetOrgId,
          email,
          role: 'TEACHER',
          full_name: fullName,
          department: body.department?.trim() || null,
          section_id: body.sectionId || null,
          invited_by: user.id,
        }),
      });

      // Upsert into org_users as pending invite
      await fetch(`${supabaseUrl}/rest/v1/org_users`, {
        method: 'POST',
        headers: {
          apikey: secretKey,
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify({
          org_id: targetOrgId,
          invited_email: email,
          invited_name: fullName,
          role: 'TEACHER',
          section_id: body.sectionId || null,
          is_active: true,
          onboarding_completed: false,
        }),
      });

      return c.json({
        success: true,
        mode: 'GOOGLE_INVITE',
        message: `Faculty invite created for ${email}. Teacher can sign in with Google.`,
        teacher: { email, fullName, role: 'TEACHER' },
      });
    }

    // PASSWORD Auth Mode: Create user via Supabase Auth Admin API
    if (!body.password || body.password.length < 6) {
      return c.json({ error: 'Password must be at least 6 characters long' }, 400);
    }

    let teacherUserId: string;

    const createAuthUserRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: secretKey,
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password: body.password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          role: 'TEACHER',
        },
      }),
    });

    if (!createAuthUserRes.ok) {
      const errText = await createAuthUserRes.text();
      let isEmailRegistered = false;
      try {
        const j = JSON.parse(errText);
        isEmailRegistered = j.code === 'email_exists' || errText.includes('already been registered');
      } catch {}

      if (isEmailRegistered) {
        // Find existing user id
        const userLookup = await fetch(`${supabaseUrl}/rest/v1/users?email=eq.${encodeURIComponent(email)}&select=id`, {
          headers: { apikey: secretKey, Authorization: `Bearer ${secretKey}` },
        });
        const users = (await userLookup.json().catch(() => [])) as any[];
        if (users[0]?.id) {
          teacherUserId = users[0].id;
          // Update password for existing user
          await fetch(`${supabaseUrl}/auth/v1/admin/users/${teacherUserId}`, {
            method: 'PUT',
            headers: {
              apikey: secretKey,
              Authorization: `Bearer ${secretKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ password: body.password }),
          });
        } else {
          return c.json({ error: `User with email ${email} already registered in another workspace.` }, 400);
        }
      } else {
        return c.json({ error: `Failed to create teacher account: ${errText}` }, 400);
      }
    } else {
      const created = (await createAuthUserRes.json()) as { id: string };
      teacherUserId = created.id;
    }

    // Upsert public.users
    await fetch(`${supabaseUrl}/rest/v1/users`, {
      method: 'POST',
      headers: {
        apikey: secretKey,
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        id: teacherUserId,
        email,
        full_name: fullName,
        global_role: 'TEACHER',
      }),
    });

    // Upsert public.org_users
    await fetch(`${supabaseUrl}/rest/v1/org_users`, {
      method: 'POST',
      headers: {
        apikey: secretKey,
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        org_id: targetOrgId,
        user_id: teacherUserId,
        role: 'TEACHER',
        invited_email: email,
        invited_name: fullName,
        section_id: body.sectionId || null,
        is_active: true,
        onboarding_completed: true,
      }),
    });

    // Upsert org_invites as claimed
    await fetch(`${supabaseUrl}/rest/v1/org_invites`, {
      method: 'POST',
      headers: {
        apikey: secretKey,
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        org_id: targetOrgId,
        email,
        role: 'TEACHER',
        full_name: fullName,
        claimed_at: new Date().toISOString(),
        invited_by: user.id,
      }),
    });

    return c.json({
      success: true,
      mode: 'PASSWORD_CREATED',
      message: `Faculty account created with password auth for ${email}.`,
      teacher: { id: teacherUserId, email, fullName, role: 'TEACHER' },
    });
  } catch (err: any) {
    console.error('Error in /api/org/teachers/add:', err);
    return c.json({ error: err.message || 'Failed to add faculty member' }, 500);
  }
});

// 0c. PATCH /api/org/settings (Enforces Delegation Policy Locks)
app.patch('/api/org/settings', async (c) => {
  const user = c.get('user');
  const { supabaseUrl, secretKey } = getSupabaseAdmin(c);

  if (user.role !== 'ORG_ADMIN' && user.role !== 'SUPER_ADMIN') {
    return c.json({ error: 'Forbidden: Organization Administrator privileges required' }, 403);
  }

  try {
    const body = await c.req.json<{
      orgId?: string;
      name?: string;
      city_state?: string;
      teacher_auth_mode?: string;
      student_auth_mode?: string;
      student_allowed_domains?: string[];
      teacher_allowed_domains?: string[];
      feature_flags?: Record<string, boolean>;
      exam_defaults?: Record<string, any>;
      capacity_limits?: Record<string, any>;
      billing_config?: Record<string, any>;
      delegation_policy?: Record<string, any>;
    }>();

    const targetOrgId = (user.role === 'SUPER_ADMIN' && body.orgId) ? body.orgId : user.orgId;
    if (!targetOrgId) {
      return c.json({ error: 'Missing target organization ID' }, 400);
    }

    // Fetch org and current delegation policy
    const orgRes = await fetch(
      `${supabaseUrl}/rest/v1/organizations?id=eq.${encodeURIComponent(targetOrgId)}&select=*`,
      { headers: { apikey: secretKey, Authorization: `Bearer ${secretKey}` } },
    );

    if (!orgRes.ok) return c.json({ error: 'Failed to fetch organization' }, 500);
    const orgs = (await orgRes.json().catch(() => [])) as any[];
    const org = orgs[0];
    if (!org) return c.json({ error: 'Organization not found' }, 404);

    const delegation = org.delegation_policy || {};
    const updates: Record<string, any> = {};

    const isSuper = user.role === 'SUPER_ADMIN';

    if (body.name !== undefined) {
      updates.name = body.name.trim();
    }
    if (body.city_state !== undefined) {
      updates.city_state = body.city_state.trim();
    }
    if (body.teacher_auth_mode !== undefined) {
      updates.teacher_auth_mode = body.teacher_auth_mode;
    }
    if (body.student_auth_mode !== undefined) {
      if (!isSuper && delegation.lock_student_domains) {
        return c.json({ error: 'POLICY_LOCKED', message: 'Student authentication mode is locked by Super Admin policy.' }, 403);
      }
      updates.student_auth_mode = body.student_auth_mode;
    }

    if (body.student_allowed_domains !== undefined) {
      if (!isSuper && delegation.lock_student_domains) {
        return c.json({ error: 'POLICY_LOCKED', message: 'Student domains are locked by Super Admin policy.' }, 403);
      }
      const newStudentDomains = body.student_allowed_domains.map((d) => d.trim().toLowerCase()).filter(Boolean);

      // Check conflict with other active orgs
      const otherOrgsRes = await fetch(
        `${supabaseUrl}/rest/v1/organizations?id=neq.${encodeURIComponent(targetOrgId)}&is_active=eq.true&select=id,name,student_allowed_domains`,
        { headers: { apikey: secretKey, Authorization: `Bearer ${secretKey}` } },
      );
      if (otherOrgsRes.ok) {
        const otherOrgs = (await otherOrgsRes.json().catch(() => [])) as any[];
        for (const dom of newStudentDomains) {
          const conflicting = otherOrgs.find((o) => Array.isArray(o.student_allowed_domains) && o.student_allowed_domains.includes(dom));
          if (conflicting) {
            return c.json({
              error: 'DOMAIN_CONFLICT',
              message: `Domain "${dom}" is already claimed by active organization "${conflicting.name}".`,
            }, 409);
          }
        }
      }
      updates.student_allowed_domains = newStudentDomains;
    }

    if (body.teacher_allowed_domains !== undefined) {
      if (!isSuper && delegation.allow_org_edit_teacher_domains === false) {
        return c.json({ error: 'POLICY_LOCKED', message: 'Teacher domains are locked by Super Admin policy.' }, 403);
      }
      updates.teacher_allowed_domains = body.teacher_allowed_domains.map((d) => d.trim().toLowerCase()).filter(Boolean);
    }

    // Keep allowed_domains in sync
    const currentStudent = updates.student_allowed_domains || org.student_allowed_domains || [];
    const currentTeacher = updates.teacher_allowed_domains || org.teacher_allowed_domains || [];
    updates.allowed_domains = Array.from(new Set([...currentStudent, ...currentTeacher]));

    if (body.feature_flags !== undefined) {
      if (!isSuper && delegation.allow_org_edit_features === false) {
        return c.json({ error: 'POLICY_LOCKED', message: 'Feature flags are locked by Super Admin policy.' }, 403);
      }
      updates.feature_flags = { ...(org.feature_flags || {}), ...body.feature_flags };
    }

    if (body.exam_defaults !== undefined) {
      if (!isSuper && delegation.allow_org_edit_exam_defaults === false) {
        return c.json({ error: 'POLICY_LOCKED', message: 'Exam defaults are locked by Super Admin policy.' }, 403);
      }
      updates.exam_defaults = { ...(org.exam_defaults || {}), ...body.exam_defaults };
    }

    if (body.capacity_limits !== undefined) {
      if (!isSuper && delegation.lock_billing_and_limits) {
        return c.json({ error: 'POLICY_LOCKED', message: 'Capacity limits are locked by Super Admin policy.' }, 403);
      }
      updates.capacity_limits = { ...(org.capacity_limits || {}), ...body.capacity_limits };
    }

    if (body.billing_config !== undefined) {
      if (!isSuper && delegation.lock_billing_and_limits) {
        return c.json({ error: 'POLICY_LOCKED', message: 'Billing configuration is locked by Super Admin policy.' }, 403);
      }
      updates.billing_config = { ...(org.billing_config || {}), ...body.billing_config };
    }

    if (body.delegation_policy !== undefined && isSuper) {
      updates.delegation_policy = { ...(org.delegation_policy || {}), ...body.delegation_policy };
    }

    const patchRes = await fetch(`${supabaseUrl}/rest/v1/organizations?id=eq.${encodeURIComponent(targetOrgId)}`, {
      method: 'PATCH',
      headers: {
        apikey: secretKey,
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(updates),
    });

    if (!patchRes.ok) {
      const errText = await patchRes.text();
      return c.json({ error: `Failed to update organization: ${errText}` }, 400);
    }

    const updated = (await patchRes.json().catch(() => [])) as any[];
    return c.json({ success: true, org: updated[0] });
  } catch (err: any) {
    console.error('Error in PATCH /api/org/settings:', err);
    return c.json({ error: err.message || 'Settings update failed' }, 500);
  }
});

// ── Google Workspace Integration Endpoints (Drive.file & Forms.body) ────

// 0c. GET /api/google/auth-url (Generate server-side Google OAuth URL)
app.get('/api/google/auth-url', async (c) => {
  const redirectUri = c.req.query('redirectUri');
  if (!redirectUri) {
    return c.json({ error: 'Missing required query parameter: redirectUri' }, 400);
  }

  try {
    const authUrl = buildGoogleAuthUrl(redirectUri, c.env, 'google_connect');
    return c.json({ authUrl });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to generate Google auth URL' }, 500);
  }
});

// 0d. GET /api/google/status (Teacher / Admin Google Connection Status)
app.get('/api/google/status', async (c) => {
  const user = c.get('user');
  const { supabaseUrl, secretKey } = getSupabaseAdmin(c);

  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/google_credentials?user_id=eq.${encodeURIComponent(user.id)}&select=google_email,scopes,updated_at`,
      { headers: { apikey: secretKey, Authorization: `Bearer ${secretKey}` } },
    );
    if (!res.ok) return c.json({ connected: false });
    const data = (await res.json().catch(() => [])) as any[];
    if (data.length > 0) {
      return c.json({
        connected: true,
        googleEmail: data[0].google_email,
        scopes: data[0].scopes || [],
        updatedAt: data[0].updated_at,
      });
    }
    return c.json({ connected: false });
  } catch (err: any) {
    return c.json({ connected: false, error: err.message }, 500);
  }
});

// 0e. POST /api/google/connect (Exchange code for tokens & store encrypted refresh token)
app.post('/api/google/connect', async (c) => {
  const user = c.get('user');
  const { supabaseUrl, secretKey } = getSupabaseAdmin(c);

  const isPrivileged =
    user.role === 'TEACHER' ||
    user.role === 'ORG_ADMIN' ||
    user.role === 'SUPER_ADMIN';

  if (!isPrivileged) {
    return c.json({ error: 'Forbidden: Faculty or Administrator access required' }, 403);
  }

  try {
    const body = await c.req.json<{ code: string; redirectUri: string }>();
    if (!body?.code || !body?.redirectUri) {
      return c.json({ error: 'Missing required fields: code and redirectUri' }, 400);
    }

    const tokens = await exchangeGoogleCode(body.code, body.redirectUri, {
      GOOGLE_CLIENT_ID: c.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: c.env.GOOGLE_CLIENT_SECRET,
    });

    const encSecret = c.env.TOKEN_ENCRYPTION_KEY || 'colformly_default_sec_token_key_2026';
    let encryptedRefreshToken = '';
    let tokenIv = '';

    if (tokens.refreshToken) {
      const enc = await encryptToken(tokens.refreshToken, encSecret);
      encryptedRefreshToken = enc.ciphertext;
      tokenIv = enc.iv;
    } else {
      // Retain existing refresh token if user reconnected without offline consent prompt
      const existingRes = await fetch(
        `${supabaseUrl}/rest/v1/google_credentials?user_id=eq.${encodeURIComponent(user.id)}&select=encrypted_refresh_token,token_iv`,
        { headers: { apikey: secretKey, Authorization: `Bearer ${secretKey}` } },
      );
      const existing = (await existingRes.json().catch(() => [])) as any[];
      if (existing[0]?.encrypted_refresh_token) {
        encryptedRefreshToken = existing[0].encrypted_refresh_token;
        tokenIv = existing[0].token_iv;
      } else {
        throw new Error('No refresh token returned by Google. Please reconnect and ensure offline consent is granted.');
      }
    }

    const targetOrgId = user.orgId || 'a0000000-0000-0000-0000-000000000001';

    // Upsert into public.google_credentials
    const upsertRes = await fetch(`${supabaseUrl}/rest/v1/google_credentials`, {
      method: 'POST',
      headers: {
        apikey: secretKey,
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        user_id: user.id,
        org_id: targetOrgId,
        google_email: tokens.googleEmail,
        encrypted_refresh_token: encryptedRefreshToken,
        token_iv: tokenIv,
        scopes: tokens.scopes,
        updated_at: new Date().toISOString(),
      }),
    });

    if (!upsertRes.ok) {
      const errText = await upsertRes.text();
      throw new Error(`Failed to store credentials: ${errText}`);
    }

    return c.json({
      success: true,
      googleEmail: tokens.googleEmail,
      scopes: tokens.scopes,
    });
  } catch (err: any) {
    console.error('Error in /api/google/connect:', err);
    return c.json({ error: err.message || 'Google OAuth connection failed' }, 400);
  }
});

// 0f. POST /api/tests/:testId/sync-google-form (Drive Folder & Google Form Sync)
app.post('/api/tests/:testId/sync-google-form', async (c) => {
  const user = c.get('user');
  const testId = c.req.param('testId');
  const { supabaseUrl, secretKey } = getSupabaseAdmin(c);

  const isPrivileged =
    user.role === 'TEACHER' ||
    user.role === 'ORG_ADMIN' ||
    user.role === 'SUPER_ADMIN';

  if (!isPrivileged) {
    return c.json({ error: 'Forbidden: Faculty or Administrator access required' }, 403);
  }

  try {
    const result = await syncTestToGoogleForm(testId, user.id, c.env, { supabaseUrl, secretKey });
    return c.json(result);
  } catch (err: any) {
    console.error('Google Form sync error:', err);
    return c.json({ error: err.message || 'Google Form sync failed' }, 400);
  }
});

// 0g. GET /api/tests/:testId/verify-sheet (Inspect linkedSheetId from Google Forms)
app.get('/api/tests/:testId/verify-sheet', async (c) => {
  const user = c.get('user');
  const testId = c.req.param('testId');
  const { supabaseUrl, secretKey } = getSupabaseAdmin(c);

  const isPrivileged =
    user.role === 'TEACHER' ||
    user.role === 'ORG_ADMIN' ||
    user.role === 'SUPER_ADMIN';

  if (!isPrivileged) {
    return c.json({ error: 'Forbidden: Faculty or Administrator access required' }, 403);
  }

  try {
    const result = await verifyTestSheetLink(testId, user.id, c.env, { supabaseUrl, secretKey });
    return c.json(result);
  } catch (err: any) {
    console.error('Sheet verification error:', err);
    return c.json({ verified: false, error: err.message || 'Sheet verification failed' }, 400);
  }
});

// 1. POST /api/ai/generate-questions (Teacher / Admin only with Quota & Feature check)
app.post('/api/ai/generate-questions', async (c) => {
  const user = c.get('user');

  const isAuthorizedRole =
    user.role === 'TEACHER' ||
    user.role === 'ORG_ADMIN' ||
    user.role === 'SUPER_ADMIN';

  if (!isAuthorizedRole) {
    return c.json(
      {
        error: 'Forbidden: Only faculty and administrators can invoke the AI Question Generator.',
        userRole: user.role,
      },
      403,
    );
  }

  const telemetryEnv: TelemetryEnv = {
    SUPABASE_URL: c.env.SUPABASE_URL || 'https://crprffwlfngyiyztwgwb.supabase.co',
    SUPABASE_SECRET_KEY: c.env.SUPABASE_SECRET_KEY || c.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_SERVICE_ROLE_KEY: c.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_PUBLISHABLE_KEY: c.env.SUPABASE_PUBLISHABLE_KEY || c.env.SUPABASE_ANON_KEY,
    SUPABASE_ANON_KEY: c.env.SUPABASE_ANON_KEY,
  };

  try {
    const body = await c.req.json<{
      topic: string;
      count?: number;
      difficulty?: 'easy' | 'medium' | 'hard';
      syllabusNotes?: string;
      orgId?: string;
    }>();

    if (!body?.topic?.trim()) {
      return c.json({ error: 'Missing required field: "topic"' }, 400);
    }

    const targetOrgId = user.orgId || body.orgId || 'a0000000-0000-0000-0000-000000000001';
    const { supabaseUrl, secretKey } = getSupabaseAdmin(c);

    // Verify feature flag and AI monthly quota
    const orgRes = await fetch(
      `${supabaseUrl}/rest/v1/organizations?id=eq.${encodeURIComponent(targetOrgId)}&select=id,name,feature_flags,capacity_limits`,
      { headers: { apikey: secretKey, Authorization: `Bearer ${secretKey}` } },
    );
    if (orgRes.ok) {
      const orgs = (await orgRes.json().catch(() => [])) as any[];
      const org = orgs[0];
      if (org) {
        if (org.feature_flags?.ai_generator === false) {
          return c.json({ error: 'AI Question Generator is disabled for your institution.' }, 403);
        }

        const monthlyAllowance = org.capacity_limits?.monthly_ai_allowance;
        if (typeof monthlyAllowance === 'number' && monthlyAllowance > 0) {
          const currentMonth = new Date().toISOString().slice(0, 7);
          const usageRes = await fetch(
            `${supabaseUrl}/rest/v1/org_usage_monthly?org_id=eq.${encodeURIComponent(targetOrgId)}&billing_month=eq.${currentMonth}&select=ai_requests_count`,
            { headers: { apikey: secretKey, Authorization: `Bearer ${secretKey}` } },
          );
          if (usageRes.ok) {
            const usage = (await usageRes.json().catch(() => [])) as any[];
            const reqCount = usage[0]?.ai_requests_count || 0;
            if (reqCount >= monthlyAllowance) {
              return c.json(
                { error: `Monthly AI allowance (${monthlyAllowance} requests) has been exhausted for this organization.` },
                429,
              );
            }
          }
        }
      }
    }

    const aiEnv: AiEnv = {
      GROQ_API_KEYS: c.env.GROQ_API_KEYS,
      GROQ_API_KEY: c.env.GROQ_API_KEY,
      GEMINI_API_KEYS: c.env.GEMINI_API_KEYS,
      GEMINI_API_KEY: c.env.GEMINI_API_KEY,
    };

    const count = body.count || 2;
    const { questions, provider } = await generateExamQuestions(
      body.topic.trim(),
      count,
      body.difficulty || 'medium',
      body.syllabusNotes,
      aiEnv,
    );

    // Async telemetry: Increment usage with ZERO exam latency
    c.executionCtx.waitUntil(
      incrementOrgUsageAsync(telemetryEnv, {
        orgId: targetOrgId,
        aiReqs: 1,
        groqTokens: provider === 'groq' ? count * 350 : 0,
        geminiTokens: provider === 'gemini' ? count * 350 : 0,
      }),
    );

    return c.json({
      success: true,
      topic: body.topic.trim(),
      count: questions.length,
      provider,
      questions,
    });
  } catch (err: any) {
    console.error('Error in /api/ai/generate-questions:', err);

    // Asynchronously log incident
    c.executionCtx.waitUntil(
      reportSystemIncidentAsync(telemetryEnv, {
        severity: 'WARNING',
        category: 'AI_ROUTER',
        message: `Question generation failed: ${err.message}`,
        payload: { error: String(err) },
      }),
    );

    return c.json(
      { error: err instanceof Error ? err.message : 'Question generation failed' },
      500,
    );
  }
});

// 2. POST /api/grade-paper (Student submission grading)
app.post('/api/grade-paper', async (c) => {
  const user = c.get('user');

  const telemetryEnv: TelemetryEnv = {
    SUPABASE_URL: c.env.SUPABASE_URL || 'https://crprffwlfngyiyztwgwb.supabase.co',
    SUPABASE_SECRET_KEY: c.env.SUPABASE_SECRET_KEY || c.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_SERVICE_ROLE_KEY: c.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_PUBLISHABLE_KEY: c.env.SUPABASE_PUBLISHABLE_KEY || c.env.SUPABASE_ANON_KEY,
    SUPABASE_ANON_KEY: c.env.SUPABASE_ANON_KEY,
  };

  try {
    const body = await c.req.json<{
      testId: string;
      answers: Record<string, string>;
      antiCheatLogs?: Array<{ type: string; timestamp: string; details?: string }>;
      orgId?: string;
    }>();

    if (!body?.testId) {
      return c.json({ error: 'Missing required field: "testId"' }, 400);
    }

    const gradingEnv: GradingEnv = {
      SUPABASE_URL: c.env.SUPABASE_URL || 'https://crprffwlfngyiyztwgwb.supabase.co',
      SUPABASE_SECRET_KEY: c.env.SUPABASE_SECRET_KEY || c.env.SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_SERVICE_ROLE_KEY: c.env.SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_PUBLISHABLE_KEY: c.env.SUPABASE_PUBLISHABLE_KEY || c.env.SUPABASE_ANON_KEY,
      SUPABASE_ANON_KEY: c.env.SUPABASE_ANON_KEY,
    };

    const result = await gradeStudentPaper(
      body.testId,
      user.id,
      body.answers || {},
      body.antiCheatLogs || [],
      gradingEnv,
    );

    // Asynchronously record graded test counter
    const targetOrgId = body.orgId || result.orgId || 'a0000000-0000-0000-0000-000000000001';
    c.executionCtx.waitUntil(
      incrementOrgUsageAsync(telemetryEnv, {
        orgId: targetOrgId,
        testsGraded: 1,
      }),
    );

    // Zero-Limit Background Forwarding to Google Form Response (0 Google Sheets API calls)
    c.executionCtx.waitUntil(
      forwardSubmissionToGoogleFormAsync(telemetryEnv, {
        testId: body.testId,
        studentEmail: user.email,
        answers: body.answers || {},
      }),
    );

    // If severe anti-cheat logs detected, log an anti-cheat incident
    if (body.antiCheatLogs && body.antiCheatLogs.length >= 3) {
      c.executionCtx.waitUntil(
        reportSystemIncidentAsync(telemetryEnv, {
          severity: 'INFO',
          category: 'ANTI_CHEAT',
          orgId: targetOrgId,
          message: `Student ${user.email} triggered ${body.antiCheatLogs.length} anti-cheat integrity flags during test ${body.testId}`,
          payload: { flagsCount: body.antiCheatLogs.length, flags: body.antiCheatLogs },
        }),
      );
    }

    return c.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    console.error('Error in /api/grade-paper:', err);

    c.executionCtx.waitUntil(
      reportSystemIncidentAsync(telemetryEnv, {
        severity: 'CRITICAL',
        category: 'WORKER_CRASH',
        message: `Paper grading error: ${err.message}`,
        payload: { error: String(err) },
      }),
    );

    return c.json(
      { error: err instanceof Error ? err.message : 'Paper grading failed' },
      500,
    );
  }
});

// 3. POST /api/ai/explain-answer (Student BYOC / Fallback explainer with Quota & Feature check)
app.post('/api/ai/explain-answer', async (c) => {
  const user = c.get('user');
  const telemetryEnv: TelemetryEnv = {
    SUPABASE_URL: c.env.SUPABASE_URL || 'https://crprffwlfngyiyztwgwb.supabase.co',
    SUPABASE_SECRET_KEY: c.env.SUPABASE_SECRET_KEY || c.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_SERVICE_ROLE_KEY: c.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_PUBLISHABLE_KEY: c.env.SUPABASE_PUBLISHABLE_KEY || c.env.SUPABASE_ANON_KEY,
    SUPABASE_ANON_KEY: c.env.SUPABASE_ANON_KEY,
  };

  try {
    const body = await c.req.json<{
      question: string;
      studentAnswer: string;
      correctAnswer: string;
      mode?: 'real_life' | 'summarize' | 'hinglish';
      orgId?: string;
    }>();

    if (!body?.question || !body?.correctAnswer) {
      return c.json(
        { error: 'Missing required fields: "question" and "correctAnswer"' },
        400,
      );
    }

    const targetOrgId = user.orgId || body.orgId || 'a0000000-0000-0000-0000-000000000001';
    const { supabaseUrl, secretKey } = getSupabaseAdmin(c);

    // Verify feature flag and AI monthly quota
    const orgRes = await fetch(
      `${supabaseUrl}/rest/v1/organizations?id=eq.${encodeURIComponent(targetOrgId)}&select=id,name,feature_flags,capacity_limits`,
      { headers: { apikey: secretKey, Authorization: `Bearer ${secretKey}` } },
    );
    if (orgRes.ok) {
      const orgs = (await orgRes.json().catch(() => [])) as any[];
      const org = orgs[0];
      if (org) {
        if (org.feature_flags?.wrong_answer_explainer === false && org.feature_flags?.byoc_explainer === false) {
          return c.json({ error: 'AI Explainer is disabled for your institution.' }, 403);
        }

        const monthlyAllowance = org.capacity_limits?.monthly_ai_allowance;
        if (typeof monthlyAllowance === 'number' && monthlyAllowance > 0) {
          const currentMonth = new Date().toISOString().slice(0, 7);
          const usageRes = await fetch(
            `${supabaseUrl}/rest/v1/org_usage_monthly?org_id=eq.${encodeURIComponent(targetOrgId)}&billing_month=eq.${currentMonth}&select=ai_requests_count`,
            { headers: { apikey: secretKey, Authorization: `Bearer ${secretKey}` } },
          );
          if (usageRes.ok) {
            const usage = (await usageRes.json().catch(() => [])) as any[];
            const reqCount = usage[0]?.ai_requests_count || 0;
            if (reqCount >= monthlyAllowance) {
              return c.json(
                { error: `Monthly AI allowance (${monthlyAllowance} requests) has been exhausted for this organization.` },
                429,
              );
            }
          }
        }
      }
    }

    const aiEnv: AiEnv = {
      GROQ_API_KEYS: c.env.GROQ_API_KEYS,
      GROQ_API_KEY: c.env.GROQ_API_KEY,
      GEMINI_API_KEYS: c.env.GEMINI_API_KEYS,
      GEMINI_API_KEY: c.env.GEMINI_API_KEY,
    };

    const { explanation, provider } = await explainWrongAnswer(
      body.question,
      body.studentAnswer || '[No Answer]',
      body.correctAnswer,
      body.mode || 'real_life',
      aiEnv,
    );

    c.executionCtx.waitUntil(
      incrementOrgUsageAsync(telemetryEnv, {
        orgId: targetOrgId,
        aiReqs: 1,
        groqTokens: provider === 'groq' ? 250 : 0,
        geminiTokens: provider === 'gemini' ? 250 : 0,
      }),
    );

    return c.json({
      success: true,
      mode: body.mode || 'real_life',
      provider,
      explanation,
    });
  } catch (err: any) {
    console.error('Error in /api/ai/explain-answer:', err);
    return c.json(
      { error: err instanceof Error ? err.message : 'Explanation generation failed' },
      500,
    );
  }
});

// 4. POST /api/telemetry/report (Frontend error & incident ingestion)
app.post('/api/telemetry/report', async (c) => {
  const user = c.get('user');

  try {
    const body = await c.req.json<{
      severity?: 'CRITICAL' | 'WARNING' | 'INFO';
      category?: 'SUPABASE_DB' | 'AUTH_SECURITY' | 'RATE_LIMIT' | 'AI_ROUTER' | 'WORKER_CRASH' | 'ANTI_CHEAT';
      source?: string;
      message: string;
      stack?: string;
      url?: string;
      orgId?: string;
      errorCode?: string;
      payload?: Record<string, unknown>;
    }>();

    if (!body?.message) {
      return c.json({ error: 'Missing required incident field: message' }, 400);
    }

    const telemetryEnv: TelemetryEnv = {
      SUPABASE_URL: c.env.SUPABASE_URL || 'https://crprffwlfngyiyztwgwb.supabase.co',
      SUPABASE_SECRET_KEY: c.env.SUPABASE_SECRET_KEY || c.env.SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_SERVICE_ROLE_KEY: c.env.SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_PUBLISHABLE_KEY: c.env.SUPABASE_PUBLISHABLE_KEY || c.env.SUPABASE_ANON_KEY,
      SUPABASE_ANON_KEY: c.env.SUPABASE_ANON_KEY,
    };

    const reporterLabel = user?.email || body.source || 'frontend';
    const incidentPayload = {
      source: body.source || 'frontend',
      stack: body.stack,
      url: body.url,
      ...(body.payload || {}),
    };

    c.executionCtx.waitUntil(
      reportSystemIncidentAsync(telemetryEnv, {
        severity: body.severity || 'CRITICAL',
        category: body.category || 'WORKER_CRASH',
        orgId: body.orgId || null,
        errorCode: body.errorCode || null,
        message: `[${reporterLabel}] ${body.message}`,
        payload: incidentPayload,
      }),
    );

    return c.json({ success: true, reported: true });
  } catch (err: any) {
    return c.json({ error: err.message || 'Telemetry ingestion failed' }, 500);
  }
});

// 5. POST /api/super-admin/provision-org (Super Admin only)
app.post('/api/super-admin/provision-org', async (c) => {
  const user = c.get('user');

  if (user.role !== 'SUPER_ADMIN') {
    return c.json({ error: 'Forbidden: Super Admin root privileges required' }, 403);
  }

  const telemetryEnv: TelemetryEnv = {
    SUPABASE_URL: c.env.SUPABASE_URL || 'https://crprffwlfngyiyztwgwb.supabase.co',
    SUPABASE_SECRET_KEY: c.env.SUPABASE_SECRET_KEY || c.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_SERVICE_ROLE_KEY: c.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_PUBLISHABLE_KEY: c.env.SUPABASE_PUBLISHABLE_KEY || c.env.SUPABASE_ANON_KEY,
    SUPABASE_ANON_KEY: c.env.SUPABASE_ANON_KEY,
  };

  try {
    const body = await c.req.json<ProvisionOrgParams>();
    if (!body?.name?.trim() || !body?.setupEmail?.trim()) {
      return c.json({ error: 'Missing required fields: name and setupEmail' }, 400);
    }

    const result = await provisionOrganization(telemetryEnv, body);
    return c.json(result);
  } catch (err: any) {
    console.error('Super Admin Provision Error:', err);

    c.executionCtx.waitUntil(
      reportSystemIncidentAsync(telemetryEnv, {
        severity: 'CRITICAL',
        category: 'SUPABASE_DB',
        message: `Provision organization failed: ${err.message}`,
        payload: { error: String(err) },
      }),
    );

    return c.json(
      { success: false, error: err.message || 'Failed to provision organization' },
      400,
    );
  }
});

// 6. POST /api/super-admin/handover-org (Ghost Handover — Super Admin only)
app.post('/api/super-admin/handover-org', async (c) => {
  const user = c.get('user');

  if (user.role !== 'SUPER_ADMIN') {
    return c.json({ error: 'Forbidden: Super Admin root privileges required' }, 403);
  }

  const telemetryEnv: TelemetryEnv = {
    SUPABASE_URL: c.env.SUPABASE_URL || 'https://crprffwlfngyiyztwgwb.supabase.co',
    SUPABASE_SECRET_KEY: c.env.SUPABASE_SECRET_KEY || c.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_SERVICE_ROLE_KEY: c.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_PUBLISHABLE_KEY: c.env.SUPABASE_PUBLISHABLE_KEY || c.env.SUPABASE_ANON_KEY,
    SUPABASE_ANON_KEY: c.env.SUPABASE_ANON_KEY,
  };

  try {
    const body = await c.req.json<HandoverOrgParams>();
    if (!body?.orgId || !body?.clientAdminEmail?.trim()) {
      return c.json({ error: 'Missing required fields: orgId and clientAdminEmail' }, 400);
    }

    const result = await handoverOrganization(telemetryEnv, body);
    return c.json(result);
  } catch (err: any) {
    console.error('Super Admin Handover Error:', err);
    return c.json({ error: err.message || 'Failed to execute ghost handover' }, 500);
  }
});

export default {
  fetch: app.fetch,
  async scheduled(_event: any, _env: Bindings, ctx: any) {
    const urls = [
      'https://colformly-ga4-service.onrender.com/health',
      'https://colformly-ga4.onrender.com/health',
    ];
    ctx.waitUntil(
      Promise.allSettled(
        urls.map((url) =>
          fetch(url, { headers: { 'User-Agent': 'Colformly-Worker-Cron/1.0' } })
            .then((r) => r.text())
            .then((t) => console.log(`[Worker Cron] Keep-alive ping ${url} ->`, t))
            .catch((err) => console.warn(`[Worker Cron] Keep-alive ping ${url} failed:`, err.message)),
        ),
      ),
    );
  },
};
