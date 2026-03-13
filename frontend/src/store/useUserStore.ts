import { create } from 'zustand';

// 1. Store에서 관리할 상태(State)와 액션(Action)의 타입 정의
interface UserState {
  isLoggedIn: boolean;
  userInfo: {
    id: number | null;
    name: string | null;
  } | null;

  // 상태 변경하는 함수들
  login: (user: { id: number; name: string }) => void;
  logout: () => void;
}

// 2. Zustand Store 생성
export const useUserStore = create<UserState>((set) => ({
  // 초기 상태(초기값)
  isLoggedIn: false,
  userInfo: null,

  // 상태 변경 함수 (로그인 됨)
  login: (user) => set({ isLoggedIn: true, userInfo: user }),

  // 상태 변경 함수 (로그아웃 됨)
  logout: () => set({ isLoggedIn: false, userInfo: null }),
}));
