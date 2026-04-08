import { useCallback, type MutableRefObject } from 'react';

interface UseChatTurnFlagsParams {
  pendingSpeechCaptureRef: MutableRefObject<boolean>;
  pendingSpeechSeedRef: MutableRefObject<string>;
  finalizeSpeechOnEndRef: MutableRefObject<boolean>;
  isSubmittingSpeechTurnRef: MutableRefObject<boolean>;
  speechTurnCompletedRef: MutableRefObject<boolean>;
  pendingWakeResumeRef: MutableRefObject<boolean>;
  hasCompletedInitialWakeTurnRef: MutableRefObject<boolean>;
}

export function useChatTurnFlags({
  pendingSpeechCaptureRef,
  pendingSpeechSeedRef,
  finalizeSpeechOnEndRef,
  isSubmittingSpeechTurnRef,
  speechTurnCompletedRef,
  pendingWakeResumeRef,
  hasCompletedInitialWakeTurnRef,
}: UseChatTurnFlagsParams) {
  const resetPendingSpeech = useCallback(() => {
    pendingSpeechCaptureRef.current = false;
    pendingSpeechSeedRef.current = '';
    finalizeSpeechOnEndRef.current = false;
  }, [finalizeSpeechOnEndRef, pendingSpeechCaptureRef, pendingSpeechSeedRef]);

  const resetTurnSubmission = useCallback(() => {
    isSubmittingSpeechTurnRef.current = false;
    speechTurnCompletedRef.current = false;
  }, [isSubmittingSpeechTurnRef, speechTurnCompletedRef]);

  const resetWakeResumeState = useCallback(() => {
    pendingWakeResumeRef.current = false;
    hasCompletedInitialWakeTurnRef.current = false;
  }, [hasCompletedInitialWakeTurnRef, pendingWakeResumeRef]);

  const resetConversationTurnFlags = useCallback(() => {
    resetWakeResumeState();
    resetPendingSpeech();
    resetTurnSubmission();
  }, [resetPendingSpeech, resetTurnSubmission, resetWakeResumeState]);

  return {
    resetPendingSpeech,
    resetTurnSubmission,
    resetWakeResumeState,
    resetConversationTurnFlags,
  };
}
