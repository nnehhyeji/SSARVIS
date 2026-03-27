import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import authApi from '../apis/authApi';
import userApi from '../apis/userApi';

interface VoiceLockState {
  isVoiceLockRegistered: boolean;
  isVoiceLockEnabled: boolean;
  isLocked: boolean;
  timeoutDuration: number; // in seconds
  lastActivity: number;

  setIsVoiceLockRegistered: (registered: boolean) => void;
  setVoiceLockEnabled: (enabled: boolean) => void;
  setIsLocked: (locked: boolean) => void;
  setTimeoutDuration: (duration: number) => void;
  resetTimer: () => void;

  // API Actions
  fetchVoiceLockStatus: () => Promise<void>;
  clearVoiceLock: () => Promise<void>;
  resetVoiceLockState: () => void;
}

const DEFAULT_TIMEOUT_DURATION = 300;
const VOICE_LOCK_STORAGE_KEY = 'voice-lock-storage-v4';

export const useVoiceLockStore = create<VoiceLockState>()(
  persist(
    (set, get) => ({
      isVoiceLockRegistered: false,
      isVoiceLockEnabled: false,
      isLocked: false,
      timeoutDuration: DEFAULT_TIMEOUT_DURATION, // 기본값 300초 (5분)
      lastActivity: Date.now(),

      setIsVoiceLockRegistered: (registered) => set({ isVoiceLockRegistered: registered }),
      setVoiceLockEnabled: (enabled) => set({ isVoiceLockEnabled: enabled }),
      setIsLocked: (locked) => {
        const state = get();
        set({
          isLocked: locked,
          lastActivity: locked ? state.lastActivity : Date.now(),
        });
      },
      setTimeoutDuration: (duration) => set({ timeoutDuration: duration }),
      resetTimer: () => set({ lastActivity: Date.now() }),

      fetchVoiceLockStatus: async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
          // 1. 등록 여부 (Voice Fingerprint) 조회
          const authRes = await authApi.getVoiceLockStatus();
          const registered = authRes.data.checked;
          
          // 2. 설정 정보 (Enabled, Timeout) 조회
          const userProfile = await userApi.getUserProfile();
          
          set({ 
            isVoiceLockRegistered: registered,
            isVoiceLockEnabled: userProfile.isVoiceLockActive && registered,
            timeoutDuration: userProfile.voiceLockTimeout || DEFAULT_TIMEOUT_DURATION,
          });
        } catch (error) {
          console.error('Failed to fetch voice lock status:', error);
        }
      },

      clearVoiceLock: async () => {
        try {
          await authApi.deleteVoiceLock();
          set({
            isVoiceLockRegistered: false,
            isVoiceLockEnabled: false,
          });
        } catch (error) {
          console.error('Failed to delete voice lock:', error);
          throw error;
        }
      },

      resetVoiceLockState: () => {
        set({
          isVoiceLockRegistered: false,
          isVoiceLockEnabled: false,
          isLocked: false,
          timeoutDuration: DEFAULT_TIMEOUT_DURATION,
          lastActivity: Date.now(),
        });
        localStorage.removeItem(VOICE_LOCK_STORAGE_KEY);
      },
    }),
    {
      name: VOICE_LOCK_STORAGE_KEY,
    },
  ),
);
