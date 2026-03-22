import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Mail,
  Lock,
  User,
  UserPlus,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Check,
} from 'lucide-react';
import AnimatedBackground from '../../components/AnimatedBackground';
import { PATHS } from '../../routes/paths';
import userApi from '../../apis/userApi';
import authApi from '../../apis/authApi';
import { useUserStore } from '../../store/useUserStore';
import { useVoiceLockStore } from '../../store/useVoiceLockStore';

export default function SignupPage() {
  const navigate = useNavigate();
  const { login } = useUserStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');

  // Status states
  const [emailStatus, setEmailStatus] = useState<'none' | 'checking' | 'available' | 'duplicate'>(
    'none',
  );
  const [nicknameStatus, setNicknameStatus] = useState<
    'none' | 'checking' | 'available' | 'duplicate'
  >('none');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (emailStatus !== 'available') {
      alert('이메일 중복 확인을 해주세요.');
      return;
    }
    if (nicknameStatus !== 'available') {
      alert('닉네임 중복 확인을 해주세요.');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await userApi.signup({ email, password, nickname });

      // 회원가입 직후 자동 로그인 수행
      const loginResponse = await authApi.login({ email, password });
      
      const { accessToken, timeout } = loginResponse.data;
      localStorage.setItem('token', accessToken);

      if (timeout) {
        useVoiceLockStore.getState().setTimeoutDuration(timeout);
      }

      const profile = await userApi.getUserProfile();
      login({
        id: profile.userId,
        email: profile.email,
        nickname: profile.nickname,
      });

      alert(response.message || '회원가입이 완료되었습니다!');
      navigate(PATHS.TUTORIAL);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        alert(error.response?.data?.message || '회원가입 중 오류가 발생했습니다.');
      } else {
        alert('회원가입 중 알 수 없는 오류가 발생했습니다.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const [waveDurations] = useState<number[]>(() => [...Array(5)].map(() => 1 + Math.random()));

  const checkEmailDuplicate = async () => {
    if (!email || !email.includes('@')) {
      alert('올바른 이메일 형식을 입력해 주세요.');
      return;
    }

    try {
      setEmailStatus('checking');
      const response = await userApi.checkEmail({ email });
      if (response.isDuplicate) {
        setEmailStatus('duplicate');
      } else {
        setEmailStatus('available');
      }
    } catch {
      setEmailStatus('none');
      alert('이메일 확인 중 오류가 발생했습니다.');
    }
  };

  const checkNicknameDuplicate = async () => {
    if (!nickname || nickname.length < 2) {
      alert('닉네임은 2자 이상이어야 합니다.');
      return;
    }

    try {
      setNicknameStatus('checking');
      const response = await userApi.checkNickname({ nickname });
      if (response.isDuplicate) {
        setNicknameStatus('duplicate');
      } else {
        setNicknameStatus('available');
      }
    } catch {
      setNicknameStatus('none');
      alert('닉네임 확인 중 오류가 발생했습니다.');
    }
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
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailStatus('none');
                    }}
                    className="w-full pl-12 pr-4 py-4 bg-white/50 border border-white/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400 transition-all placeholder:text-gray-400 font-medium"
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={checkEmailDuplicate}
                  disabled={emailStatus === 'checking'}
                  className="px-6 py-4 bg-gray-800 text-white rounded-2xl font-bold shadow-lg hover:bg-gray-700 active:scale-[0.95] transition-all whitespace-nowrap disabled:opacity-50"
                >
                  {emailStatus === 'checking' ? '확인 중...' : '중복확인'}
                </button>
              </div>
              {emailStatus === 'available' && (
                <p className="text-xs text-green-600 font-bold ml-2 flex items-center gap-1">
                  <Check className="w-3 h-3" /> 사용 가능한 이메일입니다.
                </p>
              )}
              {emailStatus === 'duplicate' && (
                <p className="text-xs text-red-500 font-bold ml-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> 이미 사용 중인 이메일입니다.
                </p>
              )}
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
                  placeholder="8자 이상, 영문, 숫자, 특수문자 포함"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white/50 border border-white/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400 transition-all placeholder:text-gray-400 font-medium"
                  required
                />
              </div>
              <p className="text-[10px] text-gray-400 font-medium ml-2">
                * 영문, 숫자, 특수문자(@$!%*#?&)를 각각 하나 이상 포함해야 합니다.
              </p>
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
                    onChange={(e) => {
                      setNickname(e.target.value);
                      setNicknameStatus('none');
                    }}
                    className="w-full pl-12 pr-4 py-4 bg-white/50 border border-white/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400 transition-all placeholder:text-gray-400 font-medium"
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={checkNicknameDuplicate}
                  disabled={nicknameStatus === 'checking'}
                  className="px-6 py-4 bg-gray-800 text-white rounded-2xl font-bold shadow-lg hover:bg-gray-700 active:scale-[0.95] transition-all whitespace-nowrap disabled:opacity-50"
                >
                  {nicknameStatus === 'checking' ? '확인 중...' : '중복확인'}
                </button>
              </div>
              {nicknameStatus === 'available' && (
                <p className="text-xs text-green-600 font-bold ml-2 flex items-center gap-1">
                  <Check className="w-3 h-3" /> 사용 가능한 닉네임입니다.
                </p>
              )}
              {nicknameStatus === 'duplicate' && (
                <p className="text-xs text-red-500 font-bold ml-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> 이미 사용 중인 닉네임입니다.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-5 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-white rounded-[1.5rem] font-bold shadow-2xl hover:scale-[1.01] active:scale-[0.98] transition-all text-xl mt-4 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isSubmitting ? (
                '처리 중...'
              ) : (
                <>
                  <CheckCircle2 className="w-6 h-6" />
                  가입하고 시작하기
                </>
              )}
            </button>
          </form>

          {/* Kakao Info Box */}
          <div className="mt-10 p-4 bg-yellow-400/10 border border-yellow-400/20 rounded-2xl w-full flex items-center gap-4">
            <div className="w-10 h-10 bg-[#FEE500] rounded-xl flex items-center justify-center font-black text-xs text-yellow-900 border border-yellow-400/30">
              TALK
            </div>
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
