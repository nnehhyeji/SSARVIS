import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { QrCode, Share2, Copy, Volume2, Home, UserPlus, ChevronLeft } from 'lucide-react';
import { useState, useMemo } from 'react';
import AnimatedBackground from '../../components/AnimatedBackground';
import { useFollow } from '../../hooks/useFollow';

import { PATHS } from '../../routes/paths';

export default function CardPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { allUsers, follows } = useFollow();
  const [isCopied, setIsCopied] = useState(false);

  // URL 파라미터로 받은 ID로 사용자 정보 찾기
  const userData = useMemo(() => {
    const id = Number(userId);
    return allUsers.find((u) => u.id === id) || follows.find((f) => f.id === id);
  }, [userId, allUsers, follows]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (!userData) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-gray-50">
        <h1 className="text-2xl font-bold text-gray-800">사용자를 찾을 수 없습니다.</h1>
        <button
          onClick={() => navigate(PATHS.HOME)}
          className="mt-4 px-6 py-2 bg-pink-500 text-white rounded-full font-bold"
        >
          메인으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden flex items-center justify-center p-6 text-gray-800">
      <AnimatedBackground baseTop="#FFE4E6" baseBottom="#FFFFFF" pink="#ECFCCB" />

      {/* 뒤로가기 버튼 */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-8 left-8 p-3 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-md transition-all z-50 group border border-white/50"
      >
        <ChevronLeft className="w-8 h-8 text-gray-700 group-hover:-translate-x-1 transition-transform" />
      </button>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="relative w-full max-w-5xl h-[700px] bg-white/40 backdrop-blur-3xl rounded-[50px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-white/50 overflow-hidden flex flex-col md:flex-row"
      >
        {/* 왼쪽 섹션: 프로필 & 정보 */}
        <div className="flex-1 flex flex-col p-12 md:p-20 justify-center relative z-10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-12 relative flex"
          >
            <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[32px] shadow-sm border border-white/60 text-gray-800 font-bold text-xl leading-relaxed pr-20 relative">
              안녕! {userData.name}의 멋진 AI를
              <br />
              만나러 온 걸 환영해! ✨
              <Volume2 className="absolute right-6 bottom-6 w-8 h-8 text-pink-300 cursor-pointer hover:text-pink-500 transition-colors" />
            </div>
            <div className="absolute bottom-[-12px] left-16 w-10 h-10 bg-white/80 backdrop-blur-xl rotate-45 border-r border-b border-white/60" />
          </motion.div>

          <div className="mb-10">
            <div className="flex items-baseline gap-4 mb-6">
              <h1 className="text-7xl font-black text-gray-800 tracking-tight">{userData.name}</h1>
              <span className="text-3xl text-gray-400 font-medium">
                {userData.email.split('@')[0]}
              </span>
            </div>
            <div className="w-32 h-2 bg-gradient-to-r from-pink-400 to-rose-300 rounded-full mb-8" />

            <div className="flex gap-10 text-2xl font-bold text-gray-500">
              <div className="flex gap-3 items-center">
                <span className="text-gray-400 font-medium tracking-tight">팔로잉</span>
                <span className="text-gray-800">128</span>
              </div>
              <div className="flex gap-3 items-center">
                <span className="text-gray-400 font-medium tracking-tight">팔로워</span>
                <span className="text-gray-800">2.1k</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mt-8">
            <button
              onClick={() => navigate(PATHS.VISIT(userData.id))}
              className="px-10 py-5 bg-gray-800 text-white rounded-3xl shadow-2xl shadow-gray-800/20 text-xl font-black hover:bg-gray-900 transition-all hover:scale-105 active:scale-95 flex items-center gap-3"
            >
              <Home className="w-6 h-6" />홈 방문하기
            </button>
            <button className="px-10 py-5 bg-white rounded-3xl shadow-xl border border-gray-100 text-xl font-black text-gray-700 hover:bg-gray-50 transition-all hover:scale-105 active:scale-95 flex items-center gap-3">
              <UserPlus className="w-6 h-6 text-pink-500" />
              팔로우 하기
            </button>
          </div>
        </div>

        {/* 오른쪽 섹션: QR & 비주얼 */}
        <div className="w-full md:w-[400px] bg-white/30 backdrop-blur-md border-l border-white/30 p-12 flex flex-col items-center justify-center gap-8 relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-10 pointer-events-none">
            <div className="w-full h-full rounded-full border-[60px] border-pink-200 blur-3xl animate-pulse" />
          </div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="w-full aspect-square bg-white/90 backdrop-blur-2xl rounded-[40px] p-10 flex flex-col items-center justify-center gap-6 shadow-2xl border border-white relative z-10"
          >
            <QrCode className="w-full h-full text-gray-800" />
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">
              AI Identity QR
            </div>
          </motion.div>

          <div className="w-full flex flex-col gap-3 relative z-10">
            <button className="w-full py-5 bg-pink-500 text-white rounded-[24px] font-black shadow-lg shadow-pink-500/30 flex items-center justify-center gap-3 hover:bg-pink-600 transition-all">
              <Share2 className="w-6 h-6" />
              이미지 저장
            </button>
            <button
              onClick={handleCopyLink}
              className={`w-full py-5 rounded-[24px] font-black shadow-sm flex items-center justify-center gap-3 transition-all ${
                isCopied ? 'bg-green-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Copy className="w-6 h-6" />
              {isCopied ? '복사 완료!' : '링크 복사하기'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
