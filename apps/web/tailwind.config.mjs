/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{astro,html,js,jsx,ts,tsx}',
    '../../packages/ui/src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary, #6366f1)',
        secondary: 'var(--color-secondary, #8b5cf6)',
        accent: 'var(--color-accent, #06b6d4)',
        surface: 'var(--color-surface, #ffffff)',
        muted: 'var(--color-muted, #f1f5f9)',
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
