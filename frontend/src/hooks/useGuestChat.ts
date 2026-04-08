import { useCallback, useEffect, useRef, useState } from 'react';
import { getApiOrigin } from '../config/api';
import { containsWakeWord as sharedContainsWakeWord, normalizeWakeWordText } from '../constants/voice';
import { useRecognitionControls } from './chat/useRecognitionControls';
import { useGuestRecognitionLifecycle } from './chat/useGuestRecognitionLifecycle';
import { useSpeechSilenceMonitor } from './chat/useSpeechSilenceMonitor';
import type { ChatMessage } from '../types';

interface GuestSpeechRecognitionResultItem {
  transcript: string;
}

interface GuestSpeechRecognitionResult {
  isFinal?: boolean;
  0: GuestSpeechRecognitionResultItem;
  length: number;
}

interface GuestSpeechRecognitionEvent {
  resultIndex: number;
  results: ArrayLike<GuestSpeechRecognitionResult>;
}

interface GuestSpeechRecognitionErrorEvent {
  error: string;
}

interface GuestSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: GuestSpeechRecognitionEvent) => void) | null;
  onerror: ((event: GuestSpeechRecognitionErrorEvent) => void) | null;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface UseGuestChatOptions {
  enabled: boolean;
  targetUserId: number | null;
}

interface PendingGuestTextPayload {
  sessionId: string | null;
  targetUserId: number;
  chatSessionType: string;
  assistantType: string;
  memoryPolicy: 'SECRET';
  hasAudio: false;
  text: string;
}

const DEFAULT_GREETING = '안녕하세요. 무엇을 도와드릴까요?';
const WAKE_WORD = '싸비스';
const WAKE_WORD_ALIASES = [WAKE_WORD, '사비스', '서비스', '싸비스야', '사비서', '싸비스'];
const SPEECH_SILENCE_MS = 2000;

function estimateWordRevealIntervalMs(text: string, tokenCount: number) {
  if (tokenCount <= 1) return 220;

  const punctuationPauseCount = (text.match(/[,.!?~]/g) ?? []).length;
  const estimatedDurationMs =
    text.trim().length * 70 + punctuationPauseCount * 180 + tokenCount * 40;

  return Math.max(120, Math.min(320, Math.round(estimatedDurationMs / tokenCount)));
}

type RecognitionMode = 'idle' | 'wake' | 'speech';

interface GuestRecordingOptions {
  assistantType: string;
  chatSessionType: string;
  targetUserId: number | null;
}

function normalizeWakeTranscript(text: string) {
  return normalizeWakeWordText(text);
}

function containsWakeWord(text: string) {
  return sharedContainsWakeWord(text);
}

