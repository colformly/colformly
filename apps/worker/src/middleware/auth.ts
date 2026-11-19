import type { Context, Next } from 'hono';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
}

export async function supabaseAuthMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');

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

    let role =
      userData.app_metadata?.role ||
      userData.user_metadata?.role;

    if (!role || role === 'authenticated') {
      if (userData.email === 'core@edgecors.com') {
        role = 'SUPER_ADMIN';
      } else {
        const secretKey = c.env.SUPABASE_SECRET_KEY || c.env.SUPABASE_SERVICE_ROLE_KEY || apiKey;
        const profileRes = await fetch(
          `${supabaseUrl.replace(/\/$/, '')}/rest/v1/users?id=eq.${encodeURIComponent(userData.id)}&select=global_role`,
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
            role = profiles[0].global_role;
          }
        }
      }
    }

    if (!role || role === 'authenticated') {
      role = 'STUDENT';
    }

    c.set('user', {
      id: userData.id,
      email: userData.email,
      role,
      user_metadata: userData.user_metadata,
      app_metadata: userData.app_metadata,
    });

    await next();
  } catch (err) {
    console.error('Supabase Auth verification exception:', err);
    return c.json({ error: 'Unauthorized: Auth server unreachable or invalid' }, 401);
  }
}
