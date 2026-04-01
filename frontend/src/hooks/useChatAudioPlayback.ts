import { useCallback, useEffect, useRef, useState } from 'react';
import { useAudioUnlockStore } from '../store/useAudioUnlockStore';

let globalAudioContext: AudioContext | null = null;
let audioUnlockListenersBound = false;
let htmlMediaPlaybackPrimed = false;
const AUDIO_PLAYBACK_MAX_WAIT_MS = 30000;
const SILENT_AUDIO_DATA_URI =
  'data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAFAAAGhgD///////////////////////////////8AAAA5TEFNRTMuMTAwA8MAAAAAAAAAABQgJAUHQQABmgAABoaa5QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

function getOrCreateAudioContext(): AudioContext {
  if (!globalAudioContext || globalAudioContext.state === 'closed') {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    globalAudioContext = new Ctor();
  }
  return globalAudioContext;
}

async function resumeGlobalAudioContext(): Promise<void> {
  const ctx = getOrCreateAudioContext();
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }
}

function primeAudioContext() {
  const ctx = getOrCreateAudioContext();
  const buf = ctx.createBuffer(1, 1, 22050);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(ctx.destination);
  src.start();
}

async function primeHtmlMediaPlayback(): Promise<void> {
  if (htmlMediaPlaybackPrimed) return;

  const audio = new Audio(SILENT_AUDIO_DATA_URI);
  audio.preload = 'auto';
  audio.muted = true;
  audio.volume = 0;
  audio.setAttribute('playsinline', 'true');

  try {
    await audio.play();
    audio.pause();
    audio.currentTime = 0;
    htmlMediaPlaybackPrimed = true;
  } catch {
    // ignore; a later user gesture will retry
  }
}

async function ensureAudioUnlocked(): Promise<void> {
  await resumeGlobalAudioContext();
  primeAudioContext();
  await primeHtmlMediaPlayback();
}

