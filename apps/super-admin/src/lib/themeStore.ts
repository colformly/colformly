import { create } from 'zustand';

export type SuperAdminTheme = 'apple-glass' | 'obsidian-stealth' | 'spatial-midnight' | 'neo-brutal';

interface ThemeState {
  theme: SuperAdminTheme;
  reducedMotion: boolean;
  soundFx: boolean;
  setTheme: (theme: SuperAdminTheme) => void;
  setReducedMotion: (val: boolean) => void;
  setSoundFx: (val: boolean) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = 'colformly_superadmin_theme';

function getInitialTheme(): SuperAdminTheme {
  if (typeof window === 'undefined') return 'obsidian-stealth';
  const saved = localStorage.getItem(STORAGE_KEY) as SuperAdminTheme | null;
  if (saved && ['apple-glass', 'obsidian-stealth', 'spatial-midnight', 'neo-brutal'].includes(saved)) {
    return saved;
  }
  return 'obsidian-stealth';
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: getInitialTheme(),
  reducedMotion: false,
  soundFx: false,

  setTheme: (theme) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, theme);
      document.documentElement.setAttribute('data-admin-theme', theme);
    }
    set({ theme });
  },

  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  setSoundFx: (soundFx) => set({ soundFx }),

  toggleTheme: () => {
    const list: SuperAdminTheme[] = ['obsidian-stealth', 'apple-glass', 'spatial-midnight', 'neo-brutal'];
    const currIdx = list.indexOf(get().theme);
    const next = list[(currIdx + 1) % list.length];
    get().setTheme(next);
  },
}));

// Apply initial attribute on client load
if (typeof window !== 'undefined') {
  document.documentElement.setAttribute('data-admin-theme', getInitialTheme());
}
