import { create } from 'zustand';
import { EventSourcePolyfill } from 'event-source-polyfill';
import notificationApi from '../apis/notificationApi';
import { getApiHttpBaseUrl } from '../config/api';
import type { NotificationDTO, RealtimeNotificationDTO } from '../apis/notificationApi';
import type { Alarm } from '../types';

interface SseConnectPayload {
  message?: string;
}

function getMessageEventData(event: unknown): string | null {
  if (typeof MessageEvent !== 'undefined' && event instanceof MessageEvent) {
    return typeof event.data === 'string' ? event.data : null;
  }

  const data = (event as { data?: unknown } | null | undefined)?.data;
  return typeof data === 'string' ? data : null;
}

function addCustomSseListener(
  source: EventSourcePolyfill,
  type: string,
  listener: (event: unknown) => void,
) {
  (
    source as unknown as {
      addEventListener: (eventType: string, eventListener: (event: unknown) => void) => void;
    }
  ).addEventListener(type, listener);
}

const timeAgo = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return '방금 전';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}시간 전`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}일 전`;
};

const extractSenderNameFromMessage = (message: string) => {
  const trimmedMessage = message.trim();
  if (!trimmedMessage) return '';

  const honorificIndex = trimmedMessage.indexOf('님');
  if (honorificIndex > 0) {
    return trimmedMessage.slice(0, honorificIndex).trim();
  }

  return trimmedMessage.split(/\s+/)[0]?.trim() || '';
};

const mapNotificationToAlarm = (dto: NotificationDTO): Alarm => {
  const payload = (dto.payload || {}) as Record<string, unknown>;
  const senderName =
    (payload.senderNickname as string | undefined) ||
    (payload.senderName as string | undefined) ||
    (payload.senderCustomId as string | undefined) ||
    (payload.senderEmail as string | undefined) ||
    extractSenderNameFromMessage(dto.message);

  return {
    id: dto.notificationId,
    message: dto.message,
    isRead: dto.isRead,
    time: timeAgo(dto.createdAt),
    type: dto.eventName || 'system',
    payload: {
      ...payload,
      senderNickname: senderName,
      senderName:
        (payload.senderName as string | undefined) ||
        (payload.senderNickname as string | undefined) ||
        senderName,
      senderCustomId: (payload.senderCustomId as string | undefined) || senderName,
      senderProfileImage:
        (payload.senderProfileImage as string | undefined) ||
        (payload.senderProfileImgUrl as string | undefined) ||
        (payload.profileImageUrl as string | undefined) ||
        (payload.profileImgUrl as string | undefined) ||
        '',
    },
  };
};

const createRealtimeAlarmId = () => Date.now() + Math.floor(Math.random() * 1000);

const mapRealtimeNotificationToAlarm = (
  dto: RealtimeNotificationDTO,
  eventName: string,
): Alarm => ({
  id: createRealtimeAlarmId(),
  message: dto.message,
  isRead: false,
  time: timeAgo(dto.createdAt),
  type: eventName,
  payload: {
    senderId: dto.senderId,
    senderEmail: dto.senderEmail,
    senderCustomId: dto.senderCustomId,
    senderNickname: dto.senderNickname,
    senderProfileImage: dto.senderProfileImage,
    targetUserId: dto.targetUserId,
    followRequestId: dto.followRequestId,
    followId: dto.followId,
    direction: dto.direction,
  },
});

let eventSource: EventSourcePolyfill | null = null;

interface NotificationState {
  alarms: Alarm[];
  unreadCount: number;
  isInitialized: boolean;
  isSseConnected: boolean;
  fetchNotifications: () => Promise<void>;
  initialize: () => Promise<void>;
  reset: () => void;
  readAlarm: (id: number) => Promise<void>;
  removeAlarm: (id: number) => Promise<void>;
  readAllAlarms: () => Promise<void>;
  removeAllAlarms: () => Promise<void>;
  appendRealtimeAlarm: (alarm: Alarm) => void;
}

