import axios from 'axios';

// 1. 기본 인스턴스 생성
const axiosInstance = axios.create({
  // 백엔드 API 서버 주소를 환경 변수에서 가져옴
  baseURL: import.meta.env.VITE_API_BASE_URL,
  // 요청이 10초 이상 지연되면 에러 처리
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 2. 요청(Request) 인터셉터
axiosInstance.interceptors.request.use(
  (config) => {
    // 여기에 로그인 토큰(액세스 토큰)을 헤더에 넣는 로직 들어갈거임
    // const token = localStorage.getItem('token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// 3. 응답(Response) 인터셉터
axiosInstance.interceptors.response.use(
  (response) => {
    // 응답이 성공적일 때 처리 (그냥 그대로 리턴)
    return response;
  },
  (error) => {
    // 여기에 401 권한 없음 에러나 서버 에러 등 공통 에러 처리 로직 들어갈거임
    // if (error.response?.status === 401) { ... 토큰 갱신 등 ... }
    return Promise.reject(error);
  },
);

export default axiosInstance;
