import axios from 'axios';

// 1. 기본 인스턴스 생성
const axiosInstance = axios.create({
  // 백엔드 API 서버 주소를 환경 변수에서 가져옴
  baseURL: import.meta.env.VITE_API_BASE_URL,
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
    const token = localStorage.getItem('token');
    if (token && token !== 'mock_token_for_testing') {
      config.headers.Authorization = `Bearer ${token}`;
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
      const token = authHeader.substring(7);
      localStorage.setItem('token', token);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // 401 에러(인증 만료) 발생 시 토큰 재발급 시도 (한 번만)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // reissue API 호출 (쿠키는 withCredentials: true 로 자동 전송됨)
        const response = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL || ''}/api/v1/auth/reissue`,
          {},
          { withCredentials: true },
        );

        // 새 토큰이 헤더나 바디에 왔을 경우 (명세서엔 둘 다 명시됨)
        const newAccessToken =
          response.headers['authorization']?.substring(7) || response.data?.data?.accessToken;

        if (newAccessToken) {
          localStorage.setItem('token', newAccessToken);
          // 원래 요청의 헤더 업데이트 후 재시도
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return axiosInstance(originalRequest);
        }
      } catch (reissueError) {
        // 재발급 실패 시 (리프레시 토큰 만료 등) 로그아웃 처리
        localStorage.removeItem('token');
        // 강제로 로그인 페이지로 이동하거나 상태 초기화가 필요할 수 있음
        // window.location.href = '/login';
        return Promise.reject(reissueError);
      }
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
