import { useCallback } from 'react';
import type { MutableRefObject } from 'react';

interface StartStopRecognition {
  start: () => void;
  stop: () => void;
}

interface UseRecognitionControlsOptions {
  recognitionRef: MutableRefObject<StartStopRecognition | null>;
  isRecognizingRef: MutableRefObject<boolean>;
  manualStopRef: MutableRefObject<boolean>;
  onClearRestartTimer: () => void;
  onStartError: (message: string) => void;
}

export function useRecognitionControls({
  recognitionRef,
  isRecognizingRef,
  manualStopRef,
  onClearRestartTimer,
  onStartError,
}: UseRecognitionControlsOptions) {
  const stopRecognition = useCallback(() => {
    onClearRestartTimer();
    manualStopRef.current = true;

    if (!recognitionRef.current || !isRecognizingRef.current) {
      manualStopRef.current = false;
      return;
    }

    try {
      recognitionRef.current.stop();
    } catch {
      manualStopRef.current = false;
    }
  }, [isRecognizingRef, manualStopRef, onClearRestartTimer, recognitionRef]);

  const safeStartRecognition = useCallback(() => {
    if (!recognitionRef.current || isRecognizingRef.current) return;

    try {
      manualStopRef.current = false;
      recognitionRef.current.start();
    } catch (error) {
      const message = String((error as Error).message || error);
      if (!message.includes('already started')) {
        onStartError(message);
      }
    }
  }, [isRecognizingRef, manualStopRef, onStartError, recognitionRef]);

  return {
    safeStartRecognition,
    stopRecognition,
  };
}
