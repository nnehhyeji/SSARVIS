import { useCallback, useRef } from 'react';
import type { MutableRefObject } from 'react';

interface RecognitionErrorEventLike {
  error: string;
}

interface UseRecognitionLifecycleOptions {
  isRecognizingRef: MutableRefObject<boolean>;
  manualStopRef: MutableRefObject<boolean>;
  recognitionModeRef: MutableRefObject<string>;
  pendingSpeechCaptureRef: MutableRefObject<boolean>;
  pendingSpeechSeedRef: MutableRefObject<string>;
  isSubmittingSpeechTurnRef: MutableRefObject<boolean>;
  speechTurnCompletedRef: MutableRefObject<boolean>;
  wakeWordActiveRef: MutableRefObject<boolean>;
  restartTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  wakeModeReadyAtRef: MutableRefObject<number>;
  onClearRestartTimer: () => void;
  onWakeGuide: () => void;
  onSpeechModeError: (error: string) => void;
  onPendingWakeCapture: (seed: string) => void | Promise<void>;
  onRestartSpeechRecognition: () => void;
  onRestartWakeRecognition: (delay: number) => void;
}

export function useRecognitionLifecycle({
  isRecognizingRef,
  manualStopRef,
  recognitionModeRef,
  pendingSpeechCaptureRef,
  pendingSpeechSeedRef,
  isSubmittingSpeechTurnRef,
  speechTurnCompletedRef,
  wakeWordActiveRef,
  restartTimerRef,
  wakeModeReadyAtRef,
  onClearRestartTimer,
  onWakeGuide,
  onSpeechModeError,
  onPendingWakeCapture,
  onRestartSpeechRecognition,
  onRestartWakeRecognition,
}: UseRecognitionLifecycleOptions) {
  const onWakeGuideRef = useRef(onWakeGuide);
  const onSpeechModeErrorRef = useRef(onSpeechModeError);
  const onPendingWakeCaptureRef = useRef(onPendingWakeCapture);
  const onRestartSpeechRecognitionRef = useRef(onRestartSpeechRecognition);
  const onRestartWakeRecognitionRef = useRef(onRestartWakeRecognition);
  onWakeGuideRef.current = onWakeGuide;
  onSpeechModeErrorRef.current = onSpeechModeError;
  onPendingWakeCaptureRef.current = onPendingWakeCapture;
  onRestartSpeechRecognitionRef.current = onRestartSpeechRecognition;
  onRestartWakeRecognitionRef.current = onRestartWakeRecognition;

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
          onWakeGuideRef.current();
        }
        return;
      }

      if (recognitionModeRef.current === 'speech') {
        onSpeechModeErrorRef.current(event.error);
      }
    },
    [isRecognizingRef, manualStopRef, recognitionModeRef],
  );

  const handleRecognitionEnd = useCallback(() => {
    isRecognizingRef.current = false;
    onClearRestartTimer();

    const mode = recognitionModeRef.current;
    const pendingCapture = pendingSpeechCaptureRef.current;
    const manualStop = manualStopRef.current;
    manualStopRef.current = false;

    console.log('[onend] recognition.onend', {
      mode,
      pendingCapture,
      manualStop,
      submitting: isSubmittingSpeechTurnRef.current,
      completed: speechTurnCompletedRef.current,
    });

    if (isSubmittingSpeechTurnRef.current) {
      console.log('[onend] submitting -> skip');
      return;
    }

    if (pendingCapture && mode === 'wake') {
      console.log('[onend] wake word pending -> startSpeechCapture');
      pendingSpeechCaptureRef.current = false;
      void onPendingWakeCaptureRef.current(pendingSpeechSeedRef.current);
      return;
    }

    if (mode === 'speech') {
      if (speechTurnCompletedRef.current) return;
      if (wakeWordActiveRef.current) {
        console.log('[onend] speech mode -> restart recognition');
        restartTimerRef.current = setTimeout(() => {
          if (
            recognitionModeRef.current === 'speech' &&
            !isSubmittingSpeechTurnRef.current &&
            !speechTurnCompletedRef.current
          ) {
            onRestartSpeechRecognitionRef.current();
          }
        }, 150);
      }
      return;
    }

    if (mode === 'wake') {
      if (wakeWordActiveRef.current) {
        const delay = Math.max(250, wakeModeReadyAtRef.current - Date.now());
        onRestartWakeRecognitionRef.current(delay);
      }
    }
  }, [
    isRecognizingRef,
    isSubmittingSpeechTurnRef,
    manualStopRef,
    onClearRestartTimer,
    pendingSpeechCaptureRef,
    pendingSpeechSeedRef,
    recognitionModeRef,
    restartTimerRef,
    speechTurnCompletedRef,
    wakeModeReadyAtRef,
    wakeWordActiveRef,
  ]);

  return {
    handleRecognitionEnd,
    handleRecognitionError,
    handleRecognitionStart,
  };
}
