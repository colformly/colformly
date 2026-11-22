import { createBrowserClient, createServerClient, type CookieOptions } from '@supabase/ssr';
import type { Database } from '@colformly/types';

// Production Supabase defaults for Colformly (ap-south-1)
const DEFAULT_SUPABASE_URL = 'https://crprffwlfngyiyztwgwb.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_t9dfV3HzxY50ZwkiumiD_w_RurnQuC4';

export function getSupabaseConfig() {
  let url = '';
  let key = '';

  // 1. Direct static property access for Vite, Astro, and Rollup build-time AST replacement
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      url =
        (import.meta as any).env.VITE_SUPABASE_URL ||
        (import.meta as any).env.PUBLIC_SUPABASE_URL ||
        '';
      key =
        (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY ||
        (import.meta as any).env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        (import.meta as any).env.VITE_SUPABASE_ANON_KEY ||
        (import.meta as any).env.PUBLIC_SUPABASE_ANON_KEY ||
        '';
    }
  } catch {
    // import.meta may not be available in non-ESM environments
  }

  // 2. Node / Cloudflare Worker process.env fallback
  if (!url || !key) {
    try {
      const proc = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process;
      if (proc?.env) {
        url = url || proc.env.VITE_SUPABASE_URL || proc.env.PUBLIC_SUPABASE_URL || '';
        key =
          key ||
          proc.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
          proc.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
          proc.env.VITE_SUPABASE_ANON_KEY ||
          proc.env.PUBLIC_SUPABASE_ANON_KEY ||
          '';
      }
    } catch {
      // process not defined
    }
  }

  // 3. Fallback to production credentials if unconfigured or pointing to legacy placeholder
  if (!url || url.includes('placeholder.supabase.co')) {
    url = DEFAULT_SUPABASE_URL;
  }
  if (!key || key === 'placeholder-key') {
    key = DEFAULT_SUPABASE_ANON_KEY;
  }

  return {
    url,
    key,
    isConfigured: Boolean(url && key),
  };
}

/**
 * Browser Supabase client powered by @supabase/ssr.
 * Synchronizes PKCE auth state with cookies instead of exposing JWTs in localStorage.
 */
export function createColformlyBrowserClient() {
  const { url, key } = getSupabaseConfig();
  return createBrowserClient<any>(url, key, {
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
