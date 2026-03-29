import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Check, X } from 'lucide-react';
import { PATHS } from '../../routes/paths';
import userApi from '../../apis/userApi';
import authApi from '../../apis/authApi';
import { useUserStore } from '../../store/useUserStore';
import { useVoiceLockStore } from '../../store/useVoiceLockStore';
export default function SignupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useUserStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [customId, setCustomId] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);

  // OAuth states
  const [registerUUID, setRegisterUUID] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [isOAuthUser, setIsOAuthUser] = useState(false);

  useEffect(() => {
    if (location.state && location.state.isNewUser) {
      const { registerUUID, profileImageUrl, email, nickName } = location.state;
      if (registerUUID) {
        setIsOAuthUser(true);
        setRegisterUUID(registerUUID);
        if (profileImageUrl) setProfileImageUrl(profileImageUrl);
        if (email) {
          setEmail(email);
          setEmailStatus('verified');
        }
        if (nickName) setNickname(nickName);
      }
    }
  }, [location.state]);

  // Status states
  const [emailStatus, setEmailStatus] = useState<'none' | 'sending' | 'sent' | 'verified'>('none');
  const [customIdStatus, setCustomIdStatus] = useState<
    'none' | 'checking' | 'available' | 'duplicate'
  >('none');
  const [checkedCustomId, setCheckedCustomId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const customIdCheckRequestIdRef = useRef(0);

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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedCustomId = customId.trim();

    if (customIdStatus !== 'available' || checkedCustomId !== normalizedCustomId) {
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
      // 1. 전송할 데이터 객체 구성
      const signupData: any = {
        email,
        password,
        nickname,
        customId: normalizedCustomId, // 기존 upstream의 변수명 반영
      };

      // 2. OAuth 사용자일 경우에만 추가 정보 주입
      if (isOAuthUser) {
        signupData.registerUUID = registerUUID;
        signupData.profileImageUrl = profileImageUrl;
      }

      // 3. 통합된 데이터로 API 호출
      const response = await userApi.signup(signupData);

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

  const sendEmailCode = () => {
    if (!email || !email.includes('@')) {
      alert('올바른 이메일 형식을 입력해 주세요.');
      return;
    }
    setEmailStatus('sent');
    setTimeLeft(180);
    setIsTimerActive(true);
    alert('인증 코드 발송을 요청했습니다. 잠시 후 메일함을 확인해 주세요.');

    userApi.sendVerificationCode({ email })
      .then(() => {
        console.log('실제 이메일 발송 완료됨');
      })
      .catch((error: unknown) => {
        setEmailStatus('none');
        setIsTimerActive(false);
        setTimeLeft(0);

        if (axios.isAxiosError(error)) {
          alert(error.response?.data?.message || '인증 코드 발송 중 오류가 발생했습니다.');
        } else {
          alert('인증 코드 발송 중 알 수 없는 오류가 발생했습니다.');
        }
      });
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
    const normalizedCustomId = customId.trim();

    if (!normalizedCustomId || normalizedCustomId.length < 4) {
      alert('아이디는 4자 이상이어야 합니다.');
      return;
    }

    const requestId = ++customIdCheckRequestIdRef.current;

    try {
      setCustomIdStatus('checking');
      const response = await userApi.checkCustomId({ customId: normalizedCustomId });

      if (requestId !== customIdCheckRequestIdRef.current) {
        return;
      }

      if (response.isDuplicate) {
        setCustomIdStatus('duplicate');
        setCheckedCustomId('');
      } else {
        setCustomIdStatus('available');
        setCheckedCustomId(normalizedCustomId);
      }
    } catch {
      if (requestId !== customIdCheckRequestIdRef.current) {
        return;
      }

      setCustomIdStatus('none');
      setCheckedCustomId('');
      alert('아이디 확인 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-6xl bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col md:flex-row min-h-[720px]"
      >
        {/* Left Side Panel */}
        <div className="w-full md:w-[45%] bg-gradient-to-br from-[#F7E0DE] via-[#E6C0BC] to-[#D5A09D] p-12 flex flex-col justify-center relative order-2 md:order-1">
          <div>
            <div className="flex items-center gap-3 mb-20">
              <div className="w-12 h-12 bg-[#11141D] rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white text-2xl font-bold text-base tracking-tighter">sv</span>
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
            onClick={() => navigate(-1)}
            className="absolute top-6 left-8 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ChevronLeft size={24} />
          </button>

          <div className="mb-6 mt-4">
            <h2 className="text-[#11141D] text-3xl font-bold mb-1.5 leading-tight">Get Started</h2>
            <p className="text-gray-400 text-sm">당신을 닮은 AI를 만들어보세요.</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-3">
            {isOAuthUser && (
              <>
                <input type="hidden" name="registerUUID" value={registerUUID} />
                <input type="hidden" name="profileImageUrl" value={profileImageUrl} />
              </>
            )}
            {/* ID Field */}
            <div className="space-y-1 text-left">
              <label className="text-[#11141D] text-[10px] font-bold ml-1 uppercase tracking-wider text-gray-400">
                ID
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="아이디"
                  value={customId}
                  onChange={(e) => {
                    setCustomId(e.target.value);
                    customIdCheckRequestIdRef.current += 1;
                    setCustomIdStatus('none');
                    setCheckedCustomId('');
                  }}
                  className="flex-1 px-4 py-3 border border-gray-100 rounded-2xl bg-gray-50/30 focus:outline-none focus:ring-2 focus:ring-[#D5A09D]/20 focus:border-[#D5A09D] transition-all placeholder:text-gray-300 text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={checkCustomIdDuplicate}
                  disabled={customIdStatus === 'checking'}
                  className="px-5 py-3 bg-white border border-gray-200 text-[#11141D] rounded-2xl font-bold text-[11px] hover:bg-gray-50 transition-all shadow-sm active:scale-[0.98] disabled:opacity-50"
                >
                  {customIdStatus === 'checking' ? '확인 중' : '중복확인'}
                </button>
              </div>
              {customIdStatus === 'available' && (
                <p className="text-[9px] text-green-600 font-bold ml-1 flex items-center gap-1">
                  <Check className="w-3 h-3" /> 사용 가능한 아이디입니다.
                </p>
              )}
              {customIdStatus === 'duplicate' && (

                <p className="text-[9px] text-red-500 font-bold ml-1 flex items-center gap-1">
                  <X className="w-3 h-3" /> 이미 사용중인 아이디입니다.
                </p>
              )}
            </div>

            {/* Email Field */}
            <div className="space-y-1 text-left">
              <label className="text-[#11141D] text-[10px] font-bold ml-1 uppercase tracking-wider text-gray-400">
                Email
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="이메일"
                  value={email}
                  disabled={emailStatus === 'verified' || isOAuthUser}
                  readOnly={isOAuthUser}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailStatus('none');
                  }}
                  className="flex-1 px-4 py-3 border border-gray-100 rounded-2xl bg-gray-50/30 focus:outline-none focus:ring-2 focus:ring-[#D5A09D]/20 focus:border-[#D5A09D] transition-all placeholder:text-gray-300 disabled:opacity-50 text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={sendEmailCode}
                  disabled={emailStatus === 'sending' || emailStatus === 'verified'}
                  className="px-5 py-3 bg-white border border-gray-200 text-[#11141D] rounded-2xl font-bold text-[11px] hover:bg-gray-50 transition-all shadow-sm active:scale-[0.98] disabled:opacity-50"
                >
                  {emailStatus === 'sending'
                    ? '발송 중'
                    : emailStatus === 'verified'
                      ? '인증됨'
                      : '인증요청'}
                </button>
              </div>

              {(emailStatus === 'sent' || emailStatus === 'verified') && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-2 mt-2"
                >
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="인증코드 6자리"
                      value={verificationCode}
                      disabled={emailStatus === 'verified'}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      className="flex-1 px-4 py-3 border border-gray-100 rounded-2xl bg-gray-50/30 focus:outline-none focus:ring-2 focus:ring-[#D5A09D]/20 transition-all text-sm disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={verifyEmailCode}
                      disabled={isVerifying || emailStatus === 'verified'}
                      className="px-5 py-3 bg-[#11141D] text-white rounded-2xl font-bold text-[11px] hover:bg-[#1a1e2b] transition-all shadow-sm active:scale-[0.98] disabled:opacity-50"
                    >
                      {isVerifying ? '확인 중' : '확인'}
                    </button>
                  </div>
                  {emailStatus === 'sent' && (
                    <p
                      className={`text-[9px] font-bold ml-1 ${timeLeft < 30 ? 'text-red-500' : 'text-[#D5A09D]'}`}
                    >
                      {timeLeft > 0
                        ? `남은 시간 ${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}`
                        : '인증 만료'}
                    </p>
                  )}
                </motion.div>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1 text-left">
              <label className="text-[#11141D] text-[10px] font-bold ml-1 uppercase tracking-wider text-gray-400">
                Password
              </label>
              <input
                type="password"
                placeholder="비밀번호 입력 (8~20자)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-4 py-3 border border-gray-100 rounded-2xl bg-gray-50/30 focus:outline-none focus:ring-2 focus:ring-[#D5A09D]/20 focus:border-[#D5A09D] transition-all placeholder:text-gray-300 text-sm ${password && !isPasswordValid ? 'border-red-200' : ''
                  }`}
                required
              />
            </div>

            {/* Nickname Field */}
            <div className="space-y-1 text-left">
              <label className="text-[#11141D] text-[10px] font-bold ml-1 uppercase tracking-wider text-gray-400">
                Nickname
              </label>
              <input
                type="text"
                placeholder="활동할 닉네임"
                value={nickname}
                readOnly={isOAuthUser}
                onChange={(e) => setNickname(e.target.value)}
                className={`w-full px-4 py-3 border border-gray-100 rounded-2xl bg-gray-50/30 focus:outline-none focus:ring-2 focus:ring-[#D5A09D]/20 focus:border-[#D5A09D] transition-all placeholder:text-gray-300 text-sm ${isOAuthUser ? 'opacity-70 cursor-not-allowed text-gray-500' : ''}`}
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-[#11141D] text-white rounded-2xl font-bold hover:bg-[#1a1e2b] transition-all active:scale-[0.99] disabled:opacity-50 shadow-lg mt-2 text-base"
            >
              {isSubmitting ? '처리 중...' : '가입하고 시작하기'}
            </button>
          </form>

          <div className="flex items-center w-full my-4">
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
            카카오 간편 통합 가입
          </button>

          <div className="mt-6 text-center">
            <span className="text-gray-400 text-xs">이미 계정이 있나요? </span>
            <button
              onClick={() => navigate(PATHS.LOGIN)}
              className="text-[#D5A09D] text-xs font-bold hover:underline underline-offset-4"
            >
              로그인
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
