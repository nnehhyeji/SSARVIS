import axiosInstance from './axiosInstance';
import type { CommonResponse } from './userApi';

// --- Types ---

export interface FollowRequest {
  receiverId: number;
}

export interface FollowAcceptRequest {
  followRequestId: number;
}

export interface FollowRejectRequest {
  followRequestId: number;
}

export interface FollowListResponse {
  followId: number;
  userId: number;
  nickname: string;
  description: string;
}

export interface FollowRequestListResponse {
  followRequestId: number;
  senderId: number;
  senderNickname: string;
  senderEmail: string;
}

export interface UserSearchResponse {
  userId: number;
  nickname: string;
  email: string;
}

// --- API Functions ---
const followApi = {
  // 1. 친구 신청
  requestFollow: async (data: FollowRequest) => {
    const response = await axiosInstance.post<CommonResponse<void>>(
      '/api/v1/follows/request',
      data,
    );
    return response.data;
  },

  // 2. 친구 신청 수락
  acceptFollow: async (data: FollowAcceptRequest) => {
    const response = await axiosInstance.post<CommonResponse<void>>('/api/v1/follows/accept', data);
    return response.data;
  },

  // 3. 친구 신청 거절
  rejectFollow: async (data: FollowRejectRequest) => {
    const response = await axiosInstance.post<CommonResponse<void>>('/api/v1/follows/reject', data);
    return response.data;
  },

  // 4. 친구 삭제
  deleteFollow: async (followId: number) => {
    const response = await axiosInstance.delete<CommonResponse<void>>(
      `/api/v1/follows/${followId}`,
    );
    return response.data;
  },

  // 5. 내 친구 리스트 출력
  getFollowList: async () => {
    const response =
      await axiosInstance.get<CommonResponse<FollowListResponse[]>>('/api/v1/follows');
    return response.data;
  },

  // 6. 나에게 온 친구 신청 리스트 조회
  getFollowRequests: async () => {
    const response = await axiosInstance.get<CommonResponse<FollowRequestListResponse[]>>(
      '/api/v1/follows/requests',
    );
    return response.data;
  },

  // 7. 유저 검색
  searchUsers: async (params: { nickname?: string; email?: string }) => {
    const response = await axiosInstance.get<CommonResponse<UserSearchResponse[]>>(
      '/api/v1/follows/search',
      { params },
    );
    return response.data;
  },
};

export default followApi;
