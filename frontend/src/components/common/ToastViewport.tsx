import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react';
import { useToastStore, type ToastItem } from '../../store/useToastStore';

function ToastCard({ toast }: { toast: ToastItem }) {
  const dismiss = useToastStore((state) => state.dismiss);
  const duration = toast.duration ?? 0;

  useEffect(() => {
    if (duration <= 0) return undefined;

    const timeout = window.setTimeout(() => {
      dismiss(toast.id);
    }, duration);

    return () => window.clearTimeout(timeout);
  }, [dismiss, duration, toast.id]);

  const icon =
    toast.variant === 'success' ? (
      <CheckCircle2 className="w-5 h-5 text-emerald-300" />
    ) : toast.variant === 'error' ? (
      <CircleAlert className="w-5 h-5 text-rose-300" />
    ) : (
      <Info className="w-5 h-5 text-sky-300" />
    );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.98 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="pointer-events-auto w-full max-w-xl rounded-[1.6rem] border border-white/12 bg-black/92 px-5 py-4 text-white shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/6">
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-black tracking-[-0.02em]">{toast.title}</p>
          {toast.description && (
            <p className="mt-1 text-sm font-medium leading-relaxed text-white/70">
              {toast.description}
            </p>
          )}
        </div>

        {toast.actionLabel && toast.onAction && (
          <button
            type="button"
            onClick={() => {
              toast.onAction?.();
              dismiss(toast.id);
            }}
            className="shrink-0 rounded-full border border-white/12 bg-white/6 px-3 py-2 text-xs font-black text-white transition hover:bg-white/12"
          >
            {toast.actionLabel}
          </button>
        )}

        <button
          type="button"
          onClick={() => dismiss(toast.id)}
          className="shrink-0 rounded-full p-2 text-white/50 transition hover:bg-white/8 hover:text-white"
          aria-label="토스트 닫기"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

export default function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[140] flex justify-center px-4">
      <div className="flex w-full max-w-xl flex-col gap-3">
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <ToastCard key={toast.id} toast={toast} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
