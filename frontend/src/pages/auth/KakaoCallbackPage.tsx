import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import authApi from '../../apis/authApi';
import { useUserStore } from '../../store/useUserStore';
import userApi from '../../apis/userApi';
import { PATHS } from '../../routes/paths';

export default function KakaoCallbackPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useUserStore();
  const hasCalledAPI = useRef(false);

  useEffect(() => {
    const processKakaoCallback = async () => {
      // Strict 모드 이중 호출 방지
      if (hasCalledAPI.current) return;
      hasCalledAPI.current = true;

      const params = new URLSearchParams(location.search);
      const code = params.get('code');

      if (!code) {
        alert('카카오 인증 코드가 없습니다.');
        navigate(PATHS.LOGIN);
        return;
      }

      try {
        // 프론트엔드에서 코드를 받아 백엔드 API로 전달하여 인증 처리
        const response = await authApi.kakaoLogin(code);

        // 백엔드 응답이 제공한 JSON 형태를 바로 활용
        // { "message": "...", "data": { "isNewUser": true, "registerUUID": "...", ... } }
        const { isNewUser, accessToken } = response.data || {};

        if (isNewUser) {
          // 신규 유저인 경우 회원가입 페이지로 이동하며 data 객체 전달
          navigate(PATHS.SIGNUP, { state: response.data });
        } else {
          // 기존 유저인 경우 로그인 처리
          if (accessToken) {
            localStorage.setItem('token', accessToken);
            const profile = await userApi.getUserProfile();
            login({
              id: profile.id,
              email: profile.email,
              nickname: profile.nickname,
              customId: profile.customId,
            });
            navigate(PATHS.HOME);
          } else {
            console.error('No access token received for existing user');
            navigate(PATHS.LOGIN);
          }
        }
      } catch (error) {
        console.error('Kakao callback error:', error);
        alert('카카오 로그인 처리 중 오류가 발생했습니다.');
        navigate(PATHS.LOGIN);
      }
    };

    processKakaoCallback();
  }, [location, navigate, login]);

  return (
    <div className="min-h-screen bg-[#F0F2F5] flex items-center justify-center">
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 border-4 border-[#D5A09D] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[#11141D] font-bold mt-4">카카오 로그인 처리 중입니다...</p>
      </div>
    </div>
  );
}
