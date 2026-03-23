import { useState, useCallback, useEffect, useRef } from 'react';
import type { Follow, FollowRequest } from '../types';
import { VISITOR_PALETTES } from '../constants/theme';
import type { BgColors } from '../constants/theme';
import followApi from '../apis/followApi';
import { useUserStore } from '../store/useUserStore';

export function useFollow() {
  const { isLoggedIn } = useUserStore();
  const [follows, setFollows] = useState<Follow[]>([]);
  const [followRequests, setFollowRequests] = useState<FollowRequest[]>([]);

  // --- Search States (Integrated from pages) ---
  const [searchResults, setSearchResults] = useState<Follow[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isVisitorMode, setIsVisitorMode] = useState(false);
  const [visitedFollowName, setVisitedFollowName] = useState<string>('');
  const [visitedUserId, setVisitedUserId] = useState<number | null>(null);
  const [isDualAiMode, setIsDualAiMode] = useState(false);
  const [isInteractionModalOpen, setIsInteractionModalOpen] = useState(false);
  const [visitorBg, setVisitorBg] = useState<BgColors>({});
  const [visitorVisibility, setVisitorVisibility] = useState<'public' | 'private'>('public');

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

  // --- Lifecycle: Data Fetching & Cleanup ---
  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      // API 호출이 중복되거나 컴포넌트 언마운트 후 상태 업데이트 방지, 그리고 비로그인 상태 제외
      if (!isMounted || !isLoggedIn) return;
      await Promise.all([fetchFollows(), fetchFollowRequests()]);
    };

    loadInitialData();

    return () => {
      isMounted = false;
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [fetchFollows, fetchFollowRequests, isLoggedIn]);

  const visitFollow = useCallback(
    (id: number, isReturn: boolean = false) => {
      const user = follows.find((f) => f.id === id);
      if (!user) return null;

      setVisitedFollowName(user.name);
      setVisitedUserId(user.id);
      setIsVisitorMode(true);
      setIsDualAiMode(false);
      setIsInteractionModalOpen(false);

      const visibility = user.isFollowing ? 'private' : 'public';
      setVisitorVisibility(visibility);

      const randomPalette = VISITOR_PALETTES[Math.floor(Math.random() * VISITOR_PALETTES.length)];
      setVisitorBg(randomPalette);

      if (!isReturn) {
        alert(`${user.name}님의 방으로 방문합니다. (${visibility} 모드)`);
      }

      return `${user.name} : 우리집에 왜 왔니 ?`;
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
    return '서영님 눈물닦고 할일하세요';
  }, []);

  const requestFollow = useCallback(async (receiverId: number, name: string) => {
    try {
      await followApi.requestFollow({ receiverId });
      alert(`${name}님에게 친구 신청을 보냈습니다.`);
    } catch (error) {
      console.error('친구 신청 실패:', error);
      alert('친구 신청에 실패했습니다.');
    }
  }, []);

  const deleteFollow = useCallback(
    async (follow: Follow) => {
      try {
        if (follow.followId) {
          await followApi.deleteFollow(follow.followId);
        }
        alert(`${follow.name}님을 팔로우 취소했습니다.`);
        // 피드백 반영: 서버 데이터와 동기화
        fetchFollows();
      } catch (error) {
        console.error('친구 삭제 실패:', error);
        alert('친구 삭제에 실패했습니다.');
      }
    },
    [fetchFollows],
  );

  const acceptRequest = useCallback(
    async (id: number, name: string) => {
      try {
        await followApi.acceptFollow({ followRequestId: id });
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

  // --- Debounced Search Logic ---
  const handleSearch = useCallback(
    async (query: string) => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      setIsSearchLoading(true);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          // 닉네임, 이메일 검색을 병렬(Promise.all)로 진행하여 응답 속도 최적화
          // (차후 백엔드에서 통합 검색 API를 제공해주기 전까지 클라이언트 측 임시 최적화)
          const [nicknameRes, emailRes] = await Promise.all([
            followApi.searchUsers({ nickname: query }).catch(() => ({ data: [] as never[] })),
            followApi.searchUsers({ email: query }).catch(() => ({ data: [] as never[] })),
          ]);

          const combinedData = [...(nicknameRes.data || []), ...(emailRes.data || [])];

          // 중복 아이디(userId) 제거 로직
          const uniqueUsers = Array.from(new Map(combinedData.map((u) => [u.userId, u])).values());

          if (uniqueUsers.length > 0) {
            const mappedUsers: Follow[] = uniqueUsers.map((u) => ({
              id: u.userId,
              followId: undefined, // 검색 결과에는 followId가 없을 수 있음
              name: u.nickname,
              email: u.email,
              color: 'bg-gray-200',
              profileExp: 'o_o',
              view_count: 0,
              isFollowing: follows.some((f) => f.id === u.userId),
              isFollower: false,
            }));
            setSearchResults(mappedUsers);
          } else {
            setSearchResults([]);
          }
        } catch (error) {
          console.error('유저 검색 실패:', error);
          setSearchResults([]);
        } finally {
          setIsSearchLoading(false);
        }
      }, 500);
    },
    [follows],
  );

  return {
    follows,
    allUsers: follows, // CardPage.tsx 호환성을 위해 추가
    followRequests,
    searchResults,
    isSearchLoading,
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
    handleSearch,
    fetchFollowRequests,
    fetchFollows,
  };
}
