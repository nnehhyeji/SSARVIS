import React, { useEffect, useRef } from 'react';
import type { ChatMessageData } from '../../apis/chatApi';

interface AudioPlayerBarProps {
  audioMessages: ChatMessageData[];
  showTrackList: boolean;
  setShowTrackList: (v: boolean | ((prev: boolean) => boolean)) => void;
  isPlaying: boolean;
  setIsPlaying: (v: boolean) => void;
  currentTrackIdx: number;
  setCurrentTrackIdx: (v: number | ((prev: number) => number)) => void;
  playTrack: (idx: number) => void;
  togglePlay: () => void;
  audioDuration: number;
  audioRef: React.MutableRefObject<HTMLAudioElement | null>;
}

function getWaveSeed(message?: ChatMessageData, currentTrackIdx?: number) {
  const seedSource =
    message?.id ||
    message?.audio?.audioUrl ||
    message?.createdAt ||
    `track-${currentTrackIdx ?? -1}`;

  let hash = 0;
  for (let i = 0; i < seedSource.length; i += 1) {
    hash = (hash * 31 + seedSource.charCodeAt(i)) >>> 0;
  }

  return hash || 1;
}

function getBarHeight(
  index: number,
  barCount: number,
  cssHeight: number,
  seed: number,
  isPlaying: boolean,
) {
  const normalizedIndex = index / Math.max(1, barCount - 1);
  const waveA = Math.sin(normalizedIndex * 10 + seed * 0.0007) * 0.28;
  const waveB = Math.cos(normalizedIndex * 22 + seed * 0.0013) * 0.2;
  const waveC = Math.sin(index * 0.65 + seed * 0.0021) * 0.12;
  const pseudoNoise = (((seed + index * 97) % 1000) / 1000 - 0.5) * 0.18;
  const base = isPlaying ? 0.42 : 0.22;
  const intensity = Math.max(0.08, Math.min(0.95, base + waveA + waveB + waveC + pseudoNoise));

  return Math.max(3, intensity * cssHeight * 0.92);
}

