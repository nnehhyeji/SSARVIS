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
  responseText: string;
  hasResponseText: boolean;
  responseStreamComplete: boolean;
  presentationCommitted: boolean;
  requestId: number;
  voiceStarted: boolean;
  hasAudioData: boolean;
};

const MAX_TURN = 20;
function estimateCaptionDurationMs(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return 0;

  const punctuationPauseCount = (trimmed.match(/[,.!?~]/g) ?? []).length;
  return Math.max(1500, trimmed.length * 102 + punctuationPauseCount * 290);
}

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
    responseText: '',
    hasResponseText: false,
    responseStreamComplete: false,
    presentationCommitted: false,
    requestId: 0,
    voiceStarted: false,
    hasAudioData: false,
  };
}

export function useAIToAIChat() {
  const [isBattling, setIsBattling] = useState(false);
  const [turnCount, setTurnCount] = useState(0);
  const [myLatestText, setMyLatestText] = useState('');
  const [targetLatestText, setTargetLatestText] = useState('');
  const [activeSpeaker, setActiveSpeaker] = useState<Side | null>(null);
  const [mySpeechProgress, setMySpeechProgress] = useState(0);
  const [targetSpeechProgress, setTargetSpeechProgress] = useState(0);
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
  const pendingPresentationQueueRef = useRef<Side[]>([]);
  const activePresentationSideRef = useRef<Side | null>(null);
  const isBattlingRef = useRef(false);
  const isPausedRef = useRef(false);
  const turnCountRef = useRef(0);
  const maxTurnRef = useRef(MAX_TURN);
  const configRef = useRef<Record<Side, AiSocketConfig | null>>({ mine: null, target: null });
  const progressStartedAtRef = useRef<Record<Side, number | null>>({ mine: null, target: null });
  const progressFrameRef = useRef<Record<Side, number | null>>({ mine: null, target: null });
  const setSideSpeechProgress = useCallback((side: Side, value: number) => {
    if (side === 'mine') {
      setMySpeechProgress(value);
      return;
    }
    setTargetSpeechProgress(value);
  }, []);
  const stopSideProgressTracking = useCallback((side: Side) => {
    const frameId = progressFrameRef.current[side];
    if (frameId !== null) {
      window.cancelAnimationFrame(frameId);
      progressFrameRef.current[side] = null;
    }
  }, []);
  const resetSideSpeechProgress = useCallback(
    (side: Side, value = 0) => {
      progressStartedAtRef.current[side] = null;
      stopSideProgressTracking(side);
      setSideSpeechProgress(side, value);
    },
    [setSideSpeechProgress, stopSideProgressTracking],
  );
  const startSideProgressTracking = useCallback(
    (side: Side) => {
      stopSideProgressTracking(side);
      progressStartedAtRef.current[side] = performance.now();

      const tick = () => {
        const state = sideAudioRef.current[side];
        const responseText = state.responseText;
        const estimatedDurationMs = estimateCaptionDurationMs(responseText);
        const startedAt = progressStartedAtRef.current[side];
        if (!startedAt || estimatedDurationMs <= 0) {
          progressFrameRef.current[side] = window.requestAnimationFrame(tick);
          return;
        }

        const elapsedMs = performance.now() - startedAt;
        const fallbackProgress = Math.max(0, Math.min(elapsedMs / estimatedDurationMs, 0.98));
        let actualProgress = 0;
        const audio = state.audio;
        if (audio && Number.isFinite(audio.duration) && audio.duration > 0) {
          actualProgress = Math.max(0, Math.min(audio.currentTime / audio.duration, 0.98));
        }

        setSideSpeechProgress(side, Math.max(fallbackProgress, actualProgress));
        progressFrameRef.current[side] = window.requestAnimationFrame(tick);
      };
      progressFrameRef.current[side] = window.requestAnimationFrame(tick);
    },
    [setSideSpeechProgress, stopSideProgressTracking],
  );
  const resetAudioState = useCallback(
    (side: Side, options?: { preserveLastText?: boolean }) => {
      const current = sideAudioRef.current[side];

      current.queue = [];
      current.sourceBuffer = null;
      current.mediaSource = null;
      current.streamEnded = false;

      if (!options?.preserveLastText) {
        current.responseText = '';
        current.hasResponseText = false;
      }

      current.responseStreamComplete = false;
      current.presentationCommitted = false;
      current.streamHandled = false;
      current.voiceStarted = false;
      current.hasAudioData = false;
      resetSideSpeechProgress(side, options?.preserveLastText ? 1 : 0);

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
    },
    [resetSideSpeechProgress],
  );
  const isResponseReady = useCallback((side: Side) => {
    const current = sideAudioRef.current[side];
    return current.hasResponseText && current.responseStreamComplete;
  }, []);

  const getResponseText = useCallback((side: Side) => {
    return sideAudioRef.current[side].responseText.trim();
  }, []);

  const commitPresentation = useCallback((side: Side) => {
    const current = sideAudioRef.current[side];
    if (current.presentationCommitted || !current.hasResponseText) {
      return false;
    }

    const nextText = current.responseText;
    current.presentationCommitted = true;

    if (side === 'mine') {
      setMyLatestText(nextText);
      setBattleMessages((prev) => [...prev, { sender: 'me', text: `나의 AI: ${nextText}` }]);
      return true;
    }

    setTargetLatestText(nextText);
    setBattleMessages((prev) => [...prev, { sender: 'ai', text: `${nextText}` }]);
    return true;
  }, []);

  const dequeuePendingPresentation = useCallback((side: Side) => {
    pendingPresentationQueueRef.current = pendingPresentationQueueRef.current.filter(
      (queuedSide) => queuedSide !== side,
    );
  }, []);

  const enqueuePendingPresentation = useCallback((side: Side) => {
    const current = sideAudioRef.current[side];
    if (
      !current.hasResponseText ||
      current.presentationCommitted ||
      current.isPlaying ||
      pendingPresentationQueueRef.current.includes(side)
    ) {
      return;
    }

    pendingPresentationQueueRef.current.push(side);
  }, []);

  const closeSockets = useCallback(() => {
    pendingRelayRef.current = null;
    pendingPresentationQueueRef.current = [];
    activePresentationSideRef.current = null;

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
    setMySpeechProgress(0);
    setTargetSpeechProgress(0);
    setTopic('');
    setMyLatestText('');
    setTargetLatestText('');
    setBattleMessages([]);
    setStatusMessage('AI 대화를 멈췄습니다.');
    turnCountRef.current = 0;
    maxTurnRef.current = MAX_TURN;
    pendingRelayRef.current = null;
    pendingPresentationQueueRef.current = [];
    activePresentationSideRef.current = null;
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

      sideAudioRef.current[side].responseText = '';
      sideAudioRef.current[side].hasResponseText = false;
      sideAudioRef.current[side].responseStreamComplete = false;
      sideAudioRef.current[side].presentationCommitted = false;
      sideAudioRef.current[side].streamHandled = false;
      sideAudioRef.current[side].requestId += 1;
      dequeuePendingPresentation(side);
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
    [dequeuePendingPresentation, stopBattle],
  );

  const canRequestTurnForSide = useCallback((side: Side) => {
    const state = sideAudioRef.current[side];
    return !(
      state.isPlaying ||
      state.hasResponseText ||
      state.presentationCommitted ||
      activePresentationSideRef.current === side
    );
  }, []);

  const tryRelay = useCallback(() => {
    const pending = pendingRelayRef.current;
    if (!pending || !isBattlingRef.current || isPausedRef.current) return;

    if (turnCountRef.current >= maxTurnRef.current) {
      setIsAwaitingContinuation(true);
      setStatusMessage(`${maxTurnRef.current}턴까지 대화를 진행했어요. 더 이어갈까요?`);
      return;
    }

    if (!canRequestTurnForSide(pending.to)) {
      return;
    }

    pendingRelayRef.current = null;
    turnCountRef.current += 1;
    setTurnCount(turnCountRef.current);
    setStatusMessage(`${turnCountRef.current}턴째 대화를 이어가는 중입니다.`);
    sendTurn(pending.to, pending.text);
  }, [canRequestTurnForSide, sendTurn]);

  const handlePresentationFinished = useCallback(
    (side: Side) => {
      resetAudioState(side);
      if (activePresentationSideRef.current === side) {
        activePresentationSideRef.current = null;
      }
      setActiveSpeaker((current) => (current === side ? null : current));
      tryRelay();
    },
    [resetAudioState, tryRelay],
  );

  const startQueuedPresentation = useCallback(
    (side: Side) => {
      if (!isBattlingRef.current || isPausedRef.current) {
        return false;
      }

      const state = sideAudioRef.current[side];
      if (!state.hasResponseText || state.presentationCommitted || state.isPlaying) {
        return false;
      }

      if (activePresentationSideRef.current && activePresentationSideRef.current !== side) {
        return false;
      }

      dequeuePendingPresentation(side);
      activePresentationSideRef.current = side;
      commitPresentation(side);

      if (state.audio) {
        state.isPlaying = true;
        setActiveSpeaker(side);
        state.audio.play().catch((error) => {
          state.isPlaying = false;
          if (activePresentationSideRef.current === side) {
            activePresentationSideRef.current = null;
          }
          setActiveSpeaker((current) => (current === side ? null : current));
          console.warn('AI 대화 오디오 자동재생 실패:', error);
        });
        return true;
      }

      if (!state.responseStreamComplete || state.voiceStarted || state.hasAudioData) {
        activePresentationSideRef.current = null;
        return false;
      }

      handlePresentationFinished(side);
      return false;
    },
    [commitPresentation, dequeuePendingPresentation, handlePresentationFinished],
  );

  const scheduleNextPresentation = useCallback(() => {
    if (activePresentationSideRef.current || isPausedRef.current) {
      return;
    }

    const nextSide = pendingPresentationQueueRef.current[0];
    if (!nextSide) {
      return;
    }

    startQueuedPresentation(nextSide);
  }, [startQueuedPresentation]);

  const handleResponseReady = useCallback(
    (from: Side) => {
      if (!isBattlingRef.current) return;

      const state = sideAudioRef.current[from];
      if (state.streamHandled) {
        return;
      }
      state.streamHandled = true;

      const nextSide: Side = from === 'mine' ? 'target' : 'mine';
      const relayText = getResponseText(from);

      if (!relayText) {
        setErrorMessage('AI 응답 텍스트를 받지 못해 대화를 이어갈 수 없습니다.');
        stopBattle();
        return;
      }

      pendingRelayRef.current = { to: nextSide, text: relayText };
      tryRelay();
    },
    [getResponseText, stopBattle, tryRelay],
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
        commitPresentation(side);
        activePresentationSideRef.current = side;
        setActiveSpeaker(side);
        startSideProgressTracking(side);
      };
      audio.onended = () => {
        setSideSpeechProgress(side, 1);
        stopSideProgressTracking(side);
        handlePresentationFinished(side);
        scheduleNextPresentation();
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
    [
      commitPresentation,
      handlePresentationFinished,
      processAudioQueue,
      resetAudioState,
      scheduleNextPresentation,
      setSideSpeechProgress,
      startSideProgressTracking,
      stopSideProgressTracking,
    ],
  );
  const attachSocketHandlers = useCallback(
    (side: Side, socket: WebSocket) => {
      socket.binaryType = 'arraybuffer';

      socket.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          const state = sideAudioRef.current[side];
          state.hasAudioData = true;
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
          const state = sideAudioRef.current[side];
          state.responseText = nextText;
          state.hasResponseText = nextText.trim().length > 0;

          if (state.isPlaying) {
            commitPresentation(side);
          } else if (
            state.audio ||
            (state.responseStreamComplete && !state.voiceStarted && !state.hasAudioData)
          ) {
            enqueuePendingPresentation(side);
            scheduleNextPresentation();
          }

          if (state.responseStreamComplete && isResponseReady(side)) {
            handleResponseReady(side);
          }
          return;
        }

        if (message.type === 'voice.start') {
          sideAudioRef.current[side].voiceStarted = true;
          setupAudioForSide(side);
          if (sideAudioRef.current[side].hasResponseText) {
            enqueuePendingPresentation(side);
            scheduleNextPresentation();
          }
          return;
        }

        if (message.type === 'voice.delta') {
          const state = sideAudioRef.current[side];
          const audio = state.audio;
          if (
            audio &&
            audio.paused &&
            (!activePresentationSideRef.current || activePresentationSideRef.current === side)
          ) {
            activePresentationSideRef.current = side;
            state.isPlaying = true;
            setActiveSpeaker(side);
            audio.play().catch((error) => {
              state.isPlaying = false;
              if (activePresentationSideRef.current === side) {
                activePresentationSideRef.current = null;
              }
              setActiveSpeaker((current) => (current === side ? null : current));
              console.warn('AI 대화 오디오 자동재생 실패:', error);
            });
          }
          return;
        }

        if (message.type === 'END_OF_STREAM') {
          const state = sideAudioRef.current[side];
          state.streamEnded = true;
          state.responseStreamComplete = true;
          processAudioQueue(side);

          if (state.hasResponseText && !state.voiceStarted && !state.hasAudioData) {
            enqueuePendingPresentation(side);
            scheduleNextPresentation();
          }

          if (isResponseReady(side)) {
            handleResponseReady(side);
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
    [
      commitPresentation,
      enqueuePendingPresentation,
      handleResponseReady,
      isResponseReady,
      processAudioQueue,
      scheduleNextPresentation,
      setupAudioForSide,
      stopBattle,
    ],
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
      pendingPresentationQueueRef.current = [];
      activePresentationSideRef.current = null;

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
        activePresentationSideRef.current = side;
        audio.play().catch((error) => {
          console.warn('AI 대화 오디오 재개 실패:', error);
        });
      }
    });

    if (!resumedCurrentAudio) {
      scheduleNextPresentation();
      tryRelay();
    }
  }, [scheduleNextPresentation, tryRelay]);

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
    mySpeechProgress,
    targetSpeechProgress,
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
