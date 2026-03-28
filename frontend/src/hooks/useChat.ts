import { useCallback, useEffect, useRef, useState } from 'react';

import type { ChatMessage } from '../types';
import { useChatAudioPlayback } from './useChatAudioPlayback';
import { useChatSocket } from './useChatSocket';

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

const DEFAULT_GREETING = '난 너야, 만나서 반가워.';
const WAKE_WORD = '싸비스';
const WAKE_WORD_ALIASES = [WAKE_WORD, '사비스', '싸비쓰', '서비스', '싸비스야', '비스', '싸비', '싸쓰'];
const SPEECH_SILENCE_MS = 2000;
const TRANSCRIPT_VISIBLE_MS = 3000;
const WAITING_FOR_AI_TEXT = 'AI 응답을 준비하고 있어요...';
const WAKE_GUIDE_TEXT = `"${WAKE_WORD}"라고 말하면 음성 인식을 시작할게요.`;
const WAKE_DETECTED_TEXT = `${WAKE_WORD}를 들었어요. 하고 싶은 말을 이어서 해주세요.`;
const SPEECH_LISTENING_TEXT = '말씀을 듣고 있어요...';
const CONNECTION_ERROR_TEXT = '서버 연결에 문제가 있어요. 다시 시도해주세요.';
const LOGIN_EXPIRED_TEXT = '로그인이 만료되었어요. 다시 로그인해주세요.';
const SECRET_MODE_GREETING = '시크릿 모드예요. 이 대화는 기록되지 않고 지금 이 순간에만 머물러요.';
const SPEECH_STOPPED_TEXT = '음성 듣기를 종료했어요.';

function normalizeWakeTranscript(text: string) {
  return text.replace(/\s+/g, '').toLowerCase();
}

function containsWakeWord(text: string) {
  const normalizedText = normalizeWakeTranscript(text);
  return WAKE_WORD_ALIASES.some((alias) => normalizedText.includes(normalizeWakeTranscript(alias)));
}

