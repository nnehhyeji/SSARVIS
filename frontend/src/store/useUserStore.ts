import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Mode } from '../types';
import { useVoiceLockStore } from './useVoiceLockStore';

interface UserInfo {
  id: number | null;
  email: string | null;
  nickname: string | null;
  customId: string | null;
}

interface UserState {
  hasHydrated: boolean;
  isLoggedIn: boolean;
  userInfo: UserInfo | null;
  currentMode: Mode;
  login: (user: UserInfo) => void;
  logout: () => void;
  clearUserData: () => void;
  setCurrentMode: (mode: Mode) => void;
  setHasHydrated: (value: boolean) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      hasHydrated: false,
      isLoggedIn: false,
      userInfo: null,
      currentMode: 'normal',

      login: (user) => set({ isLoggedIn: true, userInfo: user }),

      logout: () => {
        set({ isLoggedIn: false, userInfo: null });
        localStorage.removeItem('token');
        useVoiceLockStore.getState().resetVoiceLockState();
      },

      clearUserData: () => {
        set({ isLoggedIn: false, userInfo: null });
        localStorage.removeItem('token');
        useVoiceLockStore.getState().resetVoiceLockState();
      },

      setCurrentMode: (mode) => set({ currentMode: mode }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'user-storage',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
