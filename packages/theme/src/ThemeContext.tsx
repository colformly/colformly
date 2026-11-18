import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import type { ThemeConfig } from '@colformly/types';
import { defaultTheme } from './defaults';

interface ThemeContextValue {
  theme: ThemeConfig;
  /** Structural Tailwind class for card border radius */
  cardRadius: string;
  /** Structural Tailwind class for layout mode */
  layoutMode: 'floating' | 'solid';
  /** Whether to run heavier animations */
  isAnimated: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: defaultTheme,
  cardRadius: defaultTheme.borderRadius,
  layoutMode: defaultTheme.layout,
  isAnimated: defaultTheme.animationIntensity === 'high',
});

export function useTheme() {
  return useContext(ThemeContext);
}

interface ThemeProviderProps {
  theme?: Partial<ThemeConfig>;
  children: ReactNode;
}

export function ThemeProvider({ theme: overrides, children }: ThemeProviderProps) {
  const merged = useMemo<ThemeConfig>(
    () => ({
      ...defaultTheme,
      ...overrides,
      colors: { ...defaultTheme.colors, ...overrides?.colors },
      fonts: { ...defaultTheme.fonts, ...overrides?.fonts },
    }),
    [overrides],
  );

  // Inject CSS custom properties onto :root
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', merged.colors.primary);
    root.style.setProperty('--color-secondary', merged.colors.secondary);
    root.style.setProperty('--color-accent', merged.colors.accent);
    root.style.setProperty('--color-surface', merged.colors.surface);
    root.style.setProperty('--color-muted', merged.colors.muted);
    root.style.setProperty('--font-main', merged.fonts.main);
    root.style.setProperty('--font-display', merged.fonts.display);

    // Map Tailwind borderRadius tokens to CSS values
    const radiusMap: Record<string, string> = {
      'rounded-3xl': '1.5rem',
      'rounded-xl': '0.75rem',
      'rounded-md': '0.375rem',
      'rounded-sm': '0.125rem',
    };
    root.style.setProperty('--radius-theme', radiusMap[merged.borderRadius] ?? '0.75rem');
  }, [merged]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: merged,
      cardRadius: merged.borderRadius,
      layoutMode: merged.layout,
      isAnimated: merged.animationIntensity === 'high',
    }),
    [merged],
  );

  return <ThemeContext value={value}>{children}</ThemeContext>;
}
