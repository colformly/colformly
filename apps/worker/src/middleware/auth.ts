import type { Context, Next } from 'hono';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  orgId?: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
}

export async function supabaseAuthMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');

  // Allow unauthenticated telemetry crash reporting and Google OAuth URL generation
  if (c.req.path === '/api/telemetry/report' || c.req.path === '/api/google/auth-url') {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      c.set('user', {
        id: 'anonymous',
        email: 'anonymous@colformly.internal',
        role: 'ANON',
      });
      return next();
    }
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json(
      { error: 'Unauthorized: Missing or malformed Authorization header' },
      401,
    );
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return c.json({ error: 'Unauthorized: Bearer token is empty' }, 401);
  }

  const supabaseUrl = c.env.SUPABASE_URL || 'https://crprffwlfngyiyztwgwb.supabase.co';
  const apiKey =
    c.env.SUPABASE_PUBLISHABLE_KEY ||
    c.env.SUPABASE_ANON_KEY ||
    'sb_publishable_t9dfV3HzxY50ZwkiumiD_w_RurnQuC4';

  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: apiKey,
      },
    });

    if (!res.ok) {
      return c.json({ error: 'Unauthorized: Token verification failed with Supabase Auth' }, 401);
    }

    const userData = (await res.json()) as {
      id: string;
      email: string;
      app_metadata?: { role?: string };
      user_metadata?: { role?: string };
    };

    const secretKey = c.env.SUPABASE_SECRET_KEY || c.env.SUPABASE_SERVICE_ROLE_KEY || apiKey;
    const restBase = supabaseUrl.replace(/\/$/, '');

    let globalRole: string | undefined =
      userData.app_metadata?.role ||
      userData.user_metadata?.role;

    if (userData.email === 'core@edgecors.com') {
      globalRole = 'SUPER_ADMIN';
    } else if (!globalRole || globalRole === 'authenticated') {
      const profileRes = await fetch(
        `${restBase}/rest/v1/users?id=eq.${encodeURIComponent(userData.id)}&select=global_role`,
        {
          headers: {
            apikey: secretKey,
            Authorization: `Bearer ${secretKey}`,
          },
        },
      ).catch(() => null);

      if (profileRes && profileRes.ok) {
        const profiles = (await profileRes.json().catch(() => [])) as Array<{ global_role?: string }>;
        if (profiles?.[0]?.global_role) {
          globalRole = profiles[0].global_role;
        }
      }
    }

    // Resolve active org membership and tenant status
    let orgId: string | undefined = undefined;
    let orgRole: string | undefined = undefined;

    const orgUserRes = await fetch(
      `${restBase}/rest/v1/org_users?user_id=eq.${encodeURIComponent(userData.id)}&is_active=eq.true&select=org_id,role,organizations(id,name,is_active,onboarding_status)&order=created_at.desc&limit=1`,
      {
        headers: {
          apikey: secretKey,
          Authorization: `Bearer ${secretKey}`,
        },
      },
    ).catch(() => null);

    if (orgUserRes && orgUserRes.ok) {
      const orgUsers = (await orgUserRes.json().catch(() => [])) as Array<{
        org_id: string;
        role: string;
        organizations?: {
          id: string;
          name: string;
          is_active: boolean;
          onboarding_status: string;
        };
      }>;

      if (orgUsers.length > 0) {
        const membership = orgUsers[0];
        orgId = membership.org_id;
        orgRole = membership.role;

        // Tenant Kill-Switch Check (bypass for SUPER_ADMIN and session resolution)
        const isSuper = globalRole === 'SUPER_ADMIN' || userData.email === 'core@edgecors.com';
        const isResolveSessionPath = c.req.path.includes('/resolve-session');

        if (!isSuper && !isResolveSessionPath && membership.organizations) {
          const org = membership.organizations;
          if (org.is_active === false || org.onboarding_status === 'SUSPENDED') {
            return c.json(
              {
                error: 'WORKSPACE_SUSPENDED',
                message: `The workspace for "${org.name}" is currently suspended. Please contact your administrator.`,
              },
              403,
            );
          }
        }
      }
    }

    const resolvedRole =
      globalRole === 'SUPER_ADMIN'
        ? 'SUPER_ADMIN'
        : orgRole || globalRole || 'STUDENT';

    c.set('user', {
      id: userData.id,
      email: userData.email,
      role: resolvedRole,
      orgId,
      user_metadata: userData.user_metadata,
      app_metadata: userData.app_metadata,
    });

    await next();
  } catch (err) {
    console.error('Supabase Auth verification exception:', err);
    return c.json({ error: 'Unauthorized: Auth server unreachable or invalid' }, 401);
  }
}
