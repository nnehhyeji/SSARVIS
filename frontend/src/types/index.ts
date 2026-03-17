// 알림 타입
export type Alarm = {
  id: number;
  message: string;
  isRead: boolean;
  time: string;
  type: 'follow' | 'system';
};

// AI 동작 모드 타입
export type Mode = 'normal' | 'study' | 'counseling';

// 채팅 메시지 타입
export type ChatMessage = {
  sender: 'ai' | 'me';
  text: string;
};

// 팔로우 대상 타입
export type Follow = {
  id: number;
  name: string;
  color: string;
  profileExp: string;
  view_count: number;
};

// 팔로우 요청 타입
export type FollowRequest = {
  id: number;
  name: string;
  color: string;
  profileExp: string;
};
