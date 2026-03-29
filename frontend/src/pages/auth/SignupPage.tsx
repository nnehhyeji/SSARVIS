import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Check, X } from 'lucide-react';
import { PATHS } from '../../routes/paths';
import userApi from '../../apis/userApi';
import type { SignupRequest } from '../../apis/userApi';
import authApi from '../../apis/authApi';
import { useUserStore } from '../../store/useUserStore';
import { useVoiceLockStore } from '../../store/useVoiceLockStore';
import { toast } from '../../store/useToastStore';

const TEXT = {
  invalidCustomIdCheck: '아이디 중복 확인을 먼저 완료해주세요.',
  invalidEmailVerification: '이메일 인증을 완료해주세요.',
  invalidPassword: '비밀번호 형식을 다시 확인해주세요.',
  signupSuccess: '회원가입이 완료되었습니다.',
  signupFailed: '회원가입에 실패했습니다.',
  signupError: '회원가입 중 오류가 발생했습니다.',
  invalidEmail: '올바른 이메일 주소를 입력해주세요.',
  duplicateEmail: '이미 사용 중인 이메일입니다.',
  sendCodeTitle: '인증번호를 보냈어요.',
  sendCodeDescription: '3분 안에 이메일에서 인증번호를 확인해주세요.',
  sendCodeFailed: '인증번호 발송에 실패했습니다.',
  sendCodeError: '인증번호 발송 중 오류가 발생했습니다.',
  expiredCode: '인증 시간이 만료되었습니다.',
  resendCode: '인증번호를 다시 요청해주세요.',
  emptyCode: '인증번호를 입력해주세요.',
  verifySuccess: '이메일 인증이 완료되었습니다.',
  verifyFailed: '이메일 인증에 실패했습니다.',
  verifyError: '인증번호 확인 중 오류가 발생했습니다.',
  invalidCustomIdLength: '아이디는 4자 이상 입력해주세요.',
  customIdCheckError: '아이디 중복 확인 중 오류가 발생했습니다.',
  customIdAvailable: '사용 가능한 아이디입니다.',
  customIdDuplicate: '이미 사용 중인 아이디입니다.',
  customIdChecking: '확인 중',
  customIdCheck: '중복 확인',
  socialVerified: '소셜 인증 완료',
  sending: '전송 중',
  verified: '인증 완료',
  sendVerification: '인증 요청',
  codePlaceholder: '이메일 인증번호 6자리',
  verify: '인증',
  timerExpired: '인증 시간 만료',
  timerPrefix: '남은 시간',
  signupLoading: '가입 중...',
  signupButton: '회원가입하고 시작하기',
  leftEyebrow: 'YOUR AI AGENT',
  leftHeadingLine1: '나만의',
  leftHeadingLine2: '특별한 AI를',
  leftHeadingLine3: '만들어 보세요',
  title: '회원가입',
  subtitle: '몇 가지 정보만 입력하면 AI와의 여정이 시작됩니다.',
  emailLabel: 'Email',
  passwordLabel: 'Password',
  idLabel: 'ID',
  nicknameLabel: 'Nickname',
  emailPlaceholder: '이메일',
  passwordPlaceholder: '비밀번호 입력 (8~20자)',
  customIdPlaceholder: '아이디',
  nicknamePlaceholder: '사용할 이름',
  passwordHelper: '영문과 숫자를 포함한 8~20자',
  kakaoSignup: '카카오로 회원가입',
  alreadyHaveAccount: '이미 계정이 있으신가요?',
  login: '로그인',
};