export function useChat() {
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { sender: 'ai', text: DEFAULT_GREETING },
  ]);
  const [backupMessages, setBackupMessages] = useState<ChatMessage[] | null>(null);
  const [isLockMode, setIsLockMode] = useState(false);
  const [sttText, setSttText] = useState('');
  const [latestAiText, setLatestAiText] = useState(DEFAULT_GREETING);
  const [voiceStatus, setVoiceStatus] = useState(
    WAKE_GUIDE_TEXT,
  );
  const [isWakeWordActive, setIsWakeWordActive] = useState(false);
  const [isAwaitingResponse, setIsAwaitingResponse] = useState(false);
  const [connectionNotice, setConnectionNotice] = useState('');

  const {
    audioElemRef,
    isAiSpeaking,
    aiSpeechProgress,
    aiPlaybackActiveRef,
    enqueueAudioChunk,
    startAudioPlayback,
    finalizeAudioStream,
    cleanupAudioPlayback,
    clearAiPlaybackFallbackTimer,
  } = useChatAudioPlayback();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const typeWriterIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recognitionRef = useRef<WebSpeechRecognition | null>(null);
  const recognitionModeRef = useRef<RecognitionMode>('idle');
  const isRecognizingRef = useRef(false);
  const manualStopRef = useRef(false);
  const pendingSpeechCaptureRef = useRef(false);
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

  const clearTypeWriter = useCallback(() => {
    if (typeWriterIntervalRef.current) {
      clearInterval(typeWriterIntervalRef.current);
      typeWriterIntervalRef.current = null;
    }
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

  const beginAwaitingResponse = useCallback((message = WAITING_FOR_AI_TEXT) => {
    awaitingResponseRef.current = true;
    setIsAwaitingResponse(true);
    setVoiceStatus(message);
    setSttText(message);
  }, []);

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
    if (
      awaitingResponseRef.current ||
      aiPlaybackActiveRef.current ||
      isSubmittingSpeechTurnRef.current
    ) {
      pendingWakeResumeRef.current = true;
      return;
    }

    pendingWakeResumeRef.current = false;
    resumeWakeWordRef.current?.();
  }, [aiPlaybackActiveRef]);

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

  const handleConnectionUnavailable = useCallback((hasToken: boolean) => {
    setConnectionNotice(
      hasToken ? CONNECTION_ERROR_TEXT : LOGIN_EXPIRED_TEXT,
    );
  }, []);

  const handleSocketOpen = useCallback(() => {
    setConnectionNotice('');
  }, []);

  const handleSocketClose = useCallback(({ hadToken }: { hadToken: boolean }) => {
    if (!hadToken) {
      setConnectionNotice(LOGIN_EXPIRED_TEXT);
    } else if (awaitingResponseRef.current || isSubmittingSpeechTurnRef.current) {
      setConnectionNotice(CONNECTION_ERROR_TEXT);
    }
  }, []);

  const handleSocketMessage = useCallback(
    async (message: ChatSocketMessage) => {
      if (message.type === 'ACK') return;

      if (message.type === 'END_OF_STREAM') {
        isSubmittingSpeechTurnRef.current = false;
        setConnectionNotice('');
        endAwaitingResponse();
        finalizeAudioStream();
        resumeWakeWordWhenReady();
        return;
      }

      if (message.type === 'CANCELLED') {
        isSubmittingSpeechTurnRef.current = false;
        setConnectionNotice('');
        endAwaitingResponse();
        cleanupAudioPlayback(true);
        resumeWakeWordWhenReady();
        return;
      }

      if (message.type === 'ERROR' || message.type === 'error') {
        isSubmittingSpeechTurnRef.current = false;
        const code = message.payload?.code;
        if (code === 'TOKEN_EXPIRED' || code === 'UNAUTHORIZED' || code === 401) {
          setConnectionNotice(LOGIN_EXPIRED_TEXT);
        } else {
          setConnectionNotice(CONNECTION_ERROR_TEXT);
        }
        endAwaitingResponse(false);
        cleanupAudioPlayback(true);
        resumeWakeWordWhenReady();
        return;
      }

      switch (message.type) {
        case 'text.start':
          clearTypeWriter();
          setChatMessages((prev) => [...prev, { sender: 'ai', text: '' }]);
          break;

        case 'text.end': {
          const aiResponseText = message.payload?.text || '';
          let index = 0;
          setLatestAiText(aiResponseText);

          typeWriterIntervalRef.current = setInterval(() => {
            setChatMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last && last.sender === 'ai') {
                last.text = aiResponseText.slice(0, index + 1);
              }
              return next;
            });

            index += 1;
            if (index >= aiResponseText.length) {
              clearTypeWriter();
            }
          }, 50);
          break;
        }

        case 'voice.start':
          startAudioPlayback(() => {
            if (pendingWakeResumeRef.current) {
              resumeWakeWordWhenReady();
            }
          });
          break;

        default:
          break;
      }
    },
    [
      cleanupAudioPlayback,
      clearTypeWriter,
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
    onBinaryChunk: enqueueAudioChunk,
    onConnectionUnavailable: handleConnectionUnavailable,
  });

  const sendTextTurn = useCallback(
    async (options: RecordingOptions, text: string) => {
      const socketReady = await ensureSocketReady();
      const socket = wsRef.current;

      if (!socketReady || !socket || socket.readyState !== WebSocket.OPEN) {
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

      return true;
    },
    [ensureSocketReady, wsRef],
  );

  const startWakeMode = useCallback(() => {
    if (!recognitionRef.current || !wakeWordActiveRef.current || isSubmittingSpeechTurnRef.current) {
      return;
    }

    recognitionModeRef.current = 'wake';
    pendingSpeechCaptureRef.current = false;
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.onresult = (event: WebSpeechRecognitionEvent) => {
      const lastResult = event.results[event.results.length - 1];
      const heardText = lastResult?.[0]?.transcript?.trim() || '';
      if (!heardText) return;

      setSttText(heardText);
      sttTextRef.current = heardText;
      updateVoiceStatus(heardText);

      if (containsWakeWord(heardText)) {
        updateVoiceStatus(WAKE_DETECTED_TEXT);
        setSttText(SPEECH_LISTENING_TEXT);
        pendingSpeechCaptureRef.current = true;
        stopRecognition();
      }
    };

    safeStartRecognition();
  }, [safeStartRecognition, stopRecognition, updateVoiceStatus]);

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

  const finalizeSpeechTurn = useCallback(
    async (shouldSendText: boolean) => {
      if (speechTurnCompletedRef.current || isSubmittingSpeechTurnRef.current) return;
      speechTurnCompletedRef.current = true;
      isSubmittingSpeechTurnRef.current = true;

      const finalText = sttTextRef.current.trim();
      clearSpeechSilenceTimer();
      finalizeSpeechOnEndRef.current = false;
      stopMediaRecorder();

      if (shouldSendText && finalText) {
        const options = currentRecordingOptionsRef.current;

        if (!options || !(await sendTextTurn(options, finalText))) {
          isSubmittingSpeechTurnRef.current = false;
          endAwaitingResponse();
          updateVoiceStatus('서버에 음성 질문을 보내지 못했어요. 다시 시도해주세요.');
          setConnectionNotice(CONNECTION_ERROR_TEXT);
          setSttText('');
          sttTextRef.current = '';
          speechTurnCompletedRef.current = false;
          resumeWakeWordWhenReady();
          return;
        }

        recognitionModeRef.current = 'idle';
        beginAwaitingResponse();
        setChatMessages((prev) => [...prev, { sender: 'me', text: finalText }]);
        updateVoiceStatus(finalText);
        clearTranscriptTimer();
        transcriptClearTimerRef.current = setTimeout(() => {
          if (awaitingResponseRef.current) {
            setSttText(WAITING_FOR_AI_TEXT);
          } else {
            setSttText('');
          }
        }, TRANSCRIPT_VISIBLE_MS);
      } else if (recognitionModeRef.current === 'speech') {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'AUDIO_END' }));
          wsRef.current.send(JSON.stringify({ type: 'CANCEL' }));
        }

        isSubmittingSpeechTurnRef.current = false;
        updateVoiceStatus(WAKE_GUIDE_TEXT);
        setSttText(WAKE_GUIDE_TEXT);
      }

      sttTextRef.current = '';
    },
    [
      beginAwaitingResponse,
      clearSpeechSilenceTimer,
      clearTranscriptTimer,
      endAwaitingResponse,
      resumeWakeWordWhenReady,
      sendTextTurn,
      stopMediaRecorder,
      updateVoiceStatus,
      wsRef,
    ],
  );

  const scheduleSpeechFinalize = useCallback(() => {
    clearSpeechSilenceTimer();
    speechSilenceTimerRef.current = setTimeout(() => {
      finalizeSpeechOnEndRef.current = true;
      stopRecognition();
    }, SPEECH_SILENCE_MS);
  }, [clearSpeechSilenceTimer, stopRecognition]);

  const startSpeechCapture = useCallback(async () => {
    if (
      !recognitionRef.current ||
      !currentRecordingOptionsRef.current ||
      isSubmittingSpeechTurnRef.current
    ) {
      return;
    }

    if (false) {
      updateVoiceStatus(CONNECTION_ERROR_TEXT);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
    } catch (error) {
      updateVoiceStatus(`마이크 권한을 가져오지 못했어요: ${String((error as Error).message || error)}`);
      return;
    }

    speechTurnCompletedRef.current = false;
    finalizeSpeechOnEndRef.current = false;
    recognitionModeRef.current = 'speech';
    clearTranscriptTimer();
    clearSpeechSilenceTimer();
    setSttText(SPEECH_LISTENING_TEXT);
    sttTextRef.current = '';
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.onresult = (event: WebSpeechRecognitionEvent) => {
      let transcript = '';

      for (let index = 0; index < event.results.length; index += 1) {
        transcript += event.results[index]?.[0]?.transcript || '';
      }

      const normalizedText = transcript.trim();
      if (!normalizedText) return;

      setSttText(normalizedText);
      sttTextRef.current = normalizedText;
      updateVoiceStatus(normalizedText);
      scheduleSpeechFinalize();
    };

    safeStartRecognition();
  }, [
    clearSpeechSilenceTimer,
    clearTranscriptTimer,
    safeStartRecognition,
    scheduleSpeechFinalize,
    updateVoiceStatus,
  ]);

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
      updateVoiceStatus(
        recognitionModeRef.current === 'wake'
          ? WAKE_GUIDE_TEXT
          : SPEECH_LISTENING_TEXT,
      );
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
        updateVoiceStatus(`음성 인식 중 문제가 생겼어요: ${event.error}`);
      }
    };

    recognition.onend = () => {
      isRecognizingRef.current = false;
      clearRestartTimer();

      if (pendingSpeechCaptureRef.current && recognitionModeRef.current === 'wake') {
        manualStopRef.current = false;
        pendingSpeechCaptureRef.current = false;
        if (!isSubmittingSpeechTurnRef.current) {
          void startSpeechCapture();
        }
        return;
      }

      if (recognitionModeRef.current === 'speech' && finalizeSpeechOnEndRef.current) {
        manualStopRef.current = false;
        void finalizeSpeechTurn(!!sttTextRef.current.trim());
        return;
      }

      if (manualStopRef.current) {
        manualStopRef.current = false;
        return;
      }

      if (recognitionModeRef.current === 'wake') {
        if (wakeWordActiveRef.current && !isSubmittingSpeechTurnRef.current) {
          restartTimerRef.current = setTimeout(() => {
            safeStartRecognition();
          }, 250);
        }
        return;
      }

      if (recognitionModeRef.current === 'speech') {
        if (sttTextRef.current.trim()) {
          scheduleSpeechFinalize();
          if (!isSubmittingSpeechTurnRef.current) {
            safeStartRecognition();
          }
          return;
        }

        void finalizeSpeechTurn(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      clearRestartTimer();
      clearTranscriptTimer();
      clearSpeechSilenceTimer();
      clearAiPlaybackFallbackTimer();
      clearTypeWriter();
      cleanupAudioPlayback(true);
      recognitionRef.current = null;
    };
  }, [
    cleanupAudioPlayback,
    clearAiPlaybackFallbackTimer,
    clearRestartTimer,
    clearSpeechSilenceTimer,
    clearTranscriptTimer,
    clearTypeWriter,
    finalizeSpeechTurn,
    safeStartRecognition,
    scheduleSpeechFinalize,
    startSpeechCapture,
    updateVoiceStatus,
  ]);

  useEffect(() => {
    return () => {
      clearRestartTimer();
      clearTranscriptTimer();
      clearSpeechSilenceTimer();
      clearAiPlaybackFallbackTimer();
      clearTypeWriter();
      cleanupAudioPlayback(true);
      stopMediaRecorder();
      stopRecognition();
      closeSocket(true);
    };
  }, [
    cleanupAudioPlayback,
    clearAiPlaybackFallbackTimer,
    clearRestartTimer,
    clearSpeechSilenceTimer,
    clearTranscriptTimer,
    clearTypeWriter,
    closeSocket,
    stopMediaRecorder,
    stopRecognition,
  ]);

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

  const toggleLock = useCallback(() => {
    if (!isLockMode) {
      setBackupMessages(chatMessages);
      setChatMessages([
        { sender: 'ai', text: SECRET_MODE_GREETING },
      ]);
    } else if (backupMessages) {
      setChatMessages(backupMessages);
      setBackupMessages(null);
    } else {
      setChatMessages([{ sender: 'ai', text: DEFAULT_GREETING }]);
    }

    setIsLockMode((prev) => !prev);
  }, [backupMessages, chatMessages, isLockMode]);

  const startRecording = useCallback(
    async (
      sessionId: string | null,
      assistantType: string,
      memoryPolicy: string,
      chatSessionType: string = 'USER_AI',
      targetUserId: number | null = null,
    ) => {
      if (!isSpeechRecognitionSupported.current) {
        updateVoiceStatus('이 브라우저에서는 음성 인식을 지원하지 않아요.');
        return;
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
        updateVoiceStatus(`마이크 권한을 확인할 수 없어요: ${String((error as Error).message || error)}`);
        return;
      }

      wakeWordActiveRef.current = true;
      setIsWakeWordActive(true);
      clearTranscriptTimer();
      clearSpeechSilenceTimer();
      setSttText(WAKE_GUIDE_TEXT);
      sttTextRef.current = '';
      updateVoiceStatus(WAKE_GUIDE_TEXT);
      startWakeMode();
    },
    [clearSpeechSilenceTimer, clearTranscriptTimer, startWakeMode, updateVoiceStatus],
  );

  const stopRecordingAndSendSTT = useCallback(() => {
    wakeWordActiveRef.current = false;
    setIsWakeWordActive(false);
    endAwaitingResponse();
    cleanupAudioPlayback(true);
    pendingSpeechCaptureRef.current = false;
    clearSpeechSilenceTimer();
    finalizeSpeechOnEndRef.current = false;
    isSubmittingSpeechTurnRef.current = false;

    if (recognitionModeRef.current === 'speech') {
      void finalizeSpeechTurn(!!sttTextRef.current.trim());
    } else {
      stopMediaRecorder();
    }

    recognitionModeRef.current = 'idle';
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
    updateVoiceStatus,
  ]);

  const cancelTurn = useCallback(() => {
    setSttText('');
    sttTextRef.current = '';
    endAwaitingResponse();
    cleanupAudioPlayback(true);
    clearSpeechSilenceTimer();
    finalizeSpeechOnEndRef.current = false;
    speechTurnCompletedRef.current = true;
    isSubmittingSpeechTurnRef.current = false;
    stopMediaRecorder();
    stopRecognition();

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'CANCEL' }));
    }

    resumeWakeWordWhenReady();
  }, [
    cleanupAudioPlayback,
    clearSpeechSilenceTimer,
    endAwaitingResponse,
    resumeWakeWordWhenReady,
    stopMediaRecorder,
    stopRecognition,
    wsRef,
  ]);

  const sendMessage = useCallback(
    async (
      text: string,
      sessionId: string | null,
      assistantType: string,
      memoryPolicy: string,
      chatSessionType: string = 'USER_AI',
      targetUserId: number | null = null,
    ) => {
      const normalized = text.trim();
      if (!normalized) return;

      if (!localStorage.getItem('token')) {
        setConnectionNotice(LOGIN_EXPIRED_TEXT);
        return;
      }

      setChatInput('');
      setChatMessages((prev) => [...prev, { sender: 'me', text: normalized }]);
      beginAwaitingResponse();

      const options: RecordingOptions = {
        sessionId,
        assistantType,
        memoryPolicy,
        chatSessionType,
        targetUserId,
      };

      if (!(await sendTextTurn(options, normalized))) {
        endAwaitingResponse();
        setConnectionNotice(CONNECTION_ERROR_TEXT);
        return;
      }

      setConnectionNotice('');
    },
    [beginAwaitingResponse, endAwaitingResponse, sendTextTurn],
  );

  return {
    chatInput,
    chatMessages,
    latestAiText,
    aiSpeechProgress,
    isLockMode,
    sttText,
    isAiSpeaking,
    isWakeWordActive,
    isAwaitingResponse,
    voiceStatus,
    connectionNotice,
    audioElemRef,
    setChatInput,
    setChatMessages,
    toggleLock,
    sendMessage,
    startRecording,
    stopRecordingAndSendSTT,
    cancelTurn,
  };
}

