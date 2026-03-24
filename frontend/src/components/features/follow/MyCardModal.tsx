import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2, Copy, Volume2, UserPlus, Check } from 'lucide-react';
import { PATHS } from '../../../routes/paths';

interface MyCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: number | null;
  userName?: string;
  userHandle?: string;
  followingCount?: number;
  followerCount?: number;
}

export default function MyCardModal({
  isOpen,
  onClose,
  userId = null,
  userName = '내 프로필',
  userHandle = '@ssarvis_me',
  followingCount = 0,
  followerCount = 0,
}: MyCardModalProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [isQrCopied, setIsQrCopied] = useState(false);

  const shareUrl = `${window.location.origin}${PATHS.CARD(userId ?? 1)}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(shareUrl)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleCopyQR = async () => {
    try {
      setIsQrCopied(true);
      const response = await fetch(qrImageUrl);
      const blob = await response.blob();
      const item = new ClipboardItem({ [blob.type]: blob });
      await navigator.clipboard.write([item]);
      setTimeout(() => setIsQrCopied(false), 2000);
    } catch (err) {
      console.error('QR 복사 실패:', err);
      alert('QR 복사에 실패했습니다. 다시 시도해주세요.');
      setIsQrCopied(false);
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
            className="relative flex w-full max-w-6xl max-h-[90vh] aspect-[1.8/1] overflow-hidden rounded-[4cqw] bg-white shadow-2xl"
          >
            <div className="relative flex flex-[7.05] flex-col justify-center overflow-hidden bg-white p-[7cqw]">
              <div
                className="absolute inset-0 opacity-60"
                style={{
                  background: 'linear-gradient(135deg, #FFE4E6 0%, #FFFFFF 50%, #ECFCCB 100%)',
                }}
              />

              <div className="relative z-10 flex h-full flex-col justify-center">
                <div className="relative mb-[6cqw] inline-flex self-start">
                  <div className="relative rounded-[3cqw] border border-white/80 bg-white/95 px-[2.5cqw] py-[1.8cqw] pr-[6cqw] text-[1.8cqw] font-extrabold leading-relaxed text-gray-800 shadow-md backdrop-blur-md">
                    내 프로필을 친구에게
                    <br />
                    공유해 보세요
                    <Volume2 className="absolute bottom-[1.8cqw] right-[1.5cqw] h-[2.2cqw] w-[2.2cqw] text-gray-400" />
                  </div>
                  <div className="absolute right-[-1cqw] top-1/2 h-[2.5cqw] w-[2.5cqw] -translate-y-1/2 rotate-45 border-r border-t border-white/80 bg-white" />
                </div>

                <div className="mb-[4cqw]">
                  <div className="mb-[0.8cqw] flex items-baseline gap-[1.5cqw]">
                    <h2 className="text-[6.5cqw] font-black leading-none tracking-tighter text-gray-800">
                      {userName}
                    </h2>
                    <span className="text-[2.5cqw] font-bold tracking-tight text-gray-400">
                      {userHandle}
                    </span>
                  </div>
                  <div className="mb-[1.5cqw] h-[0.2cqw] w-[85%] bg-gray-300 opacity-40" />
                  <div className="flex gap-[4cqw] text-[1.8cqw] font-bold text-gray-500">
                    <div className="flex items-center gap-[0.5cqw]">
                      <span className="text-gray-400">팔로잉</span>
                      <span className="text-gray-700">{followingCount}명</span>
                    </div>
                    <div className="flex items-center gap-[0.5cqw]">
                      <span className="text-gray-400">팔로워</span>
                      <span className="text-gray-700">{followerCount}명</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-[1.5cqw]">
                  <div className="flex items-center gap-[0.8cqw] rounded-[2.5cqw] border border-white bg-white/90 px-[3cqw] py-[1.5cqw] text-[1.8cqw] font-black text-pink-400 shadow-sm">
                    <UserPlus className="h-[1.8cqw] w-[1.8cqw]" />+ 친구 추가
                  </div>
                  <div className="rounded-[2.5cqw] border border-white bg-white/90 px-[3cqw] py-[1.5cqw] text-[1.8cqw] font-black text-gray-600 shadow-sm">
                    내 카드
                  </div>
                </div>
              </div>

              <div className="absolute right-[-10cqw] top-1/2 h-[58cqw] w-[58cqw] -translate-y-1/2">
                <div className="relative flex h-full w-full items-center justify-center rounded-full border-[2cqw] border-white bg-white shadow-[inset_-2cqw_-2cqw_6cqw_rgba(0,0,0,0.05),3cqw_3cqw_8cqw_rgba(0,0,0,0.1)]">
                  <div className="h-full w-full translate-y-[10%] scale-[1.3] opacity-80">
                    <div className="absolute left-[30%] top-[35%] h-[3.5cqw] w-[2cqw] rounded-full bg-gray-800" />
                    <div className="absolute right-[30%] top-[35%] h-[3.5cqw] w-[2cqw] rounded-full bg-gray-800" />
                    <div className="absolute left-1/2 top-[60%] h-[5cqw] w-[4.5cqw] -translate-x-1/2 rounded-full border-[0.6cqw] border-gray-800" />
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-10 flex flex-[2.95] flex-col border-l border-gray-100 bg-gray-50/70 p-[3.5cqw] backdrop-blur-lg">
              <div className="relative mb-[4cqw] flex items-center justify-center">
                <h3 className="text-[2.2cqw] font-extrabold tracking-tighter text-gray-800">
                  공유하기
                </h3>
                <button
                  onClick={onClose}
                  className="absolute right-0 rounded-full p-[0.8cqw] transition hover:bg-gray-200/50"
                >
                  <X className="h-[2.5cqw] w-[2.5cqw] text-gray-400" />
                </button>
              </div>

              <div className="flex flex-1 flex-col justify-center gap-[4cqw]">
                <div className="group mx-[1cqw] flex flex-col items-center gap-[2cqw] rounded-[4cqw] border border-white bg-white p-[3.5cqw] shadow-[0_2cqw_5cqw_rgba(0,0,0,0.08)] transition-transform hover:scale-[1.02]">
                  <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-[1.5cqw] bg-white">
                    <img
                      src={qrImageUrl}
                      alt="My Profile QR"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div className="text-center text-[0.8cqw] font-black uppercase tracking-[0.4em] text-gray-300">
                    Profile QR Code
                  </div>
                </div>

                <div className="flex w-full flex-col gap-[1.5cqw] px-[1cqw]">
                  <button
                    onClick={handleCopyQR}
                    className={`flex w-full items-center justify-center gap-[0.8cqw] rounded-[2cqw] py-[1.8cqw] text-[1.6cqw] font-black shadow-xl transition-all hover:-translate-y-[0.2cqw] ${
                      isQrCopied
                        ? 'bg-green-500 text-white'
                        : 'bg-[#1F2937] text-white hover:bg-gray-900'
                    }`}
                  >
                    {isQrCopied ? (
                      <Check className="h-[1.8cqw] w-[1.8cqw]" />
                    ) : (
                      <Share2 className="h-[1.8cqw] w-[1.8cqw]" />
                    )}
                    {isQrCopied ? '복사 완료' : 'QR 복사'}
                  </button>
                  <button
                    onClick={handleCopyLink}
                    className={`flex w-full items-center justify-center gap-[0.8cqw] rounded-[2cqw] border py-[1.8cqw] text-[1.6cqw] font-black shadow-lg transition-all hover:-translate-y-[0.2cqw] ${
                      isCopied
                        ? 'border-transparent bg-green-500 text-white'
                        : 'border-gray-100 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {isCopied ? (
                      <Check className="h-[1.8cqw] w-[1.8cqw]" />
                    ) : (
                      <Copy className="h-[1.8cqw] w-[1.8cqw]" />
                    )}
                    {isCopied ? '링크 복사 완료' : '링크 복사'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
