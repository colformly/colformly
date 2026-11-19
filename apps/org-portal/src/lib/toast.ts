import { create } from 'zustand';

export interface ToastItem {
  id: string;
  message: string;
  type: 'error' | 'success' | 'info';
}

interface ToastStore {
  toasts: ToastItem[];
  showToast: (message: string, type?: 'error' | 'success' | 'info') => void;
  removeToast: (id: string) => void;
}

export const useToast = create<ToastStore>((set) => ({
  toasts: [],
  showToast: (message, type = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 4500);
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

export function triggerToast(
  message: string,
  type: 'error' | 'success' | 'info' = 'info',
) {
  useToast.getState().showToast(message, type);
}

