import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import authApi from '../apis/authApi';

interface VoiceLockState {
  isVoiceLockRegistered: boolean;
  isVoiceLockEnabled: boolean;
  lockPhrase: string;
  isLocked: boolean;
  timeoutDuration: number; // in seconds
  lastActivity: number;

  setIsVoiceLockRegistered: (registered: boolean) => void;
  setVoiceLockEnabled: (enabled: boolean) => void;
  setLockPhrase: (phrase: string) => void;
  setIsLocked: (locked: boolean) => void;
  setTimeoutDuration: (duration: number) => void;
  resetTimer: () => void;

  // API Actions
  fetchVoiceLockStatus: () => Promise<void>;
  clearVoiceLock: () => Promise<void>;
  resetVoiceLockState: () => void;
}

const DEFAULT_LOCK_PHRASE = '싸비스';
const DEFAULT_TIMEOUT_DURATION = 300;
const VOICE_LOCK_STORAGE_KEY = 'voice-lock-storage-v4';

export const useVoiceLockStore = create<VoiceLockState>()(
  persist(
    (set, get) => ({
      isVoiceLockRegistered: false,
      isVoiceLockEnabled: false,
      lockPhrase: DEFAULT_LOCK_PHRASE,
      isLocked: false,
      timeoutDuration: DEFAULT_TIMEOUT_DURATION, // 기본값 300초 (5분)
      lastActivity: Date.now(),

      setIsVoiceLockRegistered: (registered) => set({ isVoiceLockRegistered: registered }),
      setVoiceLockEnabled: (enabled) => set({ isVoiceLockEnabled: enabled }),
      setLockPhrase: (phrase) => set({ lockPhrase: phrase }),
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
          const response = await authApi.getVoiceLockStatus();
          const registered = response.data.checked;
          set({ isVoiceLockRegistered: registered });
          // 만약 등록되어 있지 않다면 활성화도 꺼짐
          if (!registered) {
            set({ isVoiceLockEnabled: false });
          }
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
            lockPhrase: DEFAULT_LOCK_PHRASE,
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
          lockPhrase: DEFAULT_LOCK_PHRASE,
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
