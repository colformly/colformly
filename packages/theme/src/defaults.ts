import type { ThemeConfig } from '@colformly/types';

export const defaultTheme: ThemeConfig = {
  colors: {
    primary: '#6366f1',
    secondary: '#8b5cf6',
    accent: '#06b6d4',
    surface: '#ffffff',
    muted: '#f1f5f9',
  },
  fonts: {
    main: '"Inter", sans-serif',
    display: '"Cal Sans", sans-serif',
  },
  layout: 'floating',
  animationIntensity: 'high',
  borderRadius: 'rounded-xl',
};
