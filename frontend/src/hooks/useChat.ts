import { useCallback, useEffect, useRef, useState } from 'react';

import type { ChatMessage } from '../types';
import { useChatAudioPlayback } from './useChatAudioPlayback';
import { useNavigate } from 'react-router-dom';
import { useChatSocket } from './useChatSocket';
import { useVoiceLockStore } from '../store/useVoiceLockStore';
import { useUserStore } from '../store/useUserStore';
import { PATHS } from '../routes/paths';
import { getUserVoiceModel } from '../apis/aiApi';
import { toast } from '../store/useToastStore';
import { WAKE_WORD as WAKE_WORD_CONSTANT } from '../constants/voice';

interface WebSpeechRecognitionResultItem {
  transcript: string;
}

interface WebSpeechRecognitionResult {
  isFinal?: boolean;
  0: WebSpeechRecognitionResultItem;
  length: number;
}

interface WebSpeechRecognitionEvent {
  resultIndex: number;
  results: ArrayLike<WebSpeechRecognitionResult>;
}

interface WebSpeechRecognitionErrorEvent {
  error: string;
}

interface WebSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: WebSpeechRecognitionEvent) => void) | null;
  onerror: ((event: WebSpeechRecognitionErrorEvent) => void) | null;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type RecognitionMode = 'idle' | 'wake' | 'speech';

interface RecordingOptions {
  sessionId: string | null;
  assistantType: string;
  memoryPolicy: string;
  chatSessionType: string;
  targetUserId: number | null;
}

interface ChatSocketMessage {
  type: string;
  payload?: {
    text?: string;
    code?: string | number;
  };
}

interface UseChatOptions {
  initialGreeting?: string;
}

const DEFAULT_GREETING = '난 너야, 만나서 반가워.';
const WAKE_WORD = WAKE_WORD_CONSTANT;
const WAKE_WORD_ALIASES = [
  WAKE_WORD,
  '사비스',
  '싸비쓰',
  '서비스',
  '싸비스야',
  '비스',
  '싸비',
  '싸쓰',
];
// 1.5초 무응답 시 API 요청 전송
const SPEECH_SILENCE_MS = 1500;
const INITIAL_SPEECH_GRACE_MS = 3500;
const TRANSCRIPT_VISIBLE_MS = 3000;
const TEXT_END_FALLBACK_MS = 4000;
const WAKE_RESUME_COOLDOWN_MS = 1200;
const WAITING_FOR_AI_TEXT = 'AI 응답을 준비하고 있어요...';
const WAKE_GUIDE_TEXT = `"${WAKE_WORD}"라고 말하면 음성 인식을 시작할게요.`;
const WAKE_DETECTED_TEXT = `${WAKE_WORD}를 들었어요. 하고 싶은 말을 이어서 해주세요.`;
const SPEECH_LISTENING_TEXT = '말씀을 듣고 있어요...';
const CONNECTION_ERROR_TEXT = '서버 연결에 문제가 있어요. 다시 시도해주세요.';
const LOGIN_EXPIRED_TEXT = '로그인이 만료되었어요. 다시 로그인해주세요.';
const VOICE_REGISTRATION_REQUIRED_TEXT =
  '대화를 시작하려면 먼저 음성을 등록해야 해요. 튜토리얼에서 음성 등록을 완료해 주세요.';
const SECRET_MODE_GREETING = '시크릿 모드예요. 이 대화는 기록되지 않고 지금 이 순간에만 머물러요.';
const SPEECH_STOPPED_TEXT = '음성 듣기를 종료했어요.';
const VOICE_REGISTRATION_TOAST_ID = 'voice-registration-required';

function normalizeText(text: string) {
  return text.replace(/\s+/g, '').toLowerCase();
}

function containsWakeWord(text: string) {
  const normalized = normalizeText(text);
  return WAKE_WORD_ALIASES.some((alias) => normalized.includes(normalizeText(alias)));
}

