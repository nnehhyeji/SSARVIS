import { useState, useCallback, useEffect, useRef } from 'react';
import type { Follow, FollowRequest } from '../types';
import { VISITOR_PALETTES } from '../constants/theme';
import type { BgColors } from '../constants/theme';
import followApi from '../apis/followApi';
import { useUserStore } from '../store/useUserStore';

function mergeFollowRelations(followingData: Follow[], followerData: Follow[]): Follow[] {
  const merged = new Map<number, Follow>();

  for (const follow of followingData) {
    merged.set(follow.id, follow);
  }

  for (const follower of followerData) {
    const existing = merged.get(follower.id);

    if (existing) {
      merged.set(follower.id, {
        ...existing,
        isFollower: true,
        description: existing.description || follower.description,
      });
      continue;
    }

    merged.set(follower.id, follower);
  }

  return Array.from(merged.values());
}

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
      const [followingRes, followerRes] = await Promise.all([
        followApi.getFollowList(),
        followApi.getFollowerList(),
      ]);

      const mappedFollowing: Follow[] = (followingRes.data || []).map((f) => ({
        id: f.userId,
        followId: f.followId,
        name: f.nickname || '이름 없음',
        email: '',
        description: f.description || '',
        color: 'bg-indigo-100',
        profileExp: '^-^',
        view_count: 0,
        isFollowing: true,
        isFollower: true,
      }));

      const mappedFollowers: Follow[] = (followerRes.data || []).map((f) => ({
        id: f.followerId,
        name: f.nickname || '이름 없음',
        email: '',
        description: f.description || '',
        color: 'bg-blue-100',
        profileExp: '^o^',
        view_count: 0,
        isFollowing: true,
        isFollower: true,
      }));

      setFollows(mergeFollowRelations(mappedFollowing, mappedFollowers));
    } catch (error) {
      console.error('팔로우 목록 조회 실패:', error);
    }
  }, []);

  const fetchFollowRequests = useCallback(async () => {
    try {
      const res = await followApi.getFollowRequests();
      if (res.data) {
        const mappedRequests: FollowRequest[] = res.data.map((req) => ({
          id: req.followRequestId,
          name: req.senderNickname || '이름 없음',
          email: req.senderEmail || '',
          color: 'bg-blue-100',
          profileExp: '^o^',
        }));
        setFollowRequests(mappedRequests);
      }
    } catch (error) {
      console.error('팔로우 요청 목록 조회 실패:', error);
    }
  }, []);

  // --- Lifecycle: Data Fetching & Cleanup ---
  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      // API 호출 중복과 언마운트 후 상태 업데이트를 막고, 비로그인 상태는 제외한다.
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

      return `${user.name}: 브리지에 다녀왔어요.`;
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
    return '메인 화면으로 돌아왔어요.';
  }, []);

  const requestFollow = useCallback(async (receiverId: number, name: string) => {
    try {
      await followApi.requestFollow({ receiverId });
      setSearchResults((prev) =>
        prev.map((user) =>
          user.id === receiverId
            ? { ...user, followStatus: 'REQUESTED', isFollowing: false }
            : user,
        ),
      );
      alert(`${name}님에게 친구 요청을 보냈습니다.`);
    } catch (error) {
      console.error('친구 요청 실패:', error);
      alert('친구 요청에 실패했습니다.');
    }
  }, []);

  const deleteFollow = useCallback(
    async (follow: Follow) => {
      try {
        if (follow.followId) {
          await followApi.deleteFollow(follow.followId);
          alert(`${follow.name}님과의 관계를 해제했습니다.`);
          fetchFollows();
          return;
        }
        alert('아직 해제할 수 없는 관계입니다.');
      } catch (error) {
        console.error('친구 해제 실패:', error);
        alert('친구 해제에 실패했습니다.');
      }
    },
    [fetchFollows],
  );

  const acceptRequest = useCallback(
    async (id: number, name: string) => {
      try {
        await followApi.acceptFollow({ followRequestId: id });
        setFollowRequests((prev) => prev.filter((req) => req.id !== id));
        alert(`${name}님의 친구 요청을 수락했습니다.`);
        fetchFollows();
      } catch (error) {
        console.error('친구 요청 수락 실패:', error);
        alert('친구 요청 수락에 실패했습니다.');
      }
    },
    [fetchFollows],
  );

  const rejectRequest = useCallback(async (id: number) => {
    try {
      await followApi.rejectFollow({ followRequestId: id });
      setFollowRequests((prev) => prev.filter((req) => req.id !== id));
      alert('친구 요청을 거절했습니다.');
    } catch (error) {
      console.error('친구 요청 거절 실패:', error);
      alert('친구 요청 거절에 실패했습니다.');
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
          // 닉네임과 이메일 검색을 병렬로 호출해 응답 시간을 줄인다.
          // 백엔드 통합 검색 API가 생기기 전까지의 프론트 임시 최적화다.
          const [nicknameRes, emailRes] = await Promise.all([
            followApi.searchUsers({ nickname: query }).catch(() => ({ data: [] as never[] })),
            followApi.searchUsers({ email: query }).catch(() => ({ data: [] as never[] })),
          ]);

          const combinedData = [...(nicknameRes.data || []), ...(emailRes.data || [])];

          // userId 기준으로 중복 검색 결과를 제거한다.
          const uniqueUsers = Array.from(new Map(combinedData.map((u) => [u.userId, u])).values());

          if (uniqueUsers.length > 0) {
            const mappedUsers: Follow[] = uniqueUsers.map((u) => ({
              id: u.userId,
              followId: undefined, // 寃??寃곌낵?먮뒗 followId媛 ?놁쓣 ???덉쓬
              name: u.nickname,
              email: u.email,
              description: '',
              color: 'bg-gray-200',
              profileExp: 'o_o',
              view_count: 0,
              followStatus: u.followStatus,
              isFollowing:
                u.followStatus === 'FOLLOWING' ||
                follows.some((f) => f.id === u.userId && f.isFollowing),
              isFollower: false,
            }));
            setSearchResults(mappedUsers);
          } else {
            setSearchResults([]);
          }
        } catch (error) {
          console.error('사용자 검색 실패:', error);
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
    allUsers: follows, // CardPage.tsx ?명솚?깆쓣 ?꾪빐 異붽?
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
