import axios from 'axios';
import { getApiHttpBaseUrl } from '../config/api';
import { useVoiceLockStore } from '../store/useVoiceLockStore';

// 1. 기본 인스턴스 생성
const axiosInstance = axios.create({
  // 백엔드 API 서버 주소와 공통 경로(/api/v1)를 결합
  baseURL: getApiHttpBaseUrl(),
  // 요청이 10초 이상 지연되면 에러 처리
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 2. 요청(Request) 인터셉터
axiosInstance.interceptors.request.use(
  (config) => {
    const skipTokenPaths = ['/auth/login', '/users/check-email', '/users/check-nickname'];
    // baseURL이 /api/v1 이므로 config.url은 /auth/login 처럼 들어옴
    const isPublicPath = skipTokenPaths.some(
      (path) => config.url === path || config.url?.includes(path),
    );
    // 회원 가입의 경우 POST /users (상세 경로 없음) 이므로 별도 체크
    const isSignupPath = config.url === '/users' && config.method === 'post';

    if (!isPublicPath && !isSignupPath) {
      const token = localStorage.getItem('token');
      if (token && token !== 'mock_token_for_testing') {
        config.headers.Authorization = `Bearer ${token.trim()}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// 3. 응답(Response) 인터셉터
axiosInstance.interceptors.response.use(
  (response) => {
    // 응답 헤더에 Authorization이 있으면 (재발급 혹은 로그인 시) 로컬 스토리지 업데이트
    const authHeader = response.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      localStorage.setItem('token', token);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // 인증이 필요 없는 API 경로는 재발급 시도 제외
    const skipReissuePaths = [
      '/auth/login',
      '/auth/reissue',
      '/users/check-email',
      '/users/check-nickname',
    ];
    const isSkipReissue = skipReissuePaths.some(
      (path) => originalRequest.url === path || originalRequest.url?.includes(path),
    );
    const isSignupPath = originalRequest.url === '/users' && originalRequest.method === 'post';

    // 401 에러(인증 만료) 발생 시 토큰 재발급 시도 (인증 필수 경로에서만)
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isSkipReissue &&
      !isSignupPath
    ) {
      originalRequest._retry = true;

      try {
        // reissue API 호출 (baseURL이 반영된 인스턴스가 아닌 기본 axios 사용 시 경로 주의)
        const response = await axios.post(
          `${getApiHttpBaseUrl()}/auth/reissue`,
          {},
          { withCredentials: true },
        );

        // 새 토큰이 헤더나 바디에 왔을 경우 (명세서엔 둘 다 명시됨)
        const newAccessToken = (
          response.headers['authorization']?.substring(7) || response.data?.data?.accessToken
        )?.trim();

        if (newAccessToken) {
          localStorage.setItem('token', newAccessToken);

          // 타임아웃 정보가 있으면 업데이트
          const timeout = response.data?.data?.timeout;
          if (timeout) {
            useVoiceLockStore.getState().setTimeoutDuration(timeout);
          }

          // 원래 요청의 헤더 업데이트 후 재시도
          originalRequest.headers.Authorization = `Bearer ${newAccessToken.trim()}`;
          return axiosInstance(originalRequest);
        }
      } catch (reissueError) {
        // 재발급 실패 시 (리프레시 토큰 만료 등) 로그아웃 처리
        localStorage.removeItem('token');
        return Promise.reject(reissueError);
      }
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
