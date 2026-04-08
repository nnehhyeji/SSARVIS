import { useCallback } from 'react';

interface UseChatRuntimeCleanupParams {
  onStopSilenceMonitor: () => void;
  onClearSpeechSilenceTimer: () => void;
  onClearTranscriptTimer: () => void;
  onClearWakeResumeCooldownTimer: () => void;
  onClearEndOfStreamFallbackTimer: () => void;
  onClearTextEndFallbackTimer: () => void;
  onClearTypeWriter: () => void;
  onCleanupAudioPlayback: () => void;
  onStopMediaRecorder: () => void;
  onStopRecognition: () => void;
}

export function useChatRuntimeCleanup({
  onStopSilenceMonitor,
  onClearSpeechSilenceTimer,
  onClearTranscriptTimer,
  onClearWakeResumeCooldownTimer,
  onClearEndOfStreamFallbackTimer,
  onClearTextEndFallbackTimer,
  onClearTypeWriter,
  onCleanupAudioPlayback,
  onStopMediaRecorder,
  onStopRecognition,
}: UseChatRuntimeCleanupParams) {
  const clearConversationTimers = useCallback(() => {
    onStopSilenceMonitor();
    onClearSpeechSilenceTimer();
    onClearTranscriptTimer();
    onClearWakeResumeCooldownTimer();
    onClearEndOfStreamFallbackTimer();
    onClearTextEndFallbackTimer();
    onClearTypeWriter();
  }, [
    onClearEndOfStreamFallbackTimer,
    onClearSpeechSilenceTimer,
    onClearTextEndFallbackTimer,
    onClearTranscriptTimer,
    onClearTypeWriter,
    onClearWakeResumeCooldownTimer,
    onStopSilenceMonitor,
  ]);

  const stopConversationRuntime = useCallback(() => {
    onCleanupAudioPlayback();
    onStopMediaRecorder();
    onStopRecognition();
  }, [onCleanupAudioPlayback, onStopMediaRecorder, onStopRecognition]);

  return {
    clearConversationTimers,
    stopConversationRuntime,
  };
}
