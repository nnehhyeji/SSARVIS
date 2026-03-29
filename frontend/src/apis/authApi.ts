import axiosInstance from './axiosInstance';
import type { CommonResponse } from './userApi';

// --- Types ---
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  timeout: number;
}

export interface ReissueResponse {
  accessToken: string;
  timeout: number;
}

export interface VoiceLockStatusResponse {
  checked: boolean;
}

export interface VoiceLockVerifyRequest {
  voicePassword: string;
}

export interface VoiceLockSetupRequest {
  voicePassword: string;
  timeout: number;
}

export interface KakaoLoginPayload {
  isNewUser?: boolean;
  accessToken?: string;
  registerUUID?: string;
  profileImageUrl?: string;
  email?: string;
  nickName?: string;
}

// --- API Functions ---
const authApi = {
  // 1. 로그인
  login: async (data: LoginRequest) => {
    const response = await axiosInstance.post<CommonResponse<LoginResponse>>('/auth/login', data);
    return response.data; // CommonResponse 리턴 (헤더 처리는 인터셉터나 호출부에서 가능)
  },

  // 카카오 로그인 인증 코드 전송
  kakaoLogin: async (code: string) => {
    const response = await axiosInstance.get<CommonResponse<KakaoLoginPayload>>(
      `/auth/kakao/callback?code=${code}`,
    );
    return response.data;
  },

  // 2. 로그아웃
  logout: async () => {
    const response = await axiosInstance.post<CommonResponse>('/auth/logout');
    return response.data;
  },

  // 3. 토큰 재발급
  reissue: async () => {
    const response = await axiosInstance.post<CommonResponse<ReissueResponse>>('/auth/reissue');
    return response.data;
  },

  // --- Voice Lock APIs ---
  // 4. 음성 잠금 인증 (Verify)
  verifyVoiceLock: async (data: VoiceLockVerifyRequest) => {
    const response = await axiosInstance.post<CommonResponse<VoiceLockStatusResponse>>(
      '/auth/voice-lock',
      data,
    );
    return response.data;
  },

  // 5. 음성 잠금 사용 여부 조회 (Status)
  getVoiceLockStatus: async () => {
    const response =
      await axiosInstance.get<CommonResponse<VoiceLockStatusResponse>>('/auth/voice-lock');
    return response.data;
  },

  // 6. 음성 잠금 설정 (Setup/Update)
  setupVoiceLock: async (data: VoiceLockSetupRequest) => {
    const response = await axiosInstance.patch<CommonResponse>('/auth/voice-lock', data);
    return response.data;
  },

  // 7. 음성 잠금 해제/삭제 (Delete)
  deleteVoiceLock: async () => {
    const response = await axiosInstance.delete<CommonResponse>('/auth/voice-lock');
    return response.data;
  },
};

export default authApi;
