import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {
  ThemeAnimationIntensity,
  ThemeBorderRadius,
  ThemeConfig,
  ThemeLayout,
  ThemePresetKey,
} from '@colformly/types';
import { defaultTheme, parseThemeConfig, THEME_PRESETS } from './defaults';

export interface StructuralClasses {
  /** Card surface, border, shadow, and radius */
  card: string;
  /** Top navigation container (floating glass pill vs sticky solid bar) */
  topNav: string;
  /** Sidebar container (detached floating dock vs flush solid sidebar) */
  sidebar: string;
  /** Mobile bottom navigation dock */
  mobileNav: string;
  /** Modal surface */
  modal: string;
  /** Input / form control radius & border */
  input: string;
  /** Badge / pill radius */
  badge: string;
}

export interface ThemeMotionConfig {
  intensity: ThemeAnimationIntensity;
  isAnimated: boolean;
  transition: {
    type?: 'spring' | 'tween';
    stiffness?: number;
    damping?: number;
    duration?: number;
    ease?: 'easeOut' | 'easeInOut';
  };
  hoverLift: { y: number; scale: number };
  tapScale: number;
}

export interface ThemeContextValue {
  theme: ThemeConfig;
  cardRadius: ThemeBorderRadius;
  buttonRadius: ThemeBorderRadius;
  layoutMode: ThemeLayout;
  animationIntensity: ThemeAnimationIntensity;
  isAnimated: boolean;
  isDark: boolean;
  classes: StructuralClasses;
  motion: ThemeMotionConfig;
  updateTheme: (overrides: Partial<ThemeConfig>) => void;
  applyPreset: (preset: ThemePresetKey) => void;
  resetTheme: () => void;
}

const RADIUS_CSS_MAP: Record<ThemeBorderRadius, string> = {
  'rounded-3xl': '1.5rem',
  'rounded-xl': '0.75rem',
  'rounded-md': '0.375rem',
  'rounded-sm': '0.125rem',
};

function buildStructuralClasses(theme: ThemeConfig): StructuralClasses {
  const isFloating = theme.layout === 'floating';
  const isDark = theme.mode === 'dark';
  const r = theme.borderRadius;

  const surfaceBase = isDark
    ? 'bg-zinc-900/90 text-zinc-100 border-zinc-800/80'
    : 'bg-surface/90 text-slate-900 border-slate-200/80';

  const solidBase = isDark
    ? 'bg-zinc-900 text-zinc-100 border-zinc-800'
    : 'bg-surface text-slate-900 border-slate-200';

  return {
    card: isFloating
      ? `${r} border ${surfaceBase} backdrop-blur-xl shadow-lg shadow-slate-900/5`
      : `${r} border ${solidBase} shadow-sm`,
    topNav: isFloating
      ? `${r} mx-auto max-w-6xl border ${surfaceBase} backdrop-blur-xl shadow-lg shadow-slate-900/10`
      : `w-full border-b ${solidBase} shadow-none rounded-none`,
    sidebar: isFloating
      ? `${r} border ${surfaceBase} backdrop-blur-xl shadow-xl shadow-slate-900/10`
      : `border-r ${solidBase} rounded-none shadow-none`,
    mobileNav: isFloating
      ? `${r} border ${surfaceBase} backdrop-blur-xl shadow-2xl shadow-slate-900/20`
      : `border-t ${solidBase} rounded-none`,
    modal: isFloating
      ? `${r} border ${surfaceBase} backdrop-blur-2xl shadow-2xl`
      : `${r} border ${solidBase} shadow-xl`,
    input: `${r} border ${
      isDark
        ? 'bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-500'
        : 'bg-surface border-slate-200 text-slate-900 placeholder:text-slate-400'
    } focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary`,
    badge: r === 'rounded-3xl' ? 'rounded-full' : r === 'rounded-xl' ? 'rounded-lg' : 'rounded-sm',
  };
}

function buildMotionConfig(intensity: ThemeAnimationIntensity): ThemeMotionConfig {
  const isAnimated = intensity === 'high';
  return {
    intensity,
    isAnimated,
    transition: isAnimated
      ? { type: 'spring', stiffness: 360, damping: 26 }
      : { type: 'tween', duration: 0.14, ease: 'easeOut' },
    hoverLift: isAnimated ? { y: -4, scale: 1.015 } : { y: 0, scale: 1 },
    tapScale: isAnimated ? 0.96 : 0.99,
  };
}

