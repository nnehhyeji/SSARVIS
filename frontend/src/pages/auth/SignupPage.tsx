import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, UserPlus, ArrowLeft, CheckCircle2 } from 'lucide-react';
import AnimatedBackground from '../../components/AnimatedBackground';
import { PATHS } from '../../routes/paths';

export default function SignupPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    // API 연동은 추후 진행
    console.log('Signup attempt:', { email, password, nickname });
    // 가입 완료 후 튜토리얼로 이동
    navigate(PATHS.TUTORIAL);
  };

  const [waveDurations] = useState<number[]>(() => [...Array(5)].map(() => 1 + Math.random()));

  const checkEmailDuplicate = () => {
    console.log('Checking email duplicate:', email);
    // UI 피드백만 추후 추가
  };

  const checkNicknameDuplicate = () => {
    console.log('Checking nickname duplicate:', nickname);
    // UI 피드백만 추후 추가
  };

  return (
    <div className="relative w-full h-screen overflow-hidden flex items-center justify-center p-4">
      <AnimatedBackground />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg z-10"
      >
        <div className="bg-white/40 backdrop-blur-xl border border-white/40 rounded-[2.5rem] shadow-2xl p-10 flex flex-col items-center">
          {/* Header Section */}
          <div className="w-full flex items-center justify-between mb-8">
            <button
              onClick={() => navigate(PATHS.LOGIN)}
              className="p-3 bg-white/50 rounded-2xl hover:bg-white/80 transition-all text-gray-600 shadow-sm"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="text-right flex items-center gap-3">
              <div className="flex -space-x-2">
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      height: [4, 12, 6, 16, 4],
                    }}
                    transition={{
                      duration: waveDurations[i],
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: i * 0.1,
                    }}
                    className="w-1 bg-purple-500 rounded-full"
                  />
                ))}
              </div>
              <div>
                <h2 className="text-2xl font-black bg-gradient-to-r from-gray-800 to-gray-500 bg-clip-text text-transparent">
                  회원가입
                </h2>
                <p className="text-gray-500 text-sm font-medium">새로운 목소리를 만나보세요</p>
              </div>
              <UserPlus className="w-8 h-8 text-purple-600 ml-2" />
            </div>
          </div>

          {/* Signup Form */}
          <form onSubmit={handleSignup} className="w-full space-y-6">
            {/* Email Field with Duplicate Check */}
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">
                이메일 계정
              </label>
              <div className="flex gap-2">
                <div className="relative group flex-1">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <Mail className="w-5 h-5 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                  </div>
                  <input
                    type="email"
                    placeholder="example@ssarvis.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white/50 border border-white/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400 transition-all placeholder:text-gray-400 font-medium"
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={checkEmailDuplicate}
                  className="px-6 py-4 bg-gray-800 text-white rounded-2xl font-bold shadow-lg hover:bg-gray-700 active:scale-[0.95] transition-all whitespace-nowrap"
                >
                  중복확인
                </button>
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">
                비밀번호
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                </div>
                <input
                  type="password"
                  placeholder="8자 이상의 영문, 숫자 조합"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white/50 border border-white/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400 transition-all placeholder:text-gray-400 font-medium"
                  required
                />
              </div>
            </div>

            {/* Nickname Field with Duplicate Check */}
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">
                닉네임
              </label>
              <div className="flex gap-2">
                <div className="relative group flex-1">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <User className="w-5 h-5 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                  </div>
                  <input
                    type="text"
                    placeholder="활동할 닉네임을 입력하세요"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white/50 border border-white/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400 transition-all placeholder:text-gray-400 font-medium"
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={checkNicknameDuplicate}
                  className="px-6 py-4 bg-gray-800 text-white rounded-2xl font-bold shadow-lg hover:bg-gray-700 active:scale-[0.95] transition-all whitespace-nowrap"
                >
                  중복확인
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-5 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-white rounded-[1.5rem] font-bold shadow-2xl hover:scale-[1.01] active:scale-[0.98] transition-all text-xl mt-4 flex items-center justify-center gap-3"
            >
              <CheckCircle2 className="w-6 h-6" />
              가입하고 시작하기
            </button>
          </form>

          {/* Kakao Info Box */}
          <div className="mt-10 p-4 bg-yellow-400/10 border border-yellow-400/20 rounded-2xl w-full flex items-center gap-4">
            <img
              src="https://developers.kakao.com/assets/img/lib/logos/kakaotalksharing/kakaotalk_sharing_btn_medium.png"
              alt="Kakao"
              className="w-10 h-10"
            />
            <div>
              <p className="text-sm font-bold text-gray-700">카카오톡 간편 통합 가입</p>
              <p className="text-xs text-gray-500">이미 가입된 이메일이라면 자동으로 통합됩니다.</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
