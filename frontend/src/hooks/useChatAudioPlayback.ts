import { useCallback, useRef, useState } from 'react';

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
          // noop
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
        onEnded?.();
      };

      audio.onerror = () => {
        cleanupAudioPlayback(true);
      };

      audio.play().catch((error) => console.warn('Audio playback start failed:', error));

      mediaSource.addEventListener('sourceopen', () => {
        try {
          const sourceBuffer = mediaSource.addSourceBuffer('audio/webm; codecs="opus"');
          sourceBuffer.addEventListener('updateend', processAudioQueue);
          sourceBufferRef.current = sourceBuffer;
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
  };
}
