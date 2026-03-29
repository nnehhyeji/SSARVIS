import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface MicState {
  hasHydrated: boolean;
  micPreferenceEnabled: boolean;
  micRuntimeActive: boolean;
  setHasHydrated: (value: boolean) => void;
  setMicPreferenceEnabled: (enabled: boolean) => void;
  setMicRuntimeActive: (active: boolean) => void;
  syncMicState: (active: boolean) => void;
  resetMicRuntime: () => void;
}

const MIC_STORAGE_KEY = 'mic-preference-storage-v1';

export const useMicStore = create<MicState>()(
  persist(
    (set) => ({
      hasHydrated: false,
      micPreferenceEnabled: true,
      micRuntimeActive: false,

      setHasHydrated: (value) => set({ hasHydrated: value }),
      setMicPreferenceEnabled: (enabled) => set({ micPreferenceEnabled: enabled }),
      setMicRuntimeActive: (active) => set({ micRuntimeActive: active }),
      syncMicState: (active) =>
        set({
          micPreferenceEnabled: active,
          micRuntimeActive: active,
        }),
      resetMicRuntime: () => set({ micRuntimeActive: false }),
    }),
    {
      name: MIC_STORAGE_KEY,
      partialize: (state) => ({
        micPreferenceEnabled: state.micPreferenceEnabled,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
        state?.resetMicRuntime();
      },
    },
  ),
);
