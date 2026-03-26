import { useEffect } from 'react';
import { useNotificationStore } from '../store/useNotificationStore';
import { useUserStore } from '../store/useUserStore';

export function useNotification() {
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);
  const {
    alarms,
    unreadCount,
    initialize,
    reset,
    readAlarm,
    removeAlarm,
    readAllAlarms,
    removeAllAlarms,
  } = useNotificationStore();

  useEffect(() => {
    if (isLoggedIn) {
      void initialize();
    } else {
      reset();
    }
  }, [initialize, isLoggedIn, reset]);

  return {
    alarms,
    unreadCount,
    readAlarm,
    removeAlarm,
    readAllAlarms,
    removeAllAlarms,
  };
}