const defaultContextValue: ThemeContextValue = {
  theme: defaultTheme,
  cardRadius: defaultTheme.borderRadius,
  buttonRadius: defaultTheme.borderRadius,
  layoutMode: defaultTheme.layout,
  animationIntensity: defaultTheme.animationIntensity,
  isAnimated: defaultTheme.animationIntensity === 'high',
  isDark: defaultTheme.mode === 'dark',
  classes: buildStructuralClasses(defaultTheme),
  motion: buildMotionConfig(defaultTheme.animationIntensity),
  updateTheme: () => {},
  applyPreset: () => {},
  resetTheme: () => {},
};

const ThemeContext = createContext<ThemeContextValue>(defaultContextValue);

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

export interface ThemeProviderProps {
  /** Base preset key */
  preset?: ThemePresetKey;
  /** Partial overrides (e.g. from org branding or local preview) */
  theme?: Partial<ThemeConfig>;
  /** Raw JSON theme_config directly from Supabase organizations.theme_config */
  orgTheme?: unknown;
  children: ReactNode;
}

export function ThemeProvider({
  preset = 'default',
  theme: propOverrides,
  orgTheme,
  children,
}: ThemeProviderProps) {
  const baseFromProps = useMemo<ThemeConfig>(() => {
    const presetConfig = THEME_PRESETS[preset] ?? defaultTheme;
    const withOrg = orgTheme ? parseThemeConfig(orgTheme, presetConfig) : presetConfig;
    if (!propOverrides) return withOrg;
    return parseThemeConfig(
      {
        ...withOrg,
        ...propOverrides,
        colors: { ...withOrg.colors, ...propOverrides.colors },
        fonts: { ...withOrg.fonts, ...propOverrides.fonts },
      },
      withOrg,
    );
  }, [preset, orgTheme, propOverrides]);

  const [runtimeOverrides, setRuntimeOverrides] = useState<Partial<ThemeConfig> | null>(null);

  const merged = useMemo<ThemeConfig>(() => {
    if (!runtimeOverrides) return baseFromProps;
    return {
      ...baseFromProps,
      ...runtimeOverrides,
      colors: { ...baseFromProps.colors, ...runtimeOverrides.colors },
      fonts: { ...baseFromProps.fonts, ...runtimeOverrides.fonts },
    };
  }, [baseFromProps, runtimeOverrides]);

  // Inject CSS variables and structural data attributes onto :root
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.style.setProperty('--color-primary', merged.colors.primary);
    root.style.setProperty('--color-secondary', merged.colors.secondary);
    root.style.setProperty('--color-accent', merged.colors.accent);
    root.style.setProperty('--color-surface', merged.colors.surface);
    root.style.setProperty('--color-muted', merged.colors.muted);
    root.style.setProperty('--font-main', merged.fonts.main);
    root.style.setProperty('--font-display', merged.fonts.display);
    root.style.setProperty('--radius-theme', RADIUS_CSS_MAP[merged.borderRadius] ?? '0.75rem');

    root.dataset.themeLayout = merged.layout;
    root.dataset.themeAnimation = merged.animationIntensity;
    root.dataset.themeRadius = merged.borderRadius;

    if (merged.mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [merged]);

  const updateTheme = useCallback((overrides: Partial<ThemeConfig>) => {
    setRuntimeOverrides((prev) => ({
      ...prev,
      ...overrides,
      colors: { ...(prev?.colors ?? {}), ...(overrides.colors ?? {}) } as ThemeConfig['colors'],
      fonts: { ...(prev?.fonts ?? {}), ...(overrides.fonts ?? {}) } as ThemeConfig['fonts'],
    }));
  }, []);

  const applyPreset = useCallback((presetKey: ThemePresetKey) => {
    setRuntimeOverrides(THEME_PRESETS[presetKey] ?? defaultTheme);
  }, []);

  const resetTheme = useCallback(() => {
    setRuntimeOverrides(null);
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    const classes = buildStructuralClasses(merged);
    const motion = buildMotionConfig(merged.animationIntensity);
    return {
      theme: merged,
      cardRadius: merged.borderRadius,
      buttonRadius: merged.borderRadius,
      layoutMode: merged.layout,
      animationIntensity: merged.animationIntensity,
      isAnimated: merged.animationIntensity === 'high',
      isDark: merged.mode === 'dark',
      classes,
      motion,
      updateTheme,
      applyPreset,
      resetTheme,
    };
  }, [merged, updateTheme, applyPreset, resetTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
