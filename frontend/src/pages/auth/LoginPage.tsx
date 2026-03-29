import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { ChevronLeft, Check } from 'lucide-react';
import { useUserStore } from '../../store/useUserStore';
import authApi from '../../apis/authApi';
import userApi from '../../apis/userApi';
import { useVoiceLockStore } from '../../store/useVoiceLockStore';
import { PATHS } from '../../routes/paths';
import { toast } from '../../store/useToastStore';

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
      const profile = await userApi.getUserProfile();
      login({
        id: profile.id,
        email: profile.email,
        nickname: profile.nickname,
        customId: profile.customId,
      });

      void useVoiceLockStore.getState().fetchVoiceLockStatus();
      navigate(PATHS.USER_HOME(profile.id));
    } catch (error) {
      console.error('Auto login failed', error);
      localStorage.removeItem('token');
      setIsLoading(false);
    }
  }, [login, navigate]);

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
      const loginResponse = await authApi.login({ email, password });
      const { accessToken } = loginResponse.data;
      localStorage.setItem('token', accessToken);

      if (isRememberId) {
        localStorage.setItem('rememberedId', email);
      } else {
        localStorage.removeItem('rememberedId');
      }

      localStorage.setItem('autoLogin', String(isAutoLogin));
      const profile = await userApi.getUserProfile();

      login({
        id: profile.id,
        email: profile.email,
        nickname: profile.nickname,
        customId: profile.customId,
      });

      await useVoiceLockStore.getState().fetchVoiceLockStatus();
      toast.success('로그인되었어요.', `${profile.nickname}님 환영해요.`);
      navigate(PATHS.USER_HOME(profile.id));
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        toast.error('로그인에 실패했어요.', error.response?.data?.message);
      } else {
        toast.error('로그인 중 알 수 없는 오류가 발생했어요.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && isAutoLogin) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-12 h-12 border-4 border-[#D5A09D] border-t-transparent rounded-full mx-auto"
          />
          <p className="mt-4 text-gray-600 font-medium">자동 로그인 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F2F5] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-6xl bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col md:flex-row min-h-[640px]"
      >
        {/* Left Side Panel */}
        <div className="w-full md:w-[45%] bg-gradient-to-br from-[#F7E0DE] via-[#E6C0BC] to-[#D5A09D] p-12 flex flex-col justify-center relative order-2 md:order-1">
          <div>
            <div className="flex items-center gap-3 mb-20">
              <div className="w-12 h-12 bg-[#11141D] rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-base tracking-tighter">sv</span>
              </div>
              <span className="text-[#11141D] font-black text-3xl tracking-tight">SSARVIS</span>
            </div>

            <div className="space-y-6">
              <span className="text-[#11141D]/50 text-sm font-black tracking-[0.2em] block uppercase">
                YOUR AI ARCHIVE
              </span>
              <h1 className="text-[#11141D] text-5xl font-extrabold leading-[1.2] break-keep">
                나를 닮은
                <br />
                나만의 AI가
                <br />
                시작되는 곳
              </h1>
            </div>
          </div>
        </div>

        {/* Right Side Form */}
        <div className="w-full md:w-[55%] p-8 md:p-12 flex flex-col relative order-1 md:order-2 self-center">
          <button
            onClick={() => navigate(PATHS.HOME)}
            className="absolute top-6 left-8 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ChevronLeft size={24} />
          </button>

          <div className="mb-6 m-4">
            <h2 className="text-[#11141D] text-3xl font-bold mb-1.5 leading-tight">Welcome back</h2>
            <p className="text-gray-400 text-sm font-medium">
              정보를 입력하여 로그인을 진행해주세요.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5 text-left">
              <label className="text-[#11141D] text-[10px] font-bold ml-1 uppercase tracking-wider text-gray-400">
                Email
              </label>
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-100 rounded-2xl bg-gray-50/30 focus:outline-none focus:ring-2 focus:ring-[#D5A09D]/20 focus:border-[#D5A09D] transition-all placeholder:text-gray-300 text-sm font-medium"
                required
              />
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-[#11141D] text-[10px] font-bold ml-1 uppercase tracking-wider text-gray-400">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-100 rounded-2xl bg-gray-50/30 focus:outline-none focus:ring-2 focus:ring-[#D5A09D]/20 focus:border-[#D5A09D] transition-all placeholder:text-gray-300 text-sm font-medium"
                required
              />
            </div>

            {/* Remember ID & Auto Login */}
            <div className="flex items-center gap-6 px-1 py-1">
              {/* 아이디 기억 */}
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={isRememberId}
                    onChange={(e) => setIsRememberId(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="w-5 h-5 border-2 border-gray-100 rounded-md peer-checked:bg-[#D5A09D] peer-checked:border-[#D5A09D] transition-all flex items-center justify-center">
                    <Check className={`w-3 h-3 text-white transition-opacity ${isRememberId ? 'opacity-100' : 'opacity-0'}`} />
                  </div>
                </div>
                {/* 수정된 부분: isRememberId 상태에 따라 text 색상을 다르게 줍니다. */}
                <span className={`text-xs font-bold transition-colors group-hover:text-gray-500 ${isRememberId ? 'text-gray-500' : 'text-gray-300'}`}>
                  아이디 기억
                </span>
              </label>

              {/* 자동 로그인 */}
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={isAutoLogin}
                    onChange={(e) => setIsAutoLogin(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="w-5 h-5 border-2 border-gray-100 rounded-md peer-checked:bg-[#D5A09D] peer-checked:border-[#D5A09D] transition-all flex items-center justify-center">
                    <Check className={`w-3 h-3 text-white transition-opacity ${isAutoLogin ? 'opacity-100' : 'opacity-0'}`} />
                  </div>
                </div>
                {/* 수정된 부분: isAutoLogin 상태에 따라 text 색상을 다르게 줍니다. */}
                <span className={`text-xs font-bold transition-colors group-hover:text-gray-500 ${isAutoLogin ? 'text-gray-500' : 'text-gray-300'}`}>
                  자동 로그인
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-[#11141D] text-white rounded-2xl font-bold hover:bg-[#1a1e2b] transition-all active:scale-[0.99] disabled:opacity-50 shadow-lg text-base"
            >
              로그인
            </button>
          </form>

          <div className="flex items-center w-full my-6">
            <div className="flex-1 h-[1px] bg-gray-100"></div>
          </div>

          <button
            type="button"
            onClick={() => {
              const REST_API_KEY = import.meta.env.VITE_KAKAO_REST_API_KEY || ''; // .env 파일에 VITE_KAKAO_REST_API_KEY 추가 필요
              const REDIRECT_URI = import.meta.env.VITE_KAKAO_OAUTH_REDIRECT_URL || ''; 
              const link = `https://kauth.kakao.com/oauth/authorize?client_id=${REST_API_KEY}&redirect_uri=${REDIRECT_URI}&response_type=code`;
              window.location.href = link;
            }}
            className="w-full py-3.5 bg-[#FEE500] text-[#11141D] rounded-2xl font-bold hover:bg-[#fada0a] transition-all active:scale-[0.99] flex items-center justify-center gap-2 shadow-sm text-sm"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3c-4.97 0-9 3.037-9 6.784 0 2.455 1.705 4.607 4.29 5.86l-.88 3.256c-.05.184.058.376.24.428.055.016.113.018.17.006l3.83-2.541c.43.06.877.091 1.35.091 4.97 0 9-3.037 9-6.784S16.97 3 12 3z" />
            </svg>
            카카오 간편 로그인
          </button>

          <div className="mt-8 text-center">
            <span className="text-gray-400 text-xs">계정이 없으신가요? </span>
            <button
              onClick={() => navigate(PATHS.SIGNUP)}
              className="text-[#D5A09D] text-xs font-bold hover:underline underline-offset-4"
            >
              회원가입
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
