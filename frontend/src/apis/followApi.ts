import axiosInstance from './axiosInstance';
import type { CommonResponse } from './userApi';

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
  customId: string;
  followerProfileImgUrl: string;
  description: string;
}

export interface FollowerListResponse {
  followId: number;
  followerId: number;
  nickname: string;
  customId: string;
  followerProfileImgUrl: string;
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
  customId: string;
  nickname: string;
  email: string;
  profileImageUrl: string;
  followStatus: 'NONE' | 'REQUESTED' | 'FOLLOWING';
}

export interface TopChatterResponse {
  userId: number;
  nickname: string;
  profileImageUrl: string;
  totalMessageCount: number;
}

const followApi = {
  requestFollow: async (data: FollowRequest) => {
    const response = await axiosInstance.post<CommonResponse<void>>('/follows/request', data);
    return response.data;
  },

  acceptFollow: async (data: FollowAcceptRequest) => {
    const response = await axiosInstance.post<CommonResponse<void>>('/follows/accept', data);
    return response.data;
  },

  rejectFollow: async (data: FollowRejectRequest) => {
    const response = await axiosInstance.post<CommonResponse<void>>('/follows/reject', data);
    return response.data;
  },

  deleteFollow: async (followId: number) => {
    const response = await axiosInstance.delete<CommonResponse<void>>(`/follows/${followId}`);
    return response.data;
  },

  getFollowList: async () => {
    const response = await axiosInstance.get<CommonResponse<FollowListResponse[]>>('/follows');
    return response.data;
  },

  getFollowerList: async () => {
    const response =
      await axiosInstance.get<CommonResponse<FollowerListResponse[]>>('/follows/followers');
    return response.data;
  },

  getTopChatters: async () => {
    const response =
      await axiosInstance.get<CommonResponse<TopChatterResponse[]>>('/follows/top-chatters');
    return response.data;
  },

  getFollowRequests: async () => {
    const response =
      await axiosInstance.get<CommonResponse<FollowRequestListResponse[]>>('/follows/requests');
    return response.data;
  },

  searchUsers: async (keyword: string) => {
    const response = await axiosInstance.get<CommonResponse<UserSearchResponse[]>>(
      '/follows/search',
      { params: { keyword } },
    );
    return response.data;
  },
};

export default followApi;
