import { useCallback, useEffect, useRef, useState } from 'react';
import { getApiOrigin } from '../config/api';
import type { ChatMessage } from '../types';

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

const WAKE_WORD = '싸비스';
const SPEECH_SILENCE_MS = 2000;
const TRANSCRIPT_VISIBLE_MS = 3000;

const WAKE_WORD_ALIASES = [WAKE_WORD, '사비스', '서비스', '싸비스야', '사비서', '싸비스'];

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
    { sender: 'ai', text: '안녕하세요. 무엇을 도와드릴까요?' },
  ]);
  const [backupMessages, setBackupMessages] = useState<ChatMessage[] | null>(null);
  const [isLockMode, setIsLockMode] = useState(false);
  const [sttText, setSttText] = useState('');
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [aiSpeechProgress, setAiSpeechProgress] = useState(0);
  const [latestAiText, setLatestAiText] = useState('안녕하세요. 무엇을 도와드릴까요?');
  const [voiceStatus, setVoiceStatus] = useState('마이크 버튼을 눌러 웨이크 워드를 활성화하세요.');
  const [isWakeWordActive, setIsWakeWordActive] = useState(false);
  const [isAwaitingResponse, setIsAwaitingResponse] = useState(false);
  const [connectionNotice, setConnectionNotice] = useState('');

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaSourceRef = useRef<MediaSource | null>(null);
  const sourceBufferRef = useRef<SourceBuffer | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const audioElemRef = useRef<HTMLAudioElement | null>(null);
  const typeWriterIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const aiPlaybackFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiSpeechProgressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
  const aiPlaybackActiveRef = useRef(false);
  const pendingWakeResumeRef = useRef(false);

  const processAudioQueue = useCallback(() => {
    const sourceBuffer = sourceBufferRef.current;
    if (!sourceBuffer || sourceBuffer.updating || audioQueueRef.current.length === 0) return;

    try {
      const chunk = audioQueueRef.current.shift();
      if (chunk) sourceBuffer.appendBuffer(chunk);
    } catch (error) {
      console.error('오디오 버퍼 추가 중 오류:', error);
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

  const clearAiPlaybackFallbackTimer = useCallback(() => {
    if (aiPlaybackFallbackTimerRef.current) {
      clearTimeout(aiPlaybackFallbackTimerRef.current);
      aiPlaybackFallbackTimerRef.current = null;
    }
  }, []);

  const clearAiSpeechProgressTimer = useCallback(() => {
    if (aiSpeechProgressTimerRef.current) {
      clearInterval(aiSpeechProgressTimerRef.current);
      aiSpeechProgressTimerRef.current = null;
    }
  }, []);

  const beginAwaitingResponse = useCallback((message = '응답 생성 중...') => {
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

  const resumeWakeWordWhenReady = useCallback(() => {
    if (!wakeWordActiveRef.current) return;
    if (awaitingResponseRef.current || aiPlaybackActiveRef.current) {
      pendingWakeResumeRef.current = true;
      return;
    }

    pendingWakeResumeRef.current = false;
    resumeWakeWordRef.current?.();
  }, []);

  const updateVoiceStatus = useCallback((message: string) => {
    setVoiceStatus(message);
    if (recognitionModeRef.current !== 'speech' && !awaitingResponseRef.current) {
      setSttText(message);
    }
  }, []);

  const cleanupAudioPlayback = useCallback(
    (resetSpeaking: boolean = true) => {
      clearAiPlaybackFallbackTimer();
      clearAiSpeechProgressTimer();

      const audio = audioElemRef.current;
      if (audio) {
        audio.onplay = null;
        audio.onpause = null;
        audio.onended = null;
        audio.onerror = null;
        audio.pause();
        if (audio.src.startsWith('blob:')) {
          URL.revokeObjectURL(audio.src);
        }
      }

      const sourceBuffer = sourceBufferRef.current;
      if (sourceBuffer) {
        sourceBuffer.removeEventListener('updateend', processAudioQueue);
      }

      const mediaSource = mediaSourceRef.current;
      if (mediaSource && mediaSource.readyState === 'open') {
        try {
          mediaSource.endOfStream();
        } catch {
          // ignore MediaSource finalization errors
        }
      }

      audioElemRef.current = null;
      mediaSourceRef.current = null;
      sourceBufferRef.current = null;
      audioQueueRef.current = [];
      aiPlaybackActiveRef.current = false;
      setAiSpeechProgress(0);

      if (resetSpeaking) {
        setIsAiSpeaking(false);
      }
    },
    [clearAiPlaybackFallbackTimer, clearAiSpeechProgressTimer, processAudioQueue],
  );

  const finalizeAudioStream = useCallback(() => {
    clearAiPlaybackFallbackTimer();

    const mediaSource = mediaSourceRef.current;
    const sourceBuffer = sourceBufferRef.current;

    const scheduleFallbackCleanup = () => {
      clearAiPlaybackFallbackTimer();
      aiPlaybackFallbackTimerRef.current = setTimeout(() => {
        const audio = audioElemRef.current;
        if (!audio || audio.ended || audio.paused || !aiPlaybackActiveRef.current) {
          cleanupAudioPlayback(true);
        }
      }, 1200);
    };

    const closeMediaSource = () => {
      if (mediaSource && mediaSource.readyState === 'open') {
        try {
          mediaSource.endOfStream();
        } catch {
          // ignore and rely on fallback cleanup
        }
      }

      scheduleFallbackCleanup();
    };

    if (sourceBuffer?.updating) {
      const handleUpdateEnd = () => {
        sourceBuffer.removeEventListener('updateend', handleUpdateEnd);
        closeMediaSource();
      };
      sourceBuffer.addEventListener('updateend', handleUpdateEnd);
      return;
    }

    closeMediaSource();
  }, [cleanupAudioPlayback, clearAiPlaybackFallbackTimer]);

  const startAiSpeechProgressTracking = useCallback(() => {
    clearAiSpeechProgressTimer();

    aiSpeechProgressTimerRef.current = setInterval(() => {
      const audio = audioElemRef.current;
      if (!audio) return;

      const currentTime = audio.currentTime || 0;
      let estimatedDuration = 0;

      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        estimatedDuration = audio.duration;
      } else if (audio.buffered.length > 0) {
        estimatedDuration = audio.buffered.end(audio.buffered.length - 1);
      }

      if (estimatedDuration <= 0) return;

      const rawProgress = currentTime / estimatedDuration;
      const clampedProgress = Math.max(0, Math.min(rawProgress, audio.ended ? 1 : 0.98));
      setAiSpeechProgress((prev) => (clampedProgress > prev ? clampedProgress : prev));
    }, 80);
  }, [clearAiSpeechProgressTimer]);

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

  const scheduleSpeechFinalize = useCallback(() => {
    clearSpeechSilenceTimer();
    speechSilenceTimerRef.current = setTimeout(() => {
      finalizeSpeechOnEndRef.current = true;
      stopRecognition();
    }, SPEECH_SILENCE_MS);
  }, [clearSpeechSilenceTimer, stopRecognition]);

  const connectSocket = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setConnectionNotice('로그인이 만료되었습니다. 다시 로그인해주세요.');
      return null;
    }

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
    const socket = new WebSocket(`${protocol}//${host}/ws/chat?token=${token}`);
    socket.binaryType = 'arraybuffer';

    socket.onopen = () => console.log('웹소켓 연결 성공');
    socket.onclose = () => {
      console.log('웹소켓 연결 종료');
      if (wsRef.current === socket) {
        wsRef.current = null;
      }
    };

    socket.onopen = () => {
      setConnectionNotice('');
      console.log('WebSocket connected');
    };

    socket.onclose = () => {
      console.log('WebSocket closed');
      const hasToken = !!localStorage.getItem('token');
      if (!hasToken) {
        setConnectionNotice('로그인이 만료되었습니다. 다시 로그인해주세요.');
      } else if (awaitingResponseRef.current) {
        setConnectionNotice('서버 연결이 끊어졌습니다. 다시 시도해주세요.');
      }

      if (wsRef.current === socket) {
        wsRef.current = null;
      }
    };

    socket.onmessage = async (event) => {
      if (event.data instanceof ArrayBuffer) {
        audioQueueRef.current.push(event.data);
        processAudioQueue();
        return;
      }

      if (typeof event.data !== 'string') return;

      const message = JSON.parse(event.data);
      if (message.type === 'ACK') return;
      if (message.type === 'END_OF_STREAM') {
        setConnectionNotice('');
        endAwaitingResponse();
        finalizeAudioStream();
        resumeWakeWordWhenReady();
        console.debug('WebSocket stream ended:', message.type);
        return;
      }
      if (message.type === 'CANCELLED') {
        setConnectionNotice('');
        endAwaitingResponse();
        cleanupAudioPlayback(true);
        resumeWakeWordWhenReady();
        console.warn('WebSocket request cancelled:', message.type, message.message);
        return;
      }
      if (message.type === 'ERROR' || message.type === 'error') {
        const code = message.payload?.code;
        if (code === 'TOKEN_EXPIRED' || code === 'UNAUTHORIZED' || code === 401) {
          setConnectionNotice('로그인이 만료되었습니다. 다시 로그인해주세요.');
        } else {
          setConnectionNotice('응답을 불러오지 못했습니다. 다시 시도해주세요.');
        }
        endAwaitingResponse(false);
        cleanupAudioPlayback(true);
        resumeWakeWordWhenReady();
        console.error('WebSocket state:', message.type, {
          message: message.message,
          detail: message.detail,
          code: message.payload?.code,
          errors: message.payload?.errors,
        });
        return;
      }

      switch (message.type) {
        case 'text.start':
          if (typeWriterIntervalRef.current) clearInterval(typeWriterIntervalRef.current);
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
            if (index >= aiResponseText.length && typeWriterIntervalRef.current) {
              clearInterval(typeWriterIntervalRef.current);
            }
          }, 50);
          break;
        }

        case 'voice.start': {
          cleanupAudioPlayback(false);
          audioQueueRef.current = [];
          const mediaSource = new MediaSource();
          const audio = new Audio();
          mediaSourceRef.current = mediaSource;
          audio.src = URL.createObjectURL(mediaSource);
          audio.onplay = () => {
            clearAiPlaybackFallbackTimer();
            aiPlaybackActiveRef.current = true;
            setIsAiSpeaking(true);
            startAiSpeechProgressTracking();
          };
          audio.onpause = () => {
            aiPlaybackActiveRef.current = false;
            setIsAiSpeaking(false);
          };
          audio.onended = () => {
            aiPlaybackActiveRef.current = false;
            setAiSpeechProgress(1);
            cleanupAudioPlayback(true);
            if (pendingWakeResumeRef.current) {
              resumeWakeWordWhenReady();
            }
          };
          audio.onerror = () => {
            cleanupAudioPlayback(true);
          };
          audio.play().catch((error) => console.warn('오디오 자동재생 대기:', error));

          mediaSource.addEventListener('sourceopen', () => {
            try {
              const sourceBuffer = mediaSource.addSourceBuffer('audio/webm; codecs="opus"');
              sourceBuffer.addEventListener('updateend', processAudioQueue);
              sourceBufferRef.current = sourceBuffer;
            } catch (error) {
              console.warn('SourceBuffer 초기화 실패:', error);
            }
          });

          audioElemRef.current = audio;
          break;
        }

        case 'ERROR':
        case 'error':
        case 'CANCELLED':
        case 'END_OF_STREAM':
          console.error('웹소켓 상태:', message.type, message.message);
          break;
      }
    };

    wsRef.current = socket;
    return socket;
  }, [
    cleanupAudioPlayback,
    clearAiPlaybackFallbackTimer,
    startAiSpeechProgressTracking,
    endAwaitingResponse,
    finalizeAudioStream,
    processAudioQueue,
    resumeWakeWordWhenReady,
  ]);

  const ensureSocketReady = useCallback(async () => {
    const socket = connectSocket();
    if (!socket) return false;

    if (socket.readyState === WebSocket.OPEN) {
      setConnectionNotice('');
      return true;
    }
    if (socket.readyState !== WebSocket.CONNECTING) {
      setConnectionNotice('서버 연결이 끊어졌습니다. 다시 시도해주세요.');
      return false;
    }

    return await new Promise<boolean>((resolve) => {
      let resolved = false;

      const cleanup = (result: boolean) => {
        if (resolved) return;
        resolved = true;
        socket.removeEventListener('open', handleOpen);
        socket.removeEventListener('error', handleError);
        socket.removeEventListener('close', handleClose);
        clearTimeout(timeoutId);
        if (!result) {
          const hasToken = !!localStorage.getItem('token');
          setConnectionNotice(
            hasToken
              ? '서버 연결이 끊어졌습니다. 다시 시도해주세요.'
              : '로그인이 만료되었습니다. 다시 로그인해주세요.',
          );
        }
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

  const safeStartRecognition = useCallback(() => {
    if (!recognitionRef.current || isRecognizingRef.current) return;

    try {
      manualStopRef.current = false;
      recognitionRef.current.start();
    } catch (error) {
      const message = String((error as Error).message || error);
      if (!message.includes('recognition has already started')) {
        updateVoiceStatus(`마이크 시작 실패: ${message}`);
      }
    }
  }, [updateVoiceStatus]);

  const finalizeSpeechTurn = useCallback(
    (shouldSendText: boolean) => {
      if (speechTurnCompletedRef.current) return;
      speechTurnCompletedRef.current = true;

      const finalText = sttTextRef.current.trim();
      clearSpeechSilenceTimer();
      finalizeSpeechOnEndRef.current = false;
      stopMediaRecorder();

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'AUDIO_END' }));

        if (shouldSendText && finalText) {
          wsRef.current.send(JSON.stringify({ type: 'TEXT', text: finalText }));
        } else {
          wsRef.current.send(JSON.stringify({ type: 'CANCEL' }));
        }
      }

      if (shouldSendText && finalText) {
        recognitionModeRef.current = 'idle';
        beginAwaitingResponse();
        setChatMessages((prev) => [...prev, { sender: 'me', text: finalText }]);
        updateVoiceStatus(`입력 완료: "${finalText}"`);
        clearTranscriptTimer();
        transcriptClearTimerRef.current = setTimeout(() => {
          if (awaitingResponseRef.current) {
            setSttText('응답 생성 중...');
          } else {
            setSttText('');
          }
        }, TRANSCRIPT_VISIBLE_MS);
      } else if (recognitionModeRef.current === 'speech') {
        updateVoiceStatus(`웨이크 워드 대기 중... "${WAKE_WORD}"라고 말해보세요.`);
        setSttText(`웨이크 워드 대기 중... "${WAKE_WORD}"라고 말해보세요.`);
      }

      sttTextRef.current = '';
    },
    [
      beginAwaitingResponse,
      clearSpeechSilenceTimer,
      clearTranscriptTimer,
      stopMediaRecorder,
      updateVoiceStatus,
    ],
  );

  const startWakeMode = useCallback(() => {
    if (!recognitionRef.current || !wakeWordActiveRef.current) return;

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
      updateVoiceStatus(`들음: "${heardText}"`);

      if (containsWakeWord(heardText)) {
        updateVoiceStatus('웨이크 워드 감지! 음성을 듣고 있어요.');
        setSttText('음성을 듣고 있어요...');
        pendingSpeechCaptureRef.current = true;
        stopRecognition();
      }
    };

    safeStartRecognition();
  }, [safeStartRecognition, stopRecognition, updateVoiceStatus]);

  useEffect(() => {
    resumeWakeWordRef.current = () => {
      if (!wakeWordActiveRef.current || awaitingResponseRef.current) return;
      startWakeMode();
    };
  }, [startWakeMode]);

  const startSpeechCapture = useCallback(async () => {
    if (!recognitionRef.current || !currentRecordingOptionsRef.current) return;

    const socketReady = await ensureSocketReady();
    if (!socketReady || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      updateVoiceStatus('채팅 서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.');
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
      updateVoiceStatus(`마이크 시작 실패: ${String((error as Error).message || error)}`);
      return;
    }

    speechTurnCompletedRef.current = false;
    finalizeSpeechOnEndRef.current = false;
    recognitionModeRef.current = 'speech';
    clearTranscriptTimer();
    clearSpeechSilenceTimer();
    setSttText('음성을 듣고 있어요...');
    sttTextRef.current = '';
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.onresult = (event: WebSpeechRecognitionEvent) => {
      let transcript = '';

      for (let i = 0; i < event.results.length; i += 1) {
        transcript += event.results[i]?.[0]?.transcript || '';
      }

      const normalizedText = transcript.trim();
      if (!normalizedText) return;

      setSttText(normalizedText);
      sttTextRef.current = normalizedText;
      updateVoiceStatus(`입력 중: "${normalizedText}"`);
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
          ? `웨이크 워드 대기 중... "${WAKE_WORD}"라고 말해보세요.`
          : '음성 인식 중...',
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
          updateVoiceStatus(`웨이크 워드 대기 중... "${WAKE_WORD}"라고 말해보세요.`);
        }
        return;
      }

      if (recognitionModeRef.current === 'speech') {
        updateVoiceStatus(`음성 인식 오류: ${event.error}`);
      }
    };

    recognition.onend = () => {
      isRecognizingRef.current = false;
      clearRestartTimer();

      if (pendingSpeechCaptureRef.current && recognitionModeRef.current === 'wake') {
        manualStopRef.current = false;
        pendingSpeechCaptureRef.current = false;
        void startSpeechCapture();
        return;
      }

      if (recognitionModeRef.current === 'speech' && finalizeSpeechOnEndRef.current) {
        manualStopRef.current = false;
        const hasFinalText = !!sttTextRef.current.trim();
        finalizeSpeechTurn(hasFinalText);

        if (wakeWordActiveRef.current && !awaitingResponseRef.current) {
          startWakeMode();
        }
        return;
      }

      if (manualStopRef.current) {
        manualStopRef.current = false;
        return;
      }

      if (recognitionModeRef.current === 'wake') {
        if (wakeWordActiveRef.current) {
          restartTimerRef.current = setTimeout(() => {
            safeStartRecognition();
          }, 250);
        }
        return;
      }

      if (recognitionModeRef.current === 'speech') {
        if (sttTextRef.current.trim()) {
          scheduleSpeechFinalize();
          safeStartRecognition();
          return;
        }

        const hasFinalText = !!sttTextRef.current.trim();
        finalizeSpeechTurn(hasFinalText);

        if (wakeWordActiveRef.current && !awaitingResponseRef.current) {
          startWakeMode();
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      clearRestartTimer();
      clearTranscriptTimer();
      clearSpeechSilenceTimer();
      clearAiPlaybackFallbackTimer();
      cleanupAudioPlayback(true);
      recognitionRef.current = null;
    };
  }, [
    cleanupAudioPlayback,
    clearAiPlaybackFallbackTimer,
    clearRestartTimer,
    clearSpeechSilenceTimer,
    clearTranscriptTimer,
    finalizeSpeechTurn,
    safeStartRecognition,
    scheduleSpeechFinalize,
    startSpeechCapture,
    startWakeMode,
    updateVoiceStatus,
  ]);

  useEffect(() => {
    connectSocket();

    return () => {
      clearRestartTimer();
      clearTranscriptTimer();
      clearSpeechSilenceTimer();
      clearAiPlaybackFallbackTimer();
      cleanupAudioPlayback(true);
      stopMediaRecorder();
      stopRecognition();
      wsRef.current?.close();
    };
  }, [
    cleanupAudioPlayback,
    clearAiPlaybackFallbackTimer,
    clearRestartTimer,
    clearSpeechSilenceTimer,
    clearTranscriptTimer,
    connectSocket,
    stopMediaRecorder,
    stopRecognition,
  ]);

  useEffect(() => {
    if (!isAwaitingResponse) return;

    const frames = ['|', '/', '-', '\\'];
    let frameIndex = 0;

    const intervalId = setInterval(() => {
      setSttText(`응답 생성 중... ${frames[frameIndex]}`);
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
        { sender: 'ai', text: '시크릿 모드가 활성화되었습니다. 대화 내용은 저장되지 않습니다.' },
      ]);
    } else if (backupMessages) {
      setChatMessages(backupMessages);
      setBackupMessages(null);
    } else {
      setChatMessages([{ sender: 'ai', text: '안녕하세요. 무엇을 도와드릴까요?' }]);
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
        updateVoiceStatus('이 브라우저는 음성 인식을 지원하지 않습니다.');
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
        updateVoiceStatus(`마이크 권한이 필요합니다: ${String((error as Error).message || error)}`);
        return;
      }

      wakeWordActiveRef.current = true;
      setIsWakeWordActive(true);
      clearTranscriptTimer();
      clearSpeechSilenceTimer();
      setSttText(`웨이크 워드 대기 중... "${WAKE_WORD}"라고 말해보세요.`);
      sttTextRef.current = '';
      updateVoiceStatus(`웨이크 워드 대기 중... "${WAKE_WORD}"라고 말해보세요.`);
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

    if (recognitionModeRef.current === 'speech') {
      finalizeSpeechTurn(!!sttTextRef.current.trim());
    } else {
      stopMediaRecorder();
    }

    recognitionModeRef.current = 'idle';
    stopRecognition();
    setSttText('');
    sttTextRef.current = '';
    updateVoiceStatus('웨이크 워드 대기가 중지되었습니다.');
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
    stopMediaRecorder();
    stopRecognition();

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'CANCEL' }));
    }

    if (wakeWordActiveRef.current) {
      startWakeMode();
    }
  }, [
    cleanupAudioPlayback,
    clearSpeechSilenceTimer,
    endAwaitingResponse,
    startWakeMode,
    stopMediaRecorder,
    stopRecognition,
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
      if (!text.trim()) return;
      if (!localStorage.getItem('token')) {
        setConnectionNotice('로그인이 만료되었습니다. 다시 로그인해주세요.');
        return;
      }

      setChatInput('');
      setChatMessages((prev) => [...prev, { sender: 'me', text }]);
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
        wsRef.current.send(JSON.stringify({ type: 'TEXT', text }));
      } else {
        console.warn('웹소켓 서버가 연결되어 있지 않습니다. 재연결을 시도합니다.');
        connectSocket();
      }
    },
    [beginAwaitingResponse, connectSocket],
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
