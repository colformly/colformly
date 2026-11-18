import type { ThemeConfig, ThemePresetKey } from '@colformly/types';

export const defaultTheme: ThemeConfig = {
  colors: {
    primary: '#0F766E',
    secondary: '#14B8A6',
    accent: '#0D9488',
    surface: '#FFFFFF',
    muted: '#F8FAFC',
  },
  fonts: {
    main: '"Instrument Sans", system-ui, sans-serif',
    display: '"Plus Jakarta Sans", system-ui, sans-serif',
  },
  layout: 'floating',
  animationIntensity: 'high',
  borderRadius: 'rounded-xl',
  mode: 'light',
};

export const gamifiedTheme: ThemeConfig = {
  colors: {
    primary: '#7c3aed',
    secondary: '#ec4899',
    accent: '#10b981',
    surface: '#fafaff',
    muted: '#f3e8ff',
  },
  fonts: {
    main: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif',
    display: '"Space Grotesk", "Plus Jakarta Sans", sans-serif',
  },
  layout: 'floating',
  animationIntensity: 'high',
  borderRadius: 'rounded-3xl',
  mode: 'light',
};

export const enterpriseTheme: ThemeConfig = {
  colors: {
    primary: '#1d4ed8',
    secondary: '#334155',
    accent: '#0284c7',
    surface: '#ffffff',
    muted: '#f8fafc',
  },
  fonts: {
    main: '"Inter", system-ui, sans-serif',
    display: '"Inter", system-ui, sans-serif',
  },
  layout: 'solid',
  animationIntensity: 'minimal',
  borderRadius: 'rounded-md',
  mode: 'light',
};

export const superAdminTheme: ThemeConfig = {
  colors: {
    primary: '#14B8A6',
    secondary: '#2DD4BF',
    accent: '#34D399',
    surface: '#09090B',
    muted: '#18181B',
  },
  fonts: {
    main: '"Instrument Sans", system-ui, sans-serif',
    display: '"Plus Jakarta Sans", system-ui, sans-serif',
  },
  layout: 'floating',
  animationIntensity: 'minimal',
  borderRadius: 'rounded-xl',
  mode: 'dark',
};

export const THEME_PRESETS: Record<ThemePresetKey, ThemeConfig> = {
  default: defaultTheme,
  gamified: gamifiedTheme,
  enterprise: enterpriseTheme,
  superAdmin: superAdminTheme,
};

/**
 * Safely parse an untrusted JSON theme_config coming from Supabase organizations.theme_config
 */
export function parseThemeConfig(raw: unknown, fallback: ThemeConfig = defaultTheme): ThemeConfig {
  if (!raw || typeof raw !== 'object') {
    return fallback;
  }

  const candidate = raw as Partial<ThemeConfig>;
  const validLayouts = ['floating', 'solid'] as const;
  const validIntensity = ['high', 'minimal'] as const;
  const validRadii = ['rounded-3xl', 'rounded-xl', 'rounded-md', 'rounded-sm'] as const;

  return {
    colors: {
      primary: candidate.colors?.primary || fallback.colors.primary,
      secondary: candidate.colors?.secondary || fallback.colors.secondary,
      accent: candidate.colors?.accent || fallback.colors.accent,
      surface: candidate.colors?.surface || fallback.colors.surface,
      muted: candidate.colors?.muted || fallback.colors.muted,
    },
    fonts: {
      main: candidate.fonts?.main || fallback.fonts.main,
      display: candidate.fonts?.display || fallback.fonts.display,
    },
    layout: validLayouts.includes(candidate.layout as 'floating' | 'solid')
      ? (candidate.layout as 'floating' | 'solid')
      : fallback.layout,
    animationIntensity: validIntensity.includes(candidate.animationIntensity as 'high' | 'minimal')
      ? (candidate.animationIntensity as 'high' | 'minimal')
      : fallback.animationIntensity,
    borderRadius: validRadii.includes(candidate.borderRadius as ThemeConfig['borderRadius'])
      ? (candidate.borderRadius as ThemeConfig['borderRadius'])
      : fallback.borderRadius,
    mode: candidate.mode === 'dark' || candidate.mode === 'light' ? candidate.mode : fallback.mode,
  };
}
