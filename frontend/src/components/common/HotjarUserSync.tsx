import { useEffect, useRef } from 'react';
import { useUserStore } from '../../store/useUserStore';

type HotjarIdentifyAttributes = Record<string, string | number | boolean | null>;

declare global {
  interface Window {
    hj?: {
      (
        command: 'identify',
        userId: string | null,
        attributes?: HotjarIdentifyAttributes,
      ): void;
    };
  }
}

export default function HotjarUserSync() {
  const hasHydrated = useUserStore((state) => state.hasHydrated);
  const userInfo = useUserStore((state) => state.userInfo);
  const lastIdentifiedUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!hasHydrated || typeof window === 'undefined' || !window.hj) {
      return;
    }

    const currentUserId = userInfo?.id != null ? String(userInfo.id) : null;

    if (lastIdentifiedUserId.current === currentUserId) {
      return;
    }

    lastIdentifiedUserId.current = currentUserId;

    window.hj('identify', currentUserId, {
      customId: userInfo?.customId ?? null,
      email: userInfo?.email ?? null,
      nickname: userInfo?.nickname ?? null,
      isLoggedIn: currentUserId !== null,
    });
  }, [hasHydrated, userInfo]);

  return null;
}
