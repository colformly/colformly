import { useEffect, type ReactNode } from 'react';
import type { UserRole } from '@colformly/types';
import { supabase } from './client';
import { useAuthStore } from './store';

export interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Mounts once at the root of an app to initialize Supabase session state
 * and listen for PKCE/OAuth/refresh auth transitions.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const initialize = useAuthStore((s) => s.initialize);
  const setSession = useAuthStore((s) => s.setSession);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const clear = useAuthStore((s) => s.clear);

  useEffect(() => {
    void initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        clear();
        return;
      }

      setSession(session);
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        void refreshProfile();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [initialize, setSession, refreshProfile, clear]);

  return <>{children}</>;
}

export function useAuth() {
  return useAuthStore();
}

export interface RequireRoleProps {
  allowedRoles: UserRole[];
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
  children: ReactNode;
}

export function RequireRole({
  allowedRoles,
  fallback = null,
  loadingFallback = null,
  children,
}: RequireRoleProps) {
  const { role, isLoading, isInitialized } = useAuthStore();

  if (!isInitialized || isLoading) {
    return <>{loadingFallback}</>;
  }

  if (!role || !allowedRoles.includes(role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