export const useNotificationStore = create<NotificationState>()((set, get) => ({
  alarms: [],
  unreadCount: 0,
  isInitialized: false,
  isSseConnected: false,

  fetchNotifications: async () => {
    try {
      const [listRes, countRes] = await Promise.all([
        notificationApi.getNotifications(),
        notificationApi.getUnreadCount(),
      ]);

      set({
        alarms: (listRes.data?.data || []).map(mapNotificationToAlarm),
        unreadCount: countRes.data?.data?.count ?? 0,
      });
    } catch (error) {
      console.error('알림 목록/개수 조회 실패:', error);
    }
  },

  initialize: async () => {
    const token = localStorage.getItem('token');

    if (!token) {
      get().reset();
      return;
    }

    if (!get().isInitialized) {
      await get().fetchNotifications();
      set({ isInitialized: true });
    }

    if (eventSource) {
      return;
    }

    eventSource = new EventSourcePolyfill(`${getApiHttpBaseUrl()}/sse/subscribe`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      heartbeatTimeout: 86400000,
      withCredentials: true,
    });

    eventSource.onopen = () => {
      set({ isSseConnected: true });
      console.log('SSE 연결 성공');
      void get().fetchNotifications();
    };

    eventSource.onmessage = (event) => {
      if (event.data && !event.data.includes('EventStream Created')) {
        try {
          const newNoti: NotificationDTO = JSON.parse(event.data);
          if (!newNoti.notificationId) return;
          get().appendRealtimeAlarm(mapNotificationToAlarm(newNoti));
        } catch (e) {
          console.error('SSE 수신 데이터 파싱 오류:', e);
        }
      }
    };

    const handleCustomEvent =
      (eventName: string) =>
      (event: unknown): void => {
        const data = getMessageEventData(event);
        if (!data) return;

        try {
          const newNoti: RealtimeNotificationDTO = JSON.parse(data);
          get().appendRealtimeAlarm(mapRealtimeNotificationToAlarm(newNoti, eventName));
          void get().fetchNotifications();
        } catch (e) {
          console.error('SSE 커스텀 이벤트 파싱 오류:', e);
        }
      };

    addCustomSseListener(eventSource, 'connect', (event: unknown) => {
        const dataText = getMessageEventData(event);
        if (!dataText) return;

        try {
          const data = JSON.parse(dataText) as SseConnectPayload;
          console.log('SSE Connect API 응답:', data.message);
        } catch (e) {
          console.debug('JSON Parse skip for connect event:', e);
        }
      });

    addCustomSseListener(
      eventSource,
      'FOLLOW_REQUEST',
      handleCustomEvent('FOLLOW_REQUEST'),
    );
    addCustomSseListener(
      eventSource,
      'FOLLOW_ACCEPT',
      handleCustomEvent('FOLLOW_ACCEPT'),
    );
    addCustomSseListener(
      eventSource,
      'FOLLOW_CREATED',
      handleCustomEvent('FOLLOW_CREATED'),
    );
    addCustomSseListener(
      eventSource,
      'NOTIFICATION',
      handleCustomEvent('NOTIFICATION'),
    );

    eventSource.onerror = function onSseError(error) {
      set({ isSseConnected: false });
      console.error('SSE 연결 에러 (연결 유실 혹은 토큰 만료 등):', error);
    };
  },

  reset: () => {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }

    set({
      alarms: [],
      unreadCount: 0,
      isInitialized: false,
      isSseConnected: false,
    });
  },

  readAlarm: async (id: number) => {
    try {
      await notificationApi.readNotification(id);
      set((state) => ({
        alarms: state.alarms.map((alarm) => (alarm.id === id ? { ...alarm, isRead: true } : alarm)),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (error) {
      console.error('알림 읽음 처리 실패:', error);
    }
  },

  removeAlarm: async (id: number) => {
    try {
      await notificationApi.deleteNotification(id);
      set((state) => ({
        alarms: state.alarms.filter((alarm) => alarm.id !== id),
      }));
      await get().fetchNotifications();
    } catch (error) {
      console.error('알림 삭제 실패:', error);
    }
  },

  readAllAlarms: async () => {
    try {
      const unreadAlarms = get().alarms.filter((alarm) => !alarm.isRead);
      await Promise.all(unreadAlarms.map((alarm) => notificationApi.readNotification(alarm.id)));
      set((state) => ({
        alarms: state.alarms.map((alarm) => ({ ...alarm, isRead: true })),
        unreadCount: 0,
      }));
    } catch (error) {
      console.error('전체 알림 읽음 처리 실패:', error);
    }
  },

  removeAllAlarms: async () => {
    try {
      await Promise.all(get().alarms.map((alarm) => notificationApi.deleteNotification(alarm.id)));
      set({ alarms: [], unreadCount: 0 });
    } catch (error) {
      console.error('전체 알림 삭제 실패:', error);
    }
  },

  appendRealtimeAlarm: (alarm: Alarm) => {
    set((state) => {
      const isDuplicate = state.alarms.some((existing) => {
        const existingSenderId = (existing.payload as { senderId?: number } | undefined)?.senderId;
        const nextSenderId = (alarm.payload as { senderId?: number } | undefined)?.senderId;

        return (
          existing.message === alarm.message &&
          existing.time === alarm.time &&
          existingSenderId === nextSenderId
        );
      });

      if (isDuplicate) {
        return state;
      }

      return {
        alarms: [alarm, ...state.alarms],
        unreadCount: state.unreadCount + 1,
      };
    });
  },
}));
