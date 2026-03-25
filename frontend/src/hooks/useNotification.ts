import { useState, useEffect, useCallback } from 'react';
import { EventSourcePolyfill } from 'event-source-polyfill';
import notificationApi from '../apis/notificationApi';
import { getApiHttpBaseUrl } from '../config/api';
import type { NotificationDTO } from '../apis/notificationApi';
import type { Alarm } from '../types';

// 시간 표시 포맷 함수 ("방금 전", "N분 전" 등)
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

// DTO를 클라이언트용 Alarm 타입으로 변환
const mapNotificationToAlarm = (dto: NotificationDTO): Alarm => ({
  id: dto.notificationId,
  message: dto.message,
  isRead: dto.isRead,
  time: timeAgo(dto.createdAt),
  type: dto.eventName?.includes('FOLLOW') ? 'follow' : 'system',
  payload: dto.payload || {},
});

export function useNotification() {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // 1. 알림 리스트 & 카운트 조회
  const fetchNotifications = useCallback(async () => {
    try {
      const listRes = await notificationApi.getNotifications();
      if (listRes.data?.data) {
        setAlarms(listRes.data.data.map(mapNotificationToAlarm));
      }

      const countRes = await notificationApi.getUnreadCount();
      if (countRes.data?.data) {
        setUnreadCount(countRes.data.data.count);
      }
    } catch (error) {
      console.error('알림 목록/개수 조회 실패:', error);
    }
  }, []);

  // 2. 단일 알림 읽음 처리
  const readAlarm = useCallback(async (id: number) => {
    try {
      await notificationApi.readNotification(id);
      setAlarms((prev) => prev.map((a) => (a.id === id ? { ...a, isRead: true } : a)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('알림 읽음 처리 실패:', error);
    }
  }, []);

  // 3. 단일 알림 삭제 처리
  const removeAlarm = useCallback(
    async (id: number) => {
      try {
        await notificationApi.deleteNotification(id);
        setAlarms((prev) => prev.filter((a) => a.id !== id));
        // 알림 목록/개수 다시 동기화
        fetchNotifications();
      } catch (error) {
        console.error('알림 삭제 실패:', error);
      }
    },
    [fetchNotifications],
  );

  // 4. 모의 일괄 읽음 처리 (명세상 단건 처리만 있으므로 순회)
  const readAllAlarms = useCallback(async () => {
    try {
      const unreadAlarms = alarms.filter((a) => !a.isRead);
      await Promise.all(unreadAlarms.map((a) => notificationApi.readNotification(a.id)));
      setAlarms((prev) => prev.map((a) => ({ ...a, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('전체 알림 읽음 처리 실패:', error);
    }
  }, [alarms]);

  // 5. 모의 일괄 삭제 처리
  const removeAllAlarms = useCallback(async () => {
    try {
      await Promise.all(alarms.map((a) => notificationApi.deleteNotification(a.id)));
      setAlarms([]);
      setUnreadCount(0);
    } catch (error) {
      console.error('전체 알림 삭제 실패:', error);
    }
  }, [alarms]);

  // 초기 데이터 패칭 로직 독립 분리
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchNotifications();
  }, [fetchNotifications]);

  // --- SSE 구독 --- (의존성 최소화)
  useEffect(() => {
    let eventSource: EventSourcePolyfill | null = null;
    const token = localStorage.getItem('token');

    if (token) {
      eventSource = new EventSourcePolyfill(`${getApiHttpBaseUrl()}/sse/subscribe`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        heartbeatTimeout: 86400000,
        withCredentials: true,
      });

      eventSource.onopen = () => {
        console.log('SSE 연결 성공');
      };

      // 일반 메시지 이벤트
      eventSource.onmessage = (event) => {
        if (event.data && !event.data.includes('EventStream Created')) {
          try {
            const newNoti: NotificationDTO = JSON.parse(event.data);
            if (!newNoti.notificationId) return; // 알림 데이터가 아닌 경우 (예: 단순 연결 메시지) 무시
            setAlarms((prev) => [mapNotificationToAlarm(newNoti), ...prev]);
            setUnreadCount((prev) => prev + 1);
          } catch (e) {
            console.error('SSE 수신 데이터 파싱 오류:', e);
          }
        }
      };

      // 백엔드에서 특정 이벤트명으로 보낼 경우 대비
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handleCustomEvent = (event: any) => {
        if (event.data) {
          try {
            const newNoti: NotificationDTO = JSON.parse(event.data);
            if (!newNoti.notificationId) return; // 안전 장치
            setAlarms((prev) => [mapNotificationToAlarm(newNoti), ...prev]);
            setUnreadCount((prev) => prev + 1);
          } catch (e) {
            console.error('SSE 커스텀 이벤트 파싱 오류:', e);
          }
        }
      };

      // 초기 연결 확인 이벤트
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      eventSource.addEventListener('connect', (event: any) => {
        if (event.data) {
          try {
            const data = JSON.parse(event.data);
            console.log('SSE Connect API 응답:', data.message); // "SSE 연결 성공"
          } catch (e) {
            console.debug('JSON Parse skip for connect event:', e);
          }
        }
      });

      eventSource.addEventListener('FOLLOW_REQUEST', handleCustomEvent);
      eventSource.addEventListener('FOLLOW_ACCEPT', handleCustomEvent);
      eventSource.addEventListener('NOTIFICATION', handleCustomEvent);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      eventSource.onerror = (error: any) => {
        console.error('SSE 연결 에러 (연결 유실 혹은 토큰 만료 등):', error);
      };
    }

    return () => {
      if (eventSource) {
        console.log('SSE 연결 종료');
        eventSource.close();
      }
    };
  }, []);

  return {
    alarms,
    unreadCount,
    readAlarm,
    removeAlarm,
    readAllAlarms,
    removeAllAlarms,
  };
}
