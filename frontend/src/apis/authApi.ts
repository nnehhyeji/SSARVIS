import axiosInstance from './axiosInstance';
import type { CommonResponse } from './userApi';

// --- Types ---
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
}

export interface ReissueResponse {
  accessToken: string;
}

// --- API Functions ---
const authApi = {
  // 1. 로그인
  login: async (data: LoginRequest) => {
    const response = await axiosInstance.post<CommonResponse<LoginResponse>>(
      '/api/v1/auth/login',
      data,
    );
    return response.data; // CommonResponse 리턴 (헤더 처리는 인터셉터나 호출부에서 가능)
  },

  // 2. 로그아웃
  logout: async () => {
    const response = await axiosInstance.post<CommonResponse>('/api/v1/auth/logout');
    return response.data;
  },

  // 3. 토큰 재발급
  reissue: async () => {
    const response =
      await axiosInstance.post<CommonResponse<ReissueResponse>>('/api/v1/auth/reissue');
    return response.data;
  },
};

export default authApi;