type LocationState = {
  isNewUser?: boolean;
  registerUUID?: string;
  profileImageUrl?: string;
  email?: string;
  nickname?: string;
};

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

  const [registerUUID, setRegisterUUID] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [isOAuthUser, setIsOAuthUser] = useState(false);
  const [isEmailFromOAuth, setIsEmailFromOAuth] = useState(false);
  const [isNicknameFromOAuth, setIsNicknameFromOAuth] = useState(false);

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

  useEffect(() => {
    const state = location.state as LocationState | null;
    if (!state?.isNewUser) return;

    if (state.registerUUID) {
      setIsOAuthUser(true);
      setRegisterUUID(state.registerUUID);
      if (state.profileImageUrl) setProfileImageUrl(state.profileImageUrl);

      if (state.email) {
        setEmail(state.email);
        setEmailStatus('verified');
        setIsEmailFromOAuth(true);
      }

      if (state.nickname) {
        setNickname(state.nickname);
        setIsNicknameFromOAuth(true);
      }
    }
  }, [location.state]);

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

  const handleSignup = async (event: React.FormEvent) => {
    event.preventDefault();

    const normalizedCustomId = customId.trim();

    if (customIdStatus !== 'available' || checkedCustomId !== normalizedCustomId) {
      toast.error(TEXT.invalidCustomIdCheck);
      return;
    }

    if (emailStatus !== 'verified') {
      toast.error(TEXT.invalidEmailVerification);
      return;
    }

    if (!isPasswordValid) {
      toast.error(TEXT.invalidPassword);
      return;
    }

    try {
      setIsSubmitting(true);

      const signupData: SignupRequest = {
        email,
        password,
        nickname,
        customId: normalizedCustomId,
      };

      if (isOAuthUser) {
        signupData.registerUUID = registerUUID;
        signupData.profileImageUrl = profileImageUrl;
      }

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

      toast.success(response.message || TEXT.signupSuccess);
      navigate(PATHS.TUTORIAL);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        toast.error(TEXT.signupFailed, error.response?.data?.message);
      } else {
        toast.error(TEXT.signupError);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const sendEmailCode = async () => {
    if (isEmailFromOAuth) return;

    if (!email || !email.includes('@')) {
      toast.error(TEXT.invalidEmail);
      return;
    }

    try {
      setEmailStatus('sending');

      const duplicateCheck = await userApi.checkEmail({ email });
      if (duplicateCheck.isDuplicate) {
        setEmailStatus('none');
        toast.error(TEXT.duplicateEmail);
        return;
      }

      await userApi.sendVerificationCode({ email });
      setEmailStatus('sent');
      setTimeLeft(180);
      setIsTimerActive(true);
      toast.info(TEXT.sendCodeTitle, TEXT.sendCodeDescription);
    } catch (error: unknown) {
      setEmailStatus('none');
      setIsTimerActive(false);
      setTimeLeft(0);

      if (axios.isAxiosError(error)) {
        toast.error(TEXT.sendCodeFailed, error.response?.data?.message);
      } else {
        toast.error(TEXT.sendCodeError);
      }
    }
  };

  const verifyEmailCode = async () => {
    if (isEmailFromOAuth) return;

    if (timeLeft === 0) {
      toast.error(TEXT.expiredCode, TEXT.resendCode);
      return;
    }

    if (!verificationCode) {
      toast.error(TEXT.emptyCode);
      return;
    }

    try {
      setIsVerifying(true);
      await userApi.verifyEmailCode({ email, code: verificationCode });
      setEmailStatus('verified');
      setIsTimerActive(false);
      toast.success(TEXT.verifySuccess);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        toast.error(TEXT.verifyFailed, error.response?.data?.message);
      } else {
        toast.error(TEXT.verifyError);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const checkCustomIdDuplicate = async () => {
    const normalizedCustomId = customId.trim();

    if (!normalizedCustomId || normalizedCustomId.length < 4) {
      toast.error(TEXT.invalidCustomIdLength);
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
      toast.error(TEXT.customIdCheckError);
    }
  };

  const remainingTime = `${Math.floor(timeLeft / 60)}:${(timeLeft % 60)
    .toString()
    .padStart(2, '0')}`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F0F2F5] p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex min-h-[720px] w-full max-w-6xl flex-col overflow-hidden rounded-[2.5rem] bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] md:flex-row"
      >
        <div className="relative order-2 flex w-full flex-col justify-center bg-gradient-to-br from-[#F7E0DE] via-[#E6C0BC] to-[#D5A09D] p-12 md:order-1 md:w-[45%]">
          <div>
            <div className="mb-20 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#11141D] shadow-lg">
                <div
                  className="h-7 w-7 bg-white"
                  style={{
                    WebkitMaskImage: "url('/logo.svg')",
                    WebkitMaskRepeat: 'no-repeat',
                    WebkitMaskPosition: 'center',
                    WebkitMaskSize: 'contain',
                    maskImage: "url('/logo.svg')",
                    maskRepeat: 'no-repeat',
                    maskPosition: 'center',
                    maskSize: 'contain',
                  }}
                  aria-label="SSARVIS logo"
                />
              </div>
              <span className="text-3xl font-black tracking-tight text-[#11141D]">SSARVIS</span>
            </div>

            <div className="space-y-6">
              <span className="block text-sm font-black uppercase tracking-[0.2em] text-[#11141D]/50">
                {TEXT.leftEyebrow}
              </span>
              <h1 className="break-keep text-5xl font-extrabold leading-[1.2] text-[#11141D]">
                {TEXT.leftHeadingLine1}
                <br />
                {TEXT.leftHeadingLine2}
                <br />
                {TEXT.leftHeadingLine3}
              </h1>
            </div>
          </div>
        </div>

        <div className="relative order-1 flex w-full flex-col self-center p-8 md:order-2 md:w-[55%] md:p-12">
          <button
            onClick={() => navigate(-1)}
            className="absolute left-8 top-6 text-gray-400 transition-colors hover:text-gray-600"
          >
            <ChevronLeft size={24} />
          </button>

          <div className="mb-6 mt-4">
            <h2 className="mb-1.5 text-3xl font-bold leading-tight text-[#11141D]">{TEXT.title}</h2>
            <p className="text-sm text-gray-400">{TEXT.subtitle}</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-3">
            {isOAuthUser && (
              <>
                <input type="hidden" name="registerUUID" value={registerUUID} />
                <input type="hidden" name="profileImageUrl" value={profileImageUrl} />
              </>
            )}

            <div className="space-y-1 text-left">
              <label className="ml-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                {TEXT.emailLabel}
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder={TEXT.emailPlaceholder}
                  value={email}
                  disabled={emailStatus === 'verified' || isEmailFromOAuth}
                  readOnly={isEmailFromOAuth}
                  onChange={(event) => {
                    if (isEmailFromOAuth) return;
                    setEmail(event.target.value);
                    setEmailStatus('none');
                    setVerificationCode('');
                  }}
                  className={`flex-1 rounded-2xl border border-gray-100 bg-gray-50/30 px-4 py-3 text-sm transition-all placeholder:text-gray-300 focus:border-[#D5A09D] focus:outline-none focus:ring-2 focus:ring-[#D5A09D]/20 disabled:opacity-50 ${
                    isEmailFromOAuth ? 'cursor-not-allowed text-gray-500 opacity-70' : ''
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={sendEmailCode}
                  disabled={
                    emailStatus === 'sending' || emailStatus === 'verified' || isEmailFromOAuth
                  }
                  className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-[11px] font-bold text-[#11141D] shadow-sm transition-all hover:bg-gray-50 active:scale-[0.98] disabled:opacity-50"
                >
                  {isEmailFromOAuth
                    ? TEXT.socialVerified
                    : emailStatus === 'sending'
                      ? TEXT.sending
                      : emailStatus === 'verified'
                        ? TEXT.verified
                        : TEXT.sendVerification}
                </button>
              </div>

              {(emailStatus === 'sent' || emailStatus === 'verified' || isEmailFromOAuth) && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-2 space-y-2"
                >
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={isEmailFromOAuth ? TEXT.socialVerified : TEXT.codePlaceholder}
                      value={isEmailFromOAuth ? '' : verificationCode}
                      disabled={emailStatus === 'verified' || isEmailFromOAuth}
                      readOnly={isEmailFromOAuth}
                      onChange={(event) => setVerificationCode(event.target.value)}
                      className="flex-1 rounded-2xl border border-gray-100 bg-gray-50/30 px-4 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#D5A09D]/20 disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={verifyEmailCode}
                      disabled={isVerifying || emailStatus === 'verified' || isEmailFromOAuth}
                      className="rounded-2xl bg-[#11141D] px-5 py-3 text-[11px] font-bold text-white shadow-sm transition-all hover:bg-[#1a1e2b] active:scale-[0.98] disabled:opacity-50"
                    >
                      {isEmailFromOAuth
                        ? TEXT.verified
                        : isVerifying
                          ? TEXT.customIdChecking
                          : TEXT.verify}
                    </button>
                  </div>
                  {emailStatus === 'sent' && (
                    <p
                      className={`ml-1 text-[9px] font-bold ${
                        timeLeft < 30 ? 'text-red-500' : 'text-[#D5A09D]'
                      }`}
                    >
                      {timeLeft > 0 ? `${TEXT.timerPrefix} ${remainingTime}` : TEXT.timerExpired}
                    </p>
                  )}
                </motion.div>
              )}
            </div>

            <div className="space-y-1 text-left">
              <label className="ml-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                {TEXT.passwordLabel}
              </label>
              <input
                type="password"
                placeholder={TEXT.passwordPlaceholder}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={`w-full rounded-2xl border border-gray-100 bg-gray-50/30 px-4 py-3 text-sm transition-all placeholder:text-gray-300 focus:border-[#D5A09D] focus:outline-none focus:ring-2 focus:ring-[#D5A09D]/20 ${
                  password && !isPasswordValid ? 'border-red-200' : ''
                }`}
                required
              />
              {password && !isPasswordValid && (
                <p className="ml-1 text-[9px] font-bold text-red-500">{TEXT.passwordHelper}</p>
              )}
            </div>

            <div className="space-y-1 text-left">
              <label className="ml-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                {TEXT.idLabel}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={TEXT.customIdPlaceholder}
                  value={customId}
                  onChange={(event) => {
                    setCustomId(event.target.value);
                    customIdCheckRequestIdRef.current += 1;
                    setCustomIdStatus('none');
                    setCheckedCustomId('');
                  }}
                  className="flex-1 rounded-2xl border border-gray-100 bg-gray-50/30 px-4 py-3 text-sm transition-all placeholder:text-gray-300 focus:border-[#D5A09D] focus:outline-none focus:ring-2 focus:ring-[#D5A09D]/20"
                  required
                />
                <button
                  type="button"
                  onClick={checkCustomIdDuplicate}
                  disabled={customIdStatus === 'checking'}
                  className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-[11px] font-bold text-[#11141D] shadow-sm transition-all hover:bg-gray-50 active:scale-[0.98] disabled:opacity-50"
                >
                  {customIdStatus === 'checking' ? TEXT.customIdChecking : TEXT.customIdCheck}
                </button>
              </div>
              {customIdStatus === 'available' && (
                <p className="ml-1 flex items-center gap-1 text-[9px] font-bold text-green-600">
                  <Check className="h-3 w-3" /> {TEXT.customIdAvailable}
                </p>
              )}
              {customIdStatus === 'duplicate' && (
                <p className="ml-1 flex items-center gap-1 text-[9px] font-bold text-red-500">
                  <X className="h-3 w-3" /> {TEXT.customIdDuplicate}
                </p>
              )}
            </div>

            <div className="space-y-1 text-left">
              <label className="ml-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                {TEXT.nicknameLabel}
              </label>
              <input
                type="text"
                placeholder={TEXT.nicknamePlaceholder}
                value={nickname}
                readOnly={isNicknameFromOAuth}
                onChange={(event) => {
                  if (isNicknameFromOAuth) return;
                  setNickname(event.target.value);
                }}
                className={`w-full rounded-2xl border border-gray-100 bg-gray-50/30 px-4 py-3 text-sm transition-all placeholder:text-gray-300 focus:border-[#D5A09D] focus:outline-none focus:ring-2 focus:ring-[#D5A09D]/20 ${
                  isNicknameFromOAuth ? 'cursor-not-allowed text-gray-500 opacity-70' : ''
                }`}
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 w-full rounded-2xl bg-[#11141D] py-4 text-base font-bold text-white shadow-lg transition-all hover:bg-[#1a1e2b] active:scale-[0.99] disabled:opacity-50"
            >
              {isSubmitting ? TEXT.signupLoading : TEXT.signupButton}
            </button>
          </form>

          {!isOAuthUser && (
            <>
              <div className="my-4 flex w-full items-center">
                <div className="h-[1px] flex-1 bg-gray-100" />
              </div>

              <button
                type="button"
                onClick={() => {
                  const restApiKey = import.meta.env.VITE_KAKAO_REST_API_KEY || '';
                  const redirectUri = import.meta.env.VITE_KAKAO_OAUTH_REDIRECT_URL || '';
                  const link = `https://kauth.kakao.com/oauth/authorize?client_id=${restApiKey}&redirect_uri=${redirectUri}&response_type=code`;
                  window.location.href = link;
                }}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FEE500] py-3.5 text-sm font-bold text-[#11141D] shadow-sm transition-all hover:bg-[#fada0a] active:scale-[0.99]"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 3c-4.97 0-9 3.037-9 6.784 0 2.455 1.705 4.607 4.29 5.86l-.88 3.256c-.05.184.058.376.24.428.055.016.113.018.17.006l3.83-2.541c.43.06.877.091 1.35.091 4.97 0 9-3.037 9-6.784S16.97 3 12 3z" />
                </svg>
                {TEXT.kakaoSignup}
              </button>
            </>
          )}

          <div className="mt-6 text-center">
            <span className="text-xs text-gray-400">{TEXT.alreadyHaveAccount} </span>
            <button
              onClick={() => navigate(PATHS.LOGIN)}
              className="text-xs font-bold text-[#D5A09D] underline-offset-4 hover:underline"
            >
              {TEXT.login}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
