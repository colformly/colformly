import type { TelemetryEnv } from './telemetry';
import { reportSystemIncidentAsync } from './telemetry';

export interface ProvisionOrgParams {
  name: string;
  orgType?: 'COLLEGE' | 'UNIVERSITY' | 'COACHING' | 'SCHOOL';
  domains?: string[];
  instituteCode?: string;
  setupEmail: string;
  setupPassword?: string;
  tier?: 'FREE' | 'PILOT' | 'PRO' | 'CAMPUS_EXPANSION' | 'CAMPUS' | 'ENTERPRISE';
  mrrCents?: number;
}

export interface HandoverOrgParams {
  orgId: string;
  clientAdminEmail: string;
  clientAdminName?: string;
}

function getSecretKey(env: TelemetryEnv): string {
  return (
    env.SUPABASE_SECRET_KEY ||
    env.SUPABASE_SERVICE_ROLE_KEY ||
    env.SUPABASE_PUBLISHABLE_KEY ||
    env.SUPABASE_ANON_KEY ||
    'sb_publishable_t9dfV3HzxY50ZwkiumiD_w_RurnQuC4'
  );
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

async function rollbackOrg(supabaseUrl: string, secretKey: string, orgId: string) {
  try {
    await fetch(`${supabaseUrl}/rest/v1/organizations?id=eq.${encodeURIComponent(orgId)}`, {
      method: 'DELETE',
      headers: {
        apikey: secretKey,
        Authorization: `Bearer ${secretKey}`,
      },
    });
  } catch (err) {
    console.warn(`Rollback of organization ${orgId} failed:`, err);
  }
}

export async function provisionOrganization(
  env: TelemetryEnv,
  params: ProvisionOrgParams,
): Promise<{ success: boolean; org: any; setupAdmin: { id: string; email: string } }> {
  const supabaseUrl = env.SUPABASE_URL.replace(/\/$/, '');
  const secretKey = getSecretKey(env);

  const slug = `${slugify(params.name)}-${Math.random().toString(36).substring(2, 6)}`;
  const domains = Array.isArray(params.domains)
    ? params.domains.map((d) => d.trim().toLowerCase()).filter(Boolean)
    : [];

  // Map tier strictly to PostgreSQL enum org_tier ('FREE' | 'CAMPUS' | 'ENTERPRISE')
  const rawTier = (params.tier || 'CAMPUS').toUpperCase();
  const dbTier: 'FREE' | 'CAMPUS' | 'ENTERPRISE' =
    rawTier === 'ENTERPRISE'
      ? 'ENTERPRISE'
      : rawTier === 'FREE'
      ? 'FREE'
      : 'CAMPUS'; // Safely maps PILOT, PRO, CAMPUS_EXPANSION to CAMPUS

  const instituteCode = params.instituteCode?.trim() || null;

  // 1. Create Organization in public.organizations
  const orgPayload = {
    name: params.name.trim(),
    slug,
    org_type: params.orgType || 'COLLEGE',
    allowed_domains: domains,
    institute_code: instituteCode,
    onboarding_status: 'SETUP_MODE',
    auth_policy: 'HYBRID',
    tier: dbTier,
    mrr_cents: Math.max(0, params.mrrCents || 0),
    is_active: true,
    feature_flags: { ai_generator: true, byoc_explainer: true, strict_pwa: false },
    global_broadcast: { active: false, message: '', audience: 'ALL', updated_at: null },
  };

  const createOrgRes = await fetch(`${supabaseUrl}/rest/v1/organizations`, {
    method: 'POST',
    headers: {
      apikey: secretKey,
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(orgPayload),
  });

  if (!createOrgRes.ok) {
    const errText = await createOrgRes.text();
    let parsedErr = errText;
    try {
      const j = JSON.parse(errText);
      parsedErr = j.message || j.error || errText;
    } catch {}
    throw new Error(`Failed to create organization: ${parsedErr}`);
  }

  const createdOrgs = (await createOrgRes.json()) as any[];
  const org = createdOrgs[0];

  // 2. Create or reuse Setup Admin in Supabase Auth via Admin API
  const setupEmail = params.setupEmail.trim().toLowerCase();
  const setupPassword =
    params.setupPassword || `Colformly@${Math.random().toString(36).slice(2, 8).toUpperCase()}!`;

  let setupUser: { id: string; email: string };

  const adminCreateRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: secretKey,
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: setupEmail,
      password: setupPassword,
      email_confirm: true,
      user_metadata: {
        full_name: `${params.name} Setup Operator`,
        role: 'ORG_ADMIN',
      },
    }),
  });

  if (!adminCreateRes.ok) {
    const errText = await adminCreateRes.text();
    let errJson: any = null;
    try {
      errJson = JSON.parse(errText);
    } catch {}

    // Check if the user already exists in Supabase Auth
    const isEmailRegistered =
      adminCreateRes.status === 422 ||
      errText.includes('already been registered') ||
      errJson?.code === 'email_exists' ||
      errJson?.message?.includes('already been registered');

    if (isEmailRegistered) {
      // Lookup existing user ID in public.users or auth
      const userLookupRes = await fetch(
        `${supabaseUrl}/rest/v1/users?email=eq.${encodeURIComponent(setupEmail)}&select=id,email`,
        {
          headers: { apikey: secretKey, Authorization: `Bearer ${secretKey}` },
        },
      );
      const existingUsers = (await userLookupRes.json().catch(() => [])) as Array<{
        id: string;
        email: string;
      }>;

      if (existingUsers?.[0]?.id) {
        setupUser = { id: existingUsers[0].id, email: existingUsers[0].email };
      } else {
        // Query auth admin users list
        const authListRes = await fetch(
          `${supabaseUrl}/auth/v1/admin/users?page=1&per_page=50`,
          {
            headers: { apikey: secretKey, Authorization: `Bearer ${secretKey}` },
          },
        );
        const authData = (await authListRes.json().catch(() => ({}))) as {
          users?: Array<{ id: string; email: string }>;
        };
        const found = authData.users?.find((u) => u.email?.toLowerCase() === setupEmail);

        if (found) {
          setupUser = { id: found.id, email: found.email };
        } else {
          await rollbackOrg(supabaseUrl, secretKey, org.id);
          throw new Error(
            `Setup email "${setupEmail}" is already registered in another tenant, but user ID could not be resolved. Please use a distinct setup email.`,
          );
        }
      }
    } else {
      await rollbackOrg(supabaseUrl, secretKey, org.id);
      throw new Error(
        `Failed to create setup operator in Supabase Auth: ${errJson?.msg || errJson?.message || errText}`,
      );
    }
  } else {
    setupUser = (await adminCreateRes.json()) as { id: string; email: string };
  }

  // 3. Upsert into public.users with global_role ORG_ADMIN
  const upsertUserRes = await fetch(`${supabaseUrl}/rest/v1/users`, {
    method: 'POST',
    headers: {
      apikey: secretKey,
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      id: setupUser.id,
      email: setupUser.email,
      full_name: `${params.name} Setup Operator`,
      global_role: 'ORG_ADMIN',
    }),
  });

  if (!upsertUserRes.ok) {
    const errText = await upsertUserRes.text();
    console.warn('Upsert into public.users warning:', errText);
  }

  // 4. Assign membership in public.org_users
  const assignOrgUserRes = await fetch(`${supabaseUrl}/rest/v1/org_users`, {
    method: 'POST',
    headers: {
      apikey: secretKey,
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      org_id: org.id,
      user_id: setupUser.id,
      role: 'ORG_ADMIN',
      onboarding_completed: true,
    }),
  });

  if (!assignOrgUserRes.ok) {
    const errText = await assignOrgUserRes.text();
    console.warn('Assignment in public.org_users warning:', errText);
  }

  // 5. Update setup_admin_id on public.organizations
  await fetch(`${supabaseUrl}/rest/v1/organizations?id=eq.${org.id}`, {
    method: 'PATCH',
    headers: {
      apikey: secretKey,
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      setup_admin_id: setupUser.id,
    }),
  });

  return {
    success: true,
    org: { ...org, tier: dbTier, setup_admin_id: setupUser.id },
    setupAdmin: { id: setupUser.id, email: setupUser.email },
  };
}

