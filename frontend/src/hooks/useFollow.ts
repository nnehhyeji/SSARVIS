import { useState, useCallback, useEffect } from 'react';
import type { Follow, FollowRequest } from '../types';
import { VISITOR_PALETTES } from '../constants/theme';
import type { BgColors } from '../constants/theme';
import followApi from '../apis/followApi';

// ─── useFollow ───
// 역할: 팔로우 목록, 요청, 방문 모드 및 상호작용 관련 상태를 관리합니다.
// - 팔로우 방문, 삭제, 요청 수락/거절 기능을 제공합니다.

export function useFollow() {
  const [follows, setFollows] = useState<Follow[]>([]);
  const [followRequests, setFollowRequests] = useState<FollowRequest[]>([]);

  const [isVisitorMode, setIsVisitorMode] = useState(false);
  const [visitedFollowName, setVisitedFollowName] = useState<string>('');
  const [visitedUserId, setVisitedUserId] = useState<number | null>(null);
  const [isDualAiMode, setIsDualAiMode] = useState(false);
  const [isInteractionModalOpen, setIsInteractionModalOpen] = useState(false);
  const [visitorBg, setVisitorBg] = useState<BgColors>({});
  const [visitorVisibility, setVisitorVisibility] = useState<'public' | 'private'>('public');

  const visitFollow = useCallback(
    (id: number, isReturn: boolean = false) => {
      // follows 목록에서 검색
      const user = follows.find((f) => f.id === id);

      if (!user) return null;

      setVisitedFollowName(user.name);
      setVisitedUserId(user.id);
      setIsVisitorMode(true);
      setIsDualAiMode(false);
      setIsInteractionModalOpen(false);

      // 공개 범위 로직: 내가 팔로우하고 있는 사람(isFollowing)이면 private, 아니면 public
      const visibility = user.isFollowing ? 'private' : 'public';
      setVisitorVisibility(visibility);

      const randomPalette = VISITOR_PALETTES[Math.floor(Math.random() * VISITOR_PALETTES.length)];
      setVisitorBg(randomPalette);

      if (!isReturn) {
        alert(`${user.name}님의 방으로 방문합니다. (${visibility} 모드)`);
      }

      return `${user.name} : 우리집에 왜 왔니 ?`; // triggerText 용도
    },
    [follows],
  );

  const leaveFollow = useCallback(() => {
    setIsVisitorMode(false);
    setIsDualAiMode(false);
    setIsInteractionModalOpen(false);
    setVisitedFollowName('');
    setVisitedUserId(null);
    setVisitorBg({});
    setVisitorVisibility('public');
    return '서영님 눈물닦고 할일하세요'; // triggerText 복구용
  }, []);

  const fetchFollows = useCallback(async () => {
    try {
      const res = await followApi.getFollowList();
      if (res.data) {
        const mappedFollows: Follow[] = res.data.map((f) => ({
          id: f.userId,
          followId: f.followId,
          name: f.nickname || '이름없음',
          email: f.description || '',
          color: 'bg-indigo-100',
          profileExp: '^-^',
          view_count: 0,
          isFollowing: true,
          isFollower: true,
        }));
        setFollows(mappedFollows);
      }
    } catch (error) {
      console.error('친구 리스트 조회 실패:', error);
    }
  }, []);

  const fetchFollowRequests = useCallback(async () => {
    try {
      const res = await followApi.getFollowRequests();
      if (res.data) {
        const mappedRequests: FollowRequest[] = res.data.map((req) => ({
          id: req.followRequestId,
          name: req.senderNickname || '이름없음',
          email: req.senderEmail || '',
          color: 'bg-blue-100',
          profileExp: '^o^',
        }));
        setFollowRequests(mappedRequests);
      }
    } catch (error) {
      console.error('팔로우 요청 리스트 조회 실패:', error);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchFollows();

    fetchFollowRequests();
  }, [fetchFollows, fetchFollowRequests]);

  const requestFollow = useCallback(async (receiverId: number, name: string) => {
    try {
      await followApi.requestFollow({ receiverId });
      alert(`${name}님에게 친구 신청을 보냈습니다.`);
    } catch (error) {
      console.error('친구 신청 실패:', error);
      alert('친구 신청에 실패했습니다.');
    }
  }, []);

  const deleteFollow = useCallback(async (follow: Follow) => {
    try {
      if (follow.followId) {
        await followApi.deleteFollow(follow.followId);
      } else {
        // Mock fallback
      }
      setFollows((prev) => prev.filter((f) => f.id !== follow.id));
      alert(`${follow.name}님을 팔로우 취소했습니다.`);
    } catch (error) {
      console.error('친구 삭제 실패:', error);
      alert('친구 삭제에 실패했습니다.');
    }
  }, []);

  const acceptRequest = useCallback(
    async (id: number, name: string) => {
      try {
        await followApi.acceptFollow({ followRequestId: id }); // id를 followRequestId라고 가정
        setFollowRequests((prev) => prev.filter((req) => req.id !== id));
        alert(`${name}님의 팔로우 요청을 수락했습니다.`);
        fetchFollows();
      } catch (error) {
        console.error('친구 수락 실패:', error);
        alert('친구 수락에 실패했습니다.');
      }
    },
    [fetchFollows],
  );

  const rejectRequest = useCallback(async (id: number) => {
    try {
      await followApi.rejectFollow({ followRequestId: id });
      setFollowRequests((prev) => prev.filter((req) => req.id !== id));
      alert('팔로우 요청을 거절했습니다.');
    } catch (error) {
      console.error('친구 거절 실패:', error);
      alert('친구 거절에 실패했습니다.');
    }
  }, []);

  // 전체 유저 검색 (API 활용)
  const searchAllUsers = useCallback(
    async (query: string) => {
      if (!query.trim()) return [];
      try {
        // 1. 닉네임으로 검색 시도
        let res = await followApi.searchUsers({ nickname: query });

        // 2. 결과가 없으면 이메일로 검색 시도 (백엔드 제약 사항 대응)
        if (!res.data || res.data.length === 0) {
          res = await followApi.searchUsers({ email: query });
        }

        if (res.data) {
          const mappedUsers: Follow[] = res.data.map((u) => ({
            id: u.userId,
            name: u.nickname,
            email: u.email,
            color: 'bg-gray-200',
            profileExp: 'o_o',
            view_count: 0,
            isFollowing: follows.some((f) => f.id === u.userId), // 이미 팔로우 중인지 확인
            isFollower: false,
          }));
          return mappedUsers;
        }
        return [];
      } catch (error) {
        console.error('유저 검색 실패:', error);
        return [];
      }
    },
    [follows],
  );

  return {
    follows,
    followRequests,
    isVisitorMode,
    visitedFollowName,
    visitedUserId,
    isDualAiMode,
    isInteractionModalOpen,
    visitorBg,
    visitorVisibility,
    setFollows,
    setFollowRequests,
    setIsDualAiMode,
    setIsInteractionModalOpen,
    visitFollow,
    leaveFollow,
    requestFollow,
    deleteFollow,
    acceptRequest,
    rejectRequest,
    searchAllUsers,
    fetchFollowRequests,
    fetchFollows,
  };
}
