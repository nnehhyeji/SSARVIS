import { useState, useCallback } from 'react';
import type { Follow, FollowRequest } from '../types';
import { VISITOR_PALETTES } from '../constants/theme';
import type { BgColors } from '../constants/theme';

// ─── useFollow ───
// 역할: 팔로우 목록, 요청, 방문 모드 및 상호작용 관련 상태를 관리합니다.
// - 팔로우 방문, 삭제, 요청 수락/거절 기능을 제공합니다.

export function useFollow() {
  const [follows, setFollows] = useState<Follow[]>([
    { id: 1, name: '김싸피', color: 'bg-pink-200', profileExp: 'o_o' },
    { id: 2, name: '박싸피', color: 'bg-teal-200', profileExp: '-_-' },
  ]);

  const [followRequests, setFollowRequests] = useState<FollowRequest[]>([
    { id: 3, name: '최싸피', color: 'bg-blue-200', profileExp: '^o^' },
    { id: 4, name: '이싸피', color: 'bg-green-200', profileExp: 'O_O' },
  ]);

  const [isVisitorMode, setIsVisitorMode] = useState(false);
  const [visitedFollowName, setVisitedFollowName] = useState<string>('');
  const [isDualAiMode, setIsDualAiMode] = useState(false);
  const [isInteractionModalOpen, setIsInteractionModalOpen] = useState(false);
  const [visitorBg, setVisitorBg] = useState<BgColors>({});

  const visitFollow = useCallback((name: string, isReturn: boolean = false) => {
    setVisitedFollowName(name);
    setIsVisitorMode(true);
    setIsDualAiMode(false);
    setIsInteractionModalOpen(false);

    const randomPalette = VISITOR_PALETTES[Math.floor(Math.random() * VISITOR_PALETTES.length)];
    setVisitorBg(randomPalette);

    if (!isReturn) {
      alert(`${name}님의 방으로 방문합니다.`);
    }

    return `${name} : 우리집에 왜 왔니 ?`; // triggerText 용도
  }, []);

  const leaveFollow = useCallback(() => {
    setIsVisitorMode(false);
    setIsDualAiMode(false);
    setIsInteractionModalOpen(false);
    setVisitedFollowName('');
    setVisitorBg({});
    return '서영님 눈물닦고 할일하세요'; // triggerText 복구용
  }, []);

  const deleteFollow = useCallback((id: number) => {
    setFollows((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const acceptRequest = useCallback((id: number, name: string) => {
    setFollowRequests((prev) => prev.filter((req) => req.id !== id));
    alert(`${name}님의 팔로우 요청을 수락했습니다.`);
  }, []);

  const rejectRequest = useCallback((id: number) => {
    setFollowRequests((prev) => prev.filter((req) => req.id !== id));
  }, []);

  return {
    follows,
    followRequests,
    isVisitorMode,
    visitedFollowName,
    isDualAiMode,
    isInteractionModalOpen,
    visitorBg,
    setFollows,
    setFollowRequests,
    setIsDualAiMode,
    setIsInteractionModalOpen,
    visitFollow,
    leaveFollow,
    deleteFollow,
    acceptRequest,
    rejectRequest,
  };
}
