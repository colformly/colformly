/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
    '../../packages/ui/src/**/*.{js,jsx,ts,tsx}',
    '../../packages/theme/src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary, #0F766E)',
        secondary: 'var(--color-secondary, #14B8A6)',
        accent: 'var(--color-accent, #0D9488)',
        surface: 'var(--color-surface, #FFFFFF)',
        muted: 'var(--color-muted, #F8FAFC)',
        'teal-accent': '#14B8A6',
        'teal-soft': '#CCFBF1',
        'light-primary': 'var(--color-primary, #0F766E)',
        'light-on-surface': '#0F172A',
        'cream-bg': '#FAF9F5',
      },
      fontFamily: {
        main: ['var(--font-main, "Instrument Sans")', 'system-ui', 'sans-serif'],
        body: ['var(--font-main, "Instrument Sans")', 'system-ui', 'sans-serif'],
        display: ['var(--font-display, "Plus Jakarta Sans")', 'system-ui', 'sans-serif'],
        headline: ['var(--font-display, "Plus Jakarta Sans")', 'system-ui', 'sans-serif'],
        label: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"Red Hat Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        theme: 'var(--radius-theme, 0.75rem)',
      },
      boxShadow: {
        'floating-sidebar': '0 10px 35px -4px rgba(15, 23, 42, 0.06)',
        'student-card': '0 16px 36px -8px rgba(15, 23, 42, 0.08)',
      },
    },
  },
  plugins: [],
};
