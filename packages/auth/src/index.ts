// ═══════════════════════════════════════════════════════════════
// @colformly/auth — Supabase SSR Auth, Zustand Store & Security
// ═══════════════════════════════════════════════════════════════

export {
  createColformlyBrowserClient,
  createColformlyServerClient,
  getSupabaseConfig,
  supabase,
  type ServerCookieAdapter,
} from './client';
export { useAuthStore, type AuthState } from './store';
export { AuthProvider, RequireRole, useAuth, type AuthProviderProps, type RequireRoleProps } from './AuthProvider';
export { useAntiCheat, type UseAntiCheatOptions, type UseAntiCheatResult } from './antiCheat';
export { buildCspHeader, getSecurityHeaders } from './security';
