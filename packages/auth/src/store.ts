import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import type { UserRole } from '@colformly/types';

export interface AuthState {
  session: Session | null;
  user: User | null;
  role: UserRole | null;
  orgId: string | null;
  isLoading: boolean;
  setSession: (session: Session | null) => void;
  setRole: (role: UserRole | null) => void;
  setOrgId: (orgId: string | null) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  role: null,
  orgId: null,
  isLoading: true,
  setSession: (session) =>
    set({ session, user: session?.user ?? null, isLoading: false }),
  setRole: (role) => set({ role }),
  setOrgId: (orgId) => set({ orgId }),
  clear: () =>
    set({ session: null, user: null, role: null, orgId: null, isLoading: false }),
}));