export function useGuestChat({ enabled, targetUserId }: UseGuestChatOptions) {
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { sender: 'ai', text: DEFAULT_GREETING },
  ]);
  const [sttText, setSttText] = useState('');
  const [voicePhase, setVoicePhase] = useState<RecognitionMode>('idle');
  const [wakeWordDetectedAt, setWakeWordDetectedAt] = useState<number | null>(null);
  const [isAwaitingResponse, setIsAwaitingResponse] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaSourceRef = useRef<MediaSource | null>(null);
  const sourceBufferRef = useRef<SourceBuffer | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const audioElemRef = useRef<HTMLAudioElement | null>(null);
  const streamEndedRef = useRef(false);
  const recognitionRef = useRef<GuestSpeechRecognition | null>(null);
  const isRecognizingRef = useRef(false);
  const manualStopRef = useRef(false);
  const recognitionModeRef = useRef<RecognitionMode>('idle');
  const pendingSpeechCaptureRef = useRef(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechSessionIdRef = useRef(0);
  const sessionIdRef = useRef<string | null>(null);
  const pendingTextRef = useRef<PendingGuestTextPayload | null>(null);
  const typeWriterIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speechFinalizedRef = useRef(false);
  const isSubmittingSpeechTurnRef = useRef(false);
  const sttTextRef = useRef('');
  const lastSpeechTimeRef = useRef(0);
  const hasDetectedSpeechRef = useRef(false);
  const currentRecordingOptionsRef = useRef<GuestRecordingOptions | null>(null);
  const ignoreIncomingResponseRef = useRef(false);
  const resetGuestChatState = useCallback(() => {
    sessionIdRef.current = null;
    pendingTextRef.current = null;
    sttTextRef.current = '';
    setChatMessages([{ sender: 'ai', text: DEFAULT_GREETING }]);
    setChatInput('');
    setSttText('');
    setVoicePhase('idle');
    setWakeWordDetectedAt(null);
    setIsAwaitingResponse(false);
    setIsAiSpeaking(false);
  }, []);

  const resetTypewriter = useCallback(() => {
    if (typeWriterIntervalRef.current) {
      clearInterval(typeWriterIntervalRef.current);
      typeWriterIntervalRef.current = null;
    }
  }, []);

  const processAudioQueue = useCallback(() => {
    const sourceBuffer = sourceBufferRef.current;
    const mediaSource = mediaSourceRef.current;

    if (
      streamEndedRef.current &&
      mediaSource &&
      mediaSource.readyState === 'open' &&
      sourceBuffer &&
      !sourceBuffer.updating &&
      audioQueueRef.current.length === 0
    ) {
      try {
        mediaSource.endOfStream();
      } catch (error) {
        console.warn('Guest MediaSource end failed:', error);
      }
    }

    if (!sourceBuffer || sourceBuffer.updating || audioQueueRef.current.length === 0) return;

    try {
      const chunk = audioQueueRef.current.shift();
      if (chunk) {
        sourceBuffer.appendBuffer(chunk);
      }
    } catch (error) {
      console.error('Guest audio buffer append failed:', error);
    }
  }, []);

  const { safeStartRecognition, stopRecognition } = useRecognitionControls({
    recognitionRef,
    isRecognizingRef,
    manualStopRef,
    onClearRestartTimer: () => {
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
    },
    onStartError: (message) => {
      console.warn('Guest speech recognition start failed:', message);
    },
  });

  const { startSilenceMonitor, stopSilenceMonitor } = useSpeechSilenceMonitor({
    speechSessionIdRef,
    recognitionModeRef,
    isSubmittingSpeechTurnRef,
    speechTurnCompletedRef: speechFinalizedRef,
    lastSpeechTimeRef,
    hasDetectedSpeechRef,
    sttTextRef,
    speechSilenceMs: SPEECH_SILENCE_MS,
    initialSpeechGraceMs: SPEECH_SILENCE_MS,
    onFinalize: () => {
      stopRecognition();
    },
  });

  const clearSpeechSilenceTimer = useCallback(() => {
    stopSilenceMonitor();
  }, [stopSilenceMonitor]);

  const connectSocket = useCallback(() => {
    if (!enabled) return null;

    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return wsRef.current;
    }

    const apiOrigin = getApiOrigin();
    const protocol = apiOrigin.startsWith('https://') ? 'wss:' : 'ws:';
    const host = apiOrigin.replace(/^https?:\/\//, '');
    const socket = new WebSocket(`${protocol}//${host}/ws/guest/chat`);
    socket.binaryType = 'arraybuffer';

    socket.onclose = () => {
      if (wsRef.current === socket) {
        wsRef.current = null;
      }
    };

    socket.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        if (ignoreIncomingResponseRef.current) return;
        audioQueueRef.current.push(event.data);
        processAudioQueue();
        return;
      }

      if (event.data instanceof Blob) {
        void event.data.arrayBuffer().then((buffer) => {
          if (ignoreIncomingResponseRef.current) return;
          audioQueueRef.current.push(buffer);
          processAudioQueue();
        });
        return;
      }

      if (typeof event.data !== 'string') return;

      const message = JSON.parse(event.data);
      if (message.type === 'ACK') return;

      if (message.type === 'SESSION_ASSIGNED') {
        sessionIdRef.current = message.sessionId ?? null;
        if (pendingTextRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: 'TEXT',
              ...pendingTextRef.current,
              sessionId: sessionIdRef.current,
            }),
          );
          pendingTextRef.current = null;
        }
        return;
      }

      if (message.type === 'END_OF_STREAM') {
        if (ignoreIncomingResponseRef.current) return;
        setIsAwaitingResponse(false);
        return;
      }

      if (message.type === 'ERROR' || message.type === 'error') {
        if (ignoreIncomingResponseRef.current) return;
        setIsAwaitingResponse(false);
        console.error('Guest WebSocket error:', message.message, message.detail);
        return;
      }

      if (ignoreIncomingResponseRef.current) return;

      switch (message.type) {
        case 'text.start':
          resetTypewriter();
          setChatMessages((prev) => [...prev, { sender: 'ai', text: '' }]);
          break;

        case 'text.end': {
          const aiResponseText = message.payload?.text || message.text || '';
          const tokens = aiResponseText.match(/\S+\s*/g) ?? [aiResponseText];
          const revealIntervalMs = estimateWordRevealIntervalMs(aiResponseText, tokens.length);
          let index = 0;

          resetTypewriter();
          typeWriterIntervalRef.current = setInterval(() => {
            setChatMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last && last.sender === 'ai') {
                last.text = tokens.slice(0, index + 1).join('');
              }
              return next;
            });

            index += 1;
            if (index >= tokens.length) {
              resetTypewriter();
            }
          }, revealIntervalMs);
          break;
        }

        case 'voice.start': {
          audioQueueRef.current = [];
          streamEndedRef.current = false;
          const mediaSource = new MediaSource();
          const audio = new Audio();
          audio.src = URL.createObjectURL(mediaSource);
          audio.onplay = () => setIsAiSpeaking(true);
          audio.onpause = () => setIsAiSpeaking(false);
          audio.onended = () => setIsAiSpeaking(false);
          audio.play().catch((error) => console.warn('Guest audio autoplay pending:', error));

          mediaSource.addEventListener('sourceopen', () => {
            try {
              const sourceBuffer = mediaSource.addSourceBuffer('audio/webm; codecs="opus"');
              sourceBuffer.addEventListener('updateend', processAudioQueue);
              mediaSourceRef.current = mediaSource;
              sourceBufferRef.current = sourceBuffer;
              processAudioQueue();
            } catch (error) {
              console.warn('Guest SourceBuffer initialization failed:', error);
            }
          });

          audioElemRef.current = audio;
          break;
        }

        case 'voice.end':
          streamEndedRef.current = true;
          processAudioQueue();
          break;

        default:
          break;
      }
    };

    wsRef.current = socket;
    return socket;
  }, [enabled, processAudioQueue, resetTypewriter]);

  const ensureSocketReady = useCallback(async () => {
    const socket = connectSocket();
    if (!socket) return false;

    if (socket.readyState === WebSocket.OPEN) return true;
    if (socket.readyState !== WebSocket.CONNECTING) return false;

    return await new Promise<boolean>((resolve) => {
      let resolved = false;

      const cleanup = (result: boolean) => {
        if (resolved) return;
        resolved = true;
        socket.removeEventListener('open', handleOpen);
        socket.removeEventListener('error', handleError);
        socket.removeEventListener('close', handleClose);
        clearTimeout(timeoutId);
        resolve(result);
      };

      const handleOpen = () => cleanup(true);
      const handleError = () => cleanup(false);
      const handleClose = () => cleanup(false);
      const timeoutId = setTimeout(() => cleanup(false), 3000);

      socket.addEventListener('open', handleOpen);
      socket.addEventListener('error', handleError);
      socket.addEventListener('close', handleClose);
    });
  }, [connectSocket]);

  const sendGuestText = useCallback(
    async (
      text: string,
      assistantType: string,
      chatSessionType: string,
      nextTargetUserId: number | null,
    ) => {
      if (!enabled || !text.trim() || !nextTargetUserId) {
        setIsAwaitingResponse(false);
        return;
      }

      const socketReady = await ensureSocketReady();
      if (!socketReady || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        setIsAwaitingResponse(false);
        console.warn('Guest WebSocket connection failed.');
        return;
      }

      ignoreIncomingResponseRef.current = false;

      const payloadBase = {
        sessionId: sessionIdRef.current,
        targetUserId: nextTargetUserId,
        chatSessionType,
        assistantType,
        memoryPolicy: 'SECRET' as const,
        hasAudio: false as const,
      };

      wsRef.current.send(JSON.stringify({ type: 'CHAT_START', ...payloadBase, text: null }));

      if (sessionIdRef.current) {
        wsRef.current.send(JSON.stringify({ type: 'TEXT', ...payloadBase, text }));
      } else {
        pendingTextRef.current = { ...payloadBase, text };
      }
    },
    [enabled, ensureSocketReady],
  );

  const finalizeSpeechTurn = useCallback(
    async (
      finalText: string,
      assistantType: string,
      chatSessionType: string,
      targetUserId: number | null,
    ) => {
      const normalized = finalText.trim();
      if (speechFinalizedRef.current) return;
      speechFinalizedRef.current = true;
      setVoicePhase('idle');

      if (!normalized) {
        setSttText('');
        sttTextRef.current = '';
        return;
      }

      setChatMessages((prev) => [...prev, { sender: 'me', text: normalized }]);
      setIsAwaitingResponse(true);
      await sendGuestText(normalized, assistantType, chatSessionType, targetUserId);
    },
    [sendGuestText],
  );

  const { handleRecognitionStart, handleRecognitionError, handleRecognitionEnd } =
    useGuestRecognitionLifecycle({
      isRecognizingRef,
      manualStopRef,
      recognitionModeRef,
      pendingSpeechCaptureRef,
      restartTimerRef,
      onWakeGuide: () => {
        setSttText(`?â‘¥ì” ???ëš®ë±¶ ?Â€æ¹²?ä»¥?.. "${WAKE_WORD}"?ì‡¨í€¬ ï§ë¨°ë¹è¹‚ëŒê½­??`);
      },
      onSpeechModeError: (error) => {
        console.warn('Guest speech recognition error:', error);
      },
      onPendingWakeCapture: () => startSpeechCapture(),
      onFinalizeSpeech: () => {
        const options = currentRecordingOptionsRef.current;
        clearSpeechSilenceTimer();
        if (options) {
          return finalizeSpeechTurn(
            sttTextRef.current,
            options.assistantType,
            options.chatSessionType,
            options.targetUserId,
          );
        }
      },
      onRestartWakeRecognition: () => {
        safeStartRecognition();
      },
    });

  const startWakeMode = useCallback(() => {
    if (!recognitionRef.current) return;

    recognitionModeRef.current = 'wake';
    setVoicePhase('wake');
    pendingSpeechCaptureRef.current = false;
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = false;
    setSttText(`웨이크 워드 대기 중... "${WAKE_WORD}"라고 말해보세요.`);
    sttTextRef.current = '';

    recognitionRef.current.onresult = (event: GuestSpeechRecognitionEvent) => {
      const lastResult = event.results[event.results.length - 1];
      const heardText = lastResult?.[0]?.transcript?.trim() || '';
      if (!heardText) return;

      setSttText(heardText);
      sttTextRef.current = heardText;

      if (containsWakeWord(heardText)) {
        setWakeWordDetectedAt(Date.now());
        setSttText('웨이크 워드 감지! 음성을 듣고 있어요.');
        pendingSpeechCaptureRef.current = true;
        stopRecognition();
      }
    };

    safeStartRecognition();
  }, [safeStartRecognition, stopRecognition]);

  const startSpeechCapture = useCallback(() => {
    if (!recognitionRef.current || !currentRecordingOptionsRef.current) return;

    const sessionId = speechSessionIdRef.current + 1;
    speechSessionIdRef.current = sessionId;
    speechFinalizedRef.current = false;
    hasDetectedSpeechRef.current = false;
    recognitionModeRef.current = 'speech';
    setVoicePhase('speech');
    clearSpeechSilenceTimer();
    setSttText('음성을 듣고 있어요...');
    sttTextRef.current = '';
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    startSilenceMonitor(sessionId);

    recognitionRef.current.onresult = (event: GuestSpeechRecognitionEvent) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i += 1) {
        transcript += event.results[i]?.[0]?.transcript || '';
      }

      const normalized = transcript.trim();
      if (!normalized) return;

      hasDetectedSpeechRef.current = true;
      sttTextRef.current = normalized;
      setSttText(normalized);
      lastSpeechTimeRef.current = Date.now();
    };

    safeStartRecognition();
  }, [clearSpeechSilenceTimer, safeStartRecognition, startSilenceMonitor]);

  const startRecording = useCallback(
    async (
      _sessionId: string | null,
      assistantType: string,
      _memoryPolicy: string,
      chatSessionType: string = 'AVATAR_AI',
      targetUserId: number | null = null,
    ) => {
      if (!enabled) return false;

      const SpeechRecognition =
        (window as unknown as { SpeechRecognition?: new () => GuestSpeechRecognition })
          .SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: new () => GuestSpeechRecognition })
          .webkitSpeechRecognition;

      if (!SpeechRecognition) {
        console.warn('SpeechRecognition is not supported.');
        return false;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      } catch (error) {
        console.warn('Microphone permission is required:', error);
        return false;
      }

      currentRecordingOptionsRef.current = {
        assistantType,
        chatSessionType,
        targetUserId,
      };
      resetTypewriter();
      setSttText('');
      sttTextRef.current = '';

      if (!recognitionRef.current) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'ko-KR';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = handleRecognitionStart;

        recognition.onerror = (event: GuestSpeechRecognitionErrorEvent) => {
          isRecognizingRef.current = false;

          if (manualStopRef.current) {
            manualStopRef.current = false;
            return;
          }

          if (recognitionModeRef.current === 'wake' && event.error !== 'aborted') {
            setSttText(`웨이크 워드 대기 중... "${WAKE_WORD}"라고 말해보세요.`);
            return;
          }

          if (recognitionModeRef.current === 'speech') {
            console.warn('Guest speech recognition error:', event.error);
          }
        };
        recognition.onerror = handleRecognitionError;

        recognition.onend = () => {
          isRecognizingRef.current = false;

          if (pendingSpeechCaptureRef.current && recognitionModeRef.current === 'wake') {
            manualStopRef.current = false;
            pendingSpeechCaptureRef.current = false;
            startSpeechCapture();
            return;
          }

          if (recognitionModeRef.current === 'speech' && manualStopRef.current) {
            manualStopRef.current = false;
            const options = currentRecordingOptionsRef.current;
            clearSpeechSilenceTimer();
            if (options) {
              void finalizeSpeechTurn(
                sttTextRef.current,
                options.assistantType,
                options.chatSessionType,
                options.targetUserId,
              );
            }
            return;
          }

          if (manualStopRef.current) {
            manualStopRef.current = false;
            return;
          }

          if (recognitionModeRef.current === 'wake') {
            restartTimerRef.current = setTimeout(() => {
              safeStartRecognition();
            }, 250);
          }
        };
        recognition.onend = handleRecognitionEnd;

        recognitionRef.current = recognition;
      }

      startWakeMode();
      return true;
    },
    [
      clearSpeechSilenceTimer,
      enabled,
      finalizeSpeechTurn,
      handleRecognitionEnd,
      handleRecognitionError,
      handleRecognitionStart,
      resetTypewriter,
      safeStartRecognition,
      startSpeechCapture,
      startWakeMode,
    ],
  );

  const stopRecordingAndSendSTT = useCallback(() => {
    ignoreIncomingResponseRef.current = true;
    recognitionModeRef.current = 'idle';
    setVoicePhase('idle');
    setWakeWordDetectedAt(null);
    pendingSpeechCaptureRef.current = false;
    clearSpeechSilenceTimer();
    stopRecognition();
    setSttText('');
    sttTextRef.current = '';
  }, [clearSpeechSilenceTimer, stopRecognition]);

  const sleepConversation = useCallback(() => {
    ignoreIncomingResponseRef.current = true;
    recognitionModeRef.current = 'idle';
    setVoicePhase('wake');
    setWakeWordDetectedAt(null);
    pendingSpeechCaptureRef.current = false;
    clearSpeechSilenceTimer();
    resetTypewriter();
    setIsAwaitingResponse(false);
    setIsAiSpeaking(false);
    wsRef.current?.close();
    wsRef.current = null;
    stopRecognition();
    setSttText(`웨이크워드 대기 중.. "${WAKE_WORD}"라고 말해보세요`);
    sttTextRef.current = '';
    startWakeMode();
  }, [clearSpeechSilenceTimer, resetTypewriter, startWakeMode, stopRecognition]);

  const sendMessage = useCallback(
    async (
      text: string,
      _sessionId: string | null,
      assistantType: string,
      _memoryPolicy: string,
      chatSessionType: string = 'AVATAR_AI',
      targetUserId: number | null = null,
    ) => {
      const normalized = text.trim();
      if (!enabled || !normalized) return;

      setChatInput('');
      setChatMessages((prev) => [...prev, { sender: 'me', text: normalized }]);
      setIsAwaitingResponse(true);

      await sendGuestText(normalized, assistantType, chatSessionType, targetUserId);
    },
    [enabled, sendGuestText],
  );

  const toggleLock = useCallback(() => {}, []);

  useEffect(() => {
    if (!enabled) {
      wsRef.current?.close();
      wsRef.current = null;
      const timeoutId = window.setTimeout(() => {
        resetGuestChatState();
      }, 0);

      return () => {
        window.clearTimeout(timeoutId);
      };
    }
  }, [enabled, resetGuestChatState]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      resetGuestChatState();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [resetGuestChatState, targetUserId]);

  useEffect(() => {
    if (!enabled) return;

    return () => {
      resetTypewriter();
      clearSpeechSilenceTimer();
      audioElemRef.current?.pause();
      if (audioElemRef.current) {
        audioElemRef.current.src = '';
      }
      audioElemRef.current = null;
      mediaSourceRef.current = null;
      sourceBufferRef.current = null;
      audioQueueRef.current = [];
      streamEndedRef.current = false;
      setIsAiSpeaking(false);
      wsRef.current?.close();
      wsRef.current = null;
      stopRecognition();
    };
  }, [clearSpeechSilenceTimer, enabled, resetTypewriter, stopRecognition]);

  return {
    chatInput,
    chatMessages,
    isLockMode: false,
    sttText,
    voicePhase,
    wakeWordDetectedAt,
    isAiSpeaking,
    isAwaitingResponse,
    setChatInput,
    toggleLock,
    sendMessage,
    startRecording,
    stopRecordingAndSendSTT,
    sleepConversation,
  };
}
