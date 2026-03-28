import { useCallback, useRef, useState } from 'react';

// Singleton AudioContext — survives across hook instances and re-renders.
// Once resumed during a user gesture, it stays unlocked for the page lifetime.
let globalAudioContext: AudioContext | null = null;

function getOrCreateAudioContext(): AudioContext {
  if (!globalAudioContext || globalAudioContext.state === 'closed') {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    globalAudioContext = new Ctor();
  }
  return globalAudioContext;
}

export function useChatAudioPlayback() {
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [aiSpeechProgress, setAiSpeechProgress] = useState(0);

  const mediaSourceRef = useRef<MediaSource | null>(null);
  const sourceBufferRef = useRef<SourceBuffer | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const audioElemRef = useRef<HTMLAudioElement | null>(null);
  const aiPlaybackFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiSpeechProgressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const aiPlaybackActiveRef = useRef(false);
  const playbackSessionIdRef = useRef(0);
  const objectUrlRef = useRef<string | null>(null);
  const isCleaningUpRef = useRef(false);
  const mediaElementSourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  const processAudioQueue = useCallback(() => {
    const sourceBuffer = sourceBufferRef.current;
    if (!sourceBuffer || sourceBuffer.updating || audioQueueRef.current.length === 0) return;

    try {
      const chunk = audioQueueRef.current.shift();
      if (chunk) {
        sourceBuffer.appendBuffer(chunk);
      }
    } catch (error) {
      console.error('Audio buffer append failed:', error);
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

  // ★ Call this during a user gesture (e.g. mic button click).
  // AudioContext.resume() during a gesture unlocks it for the entire page lifetime.
  const warmUpAudio = useCallback(() => {
    try {
      const ctx = getOrCreateAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => {
          console.log('[audio] AudioContext resumed — autoplay permanently unlocked');
        });
      }
      // Also play a tiny silent buffer through it to fully activate
      const buf = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start();
    } catch {
      // ignore — will try again next time
    }
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

      const sourceBuffer = sourceBufferRef.current;
      if (sourceBuffer) {
        sourceBuffer.removeEventListener('updateend', processAudioQueue);
      }

      const mediaSource = mediaSourceRef.current;
      if (mediaSource && mediaSource.readyState === 'open') {
        try {
          mediaSource.endOfStream();
        } catch {
          // noop
        }
      }

      audioElemRef.current = null;
      mediaSourceRef.current = null;
      sourceBufferRef.current = null;
      audioQueueRef.current = [];
      aiPlaybackActiveRef.current = false;
      mediaElementSourceRef.current = null;
      setAiSpeechProgress(0);

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }

      if (resetSpeaking) {
        setIsAiSpeaking(false);
      }

      isCleaningUpRef.current = false;
    },
    [clearAiPlaybackFallbackTimer, clearAiSpeechProgressTimer, processAudioQueue],
  );

  const finalizeAudioStream = useCallback(() => {
    clearAiPlaybackFallbackTimer();
    const sessionId = playbackSessionIdRef.current;

    const mediaSource = mediaSourceRef.current;
    const sourceBuffer = sourceBufferRef.current;

    const scheduleFallbackCleanup = () => {
      clearAiPlaybackFallbackTimer();
      aiPlaybackFallbackTimerRef.current = setTimeout(() => {
        if (sessionId !== playbackSessionIdRef.current) return;
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

  const enqueueAudioChunk = useCallback(
    (chunk: ArrayBuffer) => {
      audioQueueRef.current.push(chunk);
      processAudioQueue();
    },
    [processAudioQueue],
  );

  const startAudioPlayback = useCallback(
    (onEnded?: () => void) => {
      cleanupAudioPlayback(false);
      playbackSessionIdRef.current += 1;
      const sessionId = playbackSessionIdRef.current;
      audioQueueRef.current = [];

      const mediaSource = new MediaSource();
      const audio = new Audio();

      mediaSourceRef.current = mediaSource;
      objectUrlRef.current = URL.createObjectURL(mediaSource);
      audio.src = objectUrlRef.current;
      isCleaningUpRef.current = false;

      // ★ Route audio through the already-unlocked AudioContext
      // This bypasses autoplay policy because AudioContext was resumed during user gesture
      try {
        const ctx = getOrCreateAudioContext();
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => { });
        }
        const mediaElementSource = ctx.createMediaElementSource(audio);
        mediaElementSource.connect(ctx.destination);
        mediaElementSourceRef.current = mediaElementSource;
      } catch (e) {
        // Fallback: if AudioContext fails, audio still plays through default output
        console.warn('[audio] AudioContext routing failed, using default:', e);
      }

      audio.onplay = () => {
        if (sessionId !== playbackSessionIdRef.current) return;
        clearAiPlaybackFallbackTimer();
        aiPlaybackActiveRef.current = true;
        setIsAiSpeaking(true);
        startAiSpeechProgressTracking();
      };

      audio.onpause = () => {
        if (sessionId !== playbackSessionIdRef.current) return;
        aiPlaybackActiveRef.current = false;
        setIsAiSpeaking(false);
      };

      audio.onended = () => {
        if (sessionId !== playbackSessionIdRef.current) return;
        aiPlaybackActiveRef.current = false;
        setAiSpeechProgress(1);
        cleanupAudioPlayback(true);
        onEnded?.();
      };

      audio.onerror = () => {
        if (sessionId !== playbackSessionIdRef.current) return;
        cleanupAudioPlayback(true);
      };

      mediaSource.addEventListener('sourceopen', () => {
        if (sessionId !== playbackSessionIdRef.current) return;
        try {
          const sourceBuffer = mediaSource.addSourceBuffer('audio/webm; codecs="opus"');
          sourceBufferRef.current = sourceBuffer;

          // Play after first chunk is buffered
          let playStarted = false;
          sourceBuffer.addEventListener('updateend', () => {
            if (!playStarted) {
              playStarted = true;
              // AudioContext is unlocked → play() will succeed
              audio.play().catch(() => { });
            }
            processAudioQueue();
          });
        } catch (error) {
          console.warn('SourceBuffer creation failed:', error);
        }
      });

      audioElemRef.current = audio;
    },
    [
      cleanupAudioPlayback,
      clearAiPlaybackFallbackTimer,
      processAudioQueue,
      startAiSpeechProgressTracking,
    ],
  );

  return {
    audioElemRef,
    isAiSpeaking,
    aiSpeechProgress,
    aiPlaybackActiveRef,
    enqueueAudioChunk,
    startAudioPlayback,
    finalizeAudioStream,
    cleanupAudioPlayback,
    clearAiPlaybackFallbackTimer,
    warmUpAudio,
  };
}
