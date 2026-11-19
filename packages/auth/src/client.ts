import { createBrowserClient, createServerClient, type CookieOptions } from '@supabase/ssr';
import type { Database } from '@colformly/types';

function readEnv(key: string): string {
  const metaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  if (metaEnv && typeof metaEnv[key] === 'string') {
    return metaEnv[key] as string;
  }
  const proc = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } })
    .process;
  if (proc?.env && typeof proc.env[key] === 'string') {
    return proc.env[key] as string;
  }
  return '';
}

export function getSupabaseConfig() {
  const url = readEnv('VITE_SUPABASE_URL') || readEnv('PUBLIC_SUPABASE_URL');
  const key =
    readEnv('VITE_SUPABASE_PUBLISHABLE_KEY') ||
    readEnv('PUBLIC_SUPABASE_PUBLISHABLE_KEY') ||
    readEnv('VITE_SUPABASE_ANON_KEY') ||
    readEnv('PUBLIC_SUPABASE_ANON_KEY');

  return {
    url: url || 'https://placeholder.supabase.co',
    key: key || 'placeholder-key',
    isConfigured: Boolean(url && key),
  };
}

/**
 * Browser Supabase client powered by @supabase/ssr.
 * Synchronizes PKCE auth state with cookies instead of exposing JWTs in localStorage.
 */
export function createColformlyBrowserClient() {
  const { url, key } = getSupabaseConfig();
  return createBrowserClient<Database>(url, key, {
    auth: {
      flowType: 'pkce',
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
}

export interface ServerCookieAdapter {
  getAll: () => Array<{ name: string; value: string }>;
  setAll: (cookies: Array<{ name: string; value: string; options?: CookieOptions }>) => void;
}

/**
 * Server / Edge Supabase client powered by @supabase/ssr.
 * Sets HttpOnly, Secure, SameSite=Lax cookies to mitigate XSS token theft.
 */
export function createColformlyServerClient(
  cookies: ServerCookieAdapter,
  overrides?: { url?: string; key?: string },
) {
  const config = getSupabaseConfig();
  const url = overrides?.url || config.url;
  const key = overrides?.key || config.key;

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
        cookies.setAll(
          cookiesToSet.map(({ name, value, options }) => ({
            name,
            value,
            options: {
              ...options,
              httpOnly: true,
              secure: true,
              sameSite: 'lax',
              path: '/',
            },
          })),
        );
      },
    },
  });
}

/** Default shared browser Supabase client singleton */
export const supabase = createColformlyBrowserClient();
