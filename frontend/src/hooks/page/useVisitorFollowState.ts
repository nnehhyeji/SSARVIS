import { useCallback, useEffect, useState } from 'react';

import followApi from '../../apis/followApi';

type VisitorFollowStatus = 'NONE' | 'REQUESTED' | 'FOLLOWING' | null;

type VisitorFollowSummary = {
  customId?: string;
  followId?: number | null;
} | null;

type UseVisitorFollowStateInput = {
  isLoggedIn: boolean;
  isMyHome: boolean;
  targetId: number | null;
  visitorFollow: VisitorFollowSummary;
  onRequestSuccess?: (nextStatus: Exclude<VisitorFollowStatus, null>) => void;
  onRequestError?: () => void;
};

export function useVisitorFollowState(input: UseVisitorFollowStateInput) {
  const { isLoggedIn, isMyHome, targetId, visitorFollow, onRequestSuccess, onRequestError } = input;
  const [visitorFollowStatus, setVisitorFollowStatus] = useState<VisitorFollowStatus>(null);
  const [isVisitorFollowLoading, setIsVisitorFollowLoading] = useState(false);
  const [visitorFollowCustomId, setVisitorFollowCustomId] = useState('');

  const refreshVisitorFollowStatus = useCallback(
    async (customId: string) => {
      if (!targetId || !customId) return null;

      const response = await followApi.searchUsers(customId);
      const matchedUser = (response.data || []).find(
        (user) => user.userId === targetId && user.customId === customId,
      );

      return matchedUser?.followStatus ?? null;
    },
    [targetId],
  );

  useEffect(() => {
    if (isMyHome || !isLoggedIn || !targetId) {
      setVisitorFollowStatus(null);
      setVisitorFollowCustomId('');
      return;
    }

    const initialCustomId = visitorFollow?.customId || '';
    setVisitorFollowCustomId(initialCustomId);

    if (visitorFollow?.followId) {
      setVisitorFollowStatus('FOLLOWING');
    } else {
      setVisitorFollowStatus('NONE');
    }

    if (!initialCustomId) return;

    let isMounted = true;

    void (async () => {
      try {
        const status = await refreshVisitorFollowStatus(initialCustomId);
        if (!isMounted || !status) return;
        setVisitorFollowStatus(status);
      } catch (error) {
        console.error('Failed to load visitor follow status:', error);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [isLoggedIn, isMyHome, refreshVisitorFollowStatus, targetId, visitorFollow]);

  const handleVisitorFollow = useCallback(async () => {
    if (!isLoggedIn || isMyHome || !targetId || visitorFollowStatus === 'FOLLOWING') return;
    if (visitorFollowStatus === 'REQUESTED') return;

    setIsVisitorFollowLoading(true);

    try {
      await followApi.requestFollow({ receiverId: targetId });

      let nextStatus: Exclude<VisitorFollowStatus, null> = 'REQUESTED';
      if (visitorFollowCustomId) {
        const refreshedStatus = await refreshVisitorFollowStatus(visitorFollowCustomId);
        if (refreshedStatus) {
          nextStatus = refreshedStatus;
        }
      }

      setVisitorFollowStatus(nextStatus);
      onRequestSuccess?.(nextStatus);
    } catch (error) {
      console.error('Failed to request follow from visitor page:', error);
      onRequestError?.();
    } finally {
      setIsVisitorFollowLoading(false);
    }
  }, [
    isLoggedIn,
    isMyHome,
    onRequestError,
    onRequestSuccess,
    refreshVisitorFollowStatus,
    targetId,
    visitorFollowCustomId,
    visitorFollowStatus,
  ]);

  const visitorFollowButtonLabel =
    !isMyHome && isLoggedIn
      ? visitorFollowStatus === 'FOLLOWING'
        ? '\uD314\uB85C\uC789 \uC911'
        : visitorFollowStatus === 'REQUESTED'
          ? '\uC694\uCCAD \uC644\uB8CC'
          : '\uD314\uB85C\uC6B0'
      : null;
  const isVisitorFollowButtonDisabled =
    isVisitorFollowLoading ||
    visitorFollowStatus === 'FOLLOWING' ||
    visitorFollowStatus === 'REQUESTED';

  return {
    visitorFollowStatus,
    isVisitorFollowLoading,
    visitorFollowButtonLabel,
    isVisitorFollowButtonDisabled,
    handleVisitorFollow,
  };
}