function extractSpeechAfterWakeWord(text: string): string {
  for (const alias of WAKE_WORD_ALIASES) {
    const index = text.indexOf(alias);
    if (index >= 0) {
      return text
        .slice(index + alias.length)
        .replace(/^[\s,.:;!?~'"`-]+/, '')
        .trim();
    }
  }
  return '';
}

function matchRouteCommand(text: string): string | null {
  void text;
  return null;
}

function matchHomeRouteCommand(text: string, userId?: number | null): string | null {
  const normalized = normalizeText(text);

  if (normalized === '홈' || normalized === '홈으로' || normalized === '메인화면') {
    return userId ? PATHS.USER_HOME(userId) : PATHS.HOME;
  }

  return null;
}

export function useChat({ initialGreeting = DEFAULT_GREETING }: UseChatOptions = {}) {
  const navigate = useNavigate();
  const userInfo = useUserStore((state) => state.userInfo);
  const { isLocked } = useVoiceLockStore();
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(
    initialGreeting ? [{ sender: 'ai', text: initialGreeting }] : [],
  );
  const [backupMessages, setBackupMessages] = useState<ChatMessage[] | null>(null);
  const [isLockMode, setIsLockMode] = useState(false);
  const [sttText, setSttText] = useState('');
  const [latestAiText, setLatestAiText] = useState(initialGreeting);
  const [voiceStatus, setVoiceStatus] = useState(WAKE_GUIDE_TEXT);
  const [voicePhase, setVoicePhase] = useState<RecognitionMode>('idle');
  const [wakeWordDetectedAt, setWakeWordDetectedAt] = useState<number | null>(null);
  const [isWakeWordActive, setIsWakeWordActive] = useState(false);
  const [isAwaitingResponse, setIsAwaitingResponse] = useState(false);
  const [isContinuousConversationEnabled] = useState(true);
  const [connectionNotice, setConnectionNotice] = useState('');
  const [aiTextStreamingComplete, setAiTextStreamingComplete] = useState(true);
  const [aiStreamComplete, setAiStreamComplete] = useState(true);
  const [isAiTextTyping, setIsAiTextTyping] = useState(false);

  const {
    audioElemRef,
    isAiSpeaking,
    aiSpeechProgress,
    aiPlaybackActiveRef,
    enqueueAudioChunk,
    armFinalAudioCapture,
    startAudioPlayback,
    finalizeAudioStream,
    cleanupAudioPlayback,
    clearAiPlaybackFallbackTimer,
    unlockAudioPlayback,
  } = useChatAudioPlayback();

  // --- Refs ---
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const typeWriterIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recognitionRef = useRef<WebSpeechRecognition | null>(null);
  const recognitionModeRef = useRef<RecognitionMode>('idle');
  const isRecognizingRef = useRef(false);
  const manualStopRef = useRef(false);
  const pendingSpeechCaptureRef = useRef(false);
  const pendingSpeechSeedRef = useRef('');
  // speechSessionIdRef: incremented each time we enter speech mode, used to invalidate stale timers
  const speechSessionIdRef = useRef(0);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transcriptClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechSilenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sttTextRef = useRef('');
  const currentRecordingOptionsRef = useRef<RecordingOptions | null>(null);
  const wakeWordActiveRef = useRef(false);
  const finalizeSpeechOnEndRef = useRef(false);
  const speechTurnCompletedRef = useRef(false);
  const isSpeechRecognitionSupported = useRef(true);
  const awaitingResponseRef = useRef(false);
  const resumeWakeWordRef = useRef<(() => void) | null>(null);
  const pendingWakeResumeRef = useRef(false);
  const isSubmittingSpeechTurnRef = useRef(false);
  // Silence polling: interval checks lastSpeechTime every 200ms
  const lastSpeechTimeRef = useRef<number>(0);
  const silenceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finalizeSpeechTurnRef = useRef<((shouldSend: boolean) => Promise<void>) | null>(null);
  const startSpeechCaptureRef = useRef<((initialText?: string) => Promise<void>) | null>(null);
  const safeStartRecognitionRef = useRef<(() => void) | null>(null);
  const hasVerifiedVoiceModelRef = useRef(false);
  const voiceModelCheckPromiseRef = useRef<Promise<boolean> | null>(null);
  const hasDetectedSpeechRef = useRef(false);
  const pendingAiResponseTextRef = useRef('');
  const ignoreIncomingResponseRef = useRef(false);
  const endOfStreamFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textEndFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wakeResumeCooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wakeModeReadyAtRef = useRef(0);
  const isContinuousConversationEnabledRef = useRef(isContinuousConversationEnabled);
  const hasCompletedInitialWakeTurnRef = useRef(false);

  // --- Timer helpers ---
  const clearTypeWriter = useCallback(() => {
    if (typeWriterIntervalRef.current) {
      clearInterval(typeWriterIntervalRef.current);
      typeWriterIntervalRef.current = null;
    }
    setIsAiTextTyping(false);
  }, []);

  const commitFinalAiMessage = useCallback((finalText?: string) => {
    const resolvedText = (finalText ?? pendingAiResponseTextRef.current).trim();
    if (!resolvedText) return;

    setLatestAiText(resolvedText);
    setChatMessages((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last?.sender === 'ai') {
        last.text = resolvedText;
      } else {
        next.push({ sender: 'ai', text: resolvedText });
      }
      return next;
    });
  }, []);

  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  const clearTranscriptTimer = useCallback(() => {
    if (transcriptClearTimerRef.current) {
      clearTimeout(transcriptClearTimerRef.current);
      transcriptClearTimerRef.current = null;
    }
  }, []);

  const clearSpeechSilenceTimer = useCallback(() => {
    if (speechSilenceTimerRef.current) {
      clearTimeout(speechSilenceTimerRef.current);
      speechSilenceTimerRef.current = null;
    }
  }, []);

  const clearEndOfStreamFallbackTimer = useCallback(() => {
    if (endOfStreamFallbackTimerRef.current) {
      clearTimeout(endOfStreamFallbackTimerRef.current);
      endOfStreamFallbackTimerRef.current = null;
    }
  }, []);

  const clearTextEndFallbackTimer = useCallback(() => {
    if (textEndFallbackTimerRef.current) {
      clearTimeout(textEndFallbackTimerRef.current);
      textEndFallbackTimerRef.current = null;
    }
  }, []);

  const clearWakeResumeCooldownTimer = useCallback(() => {
    if (wakeResumeCooldownTimerRef.current) {
      clearTimeout(wakeResumeCooldownTimerRef.current);
      wakeResumeCooldownTimerRef.current = null;
    }
  }, []);

  const stopSilenceMonitor = useCallback(() => {
    if (silenceIntervalRef.current) {
      clearInterval(silenceIntervalRef.current);
      silenceIntervalRef.current = null;
    }
  }, []);

  // --- State management ---
  const beginAwaitingResponse = useCallback(
    (message = WAITING_FOR_AI_TEXT) => {
      ignoreIncomingResponseRef.current = false;
      awaitingResponseRef.current = true;
      setIsAwaitingResponse(true);
      setAiTextStreamingComplete(false);
      setAiStreamComplete(false);
      clearEndOfStreamFallbackTimer();
      clearTextEndFallbackTimer();
      setVoiceStatus(message);
      setSttText(message);
    },
    [clearEndOfStreamFallbackTimer, clearTextEndFallbackTimer],
  );

  const endAwaitingResponse = useCallback((clearTranscript: boolean = true) => {
    awaitingResponseRef.current = false;
    setIsAwaitingResponse(false);
    if (clearTranscript) {
      setSttText('');
    }
  }, []);

  const updateVoiceStatus = useCallback((message: string) => {
    setVoiceStatus(message);
    if (recognitionModeRef.current !== 'speech' && !awaitingResponseRef.current) {
      setSttText(message);
    }
  }, []);

  const resumeWakeWordWhenReady = useCallback(() => {
    if (!wakeWordActiveRef.current) return;

    // Reset state so the next turn can always begin
    isSubmittingSpeechTurnRef.current = false;
    speechTurnCompletedRef.current = false;

    if (awaitingResponseRef.current || aiPlaybackActiveRef.current) {
      pendingWakeResumeRef.current = true;
      return;
    }

    pendingWakeResumeRef.current = false;
    clearWakeResumeCooldownTimer();
    wakeModeReadyAtRef.current = Date.now() + WAKE_RESUME_COOLDOWN_MS;
    setSttText('');
    wakeResumeCooldownTimerRef.current = setTimeout(() => {
      if (
        !wakeWordActiveRef.current ||
        awaitingResponseRef.current ||
        aiPlaybackActiveRef.current ||
        isSubmittingSpeechTurnRef.current
      ) {
        return;
      }
      if (isContinuousConversationEnabledRef.current && hasCompletedInitialWakeTurnRef.current) {
        void startSpeechCaptureRef.current?.('');
        return;
      }
      updateVoiceStatus(WAKE_GUIDE_TEXT);
      resumeWakeWordRef.current?.();
    }, WAKE_RESUME_COOLDOWN_MS);
  }, [aiPlaybackActiveRef, clearWakeResumeCooldownTimer, updateVoiceStatus]);

  const stopMediaRecorder = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder) return;
    if (mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    mediaRecorder.stream.getTracks().forEach((track) => track.stop());
    mediaRecorderRef.current = null;
  }, []);

  const stopRecognition = useCallback(() => {
    clearRestartTimer();
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
  }, [clearRestartTimer]);

  const updateRecordingContext = useCallback(
    (
      sessionId: string | null,
      assistantType: string,
      memoryPolicy: string,
      chatSessionType: string = 'USER_AI',
      targetUserId: number | null = null,
    ) => {
      currentRecordingOptionsRef.current = {
        sessionId,
        assistantType,
        memoryPolicy,
        chatSessionType,
        targetUserId,
      };
    },
    [],
  );

  const safeStartRecognition = useCallback(() => {
    if (!recognitionRef.current || isRecognizingRef.current) return;
    try {
      manualStopRef.current = false;
      recognitionRef.current.start();
    } catch (error) {
      const message = String((error as Error).message || error);
      if (!message.includes('already started')) {
        updateVoiceStatus(`음성 인식을 시작하지 못했어요: ${message}`);
      }
    }
  }, [updateVoiceStatus]);

  // --- Connection handlers ---
  const handleConnectionUnavailable = useCallback((hasToken: boolean) => {
    setConnectionNotice(hasToken ? CONNECTION_ERROR_TEXT : LOGIN_EXPIRED_TEXT);
  }, []);

  const handleSocketOpen = useCallback(() => {
    setConnectionNotice('');
  }, []);

  const openVoiceRegistrationGuide = useCallback(() => {
    navigate(PATHS.TUTORIAL);
  }, [navigate]);

  const showVoiceRegistrationToast = useCallback(() => {
    toast.dismiss(VOICE_REGISTRATION_TOAST_ID);
    toast.show({
      id: VOICE_REGISTRATION_TOAST_ID,
      title: '음성 등록이 필요해요',
      description: VOICE_REGISTRATION_REQUIRED_TEXT,
      variant: 'info',
      duration: 7000,
      actionLabel: '튜토리얼 이동',
      onAction: openVoiceRegistrationGuide,
    });
  }, [openVoiceRegistrationGuide]);

  const handleVoiceRegistrationRequired = useCallback(() => {
    hasVerifiedVoiceModelRef.current = false;
    setConnectionNotice(VOICE_REGISTRATION_REQUIRED_TEXT);
    endAwaitingResponse(false);
    cleanupAudioPlayback(true);
    updateVoiceStatus(VOICE_REGISTRATION_REQUIRED_TEXT);
    showVoiceRegistrationToast();
    resumeWakeWordWhenReady();
  }, [
    cleanupAudioPlayback,
    endAwaitingResponse,
    resumeWakeWordWhenReady,
    showVoiceRegistrationToast,
    updateVoiceStatus,
  ]);

  const ensureVoiceModelReady = useCallback(async () => {
    if (hasVerifiedVoiceModelRef.current) {
      return true;
    }

    if (voiceModelCheckPromiseRef.current) {
      return voiceModelCheckPromiseRef.current;
    }

    voiceModelCheckPromiseRef.current = (async () => {
      try {
        const response = await getUserVoiceModel();
        const modelId = response.data?.modelId?.trim();
        if (!modelId) {
          throw new Error('Voice model is missing');
        }
        hasVerifiedVoiceModelRef.current = true;
        return true;
      } catch (error) {
        console.warn('[useChat] voice model check failed', error);
        hasVerifiedVoiceModelRef.current = false;
        handleVoiceRegistrationRequired();
        return false;
      } finally {
        voiceModelCheckPromiseRef.current = null;
      }
    })();

    return voiceModelCheckPromiseRef.current;
  }, [handleVoiceRegistrationRequired]);

  const handleSocketClose = useCallback(
    ({ hadToken, code, reason }: { hadToken: boolean; code: number; reason: string }) => {
      if (!hadToken) {
        setConnectionNotice(LOGIN_EXPIRED_TEXT);
      } else if (code === 1011 && !hasVerifiedVoiceModelRef.current) {
        handleVoiceRegistrationRequired();
      } else if (code === 1011 && reason.includes('ASSISTANT')) {
        handleVoiceRegistrationRequired();
      } else if (awaitingResponseRef.current || isSubmittingSpeechTurnRef.current) {
        setConnectionNotice(CONNECTION_ERROR_TEXT);
      }
    },
    [handleVoiceRegistrationRequired],
  );

  const handleSocketMessage = useCallback(
    async (message: ChatSocketMessage) => {
      if (message.type === 'ACK') return;

      if (message.type === 'END_OF_STREAM') {
        if (ignoreIncomingResponseRef.current) {
          console.log('[socket] END_OF_STREAM ignored after cancel');
          isSubmittingSpeechTurnRef.current = false;
          clearEndOfStreamFallbackTimer();
          clearTextEndFallbackTimer();
          pendingAiResponseTextRef.current = '';
          clearTypeWriter();
          endAwaitingResponse();
          cleanupAudioPlayback(true);
          return;
        }
        console.log('[socket] END_OF_STREAM');
        isSubmittingSpeechTurnRef.current = false;
        setConnectionNotice('');
        clearEndOfStreamFallbackTimer();
        clearTextEndFallbackTimer();
        setAiStreamComplete(true);
        clearTypeWriter();
        commitFinalAiMessage();
        finalizeAudioStream();
        return;
      }

      if (message.type === 'CANCELLED') {
        console.log('[socket] CANCELLED');
        ignoreIncomingResponseRef.current = true;
        isSubmittingSpeechTurnRef.current = false;
        setConnectionNotice('');
        clearEndOfStreamFallbackTimer();
        clearTextEndFallbackTimer();
        setAiTextStreamingComplete(true);
        setAiStreamComplete(true);
        pendingAiResponseTextRef.current = '';
        clearTypeWriter();
        endAwaitingResponse();
        cleanupAudioPlayback(true);
        resumeWakeWordWhenReady();
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
        if (errorText.includes('ASSISTANT가 존재하지 않습니다')) {
          handleVoiceRegistrationRequired();
        } else if (code === 'TOKEN_EXPIRED' || code === 'UNAUTHORIZED' || code === 401) {
          setConnectionNotice(LOGIN_EXPIRED_TEXT);
        } else {
          setConnectionNotice(CONNECTION_ERROR_TEXT);
        }
        if (!errorText.includes('ASSISTANT가 존재하지 않습니다')) {
          clearEndOfStreamFallbackTimer();
          clearTextEndFallbackTimer();
          setAiTextStreamingComplete(true);
          setAiStreamComplete(true);
          pendingAiResponseTextRef.current = '';
          clearTypeWriter();
          endAwaitingResponse(false);
          cleanupAudioPlayback(true);
          resumeWakeWordWhenReady();
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
            setAiStreamComplete(true);
            clearTypeWriter();
            commitFinalAiMessage(aiResponseText);
            endAwaitingResponse();
            cleanupAudioPlayback(true);
            resumeWakeWordWhenReady();
          }, TEXT_END_FALLBACK_MS);
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
            setAiStreamComplete(true);
            clearTypeWriter();
            commitFinalAiMessage();
            endAwaitingResponse();
            finalizeAudioStream();
            resumeWakeWordWhenReady();
          }, 1500);
          break;

        default:
          break;
      }
    },
    [
      cleanupAudioPlayback,
      armFinalAudioCapture,
      clearTypeWriter,
      clearEndOfStreamFallbackTimer,
      clearTextEndFallbackTimer,
      commitFinalAiMessage,
      handleVoiceRegistrationRequired,
      endAwaitingResponse,
      finalizeAudioStream,
      resumeWakeWordWhenReady,
      startAudioPlayback,
    ],
  );

  const { wsRef, ensureSocketReady, closeSocket } = useChatSocket<ChatSocketMessage>({
    onOpen: handleSocketOpen,
    onClose: handleSocketClose,
    onMessage: handleSocketMessage,
    onBinaryChunk: (chunk) => {
      if (ignoreIncomingResponseRef.current) {
        return;
      }
      enqueueAudioChunk(chunk);
    },
    onConnectionUnavailable: handleConnectionUnavailable,
  });

  // --- Send to WebSocket ---
  const sendTextTurn = useCallback(
    async (options: RecordingOptions, text: string) => {
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
    },
    [ensureSocketReady, wsRef],
  );

  // --- finalizeSpeechTurn: called when silence timer fires, onend has text, or "전송" is spoken ---
  const finalizeSpeechTurn = useCallback(
    async (shouldSendText: boolean) => {
      console.log('[finalize] === finalizeSpeechTurn called ===', {
        shouldSendText,
        mode: recognitionModeRef.current,
        completed: speechTurnCompletedRef.current,
        submitting: isSubmittingSpeechTurnRef.current,
        sttText: sttTextRef.current.trim(),
      });

      // Guard: only run once per turn
      if (isSubmittingSpeechTurnRef.current) {
        console.log('[finalize] SKIPPED: already submitting');
        return;
      }

      // ★ Immediately lock state & set mode to idle to cut off all re-entry paths
      isSubmittingSpeechTurnRef.current = true;
      speechTurnCompletedRef.current = true;
      recognitionModeRef.current = 'idle'; // ← onend will see 'idle' and do nothing

      // Capture text before any resets
      const finalText = sttTextRef.current.trim();
      console.log('[finalize] captured finalText:', JSON.stringify(finalText));

      // Stop everything
      stopSilenceMonitor();
      clearSpeechSilenceTimer();
      stopMediaRecorder();
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
      }
      stopRecognition();
      finalizeSpeechOnEndRef.current = false;
      pendingSpeechCaptureRef.current = false;
      pendingSpeechSeedRef.current = '';
      sttTextRef.current = '';

      if (shouldSendText && finalText) {
        console.log('[finalize] → sending to API via WebSocket...');
        beginAwaitingResponse();
        setSttText('');
        updateVoiceStatus(finalText);

        const options = currentRecordingOptionsRef.current;
        if (!options) {
          console.log('[finalize] SEND FAILED: no recording options');
          isSubmittingSpeechTurnRef.current = false;
          speechTurnCompletedRef.current = false;
          endAwaitingResponse();
          updateVoiceStatus('서버에 음성 질문을 보내지 못했어요. 다시 시도해주세요.');
          setConnectionNotice(CONNECTION_ERROR_TEXT);
          resumeWakeWordWhenReady();
          return;
        }

        const sendOk = await sendTextTurn(options, finalText);
        if (!sendOk) {
          console.log('[finalize] SEND FAILED: sendTextTurn returned false');
          isSubmittingSpeechTurnRef.current = false;
          speechTurnCompletedRef.current = false;
          endAwaitingResponse();
          updateVoiceStatus('서버에 음성 질문을 보내지 못했어요. 다시 시도해주세요.');
          setConnectionNotice(CONNECTION_ERROR_TEXT);
          resumeWakeWordWhenReady();
          return;
        }

        console.log('[finalize] SEND SUCCESS — waiting for AI response');
        hasCompletedInitialWakeTurnRef.current = true;
        setChatMessages((prev) => [...prev, { sender: 'me', text: finalText }]);

        // Reset so next turn can proceed after AI responds
        isSubmittingSpeechTurnRef.current = false;
        speechTurnCompletedRef.current = false;

        clearTranscriptTimer();
        transcriptClearTimerRef.current = setTimeout(() => {
          if (awaitingResponseRef.current) {
            setSttText(WAITING_FOR_AI_TEXT);
          } else {
            setSttText('');
          }
        }, TRANSCRIPT_VISIBLE_MS);
      } else {
        console.log('[finalize] nothing to send → returning to wake mode');
        isSubmittingSpeechTurnRef.current = false;
        speechTurnCompletedRef.current = false;
        updateVoiceStatus(WAKE_GUIDE_TEXT);
        setSttText(WAKE_GUIDE_TEXT);
        resumeWakeWordWhenReady();
      }
    },
    [
      beginAwaitingResponse,
      clearSpeechSilenceTimer,
      clearTranscriptTimer,
      endAwaitingResponse,
      resumeWakeWordWhenReady,
      sendTextTurn,
      stopMediaRecorder,
      stopRecognition,
      stopSilenceMonitor,
      updateVoiceStatus,
    ],
  );

  // Keep refs always pointing to latest versions (avoids stale closures)
  finalizeSpeechTurnRef.current = finalizeSpeechTurn;

  // --- Silence monitor: polls every 200ms, fires when 1.5s of silence detected ---
  // Uses refs exclusively — immune to stale closure problems
  const startSilenceMonitor = useCallback(
    (sessionId: number) => {
      stopSilenceMonitor();
      lastSpeechTimeRef.current = Date.now();
      console.log('[silence] ★ monitor started for session', sessionId);

      silenceIntervalRef.current = setInterval(() => {
        // Guard checks using refs (always current, never stale)
        if (sessionId !== speechSessionIdRef.current) {
          console.log('[silence] stale session → stopping monitor');
          stopSilenceMonitor();
          return;
        }
        if (recognitionModeRef.current !== 'speech') {
          console.log(
            '[silence] mode changed to',
            recognitionModeRef.current,
            '→ stopping monitor',
          );
          stopSilenceMonitor();
          return;
        }
        if (isSubmittingSpeechTurnRef.current || speechTurnCompletedRef.current) {
          console.log('[silence] already submitting/completed → stopping monitor');
          stopSilenceMonitor();
          return;
        }

        const elapsed = Date.now() - lastSpeechTimeRef.current;
        const silenceThreshold = hasDetectedSpeechRef.current
          ? SPEECH_SILENCE_MS
          : INITIAL_SPEECH_GRACE_MS;
        if (elapsed >= silenceThreshold) {
          const text = sttTextRef.current.trim();
          console.log(
            '[silence] ★★★ silence detected! elapsed=' +
              elapsed +
              'ms, threshold=' +
              silenceThreshold +
              'ms, text=' +
              JSON.stringify(text),
          );
          stopSilenceMonitor();
          // Call via ref — always the latest version, never stale
          void finalizeSpeechTurnRef.current?.(!!text);
        }
      }, 200);
    },
    [stopSilenceMonitor],
  );

  // --- startSpeechCapture: entered after wake word is detected ---
  const startSpeechCapture = useCallback(
    async (initialText: string = '') => {
      if (!recognitionRef.current || !currentRecordingOptionsRef.current) {
        console.log('[speech] no recognition or options, aborting');
        return;
      }
      if (isSubmittingSpeechTurnRef.current) {
        console.log('[speech] already submitting, aborting');
        return;
      }

      // Increment session ID to invalidate any previous monitors
      const sessionId = speechSessionIdRef.current + 1;
      speechSessionIdRef.current = sessionId;

      recognitionModeRef.current = 'speech';
      setVoicePhase('speech');
      speechTurnCompletedRef.current = false;
      finalizeSpeechOnEndRef.current = false;

      console.log('[speech] === startSpeechCapture ===', { sessionId, initialText });

      // Pre-connect WebSocket
      void ensureSocketReady();

      // Reset transcript state
      clearTranscriptTimer();
      clearSpeechSilenceTimer();
      stopSilenceMonitor();
      hasDetectedSpeechRef.current = !!initialText.trim();
      sttTextRef.current = initialText.trim();
      if (initialText.trim()) {
        setSttText(initialText.trim());
        updateVoiceStatus(initialText.trim());
      } else {
        setSttText(SPEECH_LISTENING_TEXT);
      }

      // ★ Start the silence monitor (polls every 200ms)
      startSilenceMonitor(sessionId);

      // continuous=true so recognition doesn't stop mid-speech
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.onresult = (event: WebSpeechRecognitionEvent) => {
        // Guard using refs (never stale)
        if (sessionId !== speechSessionIdRef.current) return;
        if (recognitionModeRef.current !== 'speech') return;
        if (isSubmittingSpeechTurnRef.current) return;

        let transcript = '';
        for (let i = 0; i < event.results.length; i += 1) {
          transcript += event.results[i]?.[0]?.transcript || '';
        }

        if (containsWakeWord(transcript)) {
          const commandText = extractSpeechAfterWakeWord(transcript);
          const routeAfterWakeWord =
            matchRouteCommand(commandText) || matchHomeRouteCommand(commandText, userInfo?.id);

          pendingSpeechSeedRef.current = '';
          hasDetectedSpeechRef.current = false;
          sttTextRef.current = '';

          if (routeAfterWakeWord) {
            stopSilenceMonitor();
            clearSpeechSilenceTimer();
            setSttText('');
            updateVoiceStatus(WAKE_DETECTED_TEXT);
            stopRecognition();
            navigate(routeAfterWakeWord);
            return;
          }

          const restartedText = commandText.trim();
          hasDetectedSpeechRef.current = !!restartedText;
          sttTextRef.current = restartedText;
          setSttText(restartedText || SPEECH_LISTENING_TEXT);
          updateVoiceStatus(restartedText || WAKE_DETECTED_TEXT);
          lastSpeechTimeRef.current = Date.now();
          return;
        }

        const seedText = pendingSpeechSeedRef.current.trim();
        const normalizedText = [seedText, transcript.trim()].filter(Boolean).join(' ').trim();
        if (!normalizedText) return;

        console.log('[speech] onresult', { normalizedText });

        hasDetectedSpeechRef.current = true;
        setSttText(normalizedText);
        sttTextRef.current = normalizedText;
        updateVoiceStatus(normalizedText);

        // ★ Reset the silence clock — this is ALL we need to do
        // The interval will notice the updated timestamp
        lastSpeechTimeRef.current = Date.now();
      };

      console.log('[speech] starting recognition engine');
      safeStartRecognition();
    },
    [
      clearSpeechSilenceTimer,
      clearTranscriptTimer,
      ensureSocketReady,
      navigate,
      safeStartRecognition,
      startSilenceMonitor,
      stopRecognition,
      stopSilenceMonitor,
      updateVoiceStatus,
      userInfo,
    ],
  );

  // Keep refs always current for use inside useEffect (avoids deps instability)
  startSpeechCaptureRef.current = startSpeechCapture;
  safeStartRecognitionRef.current = safeStartRecognition;

  // --- startWakeMode: listens for "싸비스" or navigation commands ---
  const startWakeMode = useCallback(() => {
    if (
      !recognitionRef.current ||
      !wakeWordActiveRef.current ||
      isSubmittingSpeechTurnRef.current
    ) {
      return;
    }

    recognitionModeRef.current = 'wake';
    setVoicePhase('wake');
    pendingSpeechCaptureRef.current = false;
    pendingSpeechSeedRef.current = '';
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.onresult = (event: WebSpeechRecognitionEvent) => {
      const lastResult = event.results[event.results.length - 1];
      const heardText = lastResult?.[0]?.transcript?.trim() || '';
      if (!heardText) return;

      const noSpaceText = normalizeText(heardText);
      const routeAfterWakeWord = matchRouteCommand(extractSpeechAfterWakeWord(heardText));
      const standaloneRoute = matchRouteCommand(heardText);

      // Priority 1: Wake word + routing command
      if (containsWakeWord(heardText) && routeAfterWakeWord) {
        setWakeWordDetectedAt(Date.now());
        stopRecognition();
        navigate(routeAfterWakeWord);
        return;
      }

      // Priority 2: Wake word -> transition to speech capture
      if (containsWakeWord(heardText)) {
        const seededText = extractSpeechAfterWakeWord(heardText);
        console.log('[useChat] Wake Word Detected', { heardText, seededText });
        setWakeWordDetectedAt(Date.now());
        updateVoiceStatus(WAKE_DETECTED_TEXT);
        setSttText(SPEECH_LISTENING_TEXT);
        pendingSpeechCaptureRef.current = true;
        pendingSpeechSeedRef.current = seededText;
        stopRecognition();
        return;
      }

      // Priority 3: Standalone commands
      if (noSpaceText === '대기모드' || noSpaceText === '잠금' || noSpaceText === '화면잠금') {
        const voiceLockStore = useVoiceLockStore.getState();
        if (voiceLockStore.isVoiceLockEnabled) {
          stopRecognition();
          voiceLockStore.setIsLocked(true);
          return;
        }
      }
      if (standaloneRoute) {
        stopRecognition();
        navigate(standaloneRoute);
        return;
      }
      const standaloneHomeRoute = matchHomeRouteCommand(heardText, userInfo?.id);
      if (standaloneHomeRoute) {
        stopRecognition();
        navigate(standaloneHomeRoute);
        return;
      }

      // Fallback: visual feedback only
      sttTextRef.current = '';
    };

    safeStartRecognition();
  }, [navigate, safeStartRecognition, stopRecognition, updateVoiceStatus, userInfo?.id]);

  useEffect(() => {
    resumeWakeWordRef.current = () => {
      if (
        !wakeWordActiveRef.current ||
        awaitingResponseRef.current ||
        isSubmittingSpeechTurnRef.current
      ) {
        return;
      }
      startWakeMode();
    };
  }, [startWakeMode]);

  // --- SpeechRecognition lifecycle (onend handler) ---
  useEffect(() => {
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: new () => WebSpeechRecognition })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => WebSpeechRecognition })
        .webkitSpeechRecognition;

    if (!SpeechRecognition) {
      isSpeechRecognitionSupported.current = false;
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ko-KR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      isRecognizingRef.current = true;
    };

    recognition.onerror = (event: WebSpeechRecognitionErrorEvent) => {
      isRecognizingRef.current = false;

      if (manualStopRef.current) {
        manualStopRef.current = false;
        return;
      }

      if (recognitionModeRef.current === 'wake') {
        if (event.error !== 'aborted') {
          updateVoiceStatus(WAKE_GUIDE_TEXT);
        }
        return;
      }

      if (recognitionModeRef.current === 'speech') {
        console.log('[useChat] recognition error in speech mode', event.error);
        // Don't cancel the silence timer — it will fire and finalize gracefully
      }
    };

    recognition.onend = () => {
      isRecognizingRef.current = false;
      clearRestartTimer();

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

      // If already submitting, do nothing
      if (isSubmittingSpeechTurnRef.current) {
        console.log('[onend] submitting → skip');
        return;
      }

      // Wake word detected → transition to speech capture (via ref)
      if (pendingCapture && mode === 'wake') {
        console.log('[onend] wake word pending → startSpeechCapture');
        pendingSpeechCaptureRef.current = false;
        const seed = pendingSpeechSeedRef.current;
        void startSpeechCaptureRef.current?.(seed);
        return;
      }

      // Speech mode — browser stopped recognition
      // Just restart recognition; silence monitor handles finalization
      if (mode === 'speech') {
        if (speechTurnCompletedRef.current) return;
        if (wakeWordActiveRef.current) {
          console.log('[onend] speech mode → restart recognition');
          restartTimerRef.current = setTimeout(() => {
            if (
              recognitionModeRef.current === 'speech' &&
              !isSubmittingSpeechTurnRef.current &&
              !speechTurnCompletedRef.current
            ) {
              safeStartRecognitionRef.current?.();
            }
          }, 150);
        }
        return;
      }

      // Wake mode ended → restart
      if (mode === 'wake') {
        if (wakeWordActiveRef.current) {
          const delay = Math.max(250, wakeModeReadyAtRef.current - Date.now());
          restartTimerRef.current = setTimeout(() => {
            if (wakeWordActiveRef.current && !isSubmittingSpeechTurnRef.current) {
              safeStartRecognitionRef.current?.();
            }
          }, delay);
        }
        return;
      }
    };

    recognitionRef.current = recognition;

    return () => {
      clearRestartTimer();
      clearTranscriptTimer();
      clearSpeechSilenceTimer();
      stopSilenceMonitor();
      clearAiPlaybackFallbackTimer();
      clearEndOfStreamFallbackTimer();
      clearTextEndFallbackTimer();
      clearWakeResumeCooldownTimer();
      clearTypeWriter();
      cleanupAudioPlayback(true);
      recognitionRef.current = null;
    };
  }, [
    cleanupAudioPlayback,
    clearAiPlaybackFallbackTimer,
    clearEndOfStreamFallbackTimer,
    clearTextEndFallbackTimer,
    clearRestartTimer,
    clearSpeechSilenceTimer,
    clearTranscriptTimer,
    clearTypeWriter,
    clearWakeResumeCooldownTimer,
    stopSilenceMonitor,
    updateVoiceStatus,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearRestartTimer();
      clearTranscriptTimer();
      clearSpeechSilenceTimer();
      clearAiPlaybackFallbackTimer();
      clearEndOfStreamFallbackTimer();
      clearTextEndFallbackTimer();
      clearWakeResumeCooldownTimer();
      clearTypeWriter();
      cleanupAudioPlayback(true);
      stopMediaRecorder();
      stopRecognition();
      closeSocket(true);
    };
  }, [
    cleanupAudioPlayback,
    clearAiPlaybackFallbackTimer,
    clearEndOfStreamFallbackTimer,
    clearTextEndFallbackTimer,
    clearRestartTimer,
    clearSpeechSilenceTimer,
    clearTranscriptTimer,
    clearTypeWriter,
    clearWakeResumeCooldownTimer,
    closeSocket,
    stopMediaRecorder,
    stopRecognition,
  ]);

  // Spinner for awaiting response
  useEffect(() => {
    if (!isAwaitingResponse) return;
    const frames = ['|', '/', '-', '\\'];
    let frameIndex = 0;
    const intervalId = setInterval(() => {
      setSttText(`${WAITING_FOR_AI_TEXT} ${frames[frameIndex]}`);
      frameIndex = (frameIndex + 1) % frames.length;
    }, 180);
    return () => {
      clearInterval(intervalId);
    };
  }, [isAwaitingResponse]);

  // Lock mode toggle
  const toggleLock = useCallback(() => {
    if (!isLockMode) {
      setBackupMessages(chatMessages);
      setChatMessages([{ sender: 'ai', text: SECRET_MODE_GREETING }]);
    } else if (backupMessages) {
      setChatMessages(backupMessages);
      setBackupMessages(null);
    } else {
      setChatMessages([{ sender: 'ai', text: DEFAULT_GREETING }]);
    }
    setIsLockMode((prev) => !prev);
  }, [backupMessages, chatMessages, isLockMode]);

  // --- Public API ---
  const startRecording = useCallback(
    async (
      sessionId: string | null,
      assistantType: string,
      memoryPolicy: string,
      chatSessionType: string = 'USER_AI',
      targetUserId: number | null = null,
    ) => {
      unlockAudioPlayback();
      if (isLocked) {
        updateVoiceStatus('화면이 잠겨있어요. 잠금을 해제하고 다시 시도해주세요.');
        return false;
      }

      if (!isSpeechRecognitionSupported.current) {
        updateVoiceStatus('이 브라우저에서는 음성 인식을 지원하지 않아요.');
        return false;
      }

      const isVoiceModelReady = await ensureVoiceModelReady();
      if (!isVoiceModelReady) {
        return false;
      }

      currentRecordingOptionsRef.current = {
        sessionId,
        assistantType,
        memoryPolicy,
        chatSessionType,
        targetUserId,
      };

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      } catch (error) {
        void error;
        updateVoiceStatus('마이크 권한을 확인할 수 없어요');
        return false;
      }

      wakeWordActiveRef.current = true;
      hasCompletedInitialWakeTurnRef.current = false;
      setIsWakeWordActive(true);
      setVoicePhase('wake');
      setWakeWordDetectedAt(null);

      clearTranscriptTimer();
      clearSpeechSilenceTimer();
      sttTextRef.current = '';

      // Pre-connect WebSocket while user is waiting
      void ensureSocketReady();

      setSttText(WAKE_GUIDE_TEXT);
      updateVoiceStatus(WAKE_GUIDE_TEXT);
      startWakeMode();
      return true;
    },
    [
      clearSpeechSilenceTimer,
      clearTranscriptTimer,
      ensureSocketReady,
      ensureVoiceModelReady,
      isLocked,
      startWakeMode,
      unlockAudioPlayback,
      updateVoiceStatus,
    ],
  );

  const stopRecordingAndSendSTT = useCallback(() => {
    wakeWordActiveRef.current = false;
    hasCompletedInitialWakeTurnRef.current = false;
    setIsWakeWordActive(false);
    setWakeWordDetectedAt(null);
    endAwaitingResponse();
    cleanupAudioPlayback(true);
    pendingSpeechCaptureRef.current = false;
    pendingSpeechSeedRef.current = '';
    stopSilenceMonitor();
    clearSpeechSilenceTimer();
    finalizeSpeechOnEndRef.current = false;
    isSubmittingSpeechTurnRef.current = false;
    speechTurnCompletedRef.current = false;

    if (recognitionModeRef.current === 'speech' && sttTextRef.current.trim()) {
      void finalizeSpeechTurn(true);
    } else {
      stopMediaRecorder();
    }

    recognitionModeRef.current = 'idle';
    setVoicePhase('idle');
    setVoicePhase('idle');
    stopRecognition();
    setSttText('');
    sttTextRef.current = '';
    updateVoiceStatus(SPEECH_STOPPED_TEXT);
  }, [
    cleanupAudioPlayback,
    clearSpeechSilenceTimer,
    endAwaitingResponse,
    finalizeSpeechTurn,
    stopMediaRecorder,
    stopRecognition,
    stopSilenceMonitor,
    updateVoiceStatus,
  ]);

  const cancelTurn = useCallback(() => {
    ignoreIncomingResponseRef.current = true;
    stopSilenceMonitor();
    clearSpeechSilenceTimer();
    isSubmittingSpeechTurnRef.current = false;
    speechTurnCompletedRef.current = false;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'CANCEL' }));
    }
    endAwaitingResponse();
    cleanupAudioPlayback(true);
    resumeWakeWordWhenReady();
  }, [
    cleanupAudioPlayback,
    clearSpeechSilenceTimer,
    endAwaitingResponse,
    resumeWakeWordWhenReady,
    stopSilenceMonitor,
    wsRef,
  ]);

  const sleepConversation = useCallback(() => {
    ignoreIncomingResponseRef.current = true;
    wakeWordActiveRef.current = true;
    hasCompletedInitialWakeTurnRef.current = false;
    pendingWakeResumeRef.current = false;
    pendingSpeechCaptureRef.current = false;
    pendingSpeechSeedRef.current = '';
    finalizeSpeechOnEndRef.current = false;
    isSubmittingSpeechTurnRef.current = false;
    speechTurnCompletedRef.current = false;
    pendingAiResponseTextRef.current = '';

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'CANCEL' }));
    }

    setIsWakeWordActive(true);
    setWakeWordDetectedAt(null);
    setConnectionNotice('');
    setVoicePhase('wake');
    setAiTextStreamingComplete(true);
    setAiStreamComplete(true);
    clearTypeWriter();

    recognitionModeRef.current = 'idle';
    stopSilenceMonitor();
    clearSpeechSilenceTimer();
    clearTranscriptTimer();
    clearWakeResumeCooldownTimer();
    clearEndOfStreamFallbackTimer();
    clearTextEndFallbackTimer();
    endAwaitingResponse();
    cleanupAudioPlayback(true);
    stopMediaRecorder();
    stopRecognition();
    setSttText('');
    sttTextRef.current = '';
    updateVoiceStatus(WAKE_GUIDE_TEXT);
    startWakeMode();
  }, [
    cleanupAudioPlayback,
    clearEndOfStreamFallbackTimer,
    clearSpeechSilenceTimer,
    clearTextEndFallbackTimer,
    clearTranscriptTimer,
    clearTypeWriter,
    clearWakeResumeCooldownTimer,
    endAwaitingResponse,
    stopMediaRecorder,
    stopRecognition,
    stopSilenceMonitor,
    startWakeMode,
    updateVoiceStatus,
    wsRef,
  ]);

  const discardCurrentTurn = useCallback(() => {
    ignoreIncomingResponseRef.current = false;
    wakeWordActiveRef.current = false;
    hasCompletedInitialWakeTurnRef.current = false;
    pendingWakeResumeRef.current = false;
    pendingSpeechCaptureRef.current = false;
    pendingSpeechSeedRef.current = '';
    finalizeSpeechOnEndRef.current = false;
    isSubmittingSpeechTurnRef.current = false;
    speechTurnCompletedRef.current = false;

    setIsWakeWordActive(false);
    setWakeWordDetectedAt(null);
    setConnectionNotice('');
    setVoicePhase('idle');

    recognitionModeRef.current = 'idle';
    stopSilenceMonitor();
    clearSpeechSilenceTimer();
    clearTranscriptTimer();
    clearWakeResumeCooldownTimer();
    clearEndOfStreamFallbackTimer();
    clearTextEndFallbackTimer();
    clearTypeWriter();
    endAwaitingResponse();
    cleanupAudioPlayback(true);
    stopMediaRecorder();
    stopRecognition();
    setSttText('');
    sttTextRef.current = '';
  }, [
    cleanupAudioPlayback,
    clearEndOfStreamFallbackTimer,
    clearSpeechSilenceTimer,
    clearTextEndFallbackTimer,
    clearTranscriptTimer,
    clearTypeWriter,
    clearWakeResumeCooldownTimer,
    endAwaitingResponse,
    stopMediaRecorder,
    stopRecognition,
    stopSilenceMonitor,
  ]);

  const resetConversationRuntime = useCallback(() => {
    ignoreIncomingResponseRef.current = true;
    wakeWordActiveRef.current = false;
    hasCompletedInitialWakeTurnRef.current = false;
    pendingSpeechCaptureRef.current = false;
    pendingSpeechSeedRef.current = '';
    pendingWakeResumeRef.current = false;
    finalizeSpeechOnEndRef.current = false;
    isSubmittingSpeechTurnRef.current = false;
    speechTurnCompletedRef.current = false;
    pendingAiResponseTextRef.current = '';
    currentRecordingOptionsRef.current = null;

    awaitingResponseRef.current = false;
    setIsAwaitingResponse(false);
    setIsWakeWordActive(false);
    setWakeWordDetectedAt(null);
    setVoicePhase('idle');
    setConnectionNotice('');
    setLatestAiText('');
    setVoiceStatus(WAKE_GUIDE_TEXT);
    setSttText('');
    sttTextRef.current = '';
    setAiTextStreamingComplete(true);
    setAiStreamComplete(true);
    setIsAiTextTyping(false);

    recognitionModeRef.current = 'idle';
    clearTranscriptTimer();
    clearSpeechSilenceTimer();
    clearEndOfStreamFallbackTimer();
    clearTextEndFallbackTimer();
    clearWakeResumeCooldownTimer();
    clearTypeWriter();
    stopSilenceMonitor();
    cleanupAudioPlayback(true);
    stopMediaRecorder();
    stopRecognition();
    closeSocket(true);
  }, [
    cleanupAudioPlayback,
    closeSocket,
    clearEndOfStreamFallbackTimer,
    clearSpeechSilenceTimer,
    clearTextEndFallbackTimer,
    clearTranscriptTimer,
    clearTypeWriter,
    clearWakeResumeCooldownTimer,
    stopMediaRecorder,
    stopRecognition,
    stopSilenceMonitor,
  ]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || !currentRecordingOptionsRef.current) return;
      const normalizedText = text.trim();
      const isVoiceModelReady = await ensureVoiceModelReady();
      if (!isVoiceModelReady) {
        return;
      }
      setChatInput('');
      setAiTextStreamingComplete(false);
      setAiStreamComplete(false);
      pendingAiResponseTextRef.current = '';
      clearEndOfStreamFallbackTimer();
      clearTypeWriter();
      const options = currentRecordingOptionsRef.current;
      beginAwaitingResponse();
      const ok = await sendTextTurn(options, normalizedText);
      if (!ok) {
        endAwaitingResponse();
        setConnectionNotice(CONNECTION_ERROR_TEXT);
      } else {
        setChatMessages((prev) => [...prev, { sender: 'me', text: normalizedText }]);
      }
    },
    [
      beginAwaitingResponse,
      clearEndOfStreamFallbackTimer,
      clearTypeWriter,
      endAwaitingResponse,
      ensureVoiceModelReady,
      sendTextTurn,
    ],
  );

  return {
    audioElemRef,
    chatInput,
    chatMessages,
    latestAiText,
    aiSpeechProgress,
    isLockMode,
    sttText,
    voiceStatus,
    voicePhase,
    wakeWordDetectedAt,
    isAiSpeaking,
    isWakeWordActive,
    isAwaitingResponse,
    isContinuousConversationEnabled,
    aiTextStreamingComplete,
    aiStreamComplete,
    isAiTextTyping,
    connectionNotice,
    setChatInput,
    setChatMessages,
    toggleLock,
    sendMessage,
    startRecording,
    stopRecordingAndSendSTT,
    cancelTurn,
    sleepConversation,
    updateRecordingContext,
    discardCurrentTurn,
    resetConversationRuntime,
  };
}
