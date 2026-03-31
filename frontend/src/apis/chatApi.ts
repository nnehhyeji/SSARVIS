import axiosInstance from './axiosInstance';

export interface ChatSession {
  id: string; // 몽고 디비 id
  userId: number;
  assistantId: number;
  assistantType: string;
  chatSessionType: string;
  title: string;
  chatSessionStatus: string;
  messageCount: number;
  startedAt: string;
  lastMessageAt: string;
  memoryPolicy: string;
  expiredAt: string | null;
  targetUserId?: number;
  targetUserCustomId?: string;
  targetUserProfileImageUrl?: string;
}

export interface ChatMessageData {
  id: string;
  sessionId: string;
  userId: number;
  assistantId: number;
  assistantType: string;
  speakerType: 'USER' | 'ASSISTANT' | 'AVATAR';
  speakerId: number;
  text: string;
  chatMessageStatus: string;
  audio: { audioUrl: string; contentType: string; fileName: string; fileSize: number } | null;
  createdAt: string;
  profileImgUrl?: string;
  senderProfileImgUrl?: string;
}

export interface PageData<T> {
  count: number;
  contents: T[];
}

export interface ApiResponse<T> {
  message: string;
  data: T;
}

export interface GetSessionsParams {
  type: string;
  assistantType?: string;
  chatSessionType?: string;
  sort?: string;
  size?: number;
  page?: number;
}

export const getChatSessions = async (
  params: GetSessionsParams,
): Promise<PageData<ChatSession>> => {
  const response = await axiosInstance.get<ApiResponse<PageData<ChatSession>>>('/chats/sessions', {
    params,
  });
  return response.data.data;
};

export const getChatMessages = async (
  sessionId: string,
  params?: { lastMessageId?: string; limit?: number },
): Promise<PageData<ChatMessageData>> => {
  const response = await axiosInstance.get<ApiResponse<PageData<ChatMessageData>>>(
    `/chats/sessions/${sessionId}/messages`,
    { params },
  );
  return response.data.data;
};
