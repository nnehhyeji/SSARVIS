import { useState, useCallback } from 'react';
import type { Follow, FollowRequest } from '../types';
import { VISITOR_PALETTES } from '../constants/theme';
import type { BgColors } from '../constants/theme';

// ─── useFollow ───
// 역할: 팔로우 목록, 요청, 방문 모드 및 상호작용 관련 상태를 관리합니다.
// - 팔로우 방문, 삭제, 요청 수락/거절 기능을 제공합니다.

export function useFollow() {
  const [follows, setFollows] = useState<Follow[]>([
    {
      id: 1,
      name: '김싸피',
      email: 'kim@ssafy.com',
      color: 'bg-pink-200',
      profileExp: 'o_o',
      view_count: 120,
      isFollowing: true,
      isFollower: true,
    },
    {
      id: 2,
      name: '박싸피',
      email: 'park@ssafy.com',
      color: 'bg-teal-200',
      profileExp: '-_-',
      view_count: 345,
      isFollowing: false,
      isFollower: true,
    },
    {
      id: 5,
      name: '오싸피',
      email: 'oh@ssafy.com',
      color: 'bg-indigo-200',
      profileExp: '^_~',
      view_count: 88,
      isFollowing: true,
      isFollower: false,
    },
  ]);

  // 전역 사용자 검색을 시뮬레이션하기 위한 임의의 전체 사용자 목록
  const [allUsers] = useState<Follow[]>([
    {
      id: 1,
      name: '김싸피',
      email: 'kim@ssafy.com',
      color: 'bg-pink-200',
      profileExp: 'o_o',
      view_count: 120,
      isFollowing: true,
      isFollower: true,
    },
    {
      id: 2,
      name: '박싸피',
      email: 'park@ssafy.com',
      color: 'bg-teal-200',
      profileExp: '-_-',
      view_count: 345,
      isFollowing: false,
      isFollower: true,
    },
    {
      id: 5,
      name: '오싸피',
      email: 'oh@ssafy.com',
      color: 'bg-indigo-200',
      profileExp: '^_~',
      view_count: 88,
      isFollowing: true,
      isFollower: false,
    },
    {
      id: 10,
      name: '전싸피',
      email: 'jeon@ssafy.com',
      color: 'bg-orange-200',
      profileExp: 'X_X',
      view_count: 42,
      isFollowing: false,
      isFollower: false,
    },
    {
      id: 11,
      name: '구싸피',
      email: 'koo@ssafy.com',
      color: 'bg-yellow-200',
      profileExp: 'U_U',
      view_count: 12,
      isFollowing: false,
      isFollower: false,
    },
  ]);

  const [followRequests, setFollowRequests] = useState<FollowRequest[]>([
    { id: 3, name: '최싸피', email: 'choi@ssafy.com', color: 'bg-blue-200', profileExp: '^o^' },
    { id: 4, name: '이싸피', email: 'lee@ssafy.com', color: 'bg-green-200', profileExp: 'O_O' },
  ]);

  const [isVisitorMode, setIsVisitorMode] = useState(false);
  const [visitedFollowName, setVisitedFollowName] = useState<string>('');
  const [isDualAiMode, setIsDualAiMode] = useState(false);
  const [isInteractionModalOpen, setIsInteractionModalOpen] = useState(false);
  const [visitorBg, setVisitorBg] = useState<BgColors>({});
  const [visitorVisibility, setVisitorVisibility] = useState<'public' | 'private'>('public');

  const visitFollow = useCallback(
    (name: string, isReturn: boolean = false) => {
      // 1. follows 목록에서 먼저 검색
      let user = follows.find((f) => f.name === name);
      // 2. 없으면 allUsers(전체 유저)에서 검색 (글로벌 검색 방문 지원)
      if (!user) user = allUsers.find((u) => u.name === name);

      setVisitedFollowName(name);
      setIsVisitorMode(true);
      setIsDualAiMode(false);
      setIsInteractionModalOpen(false);

      // 공개 범위 로직: 내가 팔로우하고 있는 사람(isFollowing)이면 private, 아니면 public
      const visibility = user?.isFollowing ? 'private' : 'public';
      setVisitorVisibility(visibility);

      const randomPalette = VISITOR_PALETTES[Math.floor(Math.random() * VISITOR_PALETTES.length)];
      setVisitorBg(randomPalette);

      if (!isReturn) {
        alert(`${name}님의 방으로 방문합니다. (${visibility} 모드)`);
      }

      return `${name} : 우리집에 왜 왔니 ?`; // triggerText 용도
    },
    [follows, allUsers],
  );

  const leaveFollow = useCallback(() => {
    setIsVisitorMode(false);
    setIsDualAiMode(false);
    setIsInteractionModalOpen(false);
    setVisitedFollowName('');
    setVisitorBg({});
    setVisitorVisibility('public');
    return '서영님 눈물닦고 할일하세요'; // triggerText 복구용
  }, []);

  const deleteFollow = useCallback((id: number) => {
    setFollows((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const acceptRequest = useCallback((id: number, name: string) => {
    setFollowRequests((prev) => prev.filter((req) => req.id !== id));
    alert(`${name}님의 팔로우 요청을 수락했습니다.`);
    // 실제라면 여기서 follows에 추가하거나 상태를 업데이트해야 함
  }, []);

  const rejectRequest = useCallback((id: number) => {
    setFollowRequests((prev) => prev.filter((req) => req.id !== id));
  }, []);

  // 전체 유저 검색 시뮬레이션 (이메일 & 이름 포함)
  const searchAllUsers = useCallback(
    (query: string) => {
      if (!query.trim()) return [];
      const lower = query.toLowerCase();
      return allUsers.filter(
        (u) => u.name.toLowerCase().includes(lower) || u.email.toLowerCase().includes(lower),
      );
    },
    [allUsers],
  );

  return {
    follows,
    allUsers, // 전체 검색용 리스트 노출
    followRequests,
    isVisitorMode,
    visitedFollowName,
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
    deleteFollow,
    acceptRequest,
    rejectRequest,
    searchAllUsers,
  };
}