export function useChatAudioPlayback() {
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [aiSpeechProgress, setAiSpeechProgress] = useState(0);

  const audioChunksRef = useRef<ArrayBuffer[]>([]);
  const audioElemRef = useRef<HTMLAudioElement | null>(null);
  const aiPlaybackFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiSpeechProgressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const aiPlaybackActiveRef = useRef(false);
  const playbackSessionIdRef = useRef(0);
  const objectUrlRef = useRef<string | null>(null);
  const isCleaningUpRef = useRef(false);
  const playRetryCleanupRef = useRef<(() => void) | null>(null);
  const playbackEndedCallbackRef = useRef<(() => void) | null>(null);
  const playbackStartedCallbackRef = useRef<(() => void) | null>(null);
  const finalizedPlaybackSessionRef = useRef<number | null>(null);
  const playbackStartedSessionRef = useRef<number | null>(null);
  const finalAudioCaptureArmedRef = useRef(false);
  const pendingFinalizeAfterCaptureRef = useRef(false);
  const finalizeAudioStreamRef = useRef<(() => void) | null>(null);
  const largestObservedChunkRef = useRef<ArrayBuffer | null>(null);
  const webAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const webAudioStartedAtRef = useRef<number | null>(null);
  const webAudioDurationRef = useRef(0);
  const playbackModeRef = useRef<'html' | 'webaudio' | null>(null);
  const pendingManualUnlockActionRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    if (audioUnlockListenersBound) {
      return undefined;
    }

    const unlockAudio = () => {
      resumeGlobalAudioContext()
        .then(() => {
          primeAudioContext();
          return primeHtmlMediaPlayback();
        })
        .catch(() => {
          // ignore; next gesture will retry
        });
    };

    audioUnlockListenersBound = true;
    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio);
    window.addEventListener('touchstart', unlockAudio, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      audioUnlockListenersBound = false;
    };
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

  const startAiSpeechProgressTracking = useCallback(() => {
    clearAiSpeechProgressTimer();

    aiSpeechProgressTimerRef.current = setInterval(() => {
      let currentTime = 0;
      let duration = 0;

      if (playbackModeRef.current === 'webaudio') {
        const ctx = globalAudioContext;
        if (!ctx || webAudioStartedAtRef.current === null) return;
        currentTime = Math.max(0, ctx.currentTime - webAudioStartedAtRef.current);
        duration = webAudioDurationRef.current;
      } else {
        const audio = audioElemRef.current;
        if (!audio) return;
        currentTime = audio.currentTime || 0;
        duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      }

      if (duration <= 0) return;

      const rawProgress = currentTime / duration;
      const isPlaybackComplete =
        playbackModeRef.current === 'webaudio'
          ? currentTime >= duration
          : !!audioElemRef.current?.ended;
      const clampedProgress = Math.max(0, Math.min(rawProgress, isPlaybackComplete ? 1 : 0.98));
      setAiSpeechProgress((prev) => (clampedProgress > prev ? clampedProgress : prev));
    }, 80);
  }, [clearAiSpeechProgressTimer]);

  const warmUpAudio = useCallback(() => {
    try {
      const ctx = getOrCreateAudioContext();
      if (ctx.state === 'suspended') {
        void ctx.resume();
      }
      const buf = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start();
    } catch {
      // ignore
    }
  }, []);

  const unlockAudioPlayback = useCallback(() => {
    void ensureAudioUnlocked().catch(() => {
      // ignore; later gestures can retry
    });
  }, []);

  const cleanupAudioPlayback = useCallback(
    (resetSpeaking: boolean = true) => {
      if (isCleaningUpRef.current) {
        if (resetSpeaking) {
          setIsAiSpeaking(false);
        }
        return;
      }

      isCleaningUpRef.current = true;
      clearAiPlaybackFallbackTimer();
      clearAiSpeechProgressTimer();

      const audio = audioElemRef.current;
      if (audio) {
        audio.onplay = null;
        audio.onpause = null;
        audio.onended = null;
        audio.onerror = null;
        audio.pause();
        audio.src = '';
      }

      audioElemRef.current = null;
      audioChunksRef.current = [];
      aiPlaybackActiveRef.current = false;
      setAiSpeechProgress(0);

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }

      const source = webAudioSourceRef.current;
      if (source) {
        source.onended = null;
        try {
          source.stop();
        } catch {
          // ignore
        }
        source.disconnect();
      }
      webAudioSourceRef.current = null;
      webAudioStartedAtRef.current = null;
      webAudioDurationRef.current = 0;
      playbackModeRef.current = null;

      if (playRetryCleanupRef.current) {
        playRetryCleanupRef.current();
        playRetryCleanupRef.current = null;
      }

      useAudioUnlockStore.getState().dismissUnlock();
      pendingManualUnlockActionRef.current = null;
      playbackEndedCallbackRef.current = null;
      playbackStartedCallbackRef.current = null;
      finalAudioCaptureArmedRef.current = false;
      pendingFinalizeAfterCaptureRef.current = false;
      largestObservedChunkRef.current = null;

      if (resetSpeaking) {
        setIsAiSpeaking(false);
      }

      isCleaningUpRef.current = false;
    },
    [clearAiPlaybackFallbackTimer, clearAiSpeechProgressTimer],
  );

  const enqueueAudioChunk = useCallback((chunk: ArrayBuffer) => {
    console.log('[audio] binary chunk received', {
      bytes: chunk.byteLength,
      armed: finalAudioCaptureArmedRef.current,
      sessionId: playbackSessionIdRef.current,
    });

    if (
      !largestObservedChunkRef.current ||
      chunk.byteLength >= largestObservedChunkRef.current.byteLength
    ) {
      largestObservedChunkRef.current = chunk.slice(0);
    }

    if (!finalAudioCaptureArmedRef.current) {
      return;
    }

    if (audioChunksRef.current.length > 0) {
      return;
    }

    audioChunksRef.current = [chunk.slice(0)];
    finalAudioCaptureArmedRef.current = false;
    console.log('[audio] captured final audio blob', {
      bytes: chunk.byteLength,
      sessionId: playbackSessionIdRef.current,
    });

    if (pendingFinalizeAfterCaptureRef.current) {
      pendingFinalizeAfterCaptureRef.current = false;
      queueMicrotask(() => {
        finalizeAudioStreamRef.current?.();
      });
    }
  }, []);

  const armFinalAudioCapture = useCallback(() => {
    audioChunksRef.current = [];
    finalAudioCaptureArmedRef.current = true;
    console.log('[audio] armFinalAudioCapture', { sessionId: playbackSessionIdRef.current });
  }, []);

  const startAudioPlayback = useCallback(
    (callbacks?: { onPlay?: () => void; onEnded?: () => void }) => {
      cleanupAudioPlayback(true);
      playbackSessionIdRef.current += 1;
      playbackStartedCallbackRef.current = callbacks?.onPlay ?? null;
      playbackEndedCallbackRef.current = callbacks?.onEnded ?? null;
      finalizedPlaybackSessionRef.current = null;
      playbackStartedSessionRef.current = null;
      finalAudioCaptureArmedRef.current = false;
      pendingFinalizeAfterCaptureRef.current = false;
      audioChunksRef.current = [];
      largestObservedChunkRef.current = null;
      aiPlaybackActiveRef.current = false;
      setIsAiSpeaking(false);
      setAiSpeechProgress(0);
      console.log('[audio] startAudioPlayback reset', {
        sessionId: playbackSessionIdRef.current + 1,
      });
    },
    [cleanupAudioPlayback],
  );

  const finalizeAudioStream = useCallback(() => {
    clearAiPlaybackFallbackTimer();

    const sessionId = playbackSessionIdRef.current;
    if (finalizedPlaybackSessionRef.current === sessionId) {
      console.log('[audio] finalizeAudioStream skipped: already finalized', { sessionId });
      return;
    }
    const chunks = audioChunksRef.current.slice();
    if (chunks.length === 0) {
      if (finalAudioCaptureArmedRef.current) {
        console.log('[audio] finalizeAudioStream deferred: waiting for final audio blob', {
          sessionId,
        });
        pendingFinalizeAfterCaptureRef.current = true;
        return;
      }

      if (largestObservedChunkRef.current) {
        console.warn('[audio] finalizeAudioStream using largest observed chunk fallback', {
          sessionId,
          bytes: largestObservedChunkRef.current.byteLength,
        });
        chunks.push(largestObservedChunkRef.current.slice(0));
      }
    }

    if (chunks.length === 0) {
      finalizedPlaybackSessionRef.current = sessionId;
      audioChunksRef.current = [];
      finalAudioCaptureArmedRef.current = false;
      largestObservedChunkRef.current = null;
      console.log('[audio] finalizeAudioStream ended without playable chunk', { sessionId });
      const callback = playbackEndedCallbackRef.current;
      cleanupAudioPlayback(true);
      callback?.();
      return;
    }

    finalizedPlaybackSessionRef.current = sessionId;
    audioChunksRef.current = [];
    finalAudioCaptureArmedRef.current = false;
    pendingFinalizeAfterCaptureRef.current = false;
    largestObservedChunkRef.current = null;

    const audio = new Audio();
    audio.autoplay = false;
    audio.setAttribute('playsinline', 'true');
    audio.preload = 'auto';

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    const audioBlob = new Blob(chunks, { type: 'audio/webm' });
    objectUrlRef.current = URL.createObjectURL(audioBlob);
    audio.src = objectUrlRef.current;
    audioElemRef.current = audio;
    console.log('[audio] finalizeAudioStream creating audio element', {
      sessionId,
      chunks: chunks.length,
      bytes: audioBlob.size,
    });

    const promptManualAudioUnlock = (retry: () => Promise<void>) => {
      pendingManualUnlockActionRef.current = retry;
      useAudioUnlockStore.getState().requestUnlock({
        retryAction: async () => {
          try {
            await resumeGlobalAudioContext();
            primeAudioContext();
            await primeHtmlMediaPlayback();
            await pendingManualUnlockActionRef.current?.();
          } catch (error) {
            console.warn('[audio] manual unlock retry failed', error);
          }
        },
      });
    };

    const markPlaybackStarted = () => {
      if (sessionId !== playbackSessionIdRef.current) return;
      if (playbackStartedSessionRef.current === sessionId) return;
      console.log('[audio] playback started', { sessionId, mode: playbackModeRef.current });
      playbackStartedSessionRef.current = sessionId;
      useAudioUnlockStore.getState().dismissUnlock();
      pendingManualUnlockActionRef.current = null;
      clearAiPlaybackFallbackTimer();
      aiPlaybackActiveRef.current = true;
      setIsAiSpeaking(true);
      startAiSpeechProgressTracking();
      if (playRetryCleanupRef.current) {
        playRetryCleanupRef.current();
        playRetryCleanupRef.current = null;
      }
      const callback = playbackStartedCallbackRef.current;
      playbackStartedCallbackRef.current = null;
      callback?.();
    };

    const finishPlayback = () => {
      if (sessionId !== playbackSessionIdRef.current) return;
      console.log('[audio] playback ended', { sessionId, mode: playbackModeRef.current });
      aiPlaybackActiveRef.current = false;
      setAiSpeechProgress(1);
      const callback = playbackEndedCallbackRef.current;
      cleanupAudioPlayback(true);
      playbackEndedCallbackRef.current = null;
      callback?.();
    };

    const tryWebAudioPlayback = async () => {
      if (sessionId !== playbackSessionIdRef.current) return false;
      if (playbackStartedSessionRef.current === sessionId) return true;

      try {
        await resumeGlobalAudioContext();
        const ctx = getOrCreateAudioContext();
        const buffer = await audioBlob.arrayBuffer();
        const decoded = await ctx.decodeAudioData(buffer.slice(0));

        if (sessionId !== playbackSessionIdRef.current) return false;

        const source = ctx.createBufferSource();
        source.buffer = decoded;
        source.connect(ctx.destination);
        source.onended = () => {
          finishPlayback();
        };

        webAudioSourceRef.current = source;
        webAudioStartedAtRef.current = ctx.currentTime;
        webAudioDurationRef.current = decoded.duration;
        playbackModeRef.current = 'webaudio';

        source.start(0);
        markPlaybackStarted();
        return true;
      } catch (error) {
        console.warn('[audio] WebAudio fallback failed', error);
        return false;
      }
    };

    const schedulePlayRetryOnGesture = () => {
      if (playRetryCleanupRef.current) {
        playRetryCleanupRef.current();
      }

      const retryPlay = async () => {
        if (sessionId !== playbackSessionIdRef.current) return;
        if (playbackStartedSessionRef.current === sessionId) return;
        try {
          await resumeGlobalAudioContext();
        } catch {
          // ignore and still attempt media playback
        }

        try {
          playbackModeRef.current = 'html';
          await audio.play();
        } catch {
          const webAudioStarted = await tryWebAudioPlayback();
          if (!webAudioStarted) {
            promptManualAudioUnlock(retryPlay);
            schedulePlayRetryOnGesture();
          }
        }
      };

      const cleanup = () => {
        window.removeEventListener('pointerdown', handleGesture);
        window.removeEventListener('keydown', handleGesture);
        window.removeEventListener('touchstart', handleGesture);
      };

      const handleGesture = () => {
        cleanup();
        playRetryCleanupRef.current = null;
        void retryPlay();
      };

      window.addEventListener('pointerdown', handleGesture, { once: true, passive: true });
      window.addEventListener('keydown', handleGesture, { once: true });
      window.addEventListener('touchstart', handleGesture, { once: true, passive: true });
      playRetryCleanupRef.current = cleanup;
    };

    const attemptPlay = () => {
      if (playbackStartedSessionRef.current === sessionId) return;
      console.log('[audio] audio.play() attempt', { sessionId });
      playbackModeRef.current = 'html';
      void audio.play().catch((error) => {
        console.warn('[audio] play() blocked; trying WebAudio fallback', error);
        void tryWebAudioPlayback().then((started) => {
          if (!started) {
            promptManualAudioUnlock(async () => {
              playbackModeRef.current = 'html';
              try {
                await audio.play();
              } catch {
                await tryWebAudioPlayback();
              }
            });
            console.warn('[audio] retrying on next user gesture');
            schedulePlayRetryOnGesture();
          }
        });
      });
    };

    audio.onplay = () => {
      if (sessionId !== playbackSessionIdRef.current) return;
      playbackModeRef.current = 'html';
      markPlaybackStarted();
    };

    audio.onpause = () => {
      if (sessionId !== playbackSessionIdRef.current) return;
      console.log('[audio] onpause', { sessionId });
      aiPlaybackActiveRef.current = false;
      setIsAiSpeaking(false);
    };

    audio.onended = () => {
      finishPlayback();
    };

    audio.onerror = () => {
      if (sessionId !== playbackSessionIdRef.current) return;
      console.warn('[audio] onerror', {
        sessionId,
        error: audio.error?.message ?? audio.error?.code ?? 'unknown',
      });
      const callback = playbackEndedCallbackRef.current;
      cleanupAudioPlayback(true);
      playbackEndedCallbackRef.current = null;
      callback?.();
    };

    aiPlaybackFallbackTimerRef.current = setTimeout(() => {
      if (sessionId !== playbackSessionIdRef.current) return;
      console.warn('[audio] blob playback forced cleanup after max wait');
      const callback = playbackEndedCallbackRef.current;
      cleanupAudioPlayback(true);
      playbackEndedCallbackRef.current = null;
      callback?.();
    }, AUDIO_PLAYBACK_MAX_WAIT_MS);

    attemptPlay();
  }, [cleanupAudioPlayback, clearAiPlaybackFallbackTimer, startAiSpeechProgressTracking]);

  useEffect(() => {
    finalizeAudioStreamRef.current = finalizeAudioStream;
  }, [finalizeAudioStream]);

  return {
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
    warmUpAudio,
    unlockAudioPlayback,
  };
}
