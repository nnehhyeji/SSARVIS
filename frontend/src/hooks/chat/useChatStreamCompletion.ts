import { useCallback, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';

interface UseChatStreamCompletionParams {
  isSubmittingSpeechTurnRef: MutableRefObject<boolean>;
  pendingAiResponseTextRef: MutableRefObject<string>;
  setConnectionNotice: Dispatch<SetStateAction<string>>;
  setAiTextStreamingComplete: Dispatch<SetStateAction<boolean>>;
  setAiStreamComplete: Dispatch<SetStateAction<boolean>>;
  onClearEndOfStreamFallbackTimer: () => void;
  onClearTextEndFallbackTimer: () => void;
  onClearTypeWriter: () => void;
  onEndAwaitingResponse: (clearTranscript?: boolean) => void;
  onCleanupAudioPlayback: () => void;
  onCommitFinalAiMessage: (finalText?: string) => void;
  onFinalizeAudioStream: () => void;
  onResumeWakeWordWhenReady: () => void;
}

export function useChatStreamCompletion({
  isSubmittingSpeechTurnRef,
  pendingAiResponseTextRef,
  setConnectionNotice,
  setAiTextStreamingComplete,
  setAiStreamComplete,
  onClearEndOfStreamFallbackTimer,
  onClearTextEndFallbackTimer,
  onClearTypeWriter,
  onEndAwaitingResponse,
  onCleanupAudioPlayback,
  onCommitFinalAiMessage,
  onFinalizeAudioStream,
  onResumeWakeWordWhenReady,
}: UseChatStreamCompletionParams) {
  const onClearEndOfStreamFallbackTimerRef = useRef(onClearEndOfStreamFallbackTimer);
  const onClearTextEndFallbackTimerRef = useRef(onClearTextEndFallbackTimer);
  const onClearTypeWriterRef = useRef(onClearTypeWriter);
  const onEndAwaitingResponseRef = useRef(onEndAwaitingResponse);
  const onCleanupAudioPlaybackRef = useRef(onCleanupAudioPlayback);
  const onCommitFinalAiMessageRef = useRef(onCommitFinalAiMessage);
  const onFinalizeAudioStreamRef = useRef(onFinalizeAudioStream);
  const onResumeWakeWordWhenReadyRef = useRef(onResumeWakeWordWhenReady);
  onClearEndOfStreamFallbackTimerRef.current = onClearEndOfStreamFallbackTimer;
  onClearTextEndFallbackTimerRef.current = onClearTextEndFallbackTimer;
  onClearTypeWriterRef.current = onClearTypeWriter;
  onEndAwaitingResponseRef.current = onEndAwaitingResponse;
  onCleanupAudioPlaybackRef.current = onCleanupAudioPlayback;
  onCommitFinalAiMessageRef.current = onCommitFinalAiMessage;
  onFinalizeAudioStreamRef.current = onFinalizeAudioStream;
  onResumeWakeWordWhenReadyRef.current = onResumeWakeWordWhenReady;

  const clearPendingStreamState = useCallback(() => {
    isSubmittingSpeechTurnRef.current = false;
    onClearEndOfStreamFallbackTimerRef.current();
    onClearTextEndFallbackTimerRef.current();
    pendingAiResponseTextRef.current = '';
    onClearTypeWriterRef.current();
  }, [isSubmittingSpeechTurnRef, pendingAiResponseTextRef]);

  const completeCancelledStream = useCallback(() => {
    clearPendingStreamState();
    setConnectionNotice('');
    setAiTextStreamingComplete(true);
    setAiStreamComplete(true);
    onEndAwaitingResponseRef.current();
    onCleanupAudioPlaybackRef.current();
    onResumeWakeWordWhenReadyRef.current();
  }, [
    clearPendingStreamState,
    setAiStreamComplete,
    setAiTextStreamingComplete,
    setConnectionNotice,
  ]);

  const completeErroredStream = useCallback(
    (clearTranscript: boolean) => {
      clearPendingStreamState();
      setAiTextStreamingComplete(true);
      setAiStreamComplete(true);
      onEndAwaitingResponseRef.current(clearTranscript);
      onCleanupAudioPlaybackRef.current();
      onResumeWakeWordWhenReadyRef.current();
    },
    [clearPendingStreamState, setAiStreamComplete, setAiTextStreamingComplete],
  );

  const completeTextFallback = useCallback(
    (finalText?: string) => {
      setAiStreamComplete(true);
      onClearTypeWriterRef.current();
      onCommitFinalAiMessageRef.current(finalText);
      onEndAwaitingResponseRef.current();
      onCleanupAudioPlaybackRef.current();
      onResumeWakeWordWhenReadyRef.current();
    },
    [setAiStreamComplete],
  );

  const completeVoiceFallback = useCallback(() => {
    setAiStreamComplete(true);
    onClearTypeWriterRef.current();
    onCommitFinalAiMessageRef.current();
    onEndAwaitingResponseRef.current();
    onFinalizeAudioStreamRef.current();
    onResumeWakeWordWhenReadyRef.current();
  }, [setAiStreamComplete]);

  const completeEndOfStream = useCallback(() => {
    isSubmittingSpeechTurnRef.current = false;
    setConnectionNotice('');
    onClearEndOfStreamFallbackTimerRef.current();
    onClearTextEndFallbackTimerRef.current();
    setAiStreamComplete(true);
    onClearTypeWriterRef.current();
    onCommitFinalAiMessageRef.current();
    onFinalizeAudioStreamRef.current();
  }, [
    isSubmittingSpeechTurnRef,
    setAiStreamComplete,
    setConnectionNotice,
  ]);

  return {
    clearPendingStreamState,
    completeCancelledStream,
    completeErroredStream,
    completeTextFallback,
    completeVoiceFallback,
    completeEndOfStream,
  };
}
