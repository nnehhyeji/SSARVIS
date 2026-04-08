import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';

interface UseAwaitingResponseStateParams {
  awaitingResponseRef: MutableRefObject<boolean>;
  recognitionModeRef: MutableRefObject<string>;
  waitingMessage: string;
  setIsAwaitingResponse: Dispatch<SetStateAction<boolean>>;
  setAiTextStreamingComplete: Dispatch<SetStateAction<boolean>>;
  setAiStreamComplete: Dispatch<SetStateAction<boolean>>;
  setVoiceStatus: Dispatch<SetStateAction<string>>;
  setSttText: Dispatch<SetStateAction<string>>;
  onClearEndOfStreamFallbackTimer: () => void;
  onClearTextEndFallbackTimer: () => void;
}

interface ResetAwaitingResponseOptions {
  voiceStatus: string;
  clearTranscript?: boolean;
  aiTextStreamingComplete?: boolean;
  aiStreamComplete?: boolean;
}

export function useAwaitingResponseState({
  awaitingResponseRef,
  recognitionModeRef,
  waitingMessage,
  setIsAwaitingResponse,
  setAiTextStreamingComplete,
  setAiStreamComplete,
  setVoiceStatus,
  setSttText,
  onClearEndOfStreamFallbackTimer,
  onClearTextEndFallbackTimer,
}: UseAwaitingResponseStateParams) {
  const beginAwaitingResponse = useCallback(
    (message = waitingMessage) => {
      awaitingResponseRef.current = true;
      setIsAwaitingResponse(true);
      setAiTextStreamingComplete(false);
      setAiStreamComplete(false);
      onClearEndOfStreamFallbackTimer();
      onClearTextEndFallbackTimer();
      setVoiceStatus(message);
      setSttText(message);
    },
    [
      awaitingResponseRef,
      onClearEndOfStreamFallbackTimer,
      onClearTextEndFallbackTimer,
      setAiStreamComplete,
      setAiTextStreamingComplete,
      setIsAwaitingResponse,
      setSttText,
      setVoiceStatus,
      waitingMessage,
    ],
  );

  const endAwaitingResponse = useCallback(
    (clearTranscript: boolean = true) => {
      awaitingResponseRef.current = false;
      setIsAwaitingResponse(false);
      if (clearTranscript) {
        setSttText('');
      }
    },
    [awaitingResponseRef, setIsAwaitingResponse, setSttText],
  );

  const updateVoiceStatus = useCallback(
    (message: string) => {
      setVoiceStatus(message);
      if (recognitionModeRef.current !== 'speech' && !awaitingResponseRef.current) {
        setSttText(message);
      }
    },
    [awaitingResponseRef, recognitionModeRef, setSttText, setVoiceStatus],
  );

  const resetAwaitingResponseState = useCallback(
    ({
      voiceStatus,
      clearTranscript = true,
      aiTextStreamingComplete = true,
      aiStreamComplete = true,
    }: ResetAwaitingResponseOptions) => {
      awaitingResponseRef.current = false;
      setIsAwaitingResponse(false);
      setVoiceStatus(voiceStatus);
      setAiTextStreamingComplete(aiTextStreamingComplete);
      setAiStreamComplete(aiStreamComplete);
      if (clearTranscript) {
        setSttText('');
      }
    },
    [
      awaitingResponseRef,
      setAiStreamComplete,
      setAiTextStreamingComplete,
      setIsAwaitingResponse,
      setSttText,
      setVoiceStatus,
    ],
  );

  return {
    beginAwaitingResponse,
    endAwaitingResponse,
    updateVoiceStatus,
    resetAwaitingResponseState,
  };
}
