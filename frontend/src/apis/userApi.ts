import axiosInstance from './axiosInstance';

// --- Types ---
export interface CommonResponse<T = null> {
  code: string | null;
  message: string;
  data: T;
}

export interface CheckEmailRequest {
  email: string;
}

export interface CheckEmailResponse {
  isDuplicate: boolean;
}

export interface CheckNicknameRequest {
  nickname: string;
}

export interface CheckNicknameResponse {
  isDuplicate: boolean;
}

export interface CheckCustomIdRequest {
  customId: string;
}

export interface CheckCustomIdResponse {
  isDuplicate: boolean;
}

export interface EmailVerificationRequest {
  email: string;
}

export interface EmailVerifyRequest {
  email: string;
  code: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  nickname: string;
  customId: string;
}

export interface UserResponse {
  id?: number;
  userId: number;
  email: string;
  nickname: string;
  description: string;
  costume: number;
  viewCount: number;
}

// --- API Functions ---
const userApi = {
  // 1. 이메일 중복 확인
  checkEmail: async (data: CheckEmailRequest) => {
    const response = await axiosInstance.post<CommonResponse<CheckEmailResponse>>(
      '/users/check-email',
      data,
    );
    return response.data.data;
  },

  // 2. 닉네임 중복 확인 (화면상 닉네임)
  checkNickname: async (data: CheckNicknameRequest) => {
    const response = await axiosInstance.post<CommonResponse<CheckNicknameResponse>>(
      '/users/check-nickname',
      data,
    );
    return response.data.data;
  },

  // 3. 아이디 중복 확인 (로그인용 아이디)
  checkCustomId: async (data: CheckCustomIdRequest) => {
    const response = await axiosInstance.post<CommonResponse<CheckCustomIdResponse>>(
      '/users/check-customId',
      data,
    );
    return response.data.data;
  },

  // 4. 이메일 인증 코드 발송
  sendVerificationCode: async (data: EmailVerificationRequest) => {
    const response = await axiosInstance.post<CommonResponse>('/users/email/verification', data);
    return response.data;
  },

  // 5. 이메일 인증 코드 확인
  verifyEmailCode: async (data: EmailVerifyRequest) => {
    const response = await axiosInstance.post<CommonResponse>('/users/email/verify', data);
    return response.data;
  },

  // 6. 회원 가입
  signup: async (data: SignupRequest) => {
    const response = await axiosInstance.post<CommonResponse>('/users', data);
    return response.data;
  },

  // 7. 회원 탈퇴
  withdraw: async () => {
    const response = await axiosInstance.delete<CommonResponse>('/users');
    return response.data;
  },

  // 8. 유저 정보 조회
  getUserProfile: async () => {
    const response = await axiosInstance.get<CommonResponse<UserResponse>>('/users');
    const profile = response.data.data;
    return {
      ...profile,
      userId: profile.userId ?? profile.id ?? 0,
      viewCount: profile.viewCount ?? 0,
    };
  },
};

export default userApi;
