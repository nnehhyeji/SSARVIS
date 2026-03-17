import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, QrCode, Share2, Copy, RefreshCcw, Volume2 } from 'lucide-react';

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

  const handleCopyLink = () => {
    navigator.clipboard.writeText('https://ssarvis.web/ssafy_me');
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleCopyQR = () => {
    // 실제 이미지 복사 로직 (여기서는 시뮬레이션 알림)
    alert('QR 코드가 클립보드에 복사되었습니다.');
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
            className="relative w-full max-w-4xl h-[600px] bg-white rounded-[40px] shadow-2xl overflow-hidden flex"
          >
            {/* 배경 그라데이션 & 캐릭터 프리뷰 */}
            <div className="absolute inset-0 z-0">
              <div
                className="absolute inset-0 transition-opacity duration-1000"
                style={{
                  background: 'linear-gradient(135deg, #FFE4E6 0%, #FFFFFF 50%, #ECFCCB 100%)',
                }}
              />
              {/* 우측 대형 캐릭터 구체 (디자인 참고) */}
              <div className="absolute right-[-10%] top-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-80">
                <div className="w-full h-full rounded-full bg-white shadow-[inset_-20px_-20px_60px_rgba(0,0,0,0.05),20px_20px_60px_rgba(0,0,0,0.1)] flex items-center justify-center border-white border-[20px]">
                  {/* 캐릭터 눈부신 하얀색 & 얼굴 */}
                  <div className="w-[80%] h-[80%] rounded-full bg-white relative">
                    <div className="absolute top-[40%] left-[30%] w-6 h-10 bg-gray-800 rounded-full" />
                    <div className="absolute top-[40%] right-[30%] w-6 h-10 bg-gray-800 rounded-full" />
                    <div className="absolute top-[65%] left-1/2 -translate-x-1/2 w-12 h-14 border-[6px] border-gray-800 rounded-full" />
                  </div>
                </div>
                {/* 둥근 비주얼라이저 느낌의 점선 */}
                <div className="absolute inset-[-40px] border-[2px] border-dashed border-red-200 rounded-full opacity-40 animate-spin-slow" />
              </div>
            </div>

            {/* 카드 컨텐츠 */}
            <div className="relative z-10 flex-1 flex flex-col p-16 justify-center">
              {/* 한줄 소개 말풍선 */}
              <div className="mb-12 relative flex max-w-[320px]">
                <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-white/50 text-gray-800 font-bold leading-relaxed pr-16 relative">
                  이게 바로 한줄소개다
                  <br />
                  이녀석아 ㅋ
                  <Volume2 className="absolute right-5 bottom-5 w-6 h-6 text-gray-400 cursor-pointer hover:text-gray-600" />
                </div>
                {/* 말풍선 꼬리 */}
                <div className="absolute bottom-[-10px] right-20 w-8 h-8 bg-white/90 rotate-45" />
              </div>

              {/* 사용자 정보 */}
              <div className="mb-4">
                <div className="flex items-baseline gap-3 mb-4">
                  <h2 className="text-5xl font-black text-gray-800 tracking-tight">김싸피</h2>
                  <span className="text-2xl text-gray-400 font-medium tracking-wide">
                    @ssafy_me
                  </span>
                </div>
                <div className="w-full max-w-[400px] h-[1px] bg-gray-300 mb-6" />
                <div className="flex gap-8 text-xl font-bold text-gray-500">
                  <div className="flex gap-2">
                    <span className="text-gray-400">팔로잉</span>
                    <span className="text-gray-600">123명</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-gray-400">팔로워</span>
                    <span className="text-gray-600">123명</span>
                  </div>
                </div>
              </div>

              {/* 버튼 영역 */}
              <div className="mt-12 flex gap-4">
                <button className="px-10 py-5 bg-white rounded-3xl shadow-lg border border-gray-100 text-xl font-extrabold text-gray-700 hover:bg-gray-50 transition active:scale-95">
                  + 팔로우 요청
                </button>
                <button className="px-10 py-5 bg-white rounded-3xl shadow-lg border border-gray-100 text-xl font-extrabold text-gray-700 hover:bg-gray-50 transition active:scale-95">
                  홈 방문
                </button>
              </div>
            </div>

            {/* QR 및 공유 버튼 */}
            <div className="relative z-10 w-[300px] flex flex-col justify-end p-12 gap-4">
              <div className="bg-white/80 backdrop-blur-md p-4 rounded-3xl border border-white/50 shadow-xl flex flex-col items-center gap-4">
                <div className="w-full aspect-square bg-white rounded-2xl p-2 flex items-center justify-center border border-gray-100">
                  {/* QR 코드 영역 */}
                  <QrCode className="w-[80%] h-[80%] text-gray-800" />
                </div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  Profile QR Code
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={handleCopyQR}
                  className="w-full py-4 bg-gray-800 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-700 transition"
                >
                  <Share2 className="w-5 h-5" />
                  QR 코드 이미지 복사
                </button>
                <button
                  onClick={handleCopyLink}
                  className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition ${
                    isCopied
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {isCopied ? (
                    <RefreshCcw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                  {isCopied ? '링크 복사 완료!' : '링크 주소 복사'}
                </button>
              </div>
            </div>

            {/* 닫기 버튼 */}
            <button
              onClick={onClose}
              className="absolute top-8 right-8 p-3 rounded-full bg-white/20 hover:bg-black/10 transition z-20"
            >
              <X className="w-8 h-8 text-gray-500" />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
