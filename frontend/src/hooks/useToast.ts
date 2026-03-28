import { toast, useToastStore } from '../store/useToastStore';

export function useToast() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);
  const clear = useToastStore((state) => state.clear);

  return {
    toasts,
    dismiss,
    clear,
    toast,
  };
}
