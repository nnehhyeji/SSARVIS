import { create } from 'zustand';

export type ToastVariant = 'default' | 'success' | 'error' | 'info';

export interface ToastOptions {
  id?: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  actionLabel?: string;
  onAction?: () => void;
}

export interface ToastItem extends ToastOptions {
  id: string;
  createdAt: number;
}

interface ToastState {
  toasts: ToastItem[];
  push: (options: ToastOptions) => string;
  dismiss: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
}

const DEFAULT_DURATION = 4000;

function createToastId() {
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],

  push: (options) => {
    const id = options.id ?? createToastId();

    set((state) => ({
      toasts: [
        ...state.toasts,
        {
          ...options,
          id,
          duration: options.duration ?? DEFAULT_DURATION,
          variant: options.variant ?? 'default',
          createdAt: Date.now(),
        },
      ],
    }));

    return id;
  },

  dismiss: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }));
  },

  remove: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }));
  },

  clear: () => {
    set({ toasts: [] });
  },
}));

export const toast = {
  show: (options: ToastOptions) => useToastStore.getState().push(options),
  success: (title: string, description?: string, duration?: number) =>
    useToastStore.getState().push({ title, description, duration, variant: 'success' }),
  error: (title: string, description?: string, duration?: number) =>
    useToastStore.getState().push({ title, description, duration, variant: 'error' }),
  info: (title: string, description?: string, duration?: number) =>
    useToastStore.getState().push({ title, description, duration, variant: 'info' }),
  dismiss: (id: string) => useToastStore.getState().dismiss(id),
  clear: () => useToastStore.getState().clear(),
};
