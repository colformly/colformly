// ═══════════════════════════════════════════════════════════════
// @colformly/theme — Advanced Structural Theming Engine
// ═══════════════════════════════════════════════════════════════

export {
  ThemeProvider,
  useTheme,
  type StructuralClasses,
  type ThemeContextValue,
  type ThemeMotionConfig,
  type ThemeProviderProps,
} from './ThemeContext';
export {
  defaultTheme,
  enterpriseTheme,
  gamifiedTheme,
  superAdminTheme,
  THEME_PRESETS,
  parseThemeConfig,
} from './defaults';
export type {
  ThemeAnimationIntensity,
  ThemeBorderRadius,
  ThemeColors,
  ThemeConfig,
  ThemeFonts,
  ThemeLayout,
  ThemePresetKey,
} from '@colformly/types';
