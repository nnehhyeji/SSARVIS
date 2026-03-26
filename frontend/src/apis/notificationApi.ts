import axiosInstance from './axiosInstance';

export interface NotificationDTO {
  notificationId: number;
  eventName: string; // e.g. "FOLLOW_REQUEST"
  message: string;
  isRead: boolean;
  payload: Record<string, unknown> | null;
  createdAt: string;
}

export interface RealtimeNotificationDTO {
  senderId: number;
  senderEmail: string;
  senderCustomId: string;
  senderProfileImage: string;
  message: string;
  createdAt: string;
}

export interface NotificationCountDTO {
  count: number;
}

const notificationApi = {
  // 알림 리스트 조회
  getNotifications: async () => {
    return axiosInstance.get<{ message: string; data: NotificationDTO[] }>('/notifications');
  },

  // 알림 삭제
  deleteNotification: async (notificationId: number) => {
    return axiosInstance.delete<{ message: string }>(`/notifications/${notificationId}`);
  },

  // 알림 읽음 처리
  readNotification: async (notificationId: number) => {
    return axiosInstance.patch<{ message: string }>(`/notifications/${notificationId}/read`);
  },

  // 알림 개수 조회
  getUnreadCount: async () => {
    return axiosInstance.get<{ message: string; data: NotificationCountDTO }>(
      '/notifications/count',
    );
  },
};

export default notificationApi;
