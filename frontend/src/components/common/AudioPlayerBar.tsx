import React, { useRef, useEffect } from 'react';
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

  // 파형 애니메이션 루프
  useEffect(() => {
    const drawWaveform = () => {
      const canvas = waveformRef.current;
      if (!canvas) {
        animFrameRef.current = requestAnimationFrame(drawWaveform);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 고해상도 대응 (Retina/4K)
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

      if (isPlayingRef.current) {
        // ─── 재생 중: 훨씬 더 얇고 극적인 높이 변화 (Reference Image 스타일) ───
        const audio = audioRef.current;
        const duration = audio?.duration || 1;
        const currentTime = audio?.currentTime || 0;
        const progress = isFinite(duration) && duration > 0 ? currentTime / duration : 0;

        const barW = 1.5; // 막대 두께 최소화
        const gap = 4.5; // 간격을 넓혀서 더 세련된 느낌
        const barCount = Math.floor(cssW / (barW + gap));
        
        for (let i = 0; i < barCount; i++) {
          const t = Date.now() / 600;
          const slowWave = Math.sin(t + i * 0.15) * 0.45;
          const midWave = Math.sin(t * 2.5 - i * 0.5) * 0.3;
          const fastWave = Math.sin(t * 5 + i * 1.2) * 0.15;
          const noise = (Math.random() - 0.5) * 0.05; 
          
          const complexity = Math.max(0.1, 0.45 + slowWave + midWave + fastWave + noise);
          
          // 하단 고정형이므로 캔버스 높이를 더 꽉 채우도록 비율 조정
          const barH = Math.max(2, complexity * cssH * 0.95);
          const x = i * (barW + gap);
          const y = cssH - barH; // 하단 고정

          const isAhead = i / (barCount - 1) <= progress;
          ctx.fillStyle = isAhead ? '#f43f5e' : '#e5e7eb';
          
          ctx.fillRect(x, y, barW, barH);
        }
      } else {
        // ─── 정지 중: 매우 얇은 정적인 패턴 ───
        const barW = 1.5;
        const gap = 4.5;
        const barCount = Math.floor(cssW / (barW + gap));
        
        ctx.fillStyle = '#e5e7eb';
        for (let i = 0; i < barCount; i++) {
          const x = i * (barW + gap);
          const barH = 4 + Math.sin(i * 0.8) * 3; 
          const y = cssH - barH; // 하단 고정
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
  }, [audioRef]);

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
    <div className="border-t border-gray-100 bg-white px-6 py-4 flex flex-col gap-2 shrink-0">
      {/* Track label */}
      <p className="text-[11px] font-bold text-gray-400 text-center truncate">
        {currentTrackIdx >= 0 && audioMessages[currentTrackIdx]
          ? `${currentTrackIdx + 1} / ${audioMessages.length} · ${new Date(
              audioMessages[currentTrackIdx].createdAt,
            ).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}`
          : `총 ${audioMessages.length}개의 음성 메시지`}
      </p>

      {/* Waveform canvas */}
      <div className="relative w-full cursor-pointer" style={{ height: 40 }} onClick={handleSeek}>
        <canvas ref={waveformRef} className="w-full h-full" style={{ display: 'block' }} />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        {/* Left spacer */}
        <div className="w-16" />

        {/* Center: prev / play / next */}
        <div className="flex items-center gap-7">
          {/* Prev */}
          <button
            onClick={() => {
              const p = currentTrackIdx - 1;
              if (p >= 0) playTrack(p);
            }}
            disabled={currentTrackIdx <= 0}
            className="text-gray-400 hover:text-gray-700 disabled:opacity-20 transition-all active:scale-90"
            title="이전 트랙"
          >
            <svg viewBox="0 0 32 32" className="w-8 h-8 fill-current">
              <path d="M16.5 16l8-6.5c.8-.6 1.5-.2 1.5.8v11.4c0 1-.7 1.4-1.5.8l-8-6.5z" />
              <path d="M7.5 16l8-6.5c.8-.6 1.5-.2 1.5.8v11.4c0 1-.7 1.4-1.5.8l-8-6.5z" />
            </svg>
          </button>

          {/* Play / Pause */}
          <button
            onClick={togglePlay}
            className="text-gray-600 hover:text-gray-800 transition-all active:scale-95 mx-2"
            title={isPlaying ? '일시정지' : '재생'}
          >
            {isPlaying ? (
              <div className="flex gap-1.5">
                <div className="w-2.5 h-8 bg-current rounded-full" />
                <div className="w-2.5 h-8 bg-current rounded-full" />
              </div>
            ) : (
              <svg viewBox="0 0 32 32" className="w-9 h-9 fill-current ml-1">
                <path d="M10 7.5l14.5 7.5c.8.4.8 1.6 0 2l-14.5 7.5c-.8.4-1.5-.2-1.5-1.2V8.7c0-1 .7-1.6 1.5-1.2z" />
              </svg>
            )}
          </button>

          {/* Next */}
          <button
            onClick={() => {
              const n = currentTrackIdx + 1;
              if (n < audioMessages.length) playTrack(n);
            }}
            disabled={currentTrackIdx >= audioMessages.length - 1}
            className="text-gray-400 hover:text-gray-700 disabled:opacity-20 transition-all active:scale-90"
            title="다음 트랙"
          >
            <svg viewBox="0 0 32 32" className="w-8 h-8 fill-current">
              <path d="M15.5 16l-8-6.5c-.8-.6-1.5-.2-1.5.8v11.4c0 1 .7 1.4 1.5.8l8-6.5z" />
              <path d="M24.5 16l-8-6.5c-.8-.6-1.5-.2-1.5.8v11.4c0 1 .7 1.4 1.5.8l8-6.5z" />
            </svg>
          </button>
        </div>

        {/* Right: seek mode + export */}
        <div className="flex items-center gap-3 w-16 justify-end">
          <button
            onClick={() => setShowTrackList((v) => !v)}
            className={`p-1 flex flex-col items-center justify-center transition-colors ${
              showTrackList ? 'text-rose-500' : 'text-gray-400 hover:text-gray-600'
            }`}
            title={showTrackList ? '구간선택 모드 끄기' : '구간선택 모드 켜기'}
          >
            <div className="relative flex flex-col items-center">
              <svg
                viewBox="0 0 24 24"
                className="w-6 h-6 fill-none stroke-current stroke-[2] stroke-linecap-round stroke-linejoin-round"
              >
                <path d="M5 10c0-2.2 1.8-4 4-4h10" />
                <path d="M16 3l3 3-3 3" />
                <path d="M19 14c0 2.2-1.8 4-4 4H5" />
                <path d="M8 21l-3-3 3-3" />
              </svg>
              <div
                className={`w-1.5 h-1.5 rounded-full mt-0.5 ${showTrackList ? 'bg-rose-500' : 'bg-transparent'}`}
              />
            </div>
          </button>

          <button
            onClick={() => alert('내보내기 기능은 추후 개발 예정입니다.')}
            className="p-1 px-2 mb-1.5 rounded-lg text-gray-400 hover:text-gray-600 transition"
            title="내보내기"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-6 h-6 fill-none stroke-current stroke-[2] stroke-linecap-round stroke-linejoin-round"
            >
              <path d="M12 3v13M12 3l-4 4M12 3l4 4" />
              <path d="M4 14v3c0 1.6 1.4 3 3 3h10c1.6 0 3-1.4 3-3v-3" />
            </svg>
          </button>
        </div>
      </div>

      {/* 구간선택 힌트 */}
      {showTrackList && (
        <p className="text-center text-[10px] font-bold text-rose-400 animate-pulse">
          💡 위 대화 말풍선을 클릭하면 해당 위치부터 재생됩니다
        </p>
      )}
    </div>
  );
}
