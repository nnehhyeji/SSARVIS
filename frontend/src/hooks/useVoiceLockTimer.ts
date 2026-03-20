import { useEffect, useCallback } from 'react';
import { useVoiceLockStore } from '../store/useVoiceLockStore';

export const useVoiceLockTimer = () => {
  const { isVoiceLockRegistered, isVoiceLockEnabled, isLocked, setIsLocked, resetTimer } =
    useVoiceLockStore();

  const handleUserActivity = useCallback(() => {
    if (!isLocked) {
      resetTimer();
    }
  }, [isLocked, resetTimer]);

  useEffect(() => {
    if (!isVoiceLockRegistered || !isVoiceLockEnabled || isLocked) return;

    // 초기 로드 시 구형 데이터로 인한 즉시 잠금 방지
    resetTimer();

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach((event) => document.addEventListener(event, handleUserActivity));

    // 최신 상태를 직접 조회하는 방식으로 타이머 꼬임 방지
    const interval = setInterval(() => {
      const state = useVoiceLockStore.getState();
      const now = Date.now();
      const elapsed = (now - state.lastActivity) / 1000;

      if (elapsed >= state.timeoutDuration) {
        setIsLocked(true);
      }
    }, 1000);

    return () => {
      events.forEach((event) => document.removeEventListener(event, handleUserActivity));
      clearInterval(interval);
    };
  }, [
    isVoiceLockRegistered,
    isVoiceLockEnabled,
    isLocked,
    setIsLocked,
    handleUserActivity,
    resetTimer,
  ]);

  return { isLocked };
};
