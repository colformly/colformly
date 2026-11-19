import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import type { Organization, OrgUser, ThemeConfig, UserProfile, UserRole } from '@colformly/types';
import { supabase } from './client';

export interface AuthState {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  memberships: OrgUser[];
  activeOrg: Organization | null;
  role: UserRole | null;
  orgId: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  initialize: () => Promise<void>;
  setSession: (session: Session | null) => void;
  refreshProfile: () => Promise<void>;
  setActiveOrg: (orgId: string) => Promise<void>;
  setRole: (role: UserRole | null) => void;
  setOrgId: (orgId: string | null) => void;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: (redirectTo?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  clear: () => void;
}

const DEFAULT_THEME_FALLBACK: ThemeConfig = {
  colors: {
    primary: '#6366f1',
    secondary: '#8b5cf6',
    accent: '#06b6d4',
    surface: '#ffffff',
    muted: '#f1f5f9',
  },
  fonts: {
    main: '"Inter", system-ui, sans-serif',
    display: '"Plus Jakarta Sans", sans-serif',
  },
  layout: 'floating',
  animationIntensity: 'high',
  borderRadius: 'rounded-xl',
  mode: 'light',
};

function normalizeProfile(row: {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  global_role: UserRole;
  signature_url: string | null;
  grading_blessings: unknown;
  created_at: string;
  updated_at: string;
}): UserProfile {
  return {
    ...row,
    grading_blessings: Array.isArray(row.grading_blessings)
      ? row.grading_blessings.filter((x): x is string => typeof x === 'string')
      : [],
  };
}

function normalizeOrganization(row: {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  theme_config: unknown;
  tier: Organization['tier'];
  mrr_cents: number;
  is_active: boolean;
  allowed_domains?: string[];
  created_at: string;
  updated_at: string;
}): Organization {
  const rawTheme =
    row.theme_config && typeof row.theme_config === 'object'
      ? (row.theme_config as Partial<ThemeConfig>)
      : {};

  return {
    ...row,
    allowed_domains: row.allowed_domains || [],
    theme_config: {
      ...DEFAULT_THEME_FALLBACK,
      ...rawTheme,
      colors: { ...DEFAULT_THEME_FALLBACK.colors, ...(rawTheme.colors ?? {}) },
      fonts: { ...DEFAULT_THEME_FALLBACK.fonts, ...(rawTheme.fonts ?? {}) },
    },
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  memberships: [],
  activeOrg: null,
  role: null,
  orgId: null,
  isLoading: true,
  isInitialized: false,
  error: null,

  setSession: (session) =>
    set({
      session,
      user: session?.user ?? null,
      isLoading: false,
    }),

  setRole: (role) => set({ role }),
  setOrgId: (orgId) => set({ orgId }),

  initialize: async () => {
    set({ isLoading: true, error: null });
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        set({ error: error.message, isLoading: false, isInitialized: true });
        return;
      }

      set({
        session,
        user: session?.user ?? null,
        isInitialized: true,
      });

      if (session?.user) {
        await get().refreshProfile();
      } else {
        set({ isLoading: false });
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to initialize auth session',
        isLoading: false,
        isInitialized: true,
      });
    }
  },

  refreshProfile: async () => {
    const user = get().user;
    if (!user) {
      set({ profile: null, memberships: [], activeOrg: null, role: null, orgId: null, isLoading: false });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const { data: userRow, error: profileErr } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileErr) {
        throw profileErr;
      }

      const profile = normalizeProfile(userRow);

      const { data: membershipRows, error: memberErr } = await supabase
        .from('org_users')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (memberErr) {
        throw memberErr;
      }

      const memberships: OrgUser[] = (membershipRows as OrgUser[] | null) ?? [];
      const currentOrgId = get().orgId;
      const chosenMembership: OrgUser | null =
        memberships.find((m) => m.org_id === currentOrgId) ?? memberships[0] ?? null;

      let activeOrg: Organization | null = null;
      if (chosenMembership) {
        const { data: orgRow } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', chosenMembership.org_id)
          .single();
        if (orgRow) {
          activeOrg = normalizeOrganization(orgRow);
        }
      }

      const resolvedRole: UserRole =
        profile.global_role === 'SUPER_ADMIN'
          ? 'SUPER_ADMIN'
          : (chosenMembership?.role ?? profile.global_role);

      set({
        profile,
        memberships,
        activeOrg,
        orgId: chosenMembership?.org_id ?? null,
        role: resolvedRole,
        isLoading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load profile',
        isLoading: false,
      });
    }
  },

  setActiveOrg: async (orgId: string) => {
    const { memberships, profile } = get();
    const match = memberships.find((m) => m.org_id === orgId);

    const { data: orgRow, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single();

    if (error || !orgRow) {
      set({ error: error?.message ?? 'Organization not found' });
      return;
    }

    const activeOrg = normalizeOrganization(orgRow);
    const resolvedRole: UserRole =
      profile?.global_role === 'SUPER_ADMIN'
        ? 'SUPER_ADMIN'
        : (match?.role ?? profile?.global_role ?? 'STUDENT');

    set({
      activeOrg,
      orgId: activeOrg.id,
      role: resolvedRole,
      error: null,
    });
  },

  signInWithPassword: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ error: error.message, isLoading: false });
      return { error: error.message };
    }
    set({ session: data.session, user: data.user });
    await get().refreshProfile();
    return { error: null };
  },

  signInWithGoogle: async (redirectTo?: string) => {
    set({ isLoading: true, error: null });
    const target =
      redirectTo ?? (typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: target,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      set({ error: error.message, isLoading: false });
      return { error: error.message };
    }
    return { error: null };
  },

  signOut: async () => {
    set({ isLoading: true });
    await supabase.auth.signOut();
    get().clear();
  },

  clear: () =>
    set({
      session: null,
      user: null,
      profile: null,
      memberships: [],
      activeOrg: null,
      role: null,
      orgId: null,
      isLoading: false,
      error: null,
    }),
}));
