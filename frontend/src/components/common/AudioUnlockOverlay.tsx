import { AnimatePresence, motion } from 'framer-motion';
import { Volume2 } from 'lucide-react';
import { useAudioUnlockStore } from '../../store/useAudioUnlockStore';

export default function AudioUnlockOverlay() {
  const { isOpen, title, description, actionLabel, dismissUnlock, runUnlockAction } =
    useAudioUnlockStore();

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[160] flex items-center justify-center bg-black/45 px-6 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="w-full max-w-md rounded-[2rem] border border-white/12 bg-[#11141D] p-7 text-white shadow-[0_30px_90px_rgba(0,0,0,0.45)]"
          >
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-white/8">
              <Volume2 className="h-7 w-7 text-rose-300" />
            </div>

            <h2 className="text-xl font-black tracking-[-0.03em]">{title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/70">{description}</p>

            <div className="mt-7 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  void runUnlockAction();
                }}
                className="flex-1 rounded-full bg-[#F7576E] px-5 py-3 text-sm font-black text-white transition hover:bg-[#eb4b63]"
              >
                {actionLabel}
              </button>
              <button
                type="button"
                onClick={dismissUnlock}
                className="rounded-full border border-white/12 bg-white/6 px-5 py-3 text-sm font-bold text-white/80 transition hover:bg-white/10"
              >
                닫기
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
