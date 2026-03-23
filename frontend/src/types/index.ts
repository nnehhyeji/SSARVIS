// 알림 타입
export type Alarm = {
  id: number;
  message: string;
  isRead: boolean;
  time: string;
  type: 'follow' | 'system';
};

// AI 동작 모드 타입
export type Mode = 'normal' | 'study' | 'counseling' | 'persona';
export type Visibility = 'public' | 'private';

// 채팅 메시지 타입
export type ChatMessage = {
  sender: 'ai' | 'me';
  text: string;
};

// 팔로우 대상 타입
export type Follow = {
  id: number;
  followId?: number;
  name: string;
  email: string;
  color: string;
  profileExp: string;
  faceType?: number;
  intro?: string;
  view_count: number;
  isFollowing: boolean; // 내가 그를 팔로우하는지 (내 입장에서 상대가 Private으로 보임)
  isFollower: boolean; // 그가 나를 팔로우하는지 (상대 입장에서 내가 Private으로 보임)
};

// 팔로우 요청 타입
export type FollowRequest = {
  id: number;
  name: string;
  email: string;
  color: string;
  profileExp: string;
  faceType?: number;
  intro?: string;
};
