import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { User, Lock, LogIn, Check } from 'lucide-react';
import AnimatedBackground from '../../components/AnimatedBackground';
import { useUserStore } from '../../store/useUserStore';
import authApi from '../../apis/authApi';
import userApi from '../../apis/userApi';
import { useVoiceLockStore } from '../../store/useVoiceLockStore';
import { PATHS } from '../../routes/paths';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useUserStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRememberId, setIsRememberId] = useState(false);
  const [isAutoLogin, setIsAutoLogin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const performAutoLogin = useCallback(async () => {
    try {
      setIsLoading(true);
      // 토큰이 유효한지 프로필 조회를 통해 확인
      const profile = await userApi.getUserProfile();
      login({
        id: profile.id,
        email: profile.email,
        nickname: profile.nickname,
        customId: profile.customId,
      });
      navigate(PATHS.HOME);
    } catch (error) {
      console.error('Auto login failed', error);
      // 토큰 만료 등의 경우 세션 정리
      localStorage.removeItem('token');
      setIsLoading(false);
    }
  }, [login, navigate]);

  // 초기화: 아이디 기억하기 & 자동 로그인 체크
  useEffect(() => {
    const savedId = localStorage.getItem('rememberedId');
    const autoLoginEnabled = localStorage.getItem('autoLogin') === 'true';
    const token = localStorage.getItem('token');

    if (savedId) {
      setEmail(savedId);
      setIsRememberId(true);
    }

    if (autoLoginEnabled && token) {
      setIsAutoLogin(true);
      performAutoLogin();
    }
  }, [performAutoLogin]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      // 1. 로그인 요청
      const loginResponse = await authApi.login({ email, password });

      // 2. 토큰 및 설정 저장
      const { accessToken, timeout } = loginResponse.data;
      localStorage.setItem('token', accessToken);

      // 아이디 기억하기 처리
      if (isRememberId) {
        localStorage.setItem('rememberedId', email);
      } else {
        localStorage.removeItem('rememberedId');
      }

      // 자동 로그인 처리
      localStorage.setItem('autoLogin', String(isAutoLogin));

      if (timeout) {
        useVoiceLockStore.getState().setTimeoutDuration(timeout);
      }

      // 3. 유저 정보 조회
      const profile = await userApi.getUserProfile();

      // 4. Store 업데이트
      login({
        id: profile.id,
        email: profile.email,
        nickname: profile.nickname,
        customId: profile.customId,
      });

      navigate(PATHS.HOME);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        alert(error.response?.data?.message || '로그인 중 오류가 발생했습니다.');
      } else {
        alert('로그인 중 알 수 없는 오류가 발생했습니다.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && isAutoLogin) {
    return (
      <div className="relative w-full h-screen overflow-hidden flex items-center justify-center p-4">
        <AnimatedBackground />
        <div className="z-10 text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto"
          />
          <p className="mt-4 text-white font-bold text-lg drop-shadow-md">자동 로그인 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden flex items-center justify-center p-4">
      <AnimatedBackground />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md z-10"
      >
        <div className="bg-white/40 backdrop-blur-xl border border-white/40 rounded-[2.5rem] shadow-2xl p-10 flex flex-col items-center">
          {/* Logo Section */}
          <div className="mb-10 text-center">
            <motion.div
              animate={{
                scale: [1, 1.05, 1],
                rotate: [0, 2, -2, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="w-20 h-20 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 rounded-3xl flex items-center justify-center mb-4 shadow-lg mx-auto"
            >
              <LogIn className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-gray-800 to-gray-500 bg-clip-text text-transparent tracking-tight">
              SSARVIS
            </h1>
            <p className="text-gray-500 mt-2 font-medium">나만의 똑똑한 AI 목소리 친구</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="w-full space-y-4">
            <div className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <User className="w-5 h-5 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
              </div>
              <input
                type="text"
                placeholder="아이디"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white/50 border border-white/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400 transition-all placeholder:text-gray-400 font-medium"
                required
              />
            </div>

            <div className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Lock className="w-5 h-5 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
              </div>
              <input
                type="password"
                placeholder="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white/50 border border-white/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400 transition-all placeholder:text-gray-400 font-medium"
                required
              />
            </div>

            {/* Remember ID & Auto Login Checkboxes */}
            <div className="flex items-center justify-between px-2 py-1">
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={isRememberId}
                      onChange={(e) => setIsRememberId(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="w-5 h-5 bg-white/50 border-2 border-white/60 rounded-md peer-checked:bg-purple-500 peer-checked:border-purple-500 transition-all flex items-center justify-center">
                      <Check className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <span className="text-xs font-bold text-gray-500 group-hover:text-gray-700 transition-colors">
                    아이디 기억
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={isAutoLogin}
                      onChange={(e) => setIsAutoLogin(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="w-5 h-5 bg-white/50 border-2 border-white/60 rounded-md peer-checked:bg-purple-500 peer-checked:border-purple-500 transition-all flex items-center justify-center">
                      <Check className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <span className="text-xs font-bold text-gray-500 group-hover:text-gray-700 transition-colors">
                    자동 로그인
                  </span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-gray-800 text-white rounded-2xl font-bold shadow-xl hover:bg-gray-700 active:scale-[0.98] transition-all transform disabled:opacity-50"
            >
              로그인하기
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center w-full my-8">
            <div className="flex-1 h-[1px] bg-gray-300/50 shadow-sm"></div>
            <span className="px-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
              OR
            </span>
            <div className="flex-1 h-[1px] bg-gray-300/50 shadow-sm"></div>
          </div>

          {/* Social Login */}
          <button
            type="button"
            className="w-full py-4 bg-[#FEE500] text-black rounded-2xl font-bold shadow-lg hover:bg-[#FDD835] active:scale-[0.98] transition-all flex items-center justify-center gap-3 cursor-default"
          >
            <div className="w-6 h-6 bg-yellow-900 rounded-md flex items-center justify-center text-[10px] text-white font-black">
              K
            </div>
            카카오톡으로 시작하기
          </button>

          {/* Signup Link */}
          <div className="mt-8 text-center">
            <p className="text-gray-500 text-xs font-medium mb-2">SSARVIS가 처음이신가요?</p>
            <button
              onClick={() => navigate(PATHS.SIGNUP)}
              className="text-purple-600 text-sm font-bold hover:underline decoration-2 underline-offset-4"
            >
              간편 회원가입하기
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
