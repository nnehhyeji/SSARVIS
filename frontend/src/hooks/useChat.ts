import { useState, useCallback, useEffect, useRef } from 'react';
import type { ChatMessage } from '../types';

interface WebSpeechRecognitionEvent {
  results: Iterable<Array<{ transcript: string }>>;
}

interface WebSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: WebSpeechRecognitionEvent) => void) | null;
  onerror: ((error: unknown) => void) | null;
  start: () => void;
  stop: () => void;
}

export function useChat() {
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { sender: 'ai', text: '안녕하세요! 무엇을 도와드릴까요?' },
  ]);
  const [backupMessages, setBackupMessages] = useState<ChatMessage[] | null>(null);
  const [isLockMode, setIsLockMode] = useState(false);

  // --- WebSocket & Media & STT 상태 ---
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // --- AI 응답 (오디오 스트리밍 & 텍스트 타이핑) 재생 상태 ---
  const mediaSourceRef = useRef<MediaSource | null>(null);
  const sourceBufferRef = useRef<SourceBuffer | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const audioElemRef = useRef<HTMLAudioElement | null>(null);
  const typeWriterIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [sttText, setSttText] = useState('');
  const sttTextRef = useRef('');
  const recognitionRef = useRef<WebSpeechRecognition | null>(null);

  const [isAiSpeaking, setIsAiSpeaking] = useState(false);

  // 0. 오디오 스트림 큐 처리 (SourceBuffer)
  const processAudioQueue = useCallback(() => {
    const sb = sourceBufferRef.current;
    if (!sb || sb.updating || audioQueueRef.current.length === 0) return;
    try {
      const chunk = audioQueueRef.current.shift();
      if (chunk) sb.appendBuffer(chunk);
    } catch (e) {
      console.error('오디오 버퍼 덧붙이기 에러:', e);
    }
  }, []);

  // STT 초기화
  useEffect(() => {
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition: { new (): WebSpeechRecognition } })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition: { new (): WebSpeechRecognition } })
        .webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'ko-KR';

      recognition.onresult = (event: WebSpeechRecognitionEvent) => {
        const transcript = Array.from(event.results)
          .map((res) => res[0].transcript)
          .join('');
        setSttText(transcript);
        sttTextRef.current = transcript;
      };

      recognition.onerror = (e: unknown) => {
        console.error('STT 에러 발생:', e);
      };

      recognitionRef.current = recognition;
    } else {
      console.warn('이 브라우저는 음성 인식을 지원하지 않습니다.');
    }
  }, []);

  const toggleLock = useCallback(() => {
    if (!isLockMode) {
      setBackupMessages(chatMessages);
      setChatMessages([
        { sender: 'ai', text: '시크릿 모드가 활성화되었습니다. 이 대화는 저장되지 않습니다.' },
      ]);
    } else {
      if (backupMessages) {
        setChatMessages(backupMessages);
        setBackupMessages(null);
      } else {
        setChatMessages([{ sender: 'ai', text: '안녕하세요! 무엇을 도와드릴까요?' }]);
      }
    }
    setIsLockMode((prev) => !prev);
  }, [isLockMode, chatMessages, backupMessages]);

  const connectSocket = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    let wsUrl = '';
    if (import.meta.env.VITE_API_BASE_URL) {
      try {
        const url = new URL(import.meta.env.VITE_API_BASE_URL);
        const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl = `${protocol}//${url.host}/ws/chat?token=${token}`;
      } catch {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl = `${protocol}//${window.location.host}/ws/chat?token=${token}`;
      }
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${protocol}//${window.location.host}/ws/chat?token=${token}`;
    }

    const socket = new WebSocket(wsUrl);
    socket.binaryType = 'arraybuffer';

    socket.onopen = () => console.log('✅ 웹소켓 연결 성공');
    socket.onclose = () => console.log('🔌 웹소켓 연결 종료');

    socket.onmessage = async (event) => {
      // (A) 오디오 바이너리 조각 수신
      if (event.data instanceof ArrayBuffer) {
        audioQueueRef.current.push(event.data);
        processAudioQueue();
        return;
      }

      // (B) 메타데이터 분기 처리
      if (typeof event.data === 'string') {
        const message = JSON.parse(event.data);
        if (message.type === 'ACK') return; // 로깅용 ACK 통과

        switch (message.type) {
          case 'text.start':
            if (typeWriterIntervalRef.current) clearInterval(typeWriterIntervalRef.current);
            setChatMessages((prev) => [...prev, { sender: 'ai', text: '' }]);
            break;

          case 'text.end': {
            const aiResponseText = message.payload?.text || '';
            let idx = 0;
            typeWriterIntervalRef.current = setInterval(() => {
              setChatMessages((prev) => {
                const newMsgs = [...prev];
                const lastMsg = newMsgs[newMsgs.length - 1];
                if (lastMsg && lastMsg.sender === 'ai') {
                  lastMsg.text = aiResponseText.slice(0, idx + 1);
                }
                return newMsgs;
              });
              idx++;
              if (idx >= aiResponseText.length) {
                if (typeWriterIntervalRef.current) clearInterval(typeWriterIntervalRef.current);
              }
            }, 50);
            break;
          }

          case 'voice.start': {
            audioQueueRef.current = [];
            const ms = new MediaSource();
            const audio = new Audio();
            audio.src = URL.createObjectURL(ms);
            audio.onplay = () => setIsAiSpeaking(true);
            audio.onpause = () => setIsAiSpeaking(false);
            audio.onended = () => setIsAiSpeaking(false);

            audio.play().catch((e) => console.warn('오디오 자동재생 대기중:', e));

            ms.addEventListener('sourceopen', () => {
              try {
                const sb = ms.addSourceBuffer('audio/webm; codecs="opus"');
                sb.addEventListener('updateend', processAudioQueue);
                sourceBufferRef.current = sb;
              } catch (e) {
                console.warn('SourceBuffer 초기화 실패 (코덱 미지원 가능성):', e);
              }
            });

            mediaSourceRef.current = ms;
            audioElemRef.current = audio;
            break;
          }

          case 'ERROR':
          case 'CANCELLED':
          case 'END_OF_STREAM':
            console.error('❌ 소켓 상태:', message.type, message.message);
            break;
        }
      }
    };

    wsRef.current = socket;
  }, [processAudioQueue]);

  // 1. WebSocket 연결
  useEffect(() => {
    connectSocket();

    return () => {
      wsRef.current?.close();
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [connectSocket]);

  // ----------------------------------------------------------------------
  // 🎮 사용자 송신 컨트롤
  // ----------------------------------------------------------------------

  // [액션 1] 마이크 켜기: 오디오 입력 스트림 전송 시작
  const startRecording = async (
    sessionId: string | null,
    assistantType: string,
    memoryPolicy: string,
  ) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('웹소켓 연결이 끊어져 있어 재연결을 시도합니다.');
      connectSocket();
      // 잠시 연결 대기 후 턴 시작을 시도하려면 Promise 지연 로직이 필요하지만
      // 사용자 UX상으로는 F5를 누르는 것이 가장 확실합니다.
      // (지금은 백엔드 에러 원인을 파악 중이니 강제 재시도 로그만 남깁니다.)
    } else {
      // 1️⃣ 턴 시작 알림
      wsRef.current.send(
        JSON.stringify({
          type: 'CHAT_START',
          sessionId: sessionId,
          assistantType,
          memoryPolicy,
        }),
      );
    }

    try {
      // 1. STT 초기화 및 시작
      setSttText('');
      sttTextRef.current = '';
      recognitionRef.current?.start();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

      // 2️⃣ 오디오 데이터 청크 전송
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(e.data); // 바이너리 통째 전송
        }
      };

      mediaRecorder.start(250); // 250ms 마다 쪼개기
      mediaRecorderRef.current = mediaRecorder;
    } catch (e) {
      console.error('마이크 스트리밍을 시작할 수 없습니다:', e);
    }
  };

  // [액션 2] 마이크 끄기: 오디오 전송 종료 및 최종 STT 발송
  const stopRecordingAndSendSTT = () => {
    const finalSttText = sttTextRef.current || '(음성 인식 결과 없음)';

    // STT 종료
    recognitionRef.current?.stop();

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      mediaRecorderRef.current = null;
    }

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    // 3️⃣ 오디오 송신 끝
    wsRef.current.send(JSON.stringify({ type: 'AUDIO_END' }));

    // 4️⃣ STT 결괏값을 포함하여 전송 (AI 분석 시작 트리거)
    wsRef.current.send(JSON.stringify({ type: 'TEXT', text: finalSttText }));

    // UI에 우선 업데이트
    setChatMessages((prev) => [...prev, { sender: 'me', text: finalSttText }]);
    setSttText('');
    sttTextRef.current = '';
  };

  // [액션 3] 도중 취소 버튼 클릭 시
  const cancelTurn = () => {
    recognitionRef.current?.stop();
    setSttText('');
    sttTextRef.current = '';

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      mediaRecorderRef.current = null;
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'CANCEL' }));
    }
  };

  // [액션 4] 마이크 없는 순수 텍스트 전송
  const sendMessage = useCallback(
    (text: string, sessionId: string | null, assistantType: string, memoryPolicy: string) => {
      if (!text.trim()) return;

      setChatInput('');
      setChatMessages((prev) => [...prev, { sender: 'me', text }]);

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        // 텍스트 모드도 CHAT_START -> AUDIO_END -> TEXT 플로우를 따릅니다.
        wsRef.current.send(
          JSON.stringify({ type: 'CHAT_START', sessionId, assistantType, memoryPolicy }),
        );
        wsRef.current.send(JSON.stringify({ type: 'AUDIO_END' }));
        wsRef.current.send(JSON.stringify({ type: 'TEXT', text }));
      } else {
        console.warn('웹소켓 서버와 연결되어 있지 않습니다. 재연결을 시도합니다.');
        connectSocket();
      }
    },
    [connectSocket],
  );

  return {
    chatInput,
    chatMessages,
    isLockMode,
    sttText,
    isAiSpeaking,
    audioElemRef, // UI에서 오디오 상태 훅킹 가능하도록 노출
    setChatInput,
    setChatMessages,
    toggleLock,
    sendMessage,
    startRecording,
    stopRecordingAndSendSTT,
    cancelTurn,
  };
}
