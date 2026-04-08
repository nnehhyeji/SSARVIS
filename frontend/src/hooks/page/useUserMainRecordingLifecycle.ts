import { useCallback, useEffect } from 'react';

type StartRecordingFn = (
  sessionId: string | null,
  assistantType: string,
  memoryPolicy: string,
  category?: string,
  targetId?: number | null,
) => Promise<boolean>;

type UpdateRecordingContextFn = (
  sessionId: string | null,
  assistantType: string,
  memoryPolicy: string,
  category?: string,
  targetId?: number | null,
) => void;

type DidAutoStartRef = {
  current: boolean;
};

type UseUserMainRecordingLifecycleInput = {
  isMyHome: boolean;
  currentMode: string;
  isPersonaShared: boolean;
  isLockMode: boolean;
  targetId: number | null;
  hasHydrated: boolean;
  micStoreHydrated: boolean;
  hasUserGesture: boolean;
  micPreferenceEnabled: boolean;
  isMicOn: boolean;
  showEmptyPersonaMessage: boolean;
  didAutoStartRef: DidAutoStartRef;
  activeChatStartRecording: StartRecordingFn;
  updateRecordingContext: UpdateRecordingContextFn;
  setMicRuntimeActive: (active: boolean) => void;
  setIsTextInputMode: (enabled: boolean) => void;
};

export function useUserMainRecordingLifecycle(input: UseUserMainRecordingLifecycleInput) {
  const {
    isMyHome,
    currentMode,
    isPersonaShared,
    isLockMode,
    targetId,
    hasHydrated,
    micStoreHydrated,
    hasUserGesture,
    micPreferenceEnabled,
    isMicOn,
    showEmptyPersonaMessage,
    didAutoStartRef,
    activeChatStartRecording,
    updateRecordingContext,
    setMicRuntimeActive,
    setIsTextInputMode,
  } = input;

  const getAssistantType = useCallback(() => {
    if (isMyHome) {
      if (currentMode === 'counseling') return 'COUNSEL';
      if (currentMode === 'normal') return 'DAILY';
      return currentMode.toUpperCase();
    }

    return isPersonaShared ? 'PERSONA' : 'DAILY';
  }, [currentMode, isMyHome, isPersonaShared]);

  const getMemoryPolicy = useCallback(() => {
    return isMyHome && isLockMode ? 'SECRET' : 'GENERAL';
  }, [isLockMode, isMyHome]);

  const getSessionCategory = useCallback(() => {
    return isMyHome ? 'USER_AI' : 'AVATAR_AI';
  }, [isMyHome]);

  useEffect(() => {
    if (
      !micStoreHydrated ||
      !hasUserGesture ||
      !micPreferenceEnabled ||
      !hasHydrated ||
      didAutoStartRef.current ||
      isMicOn ||
      !targetId ||
      showEmptyPersonaMessage
    ) {
      return;
    }

    const assistantType = getAssistantType();
    const memoryPolicy = getMemoryPolicy();
    const category = getSessionCategory();
    const recordingTargetId = category === 'USER_AI' ? null : targetId;
    didAutoStartRef.current = true;

    void (async () => {
      setIsTextInputMode(false);
      const started = await activeChatStartRecording(
        null,
        assistantType,
        memoryPolicy,
        category,
        recordingTargetId,
      );
      setMicRuntimeActive(Boolean(started));
      if (!started) {
        setIsTextInputMode(true);
      }
    })();
  }, [
    activeChatStartRecording,
    didAutoStartRef,
    getAssistantType,
    getMemoryPolicy,
    getSessionCategory,
    hasHydrated,
    hasUserGesture,
    isMicOn,
    micPreferenceEnabled,
    micStoreHydrated,
    setIsTextInputMode,
    setMicRuntimeActive,
    showEmptyPersonaMessage,
    targetId,
  ]);

  useEffect(() => {
    const category = getSessionCategory();
    const recordingTargetId = category === 'USER_AI' ? null : targetId;

    updateRecordingContext(
      null,
      getAssistantType(),
      getMemoryPolicy(),
      category,
      recordingTargetId,
    );
  }, [
    getAssistantType,
    getMemoryPolicy,
    getSessionCategory,
    targetId,
    updateRecordingContext,
  ]);

  return {
    getAssistantType,
    getMemoryPolicy,
    getSessionCategory,
  };
}
