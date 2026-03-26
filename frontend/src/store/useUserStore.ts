import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Mode } from '../types';

// 1. Store에서 관리할 상태(State)와 액션(Action)의 타입 정의
interface UserInfo {
  id: number | null;
  email: string | null;
  nickname: string | null;
  customId: string | null;
}

interface UserState {
  isLoggedIn: boolean;
  userInfo: UserInfo | null;
  currentMode: Mode;

  // 상태 변경하는 함수들
  login: (user: UserInfo) => void;
  logout: () => void;
  clearUserData: () => void;
  setCurrentMode: (mode: Mode) => void;
}

// 2. Zustand Store 생성 (persist 미들웨어 추가)
export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      // 초기 상태(초기값)
      isLoggedIn: false,
      userInfo: null,
      currentMode: 'normal',

      // 상태 변경 함수 (로그인 됨)
      login: (user) => set({ isLoggedIn: true, userInfo: user }),

      setCurrentMode: (mode: Mode) => set({ currentMode: mode }),

      // 상태 변경 함수 (로그아웃 됨)
      logout: () => {
        set({ isLoggedIn: false, userInfo: null });
        localStorage.removeItem('access_token');
      },

      clearUserData: () => {
        set({ isLoggedIn: false, userInfo: null });
        localStorage.removeItem('access_token');
      },
    }),
    {
      name: 'user-storage', // localStorage에 저장될 키 이름
    },
  ),
);
