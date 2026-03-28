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

const DEFAULT_GREETING = '서비스와 대화할 준비가 되었어요.';
const WAKE_WORD = '싸비스';
const WAKE_WORD_ALIASES = [WAKE_WORD, '사비스', '서비서', '서비스', '싸비서'];
const SPEECH_SILENCE_MS = 2000;
const TRANSCRIPT_VISIBLE_MS = 3000;

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
    `"${WAKE_WORD}"라고 말하면 음성 대화를 시작할 수 있어요.`,
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

  const beginAwaitingResponse = useCallback((message = 'AI 응답을 기다리는 중...') => {
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
      hasToken ? '서버 연결이 끊어졌습니다. 다시 시도해주세요.' : '로그인이 만료되었습니다. 다시 로그인해주세요.',
    );
  }, []);

  const handleSocketOpen = useCallback(() => {
    setConnectionNotice('');
  }, []);

  const handleSocketClose = useCallback(({ hadToken }: { hadToken: boolean }) => {
    if (!hadToken) {
      setConnectionNotice('로그인이 만료되었습니다. 다시 로그인해주세요.');
    } else if (awaitingResponseRef.current || isSubmittingSpeechTurnRef.current) {
      setConnectionNotice('서버 연결이 끊어졌습니다. 다시 시도해주세요.');
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
          setConnectionNotice('로그인이 만료되었습니다. 다시 로그인해주세요.');
        } else {
          setConnectionNotice('응답을 불러오지 못했습니다. 다시 시도해주세요.');
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

  const { wsRef, connectSocket, ensureSocketReady, closeSocket } = useChatSocket<ChatSocketMessage>({
    onOpen: handleSocketOpen,
    onClose: handleSocketClose,
    onMessage: handleSocketMessage,
    onBinaryChunk: enqueueAudioChunk,
    onConnectionUnavailable: handleConnectionUnavailable,
  });

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
      updateVoiceStatus(`들린 문장: "${heardText}"`);

      if (containsWakeWord(heardText)) {
        updateVoiceStatus('호출어를 들었어요. 지금부터 말해 주세요.');
        setSttText('지금부터 말해 주세요...');
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
        const socketReady = await ensureSocketReady();
        const socket = wsRef.current;

        if (!options || !socketReady || !socket || socket.readyState !== WebSocket.OPEN) {
          isSubmittingSpeechTurnRef.current = false;
          endAwaitingResponse();
          updateVoiceStatus('서버와 연결되지 않아 방금 말한 내용을 보내지 못했어요.');
          setConnectionNotice('서버 연결이 끊어졌습니다. 다시 시도해주세요.');
          setSttText('');
          sttTextRef.current = '';
          speechTurnCompletedRef.current = false;
          resumeWakeWordWhenReady();
          return;
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
        socket.send(JSON.stringify({ type: 'TEXT', text: finalText }));

        recognitionModeRef.current = 'idle';
        beginAwaitingResponse();
        setChatMessages((prev) => [...prev, { sender: 'me', text: finalText }]);
        updateVoiceStatus(`내가 말한 내용: "${finalText}"`);
        clearTranscriptTimer();
        transcriptClearTimerRef.current = setTimeout(() => {
          if (awaitingResponseRef.current) {
            setSttText('AI 응답을 기다리는 중...');
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
        updateVoiceStatus(`"${WAKE_WORD}"라고 부르면 다시 들을 수 있어요.`);
        setSttText(`"${WAKE_WORD}"라고 부르면 다시 들을 수 있어요.`);
      }

      sttTextRef.current = '';
    },
    [
      beginAwaitingResponse,
      clearSpeechSilenceTimer,
      clearTranscriptTimer,
      endAwaitingResponse,
      ensureSocketReady,
      resumeWakeWordWhenReady,
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

    const socketReady = await ensureSocketReady();
    if (!socketReady || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      updateVoiceStatus('서버와 연결되지 않아 음성 대화를 시작하지 못했어요.');
      return;
    }

    const { sessionId, assistantType, memoryPolicy, chatSessionType, targetUserId } =
      currentRecordingOptionsRef.current;

    wsRef.current.send(
      JSON.stringify({
        type: 'CHAT_START',
        sessionId,
        assistantType,
        memoryPolicy,
        chatSessionType,
        targetUserId,
      }),
    );

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(event.data);
        }
      };
      mediaRecorder.start(250);
      mediaRecorderRef.current = mediaRecorder;
    } catch (error) {
      updateVoiceStatus(`마이크를 사용할 수 없어요: ${String((error as Error).message || error)}`);
      return;
    }

    speechTurnCompletedRef.current = false;
    finalizeSpeechOnEndRef.current = false;
    recognitionModeRef.current = 'speech';
    clearTranscriptTimer();
    clearSpeechSilenceTimer();
    setSttText('지금부터 말해 주세요...');
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
      updateVoiceStatus(`인식된 문장: "${normalizedText}"`);
      scheduleSpeechFinalize();
    };

    safeStartRecognition();
  }, [
    clearSpeechSilenceTimer,
    clearTranscriptTimer,
    ensureSocketReady,
    safeStartRecognition,
    scheduleSpeechFinalize,
    updateVoiceStatus,
    wsRef,
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
          ? `"${WAKE_WORD}"라고 부르면 음성 대화를 시작해요.`
          : '지금부터 말해 주세요...',
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
          updateVoiceStatus(`"${WAKE_WORD}"라고 부르면 음성 대화를 시작해요.`);
        }
        return;
      }

      if (recognitionModeRef.current === 'speech') {
        updateVoiceStatus(`음성 인식 중 오류가 발생했어요: ${event.error}`);
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
    connectSocket();

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
    connectSocket,
    stopMediaRecorder,
    stopRecognition,
  ]);

  useEffect(() => {
    if (!isAwaitingResponse) return;

    const frames = ['|', '/', '-', '\\'];
    let frameIndex = 0;

    const intervalId = setInterval(() => {
      setSttText(`AI 응답을 기다리는 중... ${frames[frameIndex]}`);
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
        { sender: 'ai', text: '시크릿 모드가 켜졌어요. 이 모드에서는 새로운 대화만 보여드릴게요.' },
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
        updateVoiceStatus(`마이크 권한을 확인해주세요: ${String((error as Error).message || error)}`);
        return;
      }

      wakeWordActiveRef.current = true;
      setIsWakeWordActive(true);
      clearTranscriptTimer();
      clearSpeechSilenceTimer();
      setSttText(`"${WAKE_WORD}"라고 부르면 음성 대화를 시작해요.`);
      sttTextRef.current = '';
      updateVoiceStatus(`"${WAKE_WORD}"라고 부르면 음성 대화를 시작해요.`);
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
    updateVoiceStatus('음성 대기를 종료했어요.');
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
    (
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
        setConnectionNotice('로그인이 만료되었습니다. 다시 로그인해주세요.');
        return;
      }

      setChatInput('');
      setChatMessages((prev) => [...prev, { sender: 'me', text: normalized }]);
      beginAwaitingResponse();

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        setConnectionNotice('');
        wsRef.current.send(
          JSON.stringify({
            type: 'CHAT_START',
            sessionId,
            assistantType,
            memoryPolicy,
            chatSessionType,
            targetUserId,
          }),
        );
        wsRef.current.send(JSON.stringify({ type: 'AUDIO_END' }));
        wsRef.current.send(JSON.stringify({ type: 'TEXT', text: normalized }));
        return;
      }

      connectSocket();
    },
    [beginAwaitingResponse, connectSocket, wsRef],
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
