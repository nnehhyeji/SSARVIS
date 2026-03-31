import axiosInstance from './axiosInstance';

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
  registerUUID?: string;
  profileImageUrl?: string;
}

export interface UserResponse {
  id: number;
  email: string;
  nickname: string;
  customId: string;
  description: string;
  userProfileImageUrl: string;
  isVoiceLockActive: boolean;
  isAcceptPrompt: boolean;
  isProfilePublic: boolean;
  viewCount: number;
  voiceLockTimeout: number;
}

export interface UserProfileResponse {
  userId: number;
  nickname: string;
  customId: string;
  profileImageUrl: string;
  description: string;
  viewCount: number;
  isPublic: boolean;
}

export interface UpdateUserRequest {
  password?: string;
  nickname?: string;
  description?: string;
}

const userApi = {
  checkEmail: async (data: CheckEmailRequest) => {
    const response = await axiosInstance.post<CommonResponse<CheckEmailResponse>>(
      '/users/check-email',
      data,
    );
    return response.data.data;
  },

  checkNickname: async (data: CheckNicknameRequest) => {
    const response = await axiosInstance.post<CommonResponse<CheckNicknameResponse>>(
      '/users/check-nickname',
      data,
    );
    return response.data.data;
  },

  checkCustomId: async (data: CheckCustomIdRequest) => {
    const response = await axiosInstance.post<CommonResponse<CheckCustomIdResponse>>(
      '/users/check-customId',
      data,
    );
    return response.data.data;
  },

  sendVerificationCode: async (data: EmailVerificationRequest) => {
    const response = await axiosInstance.post<CommonResponse>('/users/email/verification', data);
    return response.data;
  },

  verifyEmailCode: async (data: EmailVerifyRequest) => {
    const response = await axiosInstance.post<CommonResponse>('/users/email/verify', data);
    return response.data;
  },

  signup: async (data: SignupRequest) => {
    const response = await axiosInstance.post<CommonResponse>('/users', data);
    return response.data;
  },

  withdraw: async () => {
    const response = await axiosInstance.delete<CommonResponse>('/users');
    return response.data;
  },

  getUserProfile: async () => {
    const response = await axiosInstance.get<CommonResponse<UserResponse>>('/users');
    return response.data.data;
  },

  updateUserProfile: async (data: UpdateUserRequest) => {
    const response = await axiosInstance.patch<CommonResponse<{ userId: number }>>('/users', data);
    return response.data;
  },

  updateProfileImage: async (formData: FormData) => {
    const response = await axiosInstance.patch<CommonResponse<string>>(
      '/users/profile-image',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );
    return response.data;
  },

  deleteProfileImage: async () => {
    const response = await axiosInstance.delete<CommonResponse<void>>('/users/profile-image');
    return response.data;
  },

  getUserProfileById: async (userId: number) => {
    const response = await axiosInstance.get<CommonResponse<UserProfileResponse>>(
      `/users/${userId}/profile`,
    );
    return response.data.data;
  },

  toggleNamna: async () => {
    const response = await axiosInstance.get<CommonResponse<string>>('/users/namna/toggle');
    return response.data;
  },

  toggleProfileVisibility: async (isPublic: boolean) => {
    const response = await axiosInstance.patch<CommonResponse<string>>('/users/profile/toggle', {
      isPublic,
    });
    return response.data;
  },
};

export default userApi;
