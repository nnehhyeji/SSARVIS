import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2, Copy, Volume2, UserPlus, Check } from 'lucide-react';

// ─── MyCardModal ───
// 역할: 헤더의 QR 버튼 클릭 시 표시되는 내 명함(프로필 + QR코드) 모달
// - isOpen: 모달 표시 여부
// - onClose: 모달 닫기 콜백
// - isCopied 상태는 모달 내부에서만 필요하므로 내부 state로 관리합니다.

interface MyCardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MyCardModal({ isOpen, onClose }: MyCardModalProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [isQrCopied, setIsQrCopied] = useState(false);

  // 현재 유저의 프로필로 이동하는 실제 주소
  const shareUrl = `${window.location.origin}/card/1`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(shareUrl)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleCopyQR = async () => {
    try {
      setIsQrCopied(true);
      // 1. 이미지를 가져와서 Blob으로 변환
      const response = await fetch(qrImageUrl);
      const blob = await response.blob();

      // 2. 클립보드에 이미지 쓰기 (PNG 타입 필요)
      // fetch로 받은 blob이 png가 아닐 수도 있으므로 canvas를 거치는 게 안전하지만,
      // qrserver는 기본이 png이므로 바로 시도해 볼 수도 있음.
      // 하지만 브라우저 호환성을 위해 ClipboardItem을 사용함.
      const item = new ClipboardItem({ [blob.type]: blob });
      await navigator.clipboard.write([item]);

      setTimeout(() => setIsQrCopied(false), 2000);
    } catch (err) {
      console.error('QR 복사 실패:', err);
      alert('QR 이미지 복사에 실패했습니다. 브라우저 보안 설정을 확인해 주세요.');
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
            className="relative w-full max-w-6xl aspect-[1.8/1] max-h-[90vh] bg-white rounded-[4cqw] shadow-2xl overflow-hidden flex @container"
          >
            {/* 1. 카드 프리뷰 영역 (좌측 - 70.5%) */}
            <div className="relative flex-[7.05] bg-white overflow-hidden flex flex-col p-[7cqw] justify-center">
              {/* 배경 그라데이션 */}
              <div
                className="absolute inset-0 opacity-60"
                style={{
                  background: 'linear-gradient(135deg, #FFE4E6 0%, #FFFFFF 50%, #ECFCCB 100%)',
                }}
              />

              <div className="relative z-10 flex flex-col h-full justify-center">
                {/* 한줄 소개 말풍선 */}
                <div className="mb-[6cqw] relative inline-flex self-start">
                  <div className="bg-white/95 backdrop-blur-md px-[2.5cqw] py-[1.8cqw] rounded-[3cqw] shadow-md border border-white/80 text-gray-800 font-extrabold leading-relaxed pr-[6cqw] relative text-[1.8cqw]">
                    이게 바로 한줄소개다
                    <br />
                    이녀석아 ㅋ
                    <Volume2 className="absolute right-[1.5cqw] bottom-[1.8cqw] w-[2.2cqw] h-[2.2cqw] text-gray-400" />
                  </div>
                  {/* 말풍선 꼬리 */}
                  <div className="absolute right-[-1cqw] top-1/2 -translate-y-1/2 w-[2.5cqw] h-[2.5cqw] bg-white rotate-45 border-r border-t border-white/80" />
                </div>

                {/* 사용자 정보 */}
                <div className="mb-[4cqw]">
                  <div className="flex items-baseline gap-[1.5cqw] mb-[0.8cqw]">
                    <h2 className="text-[6.5cqw] font-black text-gray-800 tracking-tighter leading-none">
                      김싸피
                    </h2>
                    <span className="text-[2.5cqw] text-gray-400 font-bold tracking-tight">
                      @ssafy_me
                    </span>
                  </div>
                  <div className="w-[85%] h-[0.2cqw] bg-gray-300 mb-[1.5cqw] opacity-40" />
                  <div className="flex gap-[4cqw] text-[1.8cqw] font-bold text-gray-500">
                    <div className="flex gap-[0.5cqw] items-center">
                      <span className="text-gray-400">팔로잉</span>
                      <span className="text-gray-700">123명</span>
                    </div>
                    <div className="flex gap-[0.5cqw] items-center">
                      <span className="text-gray-400">팔로워</span>
                      <span className="text-gray-700">123명</span>
                    </div>
                  </div>
                </div>

                {/* 버튼 프리뷰 */}
                <div className="flex gap-[1.5cqw]">
                  <div className="px-[3cqw] py-[1.5cqw] bg-white/90 rounded-[2.5cqw] border border-white shadow-sm text-[1.8cqw] font-black text-pink-400 flex items-center gap-[0.8cqw]">
                    <UserPlus className="w-[1.8cqw] h-[1.8cqw]" /> + 팔로우 요청
                  </div>
                  <div className="px-[3cqw] py-[1.5cqw] bg-white/90 rounded-[2.5cqw] border border-white shadow-sm text-[1.8cqw] font-black text-gray-600">
                    홈 방문
                  </div>
                </div>
              </div>

              {/* 우측 캐릭터 프리뷰 (거대) */}
              <div className="absolute right-[-10cqw] top-1/2 -translate-y-1/2 w-[58cqw] h-[58cqw]">
                <div className="w-full h-full rounded-full bg-white shadow-[inset_-2cqw_-2cqw_6cqw_rgba(0,0,0,0.05),3cqw_3cqw_8cqw_rgba(0,0,0,0.1)] border-[2cqw] border-white relative flex items-center justify-center">
                  <div className="w-full h-full scale-[1.3] translate-y-[10%] opacity-80">
                    {/* 간략 이미테이션 캐릭터 - 크기 대폭 상향 */}
                    <div className="absolute top-[35%] left-[30%] w-[2cqw] h-[3.5cqw] bg-gray-800 rounded-full" />
                    <div className="absolute top-[35%] right-[30%] w-[2cqw] h-[3.5cqw] bg-gray-800 rounded-full" />
                    <div className="absolute top-[60%] left-1/2 -translate-x-1/2 w-[4.5cqw] h-[5cqw] border-[0.6cqw] border-gray-800 rounded-full" />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. 공유 컨트롤 영역 (우측 - 29.5%) */}
            <div className="relative z-10 flex-[2.95] bg-gray-50/70 backdrop-blur-lg flex flex-col p-[3.5cqw] border-l border-gray-100">
              {/* 헤더: 제목 및 닫기 버튼 */}
              <div className="flex justify-center items-center relative mb-[4cqw]">
                <h3 className="font-extrabold text-gray-800 text-[2.2cqw] tracking-tighter">
                  공유하기
                </h3>
                <button
                  onClick={onClose}
                  className="absolute right-0 p-[0.8cqw] rounded-full hover:bg-gray-200/50 transition"
                >
                  <X className="w-[2.5cqw] h-[2.5cqw] text-gray-400" />
                </button>
              </div>

              <div className="flex-1 flex flex-col justify-center gap-[4cqw]">
                {/* 프리미엄 QR 카드 */}
                <div className="bg-white p-[3.5cqw] rounded-[4cqw] shadow-[0_2cqw_5cqw_rgba(0,0,0,0.08)] border border-white flex flex-col items-center gap-[2cqw] hover:scale-[1.02] transition-transform group mx-[1cqw]">
                  <div className="w-full aspect-square bg-white rounded-[1.5cqw] flex items-center justify-center relative overflow-hidden">
                    <img
                      src={qrImageUrl}
                      alt="My Profile QR"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="text-[0.8cqw] font-black text-gray-300 uppercase tracking-[0.4em] text-center">
                    Profile QR Code
                  </div>
                </div>

                {/* 버튼 세트 */}
                <div className="flex flex-col gap-[1.5cqw] px-[1cqw] w-full">
                  <button
                    onClick={handleCopyQR}
                    className={`w-full py-[1.8cqw] rounded-[2cqw] font-black text-[1.6cqw] flex items-center justify-center gap-[0.8cqw] transition-all hover:-translate-y-[0.2cqw] shadow-xl ${
                      isQrCopied
                        ? 'bg-green-500 text-white'
                        : 'bg-[#1F2937] text-white hover:bg-gray-900'
                    }`}
                  >
                    {isQrCopied ? (
                      <Check className="w-[1.8cqw] h-[1.8cqw]" />
                    ) : (
                      <Share2 className="w-[1.8cqw] h-[1.8cqw]" />
                    )}
                    {isQrCopied ? '복사 완료!' : 'QR 코드 이미지 복사'}
                  </button>
                  <button
                    onClick={handleCopyLink}
                    className={`w-full py-[1.8cqw] rounded-[2cqw] font-black text-[1.6cqw] flex items-center justify-center gap-[0.8cqw] transition-all hover:-translate-y-[0.2cqw] border shadow-lg ${
                      isCopied
                        ? 'bg-green-500 text-white border-transparent'
                        : 'bg-white text-gray-700 border-gray-100 hover:bg-gray-50'
                    }`}
                  >
                    {isCopied ? (
                      <Check className="w-[1.8cqw] h-[1.8cqw]" />
                    ) : (
                      <Copy className="w-[1.8cqw] h-[1.8cqw]" />
                    )}
                    {isCopied ? '링크 복사 완료!' : '페이지 링크 복사'}
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