export async function handoverOrganization(
  env: TelemetryEnv,
  params: HandoverOrgParams,
): Promise<{ success: boolean; orgId: string; status: string; authPolicy: string }> {
  const supabaseUrl = env.SUPABASE_URL.replace(/\/$/, '');
  const secretKey = getSecretKey(env);

  // 1. Fetch current org state
  const getOrgRes = await fetch(
    `${supabaseUrl}/rest/v1/organizations?id=eq.${encodeURIComponent(params.orgId)}&select=id,name,setup_admin_id,allowed_domains`,
    {
      headers: {
        apikey: secretKey,
        Authorization: `Bearer ${secretKey}`,
      },
    },
  );

  const orgs = (await getOrgRes.json().catch(() => [])) as any[];
  const org = orgs[0];
  if (!org) {
    throw new Error(`Organization ${params.orgId} not found.`);
  }

  // 2. Whitelist / Add clientAdminEmail as ORG_ADMIN
  const clientEmail = params.clientAdminEmail.trim().toLowerCase();
  const domainPart = clientEmail.split('@')[1];
  let allowedDomains: string[] = Array.isArray(org.allowed_domains) ? org.allowed_domains : [];
  if (domainPart && !allowedDomains.includes(domainPart)) {
    allowedDomains = [...allowedDomains, domainPart];
  }

  // Check if client user already exists in public.users
  const userCheckRes = await fetch(
    `${supabaseUrl}/rest/v1/users?email=eq.${encodeURIComponent(clientEmail)}&select=id`,
    {
      headers: { apikey: secretKey, Authorization: `Bearer ${secretKey}` },
    },
  );
  const existingUsers = (await userCheckRes.json().catch(() => [])) as any[];
  const existingUser = existingUsers[0];

  if (existingUser) {
    await fetch(`${supabaseUrl}/rest/v1/org_users`, {
      method: 'POST',
      headers: {
        apikey: secretKey,
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        org_id: org.id,
        user_id: existingUser.id,
        role: 'ORG_ADMIN',
        onboarding_completed: true,
      }),
    });
  }

  // 3. Update Organization to HANDED_OVER and GOOGLE_ONLY lock
  await fetch(`${supabaseUrl}/rest/v1/organizations?id=eq.${org.id}`, {
    method: 'PATCH',
    headers: {
      apikey: secretKey,
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      onboarding_status: 'HANDED_OVER',
      auth_policy: 'GOOGLE_ONLY',
      allowed_domains: allowedDomains,
      setup_admin_id: null,
    }),
  });

  // 4. Ghost Handover: Hard-delete temporary setup_admin_id user from Supabase Auth
  if (org.setup_admin_id) {
    try {
      await fetch(`${supabaseUrl}/auth/v1/admin/users/${org.setup_admin_id}`, {
        method: 'DELETE',
        headers: {
          apikey: secretKey,
          Authorization: `Bearer ${secretKey}`,
        },
      });

      // Also clean up from public.users and public.org_users
      await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${org.setup_admin_id}`, {
        method: 'DELETE',
        headers: { apikey: secretKey, Authorization: `Bearer ${secretKey}` },
      });
    } catch (delErr) {
      console.warn('Cleanup of temporary setup admin user:', delErr);
    }
  }

  // 5. Record Incident Audit Log
  await reportSystemIncidentAsync(env, {
    severity: 'INFO',
    category: 'AUTH_SECURITY',
    orgId: org.id,
    message: `Ghost handover completed for "${org.name}". Setup admin destroyed permanently and GOOGLE_ONLY lock engaged.`,
    payload: {
      clientAdminEmail: clientEmail,
      clientAdminName: params.clientAdminName || null,
      previousSetupAdminId: org.setup_admin_id,
    },
  });

  return {
    success: true,
    orgId: org.id,
    status: 'HANDED_OVER',
    authPolicy: 'GOOGLE_ONLY',
  };
}