export default function AudioPlayerBar({
  audioMessages,
  showTrackList,
  setShowTrackList,
  isPlaying,
  currentTrackIdx,
  playTrack,
  togglePlay,
  audioDuration,
  audioRef,
}: AudioPlayerBarProps) {
  const waveformRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    const drawWaveform = () => {
      const canvas = waveformRef.current;
      if (!canvas) {
        animFrameRef.current = requestAnimationFrame(drawWaveform);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      const cssW = rect.width;
      const cssH = rect.height;
      ctx.clearRect(0, 0, cssW, cssH);

      const currentTrack = currentTrackIdx >= 0 ? audioMessages[currentTrackIdx] : undefined;
      const seed = getWaveSeed(currentTrack, currentTrackIdx);
      const barW = 1.5;
      const gap = 4.5;
      const barCount = Math.max(1, Math.floor(cssW / (barW + gap)));

      if (isPlayingRef.current) {
        const audio = audioRef.current;
        const duration = audio?.duration || 1;
        const currentTime = audio?.currentTime || 0;
        const progress = isFinite(duration) && duration > 0 ? currentTime / duration : 0;
        const activeBarIndex = Math.round(progress * Math.max(0, barCount - 1));

        for (let i = 0; i < barCount; i += 1) {
          const barH = getBarHeight(i, barCount, cssH, seed, true);
          const x = i * (barW + gap);
          const y = cssH - barH;
          const distanceFromHead = Math.abs(i - activeBarIndex);
          const isElapsed = i / Math.max(1, barCount - 1) <= progress;

          if (distanceFromHead <= 2) {
            ctx.fillStyle = '#f43f5e';
          } else if (isElapsed) {
            ctx.fillStyle = '#f9a8b8';
          } else {
            ctx.fillStyle = '#e5e7eb';
          }

          ctx.fillRect(x, y, barW, barH);
        }
      } else {
        for (let i = 0; i < barCount; i += 1) {
          const x = i * (barW + gap);
          const barH = getBarHeight(i, barCount, cssH, seed, false);
          const y = cssH - barH;
          ctx.fillStyle = '#e5e7eb';
          ctx.fillRect(x, y, barW, barH);
        }
      }

      ctx.restore();
      animFrameRef.current = requestAnimationFrame(drawWaveform);
    };

    drawWaveform();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [audioMessages, audioRef, currentTrackIdx]);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !isFinite(audioDuration) || audioDuration <= 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const newTime = ratio * audioDuration;

    if (isFinite(newTime)) {
      audioRef.current.currentTime = newTime;
    }
  };

  return (
    <div className="flex shrink-0 flex-col gap-2 border-t border-gray-100 bg-white px-6 py-4">
      <p className="truncate text-center text-[11px] font-bold text-gray-400">
        {currentTrackIdx >= 0 && audioMessages[currentTrackIdx]
          ? `${currentTrackIdx + 1} / ${audioMessages.length} 트랙 ${new Date(
              audioMessages[currentTrackIdx].createdAt,
            ).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}`
          : `총 ${audioMessages.length}개의 음성 메시지`}
      </p>

      <div className="relative h-10 w-full cursor-pointer" onClick={handleSeek}>
        <canvas ref={waveformRef} className="h-full w-full" style={{ display: 'block' }} />
      </div>

      <div className="flex items-center justify-between">
        <div className="w-16" />

        <div className="flex items-center gap-7">
          <button
            onClick={() => {
              const prevIdx = currentTrackIdx - 1;
              if (prevIdx >= 0) playTrack(prevIdx);
            }}
            disabled={currentTrackIdx <= 0}
            className="text-gray-400 transition-all active:scale-90 hover:text-gray-700 disabled:opacity-20"
            title="이전 트랙"
          >
            <svg viewBox="0 0 32 32" className="h-8 w-8 fill-current">
              <path d="M16.5 16l8-6.5c.8-.6 1.5-.2 1.5.8v11.4c0 1-.7 1.4-1.5.8l-8-6.5z" />
              <path d="M7.5 16l8-6.5c.8-.6 1.5-.2 1.5.8v11.4c0 1-.7 1.4-1.5.8l-8-6.5z" />
            </svg>
          </button>

          <button
            onClick={togglePlay}
            className="mx-2 text-gray-600 transition-all active:scale-95 hover:text-gray-800"
            title={isPlaying ? '일시정지' : '재생'}
          >
            {isPlaying ? (
              <div className="flex gap-1.5">
                <div className="h-8 w-2.5 rounded-full bg-current" />
                <div className="h-8 w-2.5 rounded-full bg-current" />
              </div>
            ) : (
              <svg viewBox="0 0 32 32" className="ml-1 h-9 w-9 fill-current">
                <path d="M10 7.5l14.5 7.5c.8.4.8 1.6 0 2l-14.5 7.5c-.8.4-1.5-.2-1.5-1.2V8.7c0-1 .7-1.6 1.5-1.2z" />
              </svg>
            )}
          </button>

          <button
            onClick={() => {
              const nextIdx = currentTrackIdx + 1;
              if (nextIdx < audioMessages.length) playTrack(nextIdx);
            }}
            disabled={currentTrackIdx >= audioMessages.length - 1}
            className="text-gray-400 transition-all active:scale-90 hover:text-gray-700 disabled:opacity-20"
            title="다음 트랙"
          >
            <svg viewBox="0 0 32 32" className="h-8 w-8 fill-current">
              <path d="M15.5 16l-8-6.5c-.8-.6-1.5-.2-1.5.8v11.4c0 1 .7 1.4 1.5.8l8-6.5z" />
              <path d="M24.5 16l-8-6.5c-.8-.6-1.5-.2-1.5.8v11.4c0 1 .7 1.4 1.5.8l8-6.5z" />
            </svg>
          </button>
        </div>

        <div className="flex w-16 items-center justify-end gap-3">
          <button
            onClick={() => setShowTrackList((v) => !v)}
            className={`flex flex-col items-center justify-center p-1 transition-colors ${
              showTrackList ? 'text-rose-500' : 'text-gray-400 hover:text-gray-600'
            }`}
            title={showTrackList ? '트랙 목록 숨기기' : '트랙 목록 보기'}
          >
            <div className="relative flex flex-col items-center">
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6 fill-none stroke-current stroke-[2] stroke-linecap-round stroke-linejoin-round"
              >
                <path d="M5 10c0-2.2 1.8-4 4-4h10" />
                <path d="M16 3l3 3-3 3" />
                <path d="M19 14c0 2.2-1.8 4-4 4H5" />
                <path d="M8 21l-3-3 3-3" />
              </svg>
              <div
                className={`mt-0.5 h-1.5 w-1.5 rounded-full ${
                  showTrackList ? 'bg-rose-500' : 'bg-transparent'
                }`}
              />
            </div>
          </button>

          <button
            onClick={() => alert('다운로드 기능은 추후 지원 예정입니다.')}
            className="mb-1.5 rounded-lg p-1 px-2 text-gray-400 transition hover:text-gray-600"
            title="다운로드"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6 fill-none stroke-current stroke-[2] stroke-linecap-round stroke-linejoin-round"
            >
              <path d="M12 3v13M12 3l-4 4M12 3l4 4" />
              <path d="M4 14v3c0 1.6 1.4 3 3 3h10c1.6 0 3-1.4 3-3v-3" />
            </svg>
          </button>
        </div>
      </div>

      {showTrackList ? (
        <p className="animate-pulse text-center text-[10px] font-bold text-rose-400">
          말풍선을 누르면 해당 음성 메시지 위치로 바로 재생할 수 있어요.
        </p>
      ) : null}
    </div>
  );
}
