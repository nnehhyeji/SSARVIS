import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Sparkles } from 'lucide-react';

interface SharePersonaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SharePersonaModal({ isOpen, onClose }: SharePersonaModalProps) {
  const [isCopied, setIsCopied] = useState(false);

  // TODO: 실제로는 현재 로그인한 유저의 식별자(userId)를 사용해야 합니다.
  const myUserId = 1;
  const shareUrl = `${window.location.origin}/persona/${myUserId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            className="relative w-full max-w-md bg-white rounded-[2cqw] sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col p-6 sm:p-8"
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-2.5 bg-yellow-100 rounded-xl">
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500" />
                </div>
                <h3 className="font-extrabold text-gray-800 text-lg sm:text-xl tracking-tight">
                  내 페르소나 문답 공유
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Description */}
            <div className="mb-6 space-y-2 text-center">
              <p className="text-gray-600 font-medium">
                링크를 복사해서 친구나 주변 사람들에게 <strong>나를 평가하는 문답</strong> 작성을 요청해보세요!
              </p>
              <p className="text-sm text-gray-400">
                (비회원도 링크를 통해 작성할 수 있습니다)
              </p>
            </div>

            {/* URL Display */}
            <div className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-6 relative overflow-hidden group">
              <p className="w-full text-center text-gray-500 text-sm font-mono truncate select-all">
                {shareUrl}
              </p>
            </div>

            {/* Button */}
            <button
              onClick={handleCopyLink}
              className={`w-full py-4 rounded-2xl font-black text-base sm:text-lg flex items-center justify-center gap-2 transition-all shadow-lg hover:-translate-y-1 ${
                isCopied
                  ? 'bg-green-500 text-white shadow-green-500/20'
                  : 'bg-gradient-to-r from-pink-500 to-rose-400 text-white shadow-pink-500/20'
              }`}
            >
              {isCopied ? (
                <>
                  <Check className="w-6 h-6" />
                  링크 복사 완료!
                </>
              ) : (
                <>
                  <Copy className="w-6 h-6" />
                  설문지 링크 복사하기
                </>
              )}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
