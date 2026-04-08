import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

export interface ChatSocketMessage {
  type: string;
  payload?: {
    text?: string;
    code?: string | number;
  };
}

export interface ChatRecordingOptions {
  sessionId: string | null;
  assistantType: string;
  memoryPolicy: string;
  chatSessionType: string;
  targetUserId: number | null;
}

interface HandleTransportMessageArgs {
  message: ChatSocketMessage;
  ignoreIncomingResponseRef: MutableRefObject<boolean>;
  pendingAiResponseTextRef: MutableRefObject<string>;
  pendingWakeResumeRef: MutableRefObject<boolean>;
  isSubmittingSpeechTurnRef: MutableRefObject<boolean>;
  textEndFallbackTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  endOfStreamFallbackTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  setConnectionNotice: (value: string) => void;
  setAiTextStreamingComplete: (value: boolean) => void;
  setChatMessages: Dispatch<SetStateAction<Array<{ sender: 'ai' | 'me'; text: string }>>>;
  setLatestAiText: (value: string) => void;
  setIsAiTextTyping: (value: boolean) => void;
  clearPendingStreamState: () => void;
  endAwaitingResponse: (resetVoiceStatus?: boolean) => void;
  cleanupAudioPlayback: (preserveLastText?: boolean) => void;
  completeEndOfStream: () => void;
  completeCancelledStream: () => void;
  completeErroredStream: (resumeWakeWord?: boolean) => void;
  completeTextFallback: (finalText?: string) => void;
  completeVoiceFallback: () => void;
  clearTypeWriter: () => void;
  clearTextEndFallbackTimer: () => void;
  clearEndOfStreamFallbackTimer: () => void;
  startAudioPlayback: (callbacks: { onPlay: () => void; onEnded: () => void }) => void;
  armFinalAudioCapture: () => void;
  resumeWakeWordWhenReady: () => void;
  handleVoiceRegistrationRequired: () => void;
  loginExpiredText: string;
  connectionErrorText: string;
  assistantMissingTextFragment: string;
  textEndFallbackMs: number;
  voiceEndFallbackMs: number;
}

