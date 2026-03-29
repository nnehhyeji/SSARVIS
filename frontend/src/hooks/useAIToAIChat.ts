import { useCallback, useEffect, useRef, useState } from 'react';
import { getApiOrigin } from '../config/api';
import type { ChatMessage } from '../types';

type Side = 'mine' | 'target';

type AiSocketConfig = {
  assistantType: string;
  targetUserId: number;
};

type PendingRelay = {
  to: Side;
  text: string;
};

type SideAudioState = {
  mediaSource: MediaSource | null;
  sourceBuffer: SourceBuffer | null;
  queue: ArrayBuffer[];
  audio: HTMLAudioElement | null;
  objectUrl: string | null;
  isPlaying: boolean;
  streamEnded: boolean;
  streamHandled: boolean;
  lastText: string;
  requestId: number;
};

const MAX_TURN = 20;

function createSideAudioState(): SideAudioState {
  return {
    mediaSource: null,
    sourceBuffer: null,
    queue: [],
    audio: null,
    objectUrl: null,
    isPlaying: false,
    streamEnded: false,
    streamHandled: false,
    lastText: '',
    requestId: 0,
  };
}

export function useAIToAIChat() {
  const [isBattling, setIsBattling] = useState(false);
  const [turnCount, setTurnCount] = useState(0);
  const [myLatestText, setMyLatestText] = useState('');
  const [targetLatestText, setTargetLatestText] = useState('');
  const [activeSpeaker, setActiveSpeaker] = useState<Side | null>(null);
  const [statusMessage, setStatusMessage] = useState('주제를 정하면 두 AI가 대화를 시작합니다.');
  const [topic, setTopic] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [battleMessages, setBattleMessages] = useState<ChatMessage[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [maxTurn, setMaxTurn] = useState(MAX_TURN);
  const [isAwaitingContinuation, setIsAwaitingContinuation] = useState(false);

  const socketsRef = useRef<Record<Side, WebSocket | null>>({ mine: null, target: null });
  const sessionIdsRef = useRef<Record<Side, string | null>>({ mine: null, target: null });
  const sideAudioRef = useRef<Record<Side, SideAudioState>>({
    mine: createSideAudioState(),
    target: createSideAudioState(),
  });
  const pendingRelayRef = useRef<PendingRelay | null>(null);
  const isBattlingRef = useRef(false);
  const isPausedRef = useRef(false);
  const turnCountRef = useRef(0);
  const maxTurnRef = useRef(MAX_TURN);
  const configRef = useRef<Record<Side, AiSocketConfig | null>>({ mine: null, target: null });

  const resetAudioState = useCallback((side: Side, options?: { preserveLastText?: boolean }) => {
    const current = sideAudioRef.current[side];
    current.queue = [];
    current.sourceBuffer = null;
    current.mediaSource = null;
    current.streamEnded = false;
    if (!options?.preserveLastText) {
      current.lastText = '';
    }
    current.streamHandled = false;

    if (current.audio) {
      current.audio.pause();
      current.audio.src = '';
      current.audio = null;
    }

    if (current.objectUrl) {
      URL.revokeObjectURL(current.objectUrl);
      current.objectUrl = null;
    }

    current.isPlaying = false;
  }, []);

  const closeSockets = useCallback(() => {
    (['mine', 'target'] as Side[]).forEach((side) => {
      const socket = socketsRef.current[side];
      if (socket && socket.readyState < WebSocket.CLOSING) {
        socket.close();
      }
      socketsRef.current[side] = null;
      resetAudioState(side);
      sessionIdsRef.current[side] = null;
    });
  }, [resetAudioState]);

  const stopBattle = useCallback(() => {
    isBattlingRef.current = false;
    isPausedRef.current = false;
    setIsBattling(false);
    setIsPaused(false);
    setIsAwaitingContinuation(false);
    setTurnCount(0);
    setMaxTurn(MAX_TURN);
    setActiveSpeaker(null);
    setTopic('');
    setMyLatestText('');
    setTargetLatestText('');
    setBattleMessages([]);
    setStatusMessage('AI 대화를 멈췄습니다.');
    turnCountRef.current = 0;
    maxTurnRef.current = MAX_TURN;
    pendingRelayRef.current = null;
    closeSockets();
  }, [closeSockets]);

  const processAudioQueue = useCallback((side: Side) => {
    const state = sideAudioRef.current[side];
    const sourceBuffer = state.sourceBuffer;
    const mediaSource = state.mediaSource;

    if (
      state.streamEnded &&
      mediaSource &&
      mediaSource.readyState === 'open' &&
      sourceBuffer &&
      !sourceBuffer.updating &&
      state.queue.length === 0
    ) {
      try {
        mediaSource.endOfStream();
      } catch (error) {
        console.warn('AI 대화 MediaSource 종료 실패:', error);
      }
    }

    if (!sourceBuffer || sourceBuffer.updating || state.queue.length === 0) return;

    const chunk = state.queue.shift();
    if (!chunk) return;

    try {
      sourceBuffer.appendBuffer(chunk);
    } catch (error) {
      console.error('AI 대화 오디오 버퍼 처리 실패:', error);
    }
  }, []);

  const sendTurn = useCallback(
    (side: Side, text: string) => {
      const socket = socketsRef.current[side];
      const config = configRef.current[side];

      if (!socket || socket.readyState !== WebSocket.OPEN || !config) {
        setErrorMessage('AI 연결이 준비되지 않아 다음 턴을 전달하지 못했습니다.');
        stopBattle();
        return;
      }

      sideAudioRef.current[side].lastText = '';
      sideAudioRef.current[side].streamHandled = false;
      sideAudioRef.current[side].requestId += 1;
      socket.send(
        JSON.stringify({
          type: 'CHAT_START',
          sessionId: sessionIdsRef.current[side],
          assistantType: config.assistantType,
          memoryPolicy: 'SECRET',
          chatSessionType: 'AI_AI',
          targetUserId: config.targetUserId,
        }),
      );
      socket.send(JSON.stringify({ type: 'AUDIO_END' }));
      socket.send(JSON.stringify({ type: 'TEXT', text }));
    },
    [stopBattle],
  );

  const tryRelay = useCallback(() => {
    const pending = pendingRelayRef.current;
    if (!pending || !isBattlingRef.current || isPausedRef.current) return;

    if (turnCountRef.current >= maxTurnRef.current) {
      isPausedRef.current = true;
      setIsPaused(true);
      setIsAwaitingContinuation(true);
      setStatusMessage(`${maxTurnRef.current}턴까지 대화를 진행했어요. 더 이어갈까요?`);
      return;
    }

    const relayTargetState = sideAudioRef.current[pending.to === 'mine' ? 'target' : 'mine'];
    if (relayTargetState.isPlaying) {
      return;
    }

    pendingRelayRef.current = null;
    turnCountRef.current += 1;
    setTurnCount(turnCountRef.current);
    setStatusMessage(`${turnCountRef.current}턴째 대화를 이어가는 중입니다.`);
    sendTurn(pending.to, pending.text);
  }, [sendTurn]);

  const handleStreamFinished = useCallback(
    (from: Side) => {
      if (!isBattlingRef.current) return;

      const state = sideAudioRef.current[from];
      if (state.streamHandled) {
        return;
      }
      state.streamHandled = true;

      const nextSide: Side = from === 'mine' ? 'target' : 'mine';
      const relayText = state.lastText.trim();

      if (!relayText) {
        setErrorMessage('AI 응답 텍스트를 받지 못해 대화를 이어갈 수 없습니다.');
        stopBattle();
        return;
      }

      pendingRelayRef.current = { to: nextSide, text: relayText };
      tryRelay();
    },
    [stopBattle, tryRelay],
  );

  const setupAudioForSide = useCallback(
    (side: Side) => {
      const state = sideAudioRef.current[side];
      resetAudioState(side, { preserveLastText: true });
      state.streamEnded = false;
      state.streamHandled = false;

      const mediaSource = new MediaSource();
      const audio = new Audio();
      const objectUrl = URL.createObjectURL(mediaSource);
      audio.src = objectUrl;

      audio.onplay = () => {
        state.isPlaying = true;
        setActiveSpeaker(side);
      };
      audio.onended = () => {
        state.isPlaying = false;
        setActiveSpeaker(null);
        if (state.streamEnded) {
          handleStreamFinished(side);
        }
      };

      mediaSource.addEventListener('sourceopen', () => {
        try {
          const sourceBuffer = mediaSource.addSourceBuffer('audio/webm; codecs="opus"');
          sourceBuffer.addEventListener('updateend', () => processAudioQueue(side));
          state.sourceBuffer = sourceBuffer;
          processAudioQueue(side);
        } catch (error) {
          console.warn('AI 대화 음성 SourceBuffer 초기화 실패:', error);
        }
      });

      state.mediaSource = mediaSource;
      state.audio = audio;
      state.objectUrl = objectUrl;
    },
    [handleStreamFinished, processAudioQueue, resetAudioState],
  );

  const attachSocketHandlers = useCallback(
    (side: Side, socket: WebSocket) => {
      socket.binaryType = 'arraybuffer';

      socket.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          const state = sideAudioRef.current[side];
          state.queue.push(event.data);
          processAudioQueue(side);
          return;
        }

        if (typeof event.data !== 'string') return;

        const message = JSON.parse(event.data);

        if (message.sessionId) {
          sessionIdsRef.current[side] = message.sessionId;
        }

        if (message.type === 'ACK') return;

        if (message.type === 'ERROR' || message.type === 'error') {
          setErrorMessage(message.message || message.detail || 'AI 대화 중 오류가 발생했습니다.');
          stopBattle();
          return;
        }

        if (message.type === 'text.end') {
          const nextText = message.payload?.text || '';
          sideAudioRef.current[side].lastText = nextText;

          if (side === 'mine') {
            setMyLatestText(nextText);
            setBattleMessages((prev) => [...prev, { sender: 'me', text: `나의 AI: ${nextText}` }]);
          } else {
            setTargetLatestText(nextText);
            setBattleMessages((prev) => [...prev, { sender: 'ai', text: `${nextText}` }]);
          }
          return;
        }

        if (message.type === 'voice.start') {
          setupAudioForSide(side);
          return;
        }

        if (message.type === 'voice.delta') {
          const audio = sideAudioRef.current[side].audio;
          if (audio && audio.paused) {
            audio.play().catch((error) => {
              console.warn('AI 대화 오디오 자동재생 실패:', error);
            });
          }
          return;
        }

        if (message.type === 'END_OF_STREAM') {
          const state = sideAudioRef.current[side];
          state.streamEnded = true;
          processAudioQueue(side);

          if (!state.isPlaying) {
            handleStreamFinished(side);
          }
        }
      };

      socket.onerror = () => {
        setErrorMessage('AI 웹소켓 연결에 실패했습니다.');
        stopBattle();
      };

      socket.onclose = () => {
        socketsRef.current[side] = null;
      };
    },
    [handleStreamFinished, processAudioQueue, setupAudioForSide, stopBattle],
  );

  const connectSocket = useCallback(
    (side: Side) =>
      new Promise<WebSocket>((resolve, reject) => {
        const token = localStorage.getItem('token');
        if (!token) {
          reject(new Error('로그인이 필요합니다.'));
          return;
        }

        const apiOrigin = getApiOrigin();
        const protocol = apiOrigin.startsWith('https://') ? 'wss:' : 'ws:';
        const host = apiOrigin.replace(/^https?:\/\//, '');
        const socket = new WebSocket(`${protocol}//${host}/ws/chat?token=${token}`);
        socketsRef.current[side] = socket;

        socket.onopen = () => {
          attachSocketHandlers(side, socket);
          resolve(socket);
        };

        socket.onerror = () => {
          reject(new Error('웹소켓 연결 실패'));
        };
      }),
    [attachSocketHandlers],
  );

  const startBattle = useCallback(
    async ({
      topic: nextTopic,
      myUserId,
      targetUserId,
      myAssistantType,
      targetAssistantType,
    }: {
      topic: string;
      myUserId: number;
      targetUserId: number;
      myAssistantType: string;
      targetAssistantType: string;
    }) => {
      const trimmedTopic = nextTopic.trim();
      if (!trimmedTopic) {
        setErrorMessage('대화 주제를 입력해주세요.');
        return false;
      }

      setErrorMessage('');
      setStatusMessage('두 AI의 연결을 준비하고 있습니다.');
      setTopic(trimmedTopic);
      setMyLatestText('');
      setTargetLatestText('');
      setBattleMessages([{ sender: 'me', text: `주제: ${trimmedTopic}` }]);
      setTurnCount(0);
      setMaxTurn(MAX_TURN);
      turnCountRef.current = 0;
      maxTurnRef.current = MAX_TURN;
      isBattlingRef.current = true;
      isPausedRef.current = false;
      setIsBattling(true);
      setIsPaused(false);
      setIsAwaitingContinuation(false);
      pendingRelayRef.current = null;

      configRef.current = {
        mine: {
          assistantType: myAssistantType,
          targetUserId: myUserId,
        },
        target: {
          assistantType: targetAssistantType,
          targetUserId,
        },
      };

      closeSockets();

      try {
        await Promise.all([connectSocket('mine'), connectSocket('target')]);
        setStatusMessage('주제를 전달했습니다. 내 AI가 먼저 대화를 시작합니다.');
        sendTurn('mine', trimmedTopic);
        return true;
      } catch (error) {
        setErrorMessage(String((error as Error).message || error));
        stopBattle();
        return false;
      }
    },
    [closeSockets, connectSocket, sendTurn, stopBattle],
  );

  useEffect(() => {
    return () => {
      closeSockets();
    };
  }, [closeSockets]);

  const pauseBattle = useCallback(() => {
    if (!isBattlingRef.current) return;

    isPausedRef.current = true;
    setIsPaused(true);
    setStatusMessage('AI 대화를 일시정지했습니다.');

    (['mine', 'target'] as Side[]).forEach((side) => {
      const audio = sideAudioRef.current[side].audio;
      if (audio && !audio.paused) {
        audio.pause();
      }
    });
  }, []);

  const resumeBattle = useCallback(() => {
    if (!isBattlingRef.current) return;

    isPausedRef.current = false;
    setIsPaused(false);
    setIsAwaitingContinuation(false);
    setStatusMessage('AI 대화를 다시 이어가는 중입니다.');

    let resumedCurrentAudio = false;

    (['mine', 'target'] as Side[]).forEach((side) => {
      const audio = sideAudioRef.current[side].audio;
      if (audio && audio.paused && !audio.ended) {
        resumedCurrentAudio = true;
        audio.play().catch((error) => {
          console.warn('AI 대화 오디오 재개 실패:', error);
        });
      }
    });

    if (!resumedCurrentAudio) {
      tryRelay();
    }
  }, [tryRelay]);

  const continueBattle = useCallback(() => {
    if (!isBattlingRef.current) return;

    maxTurnRef.current += MAX_TURN;
    setMaxTurn(maxTurnRef.current);
    setIsAwaitingContinuation(false);
    resumeBattle();
  }, [resumeBattle]);

  return {
    isBattling,
    isPaused,
    turnCount,
    myLatestText,
    targetLatestText,
    activeSpeaker,
    statusMessage,
    topic,
    errorMessage,
    battleMessages,
    maxTurn,
    isAwaitingContinuation,
    startBattle,
    pauseBattle,
    resumeBattle,
    continueBattle,
    stopBattle,
  };
}
