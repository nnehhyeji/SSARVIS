import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Sparkles, MessageCircle, RefreshCw } from 'lucide-react';
import { PATHS } from '../../../routes/paths';
import userApi from '../../../apis/userApi';
import { useUserStore } from '../../../store/useUserStore';

interface SharePersonaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SharePersonaModal({ isOpen, onClose }: SharePersonaModalProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [isAcceptPrompt, setIsAcceptPrompt] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { userInfo } = useUserStore();
  const myUserId = userInfo?.id || 1;
  const shareUrl = `${window.location.origin}${PATHS.VISIT(myUserId)}?mode=persona`;

  useEffect(() => {
    if (isOpen) {
      const loadStatus = async () => {
        try {
          setIsLoading(true);
          const profile = await userApi.getUserProfile();
          setIsAcceptPrompt(profile.isAcceptPrompt);
        } catch (error) {
          console.error('Failed to load persona status:', error);
        } finally {
          setIsLoading(false);
        }
      };
      loadStatus();
    }
  }, [isOpen]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleToggleNamna = async () => {
    try {
      setIsSaving(true);
      await userApi.toggleNamna();
      setIsAcceptPrompt(!isAcceptPrompt);
    } catch (error) {
      console.error('Failed to toggle Namna:', error);
      alert('설정 변경에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
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
                  내 페르소나 AI 페이지 공유
                </h3>
              </div>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Toggle Section */}
            <div className="mb-8 p-5 rounded-2xl bg-pink-50/50 border border-pink-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-pink-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800 text-sm sm:text-base">
                      다른 사람의 문답 허용하기
                    </h4>
                    <p className="text-xs text-pink-400 font-medium">
                      ON이면 누구나 질문을 남길 수 있습니다.
                    </p>
                  </div>
                </div>
                {isLoading ? (
                  <RefreshCw className="w-5 h-5 text-pink-300 animate-spin" />
                ) : (
                  <button
                    onClick={handleToggleNamna}
                    disabled={isSaving}
                    className={`w-12 h-6 rounded-full relative transition-all duration-300 ${
                      isAcceptPrompt ? 'bg-pink-500' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all duration-300 ${
                        isAcceptPrompt ? 'left-6' : 'left-0.5'
                      }`}
                    />
                  </button>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="mb-6 space-y-2 text-center">
              <p className="text-gray-600 font-medium">
                링크를 공유해서 지인들에게 내 AI와 대화하고
                <br />
                <strong>문답</strong>을 작성하여 페르소나를 키우도록 요청해보세요!
              </p>
              <p className="text-sm text-gray-400">(비회원도 링크를 통해 작성할 수 있습니다)</p>
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