export function handleTransportMessage({
  message,
  ignoreIncomingResponseRef,
  pendingAiResponseTextRef,
  pendingWakeResumeRef,
  isSubmittingSpeechTurnRef,
  textEndFallbackTimerRef,
  endOfStreamFallbackTimerRef,
  setConnectionNotice,
  setAiTextStreamingComplete,
  setChatMessages,
  setLatestAiText,
  setIsAiTextTyping,
  clearPendingStreamState,
  endAwaitingResponse,
  cleanupAudioPlayback,
  completeEndOfStream,
  completeCancelledStream,
  completeErroredStream,
  completeTextFallback,
  completeVoiceFallback,
  clearTypeWriter,
  clearTextEndFallbackTimer,
  clearEndOfStreamFallbackTimer,
  startAudioPlayback,
  armFinalAudioCapture,
  resumeWakeWordWhenReady,
  handleVoiceRegistrationRequired,
  loginExpiredText,
  connectionErrorText,
  assistantMissingTextFragment,
  textEndFallbackMs,
  voiceEndFallbackMs,
}: HandleTransportMessageArgs) {
  if (message.type === 'ACK') return;

  if (message.type === 'END_OF_STREAM') {
    if (ignoreIncomingResponseRef.current) {
      console.log('[socket] END_OF_STREAM ignored after cancel');
      clearPendingStreamState();
      endAwaitingResponse();
      cleanupAudioPlayback(true);
      return;
    }
    console.log('[socket] END_OF_STREAM');
    completeEndOfStream();
    return;
  }

  if (message.type === 'CANCELLED') {
    console.log('[socket] CANCELLED');
    ignoreIncomingResponseRef.current = true;
    completeCancelledStream();
    return;
  }

  if (message.type === 'ERROR' || message.type === 'error') {
    if (ignoreIncomingResponseRef.current) {
      console.log('[socket] ERROR ignored after cancel', message);
      return;
    }
    console.log('[socket] ERROR', message);
    isSubmittingSpeechTurnRef.current = false;
    const code = message.payload?.code;
    const errorText = message.payload?.text ?? '';
    if (errorText.includes(assistantMissingTextFragment)) {
      handleVoiceRegistrationRequired();
    } else if (code === 'TOKEN_EXPIRED' || code === 'UNAUTHORIZED' || code === 401) {
      setConnectionNotice(loginExpiredText);
    } else {
      setConnectionNotice(connectionErrorText);
    }
    if (!errorText.includes(assistantMissingTextFragment)) {
      completeErroredStream(false);
    }
    return;
  }

  if (ignoreIncomingResponseRef.current) {
    console.log('[socket] message ignored after cancel', message.type);
    return;
  }

  switch (message.type) {
    case 'text.start':
      console.log('[socket] text.start');
      clearTypeWriter();
      clearTextEndFallbackTimer();
      pendingAiResponseTextRef.current = '';
      setAiTextStreamingComplete(false);
      setChatMessages((prev) => [...prev, { sender: 'ai', text: '' }]);
      break;

    case 'text.end': {
      console.log('[socket] text.end', { textLength: message.payload?.text?.length ?? 0 });
      const aiResponseText = message.payload?.text || '';
      pendingAiResponseTextRef.current = aiResponseText;
      setAiTextStreamingComplete(true);
      clearTextEndFallbackTimer();
      textEndFallbackTimerRef.current = setTimeout(() => {
        console.warn('[socket] text.end fallback fired');
        completeTextFallback(aiResponseText);
      }, textEndFallbackMs);
      setLatestAiText(aiResponseText);
      setIsAiTextTyping(false);
      break;
    }

    case 'voice.start':
      console.log('[socket] voice.start');
      clearEndOfStreamFallbackTimer();
      clearTextEndFallbackTimer();
      startAudioPlayback({
        onPlay: () => {
          endAwaitingResponse();
        },
        onEnded: () => {
          endAwaitingResponse();
          if (pendingWakeResumeRef.current) {
            resumeWakeWordWhenReady();
            return;
          }
          resumeWakeWordWhenReady();
        },
      });
      break;

    case 'voice.end':
      console.log('[socket] voice.end');
      clearEndOfStreamFallbackTimer();
      clearTextEndFallbackTimer();
      armFinalAudioCapture();
      endOfStreamFallbackTimerRef.current = setTimeout(() => {
        console.warn('[socket] voice.end fallback fired');
        completeVoiceFallback();
      }, voiceEndFallbackMs);
      break;

    default:
      break;
  }
}

interface SendTextTurnArgs {
  ensureSocketReady: () => Promise<boolean>;
  wsRef: MutableRefObject<WebSocket | null>;
  options: ChatRecordingOptions;
  text: string;
}

export async function sendTextTurnOverSocket({
  ensureSocketReady,
  wsRef,
  options,
  text,
}: SendTextTurnArgs) {
  console.log('[useChat] sendTextTurn start', { text });
  const socketReady = await ensureSocketReady();
  const socket = wsRef.current;

  if (!socketReady || !socket || socket.readyState !== WebSocket.OPEN) {
    console.log('[useChat] sendTextTurn aborted: socket not ready', {
      socketReady,
      readyState: socket?.readyState ?? 'null',
    });
    return false;
  }

  socket.send(
    JSON.stringify({
      type: 'CHAT_START',
      sessionId: options.sessionId,
      assistantType: options.assistantType,
      memoryPolicy: options.memoryPolicy,
      chatSessionType: options.chatSessionType,
      targetUserId: options.targetUserId,
    }),
  );
  socket.send(JSON.stringify({ type: 'AUDIO_END' }));
  socket.send(JSON.stringify({ type: 'TEXT', text }));
  console.log('[useChat] sendTextTurn SUCCESS', { text });
  return true;
}
