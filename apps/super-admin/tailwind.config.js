/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
    '../../packages/ui/src/**/*.{js,jsx,ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary, #6366f1)',
        secondary: 'var(--color-secondary, #8b5cf6)',
        accent: 'var(--color-accent, #06b6d4)',
        surface: 'var(--color-surface, #0a0a0f)',
        muted: 'var(--color-muted, #1e1e2e)',
      },
      fontFamily: {
        main: ['var(--font-main, "Inter", sans-serif)'],
        display: ['var(--font-display, "Cal Sans", sans-serif)'],
      },
      borderRadius: {
        theme: 'var(--radius-theme, 0.75rem)',
      },
    },
  },
  plugins: [],
};
