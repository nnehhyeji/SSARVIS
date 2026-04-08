import { useCallback } from 'react';
import type { MutableRefObject } from 'react';

interface RecognitionErrorEventLike {
  error: string;
}

interface UseGuestRecognitionLifecycleOptions {
  isRecognizingRef: MutableRefObject<boolean>;
  manualStopRef: MutableRefObject<boolean>;
  recognitionModeRef: MutableRefObject<string>;
  pendingSpeechCaptureRef: MutableRefObject<boolean>;
  restartTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  onWakeGuide: () => void;
  onSpeechModeError: (error: string) => void;
  onPendingWakeCapture: () => void | Promise<void>;
  onFinalizeSpeech: () => void | Promise<void>;
  onRestartWakeRecognition: () => void;
}

export function useGuestRecognitionLifecycle({
  isRecognizingRef,
  manualStopRef,
  recognitionModeRef,
  pendingSpeechCaptureRef,
  restartTimerRef,
  onWakeGuide,
  onSpeechModeError,
  onPendingWakeCapture,
  onFinalizeSpeech,
  onRestartWakeRecognition,
}: UseGuestRecognitionLifecycleOptions) {
  const handleRecognitionStart = useCallback(() => {
    isRecognizingRef.current = true;
  }, [isRecognizingRef]);

  const handleRecognitionError = useCallback(
    (event: RecognitionErrorEventLike) => {
      isRecognizingRef.current = false;

      if (manualStopRef.current) {
        manualStopRef.current = false;
        return;
      }

      if (recognitionModeRef.current === 'wake') {
        if (event.error !== 'aborted') {
          onWakeGuide();
        }
        return;
      }

      if (recognitionModeRef.current === 'speech') {
        onSpeechModeError(event.error);
      }
    },
    [
      isRecognizingRef,
      manualStopRef,
      onSpeechModeError,
      onWakeGuide,
      recognitionModeRef,
    ],
  );

  const handleRecognitionEnd = useCallback(() => {
    isRecognizingRef.current = false;

    if (pendingSpeechCaptureRef.current && recognitionModeRef.current === 'wake') {
      manualStopRef.current = false;
      pendingSpeechCaptureRef.current = false;
      void onPendingWakeCapture();
      return;
    }

    if (recognitionModeRef.current === 'speech' && manualStopRef.current) {
      manualStopRef.current = false;
      void onFinalizeSpeech();
      return;
    }

    if (manualStopRef.current) {
      manualStopRef.current = false;
      return;
    }

    if (recognitionModeRef.current === 'wake') {
      restartTimerRef.current = setTimeout(() => {
        onRestartWakeRecognition();
      }, 250);
    }
  }, [
    isRecognizingRef,
    manualStopRef,
    onFinalizeSpeech,
    onPendingWakeCapture,
    onRestartWakeRecognition,
    pendingSpeechCaptureRef,
    recognitionModeRef,
    restartTimerRef,
  ]);

  return {
    handleRecognitionEnd,
    handleRecognitionError,
    handleRecognitionStart,
  };
}
