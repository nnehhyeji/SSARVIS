import { useCallback, useRef } from 'react';
import type { MutableRefObject } from 'react';

interface UseSpeechSilenceMonitorOptions {
  speechSessionIdRef: MutableRefObject<number>;
  recognitionModeRef: MutableRefObject<string>;
  isSubmittingSpeechTurnRef: MutableRefObject<boolean>;
  speechTurnCompletedRef: MutableRefObject<boolean>;
  lastSpeechTimeRef: MutableRefObject<number>;
  hasDetectedSpeechRef: MutableRefObject<boolean>;
  sttTextRef: MutableRefObject<string>;
  speechSilenceMs: number;
  initialSpeechGraceMs: number;
  onFinalize: (shouldSendText: boolean) => void | Promise<void>;
}

export function useSpeechSilenceMonitor({
  speechSessionIdRef,
  recognitionModeRef,
  isSubmittingSpeechTurnRef,
  speechTurnCompletedRef,
  lastSpeechTimeRef,
  hasDetectedSpeechRef,
  sttTextRef,
  speechSilenceMs,
  initialSpeechGraceMs,
  onFinalize,
}: UseSpeechSilenceMonitorOptions) {
  const silenceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onFinalizeRef = useRef(onFinalize);
  onFinalizeRef.current = onFinalize;

  const stopSilenceMonitor = useCallback(() => {
    if (silenceIntervalRef.current) {
      clearInterval(silenceIntervalRef.current);
      silenceIntervalRef.current = null;
    }
  }, []);

  const startSilenceMonitor = useCallback(
    (sessionId: number) => {
      stopSilenceMonitor();
      lastSpeechTimeRef.current = Date.now();
      console.log('[silence] monitor started for session', sessionId);

      silenceIntervalRef.current = setInterval(() => {
        if (sessionId !== speechSessionIdRef.current) {
          console.log('[silence] stale session, stopping monitor');
          stopSilenceMonitor();
          return;
        }

        if (recognitionModeRef.current !== 'speech') {
          console.log('[silence] mode changed to', recognitionModeRef.current, ', stopping monitor');
          stopSilenceMonitor();
          return;
        }

        if (isSubmittingSpeechTurnRef.current || speechTurnCompletedRef.current) {
          console.log('[silence] already submitting/completed, stopping monitor');
          stopSilenceMonitor();
          return;
        }

        const elapsed = Date.now() - lastSpeechTimeRef.current;
        const silenceThreshold = hasDetectedSpeechRef.current
          ? speechSilenceMs
          : initialSpeechGraceMs;

        if (elapsed >= silenceThreshold) {
          const text = sttTextRef.current.trim();
          console.log(
            '[silence] silence detected! elapsed=' +
              elapsed +
              'ms, threshold=' +
              silenceThreshold +
              'ms, text=' +
              JSON.stringify(text),
          );
          stopSilenceMonitor();
          void onFinalizeRef.current(!!text);
        }
      }, 200);
    },
    [
      hasDetectedSpeechRef,
      initialSpeechGraceMs,
      isSubmittingSpeechTurnRef,
      lastSpeechTimeRef,
      recognitionModeRef,
      speechSessionIdRef,
      speechSilenceMs,
      speechTurnCompletedRef,
      stopSilenceMonitor,
      sttTextRef,
    ],
  );

  return {
    startSilenceMonitor,
    stopSilenceMonitor,
  };
}
