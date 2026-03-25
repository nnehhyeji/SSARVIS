import { useState, useEffect } from 'react';
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
  const [customId, setCustomId] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);

  // Status states
  const [emailStatus, setEmailStatus] = useState<'none' | 'sending' | 'sent' | 'verified'>('none');
  const [customIdStatus, setCustomIdStatus] = useState<
    'none' | 'checking' | 'available' | 'duplicate'
  >('none');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d$@$!%*#?&]{8,20}$/;
  const isPasswordValid = passwordRegex.test(password);

  // Timer logic
  useEffect(() => {
    let timer: number | undefined;
    if (isTimerActive && timeLeft > 0) {
      timer = window.setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsTimerActive(false);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isTimerActive, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (customIdStatus !== 'available') {
      alert('아이디 중복 확인을 해주세요.');
      return;
    }
    if (emailStatus !== 'verified') {
      alert('이메일 인증을 완료해주세요.');
      return;
    }
    if (!isPasswordValid) {
      alert('비밀번호 형식을 확인해주세요.');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await userApi.signup({ email, password, nickname, customId });

      // 회원가입 직후 자동 로그인 수행
      const loginResponse = await authApi.login({ email, password });

      const { accessToken, timeout } = loginResponse.data;
      localStorage.setItem('token', accessToken);

      if (timeout) {
        useVoiceLockStore.getState().setTimeoutDuration(timeout);
      }

      const profile = await userApi.getUserProfile();
      login({
        id: profile.id,
        email: profile.email,
        nickname: profile.nickname,
        customId: profile.customId,
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

  const sendEmailCode = async () => {
    if (!email || !email.includes('@')) {
      alert('올바른 이메일 형식을 입력해 주세요.');
      return;
    }
    try {
      setEmailStatus('sending');
      await userApi.sendVerificationCode({ email });
      setEmailStatus('sent');
      setTimeLeft(180); // 3분 설정
      setIsTimerActive(true);
      alert('인증 코드가 발송되었습니다.');
    } catch (error: unknown) {
      setEmailStatus('none');
      if (axios.isAxiosError(error)) {
        alert(error.response?.data?.message || '인증 코드 발송 중 오류가 발생했습니다.');
      } else {
        alert('인증 코드 발송 중 알 수 없는 오류가 발생했습니다.');
      }
    }
  };

  const verifyEmailCode = async () => {
    if (timeLeft === 0) {
      alert('인증 시간이 만료되었습니다. 다시 요청해 주세요.');
      return;
    }
    if (!verificationCode) {
      alert('인증 코드를 입력해 주세요.');
      return;
    }
    try {
      setIsVerifying(true);
      await userApi.verifyEmailCode({ email, code: verificationCode });
      setEmailStatus('verified');
      setIsTimerActive(false);
      alert('이메일 인증에 성공했습니다.');
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        alert(error.response?.data?.message || '인증 번호가 일치하지 않습니다.');
      } else {
        alert('인증 번호 확인 중 오류가 발생했습니다.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const checkCustomIdDuplicate = async () => {
    if (!customId || customId.length < 4) {
      alert('아이디는 4자 이상이어야 합니다.');
      return;
    }
    try {
      setCustomIdStatus('checking');
      const response = await userApi.checkCustomId({ customId });
      if (response.isDuplicate) {
        setCustomIdStatus('duplicate');
      } else {
        setCustomIdStatus('available');
      }
    } catch {
      setCustomIdStatus('none');
      alert('아이디 확인 중 오류가 발생했습니다.');
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
        <div className="bg-white/40 backdrop-blur-xl border border-white/40 rounded-[2.5rem] shadow-2xl p-10 flex flex-col items-center max-h-[90vh] overflow-y-auto">
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
          <form onSubmit={handleSignup} className="w-full space-y-4">
            {/* CustomId (ID) Field */}
            <div className="space-y-1">
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">
                아이디
              </label>
              <div className="flex gap-2">
                <div className="relative group flex-1">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <User className="w-5 h-5 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                  </div>
                  <input
                    type="text"
                    placeholder="로그인에 사용할 아이디"
                    value={customId}
                    onChange={(e) => {
                      setCustomId(e.target.value);
                      setCustomIdStatus('none');
                    }}
                    className="w-full pl-12 pr-4 py-3 bg-white/50 border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400 transition-all font-medium"
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={checkCustomIdDuplicate}
                  disabled={customIdStatus === 'checking'}
                  className="px-4 py-3 bg-gray-800 text-white rounded-xl font-bold shadow-lg hover:bg-gray-700 active:scale-[0.95] transition-all whitespace-nowrap disabled:opacity-50 text-sm"
                >
                  {customIdStatus === 'checking' ? '확인 중' : '중복확인'}
                </button>
              </div>
              {customIdStatus === 'available' && (
                <p className="text-[10px] text-green-600 font-bold ml-2 flex items-center gap-1">
                  <Check className="w-3 h-3" /> 사용 가능한 아이디입니다.
                </p>
              )}
              {customIdStatus === 'duplicate' && (
                <p className="text-[10px] text-red-500 font-bold ml-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> 이미 사용 중인 아이디입니다.
                </p>
              )}
            </div>

            {/* Email Field with Verification */}
            <div className="space-y-1">
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">
                이메일
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
                    disabled={emailStatus === 'verified'}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailStatus('none');
                    }}
                    className="w-full pl-12 pr-4 py-3 bg-white/50 border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400 transition-all font-medium disabled:opacity-50"
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={sendEmailCode}
                  disabled={emailStatus === 'sending' || emailStatus === 'verified'}
                  className="px-4 py-3 bg-gray-800 text-white rounded-xl font-bold shadow-lg hover:bg-gray-700 active:scale-[0.95] transition-all whitespace-nowrap disabled:opacity-50 text-sm"
                >
                  {emailStatus === 'sending'
                    ? '발송 중'
                    : emailStatus === 'verified'
                      ? '인증됨'
                      : '인증요청'}
                </button>
              </div>

              {(emailStatus === 'sent' || emailStatus === 'verified') && (
                <div className="space-y-2 mt-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="인증코드 6자리"
                      value={verificationCode}
                      disabled={emailStatus === 'verified'}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      className="flex-1 px-4 py-3 bg-white/50 border border-white/60 rounded-xl focus:outline-none transition-all font-medium disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={verifyEmailCode}
                      disabled={isVerifying || emailStatus === 'verified'}
                      className="px-4 py-3 bg-purple-600 text-white rounded-xl font-bold shadow-lg hover:bg-purple-700 active:scale-[0.95] transition-all text-sm disabled:opacity-50"
                    >
                      {isVerifying ? '확인 중' : '확인'}
                    </button>
                  </div>
                  {emailStatus === 'sent' && (
                    <div className="flex items-center justify-between px-2">
                      <p
                        className={`text-[10px] font-bold ${timeLeft < 30 ? 'text-red-500' : 'text-purple-600'}`}
                      >
                        {timeLeft > 0
                          ? `남은 시간 ${formatTime(timeLeft)}`
                          : '인증 시간이 만료되었습니다.'}
                      </p>
                      {timeLeft === 0 && (
                        <button
                          type="button"
                          onClick={sendEmailCode}
                          className="text-[10px] text-gray-500 font-bold hover:text-purple-600 underline"
                        >
                          코드 재발송
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">
                비밀번호
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                </div>
                <input
                  type="password"
                  placeholder="8~20자, 영문, 숫자 포함"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full pl-12 pr-4 py-3 bg-white/50 border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400 transition-all font-medium ${
                    password && !isPasswordValid ? 'border-red-400' : ''
                  }`}
                  required
                />
              </div>
              {password && (
                <p
                  className={`text-[10px] font-medium ml-2 ${isPasswordValid ? 'text-green-600' : 'text-red-500'}`}
                >
                  {isPasswordValid
                    ? '사용 가능한 비밀번호입니다.'
                    : '* 영문, 숫자를 포함하여 8~20자로 입력해주세요.'}
                </p>
              )}
            </div>

            {/* Nickname Field */}
            <div className="space-y-1">
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">
                닉네임
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <User className="w-5 h-5 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                </div>
                <input
                  type="text"
                  placeholder="활동할 닉네임"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/50 border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400 transition-all font-medium"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-white rounded-xl font-bold shadow-2xl hover:scale-[1.01] active:scale-[0.98] transition-all text-lg mt-4 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isSubmitting ? (
                '처리 중...'
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  가입하고 시작하기
                </>
              )}
            </button>
          </form>

          {/* Kakao Info Box */}
          <div className="mt-6 p-3 bg-yellow-400/10 border border-yellow-400/20 rounded-xl w-full flex items-center gap-3">
            <div className="w-8 h-8 bg-[#FEE500] rounded-lg flex items-center justify-center font-black text-[10px] text-yellow-900 border border-yellow-400/30">
              TALK
            </div>
            <div>
              <p className="text-xs font-bold text-gray-700">카카오톡 간편 통합 가입</p>
              <p className="text-[10px] text-gray-500">
                이미 가입된 이메일이라면 자동으로 통합됩니다.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
