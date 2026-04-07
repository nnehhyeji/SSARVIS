import { useState, useCallback, useEffect, useRef } from 'react';
import type { Follow, FollowRequest } from '../types';
import followApi from '../apis/followApi';
import { useUserStore } from '../store/useUserStore';
import { toast } from '../store/useToastStore';

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
        customId: f.customId || '',
        profileImgUrl: f.followerProfileImgUrl || '',
        email: '',
        description: f.description || '',
        color: 'bg-indigo-100',
        profileExp: '^-^',
        view_count: 0,
        isFollowing: true,
        isFollower: false,
      }));

      const mappedFollowers: Follow[] = (followerRes.data || []).map((f) => ({
        id: f.followerId,
        followId: f.followId,
        name: f.nickname || '이름 없음',
        customId: f.customId || '',
        profileImgUrl: f.followerProfileImgUrl || '',
        email: '',
        description: f.description || '',
        color: 'bg-blue-100',
        profileExp: '^o^',
        view_count: 0,
        isFollowing: false,
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
    (id: number, isReturn: boolean = false, fallbackName?: string) => {
      const user = follows.find((f) => f.id === id);

      // 팔로우 관계가 없더라도 fallbackName이 있으면 방문 허용
      const name = user?.name || fallbackName || '';
      if (!name) return null;

      setVisitedFollowName(name);
      setVisitedUserId(id);
      setIsVisitorMode(true);
      setIsDualAiMode(false);
      setIsInteractionModalOpen(false);

      const visibility = user?.isFollowing ? 'private' : 'public';
      setVisitorVisibility(visibility);

      if (!isReturn) {
        toast.info(`${name}님의 방으로 이동해요.`, `${visibility} 모드로 방문합니다.`);
      }

      return `${name}: 브리지에 다녀왔어요.`;
    },
    [follows],
  );

  const leaveFollow = useCallback(() => {
    setIsVisitorMode(false);
    setIsDualAiMode(false);
    setIsInteractionModalOpen(false);
    setVisitedFollowName('');
    setVisitedUserId(null);
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
      toast.success(`${name}님에게 친구 요청을 보냈어요.`);
    } catch (error) {
      console.error('친구 요청 실패:', error);
      toast.error('친구 요청에 실패했어요.');
    }
  }, []);

  const deleteFollow = useCallback(
    async (follow: Follow) => {
      try {
        if (follow.followId) {
          await followApi.deleteFollow(follow.followId);
          toast.success(`${follow.name}님과의 관계를 해제했어요.`);
          fetchFollows();
          return;
        }
        toast.error('아직 해제할 수 없는 관계예요.');
      } catch (error) {
        console.error('친구 해제 실패:', error);
        toast.error('친구 해제에 실패했어요.');
      }
    },
    [fetchFollows],
  );

  const acceptRequest = useCallback(
    async (id: number, name: string) => {
      try {
        await followApi.acceptFollow({ followRequestId: id });
        setFollowRequests((prev) => prev.filter((req) => req.id !== id));
        toast.success(`${name}님의 친구 요청을 수락했어요.`);
        fetchFollows();
      } catch (error) {
        console.error('친구 요청 수락 실패:', error);
        toast.error('친구 요청 수락에 실패했어요.');
      }
    },
    [fetchFollows],
  );

  const rejectRequest = useCallback(async (id: number) => {
    try {
      await followApi.rejectFollow({ followRequestId: id });
      setFollowRequests((prev) => prev.filter((req) => req.id !== id));
      toast.success('친구 요청을 거절했어요.');
    } catch (error) {
      console.error('친구 요청 거절 실패:', error);
      toast.error('친구 요청 거절에 실패했어요.');
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
          const res = await followApi.searchUsers(query);
          const rawUsers = res.data || [];

          if (rawUsers.length > 0) {
            const mappedUsers: Follow[] = rawUsers.map((u) => ({
              id: u.userId,
              followId: undefined,
              name: u.nickname,
              customId: u.customId || '',
              profileImgUrl: u.profileImageUrl || '',
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
    allUsers: follows,
    followRequests,
    searchResults,
    isSearchLoading,
    isVisitorMode,
    visitedFollowName,
    visitedUserId,
    isDualAiMode,
    isInteractionModalOpen,
    visitorVisibility,
    setFollows,
    setFollowRequests,
    setIsDualAiMode,
    setIsInteractionModalOpen,
    setIsVisitorMode,
    setVisitedFollowName,
    setVisitedUserId,
    setVisitorVisibility,
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
