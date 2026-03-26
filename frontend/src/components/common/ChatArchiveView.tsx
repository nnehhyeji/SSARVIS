/**
 * ChatArchiveView.tsx
 *
 * 대화 내역을 표시하는 독립 컴포넌트.
 * - 사이드바와 완전히 분리되어 있으며, 선택된 채팅 세션의 메시지를 가져와 렌더링합니다.
 * - 오디오 재생 상태, 파형 애니메이션, 플레이어 바 모두 이 컴포넌트(및 AudioPlayerBar 자식)에서 관리합니다.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { getChatMessages } from '../../apis/chatApi';
import type { ChatMessageData } from '../../apis/chatApi';
import { getApiOrigin } from '../../config/api';
import AudioPlayerBar from './AudioPlayerBar';

interface ChatArchiveViewProps {
  selectedChatId: string | null;
}

export default function ChatArchiveView({ selectedChatId }: ChatArchiveViewProps) {
  // ─── 메시지 데이터 ───
  const [chatMessagesData, setChatMessagesData] = useState<ChatMessageData[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // ─── 오디오 플레이어 상태 ───
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [currentTrackIdx, setCurrentTrackIdx] = useState<number>(-1);
  const currentTrackIdxRef = useRef(-1);
  useEffect(() => {
    currentTrackIdxRef.current = currentTrackIdx;
  }, [currentTrackIdx]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [showTrackList, setShowTrackList] = useState(false);

  const audioMessages = chatMessagesData.filter((m) => m.audio?.audioUrl);
  const audioMessagesRef = useRef<ChatMessageData[]>([]);
  useEffect(() => {
    audioMessagesRef.current = audioMessages;
  }, [audioMessages]);

  const isPlayingRef = useRef(false);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // ─── URL 정규화 (CORS/Malformed URL 대응) ───
  const getFullAudioUrl = (url: string): string => {
    if (!url) return '';
    let fullUrl = url;
    if (!(url.startsWith('http://') || url.startsWith('https://'))) {
      const origin = getApiOrigin();
      const normalizedUrl = url.startsWith('/') ? url : `/${url}`;
      fullUrl = `${origin.replace(/\/$/, '')}${normalizedUrl}`;
    }
    if (fullUrl.includes('%')) {
      fullUrl = fullUrl.replace(/%(?![0-9a-fA-F]{2})/g, '%25');
    }
    return fullUrl;
  };

  // ─── 트랙 재생 ───
  const playTrack = useCallback((idx: number) => {
    if (idx < 0 || idx >= audioMessagesRef.current.length) return;
    const msg = audioMessagesRef.current[idx];
    if (!msg?.audio?.audioUrl || !audioRef.current) return;

    const fullUrl = getFullAudioUrl(msg.audio.audioUrl);
    try {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = fullUrl;
      audioRef.current.load();
      void audioRef.current.play().catch((err) => {
        console.error(`Playback failed for track ${idx}:`, err.name, fullUrl);
      });
    } catch (e) {
      console.error('Audio play prepare error:', e);
    }

    setCurrentTrackIdx(idx);
    setIsPlaying(true);

    const el = messageRefs.current[msg.id];
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  // ─── 재생/일시정지 토글 ───
  const togglePlay = () => {
    if (!audioRef.current || audioMessagesRef.current.length === 0) return;
    if (currentTrackIdx < 0 || !audioRef.current.src) {
      playTrack(currentTrackIdx < 0 ? 0 : currentTrackIdx);
      return;
    }
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      void audioRef.current.play().catch((err) => {
        if (err.name === 'NotSupportedError') playTrack(currentTrackIdx);
        else console.error('Play toggle failed:', err);
      });
    }
  };

  // ─── Audio 인스턴스 + 이벤트 리스너 마운트 ───
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const onTimeUpdate = () => {
      // we only need audioDuration for seek in AudioPlayerBar, 
      // visual progress is calculated inside AudioPlayerBar's draw loop.
    };
    const onLoadedMeta = () => setAudioDuration(audio.duration);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      const next = currentTrackIdxRef.current + 1;
      if (next < audioMessagesRef.current.length) setTimeout(() => playTrack(next), 300);
    };
    const onError = (e: Event) => {
      console.error('Audio error:', e, audio.src);
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMeta);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMeta);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── 채팅 메시지 로딩 ───
  useEffect(() => {
    let isMounted = true;
    messageRefs.current = {};
    setChatMessagesData([]);

    if (!selectedChatId) return;

    setIsChatLoading(true);
    getChatMessages(selectedChatId)
      .then((data) => {
        if (isMounted) setChatMessagesData(data.contents || []);
      })
      .catch((err) => console.error('채팅 메시지 조회 실패:', err))
      .finally(() => {
        if (isMounted) setIsChatLoading(false);
      });

    // 새 대화방 전환 시 오디오 정지
    audioRef.current?.pause();
    setCurrentTrackIdx(-1);
    setIsPlaying(false);

    return () => {
      isMounted = false;
    };
  }, [selectedChatId]);

  // ─── Empty State ───
  if (!selectedChatId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <div className="w-24 h-24 rounded-full border-2 border-gray-800 flex items-center justify-center -rotate-12">
          <svg
            viewBox="0 0 24 24"
            className="w-12 h-12 text-gray-800 fill-none stroke-current stroke-2"
          >
            <path
              d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <p className="text-xl font-bold text-gray-400">ai 와 대화를 나누어보세요 !</p>
      </div>
    );
  }

  // ─── 메시지 레이블 ───
  const getAiLabel = (msg: ChatMessageData) => {
    if (msg.assistantType === 'PERSONA') return '페르소나';
    if (msg.assistantType === 'DAILY') return '일상 비서';
    if (msg.assistantType === 'STUDY') return '학습 비서';
    if (msg.assistantType === 'COUNSEL') return '상담 비서';
    return 'AI';
  };

  return (
    <>
      {/* 메시지 스크롤 영역 */}
      <div
        ref={() => {}}
        className="flex-1 flex flex-col gap-6 overflow-y-auto w-full px-10 pt-10 pb-2"
      >
        {isChatLoading && chatMessagesData.length === 0 ? (
          <div className="py-20 text-center font-bold text-rose-500 uppercase tracking-widest text-sm opacity-50 animate-pulse">
            메시지를 불러오는 중...
          </div>
        ) : chatMessagesData.length === 0 ? (
          <div className="py-20 text-center font-bold text-gray-400 uppercase tracking-widest text-sm opacity-50">
            메시지 내역이 없습니다.
          </div>
        ) : (
          chatMessagesData.map((msg, idx) => {
            const isAi = msg.speakerType === 'AVATAR' || msg.speakerType === 'ASSISTANT';
            const trackIdx = msg.audio?.audioUrl
              ? audioMessages.findIndex((m) => m.id === msg.id)
              : -1;
            const isCurrentTrack = trackIdx >= 0 && currentTrackIdx === trackIdx;

            return isAi ? (
              <div
                key={msg.id || idx}
                ref={(el) => {
                  messageRefs.current[msg.id] = el;
                }}
                className="flex gap-4 items-start self-start max-w-[80%]"
              >
                <div className="shrink-0 flex flex-col items-center gap-1">
                  <div className="w-12 h-12 rounded-full bg-[#eee5df] shadow-sm border border-black/5 overflow-hidden">
                    {msg.profileImgUrl ? (
                      <img
                        src={msg.profileImgUrl}
                        alt="AI"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 font-bold">
                        AI
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-gray-500">{getAiLabel(msg)}</span>
                </div>
                <div className="pt-1 flex flex-col gap-1">
                  <div
                    onClick={() => {
                      if (showTrackList && trackIdx >= 0) playTrack(trackIdx);
                    }}
                    className={`text-[15px] font-bold text-gray-900 leading-snug break-keep p-4 rounded-[1.8rem] rounded-tl-none border shadow-sm transition
                      ${isCurrentTrack ? 'bg-rose-50 border-rose-300' : 'bg-[#F2F2F7] border-transparent'}
                      ${showTrackList && trackIdx >= 0 ? 'cursor-pointer hover:bg-rose-50 hover:border-rose-200' : ''}`}
                  >
                    {msg.text}
                  </div>
                  <div className="flex items-center gap-2 pl-2">
                    <span className="text-[10px] font-bold text-gray-400">
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {isCurrentTrack && isPlaying && (
                      <span className="flex items-center gap-0.5">
                        <span
                          className="w-1 h-3 bg-rose-400 rounded-full animate-bounce"
                          style={{ animationDelay: '0ms' }}
                        />
                        <span
                          className="w-1 h-2 bg-rose-400 rounded-full animate-bounce"
                          style={{ animationDelay: '80ms' }}
                        />
                        <span
                          className="w-1 h-4 bg-rose-400 rounded-full animate-bounce"
                          style={{ animationDelay: '160ms' }}
                        />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div
                key={msg.id || idx}
                ref={(el) => {
                  messageRefs.current[msg.id] = el;
                }}
                className="flex gap-4 items-start self-end max-w-[80%] flex-row-reverse"
              >
                <div className="shrink-0 flex flex-col items-center gap-1">
                  <div className="w-12 h-12 rounded-full bg-white shadow-sm border border-black/5 relative overflow-hidden flex items-center justify-center">
                    {msg.profileImgUrl ? (
                      <img
                        src={msg.profileImgUrl}
                        alt="User"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-indigo-100 text-xs font-bold text-[#5856D6]">
                        나
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-gray-500">나</span>
                </div>
                <div className="pt-1 flex flex-col gap-1 text-right">
                  <div
                    onClick={() => {
                      if (showTrackList && trackIdx >= 0) playTrack(trackIdx);
                    }}
                    className={`text-[15px] font-bold text-white bg-[#5856D6] p-4 px-6 rounded-[1.8rem] rounded-tr-none leading-relaxed break-keep shadow-sm tracking-tight
                      ${showTrackList && trackIdx >= 0 ? 'cursor-pointer opacity-90 hover:opacity-100' : ''}`}
                  >
                    {msg.text}
                  </div>
                  <div className="flex items-center gap-2 pr-2 justify-end">
                    {isCurrentTrack && isPlaying && (
                      <span className="flex items-center gap-0.5">
                        <span
                          className="w-1 h-3 bg-[#5856D6] rounded-full animate-bounce"
                          style={{ animationDelay: '0ms' }}
                        />
                        <span
                          className="w-1 h-2 bg-[#5856D6] rounded-full animate-bounce"
                          style={{ animationDelay: '80ms' }}
                        />
                        <span
                          className="w-1 h-4 bg-[#5856D6] rounded-full animate-bounce"
                          style={{ animationDelay: '160ms' }}
                        />
                      </span>
                    )}
                    <span className="text-[10px] font-bold text-gray-400">
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ─── 오디오 플레이어 바 (음성 메시지가 있는 대화에만 표시) ─── */}
      {audioMessages.length > 0 && (
        <AudioPlayerBar
          audioMessages={audioMessages}
          showTrackList={showTrackList}
          setShowTrackList={setShowTrackList}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          currentTrackIdx={currentTrackIdx}
          setCurrentTrackIdx={setCurrentTrackIdx}
          playTrack={playTrack}
          togglePlay={togglePlay}
          audioDuration={audioDuration}
          audioRef={audioRef}
        />
      )}
    </>
  );
}
