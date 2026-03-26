import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Volume2, UserPlus, Check, ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';

// Components
import CharacterScene from '../../components/features/character/CharacterScene';
import WaveformRing from '../../components/features/character/WaveformRing';

// Hooks
import { useFollow } from '../../hooks/useFollow';
import { PATHS } from '../../routes/paths';

export default function CardPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { allUsers, follows } = useFollow();

  // 사용자 정보 찾기
  const userData = useMemo(() => {
    const id = Number(userId);
    return allUsers.find((u) => u.id === id) || follows.find((f) => f.id === id);
  }, [userId, allUsers, follows]);

  const [isFollowing, setIsFollowing] = useState(userData?.isFollowing ?? false);
  const [isPlaying, setIsPlaying] = useState(false);

  // 음성 재생 시뮬레이션
  const handlePlayVoice = () => {
    setIsPlaying(true);
    setTimeout(() => setIsPlaying(false), 3000);
  };

  if (!userData) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-gray-50">
        <h1 className="text-2xl font-bold text-gray-800">사용자를 찾을 수 없습니다.</h1>
        <button
          onClick={() => navigate(PATHS.HOME)}
          className="mt-4 px-6 py-2 bg-pink-500 text-white rounded-full font-bold shadow-lg"
        >
          메인으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col bg-white">
      {/* 헤더 시뮬레이션 (디자인 일관성) */}
      <header className="relative z-50 flex justify-between items-center px-10 py-6 w-full">
        <div className="text-4xl font-black tracking-tighter text-pink-400 drop-shadow-sm flex items-center gap-2">
          SSARVIS
        </div>
        {/* 우측 아이콘들을 제거하여 명함에만 집중하게 함 */}
      </header>

      {/* 메인 콘텐츠 영역 */}
      <main className="flex-1 flex items-center px-20 relative z-10 h-full">
        {/* 왼쪽 섹션: 사용자 정보 및 소개 */}
        <div className="flex-1 flex flex-col justify-center">
          {/* 한줄 소개 말풍선 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="mb-14 relative inline-flex"
          >
            <div className="bg-white/90 backdrop-blur-2xl p-8 rounded-[40px] shadow-xl border border-white/80 text-gray-800 font-extrabold text-2xl leading-snug pr-24 min-w-[360px] relative group">
              이게 바로 한줄소개다
              <br />
              이녀석아 ㅋ
              <button
                onClick={handlePlayVoice}
                className={`absolute right-8 bottom-8 p-2 rounded-full transition-all ${isPlaying ? 'bg-pink-100 text-pink-500 scale-110' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <Volume2 className={`w-10 h-10 ${isPlaying ? 'animate-pulse' : ''}`} />
              </button>
            </div>
            {/* 말풍선 꼬리 (우측 캐릭터 방향) */}
            <div className="absolute right-[-15px] top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 rotate-45 border-r border-t border-white/80" />
          </motion.div>

          {/* 이름 및 팔로우 정보 */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-baseline gap-4 mb-3">
              <h1 className="text-8xl font-black text-gray-800 tracking-tight">{userData.name}</h1>
              <span className="text-3xl text-gray-400 font-bold tracking-tight">
                @{userData.customId || userData.email.split('@')[0]}
              </span>
            </div>

            <div className="w-[500px] h-[2px] bg-gray-300 opacity-60 mb-8" />

            <div className="flex gap-14 mb-14">
              <div className="flex flex-col gap-1">
                <span className="text-gray-400 text-xl font-bold uppercase tracking-wider">
                  Following
                </span>
                <span className="text-gray-700 text-3xl font-black">123명</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-gray-400 text-xl font-bold uppercase tracking-wider">
                  Followers
                </span>
                <span className="text-gray-700 text-3xl font-black">1,842명</span>
              </div>
            </div>

            {/* 메인 버튼 세트 */}
            <div className="flex gap-6">
              <button
                onClick={() => setIsFollowing(!isFollowing)}
                className={`px-12 py-7 rounded-[32px] text-2xl font-black transition-all flex items-center gap-3 shadow-2xl hover:scale-105 active:scale-95 ${
                  isFollowing
                    ? 'bg-white text-gray-400 border border-gray-100'
                    : 'bg-white text-gray-800 border border-white'
                }`}
              >
                {isFollowing ? (
                  <>
                    <Check className="w-8 h-8 text-green-500" /> 팔로잉 중
                  </>
                ) : (
                  <>
                    <UserPlus className="w-8 h-8 text-pink-400" /> 팔로우 요청
                  </>
                )}
              </button>
              <button
                onClick={() => navigate(PATHS.VISIT(userData.id))}
                className="px-12 py-7 bg-white/90 backdrop-blur-md rounded-[32px] text-2xl font-black text-gray-800 border border-white shadow-2xl hover:scale-105 active:scale-95 transition-all"
              >
                홈 방문
              </button>
            </div>
          </motion.div>
        </div>

        {/* 오른쪽 섹션: 거대 AI 캐릭터 */}
        <div className="relative w-[600px] h-[600px] flex items-center justify-center">
          {/* 외곽 파형 링 */}
          <div className="absolute inset-[-250px] pointer-events-none">
            <WaveformRing isActive={isPlaying} color="#F472B6" size={750} />
          </div>

          {/* 거대 캐릭터 배경 구체 */}
          <motion.div
            animate={{ y: [0, -15, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            className="w-[550px] h-[550px] rounded-full bg-white shadow-[inset_-20px_-20px_80px_rgba(0,0,0,0.05),30px_30px_90px_rgba(0,0,0,0.1)] border-[25px] border-white relative overflow-hidden flex items-center justify-center z-10"
          >
            {/* 3D 캐릭터 씬 - 고해상도로 큼직하게 렌더링 */}
            <div className="w-full h-full scale-[1.3] translate-y-10">
              <CharacterScene
                faceType={userData.faceType || 2}
                mouthOpenRadius={isPlaying ? 0.8 : 0}
                mode="normal"
                isLockMode={false}
                isSpeaking={isPlaying}
                isMicOn={true}
              />
            </div>
          </motion.div>

          {/* 캐릭터 주변 장식용 글로우 */}
          <div className="absolute w-[800px] h-[800px] bg-white opacity-20 blur-[120px] rounded-full pointer-events-none" />
        </div>
      </main>

      {/* 이전 페이지로 돌아가기 (좌하단 플로팅) */}
      <button
        onClick={() => navigate(-1)}
        className="absolute bottom-10 left-10 flex items-center gap-2 text-gray-400 hover:text-gray-800 transition-colors font-bold z-50 text-xl"
      >
        <ChevronLeft className="w-8 h-8" />
        돌아가기
      </button>
    </div>
  );
}
