import React, { useState, useEffect, useRef, memo, useCallback, useMemo } from 'react';
import {
  Mic,
  Lock,
  Users,
  Bell,
  User,
  Maximize,
  Home,
  BookOpen,
  Heart,
  Smile,
  X,
  UserPlus,
  Search,
  MoreVertical,
  ChevronRight,
  ChevronLeft,
  Plus,
  MessageSquare,
  PenTool,
  LogOut,
  RefreshCcw,
} from 'lucide-react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, Html, Float, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import AnimatedBackground from '../components/AnimatedBackground';

// 별도의 고성능 컴포넌트로 분리된 파형 링 (React 리렌더링과 독립적으로 부드럽게 애니메이션 유지)
const WaveformRing = ({ isActive }: { isActive: boolean }) => {
  const linesRef = useRef<(SVGLineElement | null)[]>([]);

  useEffect(() => {
    let aniInterval: ReturnType<typeof setInterval>;
    if (isActive) {
      aniInterval = setInterval(() => {
        linesRef.current.forEach((line) => {
          if (!line) return;
          const length = 20 + Math.random() * 25;
          line.setAttribute('y1', String(45 - length));
        });
      }, 80); // 80ms 간격으로 빠르게 파형 통통 튀도록
    } else {
      // 비활성화 시 기본값으로 복귀
      linesRef.current.forEach((line) => {
        if (!line) return;
        line.setAttribute('y1', '25'); // length = 20
      });
    }
    return () => clearInterval(aniInterval);
  }, [isActive]);

  return (
    <div
      className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-500 z-[-1] ${isActive ? 'opacity-100' : 'opacity-0'}`}
    >
      {/* 캐릭터 구체보다 큰 450px 사이즈로 테두리에 표시되도록 함 */}
      <svg viewBox="0 0 450 450" className="w-[450px] h-[450px] absolute">
        <g>
          {Array.from({ length: 60 }).map((_, i) => {
            const angle = (i * 360) / 60;
            return (
              <line
                key={i}
                ref={(el) => {
                  linesRef.current[i] = el;
                }}
                x1="225"
                y1="25"
                x2="225"
                y2="45"
                stroke="rgba(255,255,255,0.7)"
                strokeWidth="3"
                strokeLinecap="round"
                transform={`rotate(${angle} 225 225)`}
                className="transition-all duration-75 uppercase"
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
};

// ─── SpeechBubble: 타이핑 state를 완전히 격리한 독립 컴포넌트 ───
const SpeechBubble = memo(
  ({
    triggerText,
    onStart,
    onEnd,
  }: {
    triggerText: string;
    onStart: () => void;
    onEnd: () => void;
  }) => {
    const [displayedText, setDisplayedText] = useState('');

    useEffect(() => {
      if (!triggerText) return;
      let i = 0;
      let current = '';
      setDisplayedText('');
      onStart(); // 타이핑 시작 → 입 움직이기 시작
      const interval = setInterval(() => {
        if (i < triggerText.length) {
          current += triggerText.charAt(i);
          setDisplayedText(current);
          i++;
        } else {
          clearInterval(interval);
          onEnd(); // 타이핑 완료 → 입 멈추기
        }
      }, 100);
      return () => clearInterval(interval);
    }, [triggerText, onStart, onEnd]);

    if (!displayedText) return null;

    return (
      <div className="mt-8 z-20">
        {/* drop-shadow 필터: 몸통+꼬리 전체 실루엣에 하나의 그림자 적용 */}
        <div className="relative drop-shadow-lg transition-opacity duration-300 transform opacity-100 translate-y-0">
          {/* 몸통: 투명도 높여 겹침 비침 방지, border 제거 */}
          <div className="relative px-5 py-3 rounded-2xl bg-white/95 backdrop-blur-lg">
            {/* 꼬리: 몸통과 동일한 색, border 없음, 살짝 둥글게 */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white/95 rotate-45 rounded-sm" />
            <p className="relative z-10 text-base font-semibold text-gray-700 tracking-wide">
              {displayedText}
            </p>
          </div>
        </div>
      </div>
    );
  },
);

export default function MainPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // --- 상태(State) 관리 ---
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [mouthOpenRadius, setMouthOpenRadius] = useState(2);
  const [triggerText, setTriggerText] = useState('');
  const [faceType, setFaceType] = useState(0);
  const [isMyAiSpeaking, setIsMyAiSpeaking] = useState(false);
  const [myMouthOpenRadius, setMyMouthOpenRadius] = useState(2);
  const [myTriggerText, setMyTriggerText] = useState('');

  // 알림 데이터 타입 및 상태
  type Alarm = {
    id: number;
    message: string;
    isRead: boolean;
    time: string;
    type: 'follow' | 'system';
  };
  const [alarms, setAlarms] = useState<Alarm[]>([
    {
      id: 1,
      message: '김싸피님이 팔로우를 요청했습니다.',
      isRead: false,
      time: '방금 전',
      type: 'follow',
    },
    {
      id: 2,
      message: '오후 6시부터 서비스 점검이 예정되어 있습니다.',
      isRead: true,
      time: '1시간 전',
      type: 'system',
    },
  ]);
  const [isAlarmModalOpen, setIsAlarmModalOpen] = useState(false);
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);

  // --- 친구 관리 목록 State ---
  const [sidebarView, setSidebarView] = useState<'friends' | 'requests'>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFriendMenuId, setActiveFriendMenuId] = useState<number | null>(null);

  // --- 친구 방문 관련 State ---
  const [isVisitorMode, setIsVisitorMode] = useState(false);
  const [visitedFriendName, setVisitedFriendName] = useState('');
  const [isInteractionModalOpen, setIsInteractionModalOpen] = useState(false);
  const [isDualAiMode, setIsDualAiMode] = useState(false);
  const [visitorBg, setVisitorBg] = useState({});

  // AI 모드 상태 (일반/학습/상담)
  type Mode = 'normal' | 'study' | 'counseling';
  const [currentMode, setCurrentMode] = useState<Mode>('normal');

  const [friends, setFriends] = useState([
    { id: 1, name: '김싸피', color: 'bg-pink-200', profileExp: 'o_o' },
    { id: 2, name: '박싸피', color: 'bg-teal-200', profileExp: '-_-' },
  ]);

  const [friendRequests, setFriendRequests] = useState([
    { id: 3, name: '최싸피', color: 'bg-blue-200', profileExp: '^o^' },
    { id: 4, name: '이싸피', color: 'bg-green-200', profileExp: 'O_O' },
  ]);

  // --- Refs ---
  const sidebarRef = useRef<HTMLDivElement>(null);
  const modePanelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showModePanel, setShowModePanel] = useState(false);

  // --- 상수(Constants) ---
  const visitorPalettes = useMemo(
    () => [
      {
        baseTop: '#D4E5FF',
        baseBottom: '#A8C8FF',
        purple: '#C1C9F5',
        teal: '#98FB98',
        pink: '#FFD1DC',
        mint: '#E0FFFF',
      },
      {
        baseTop: '#FFF5E1',
        baseBottom: '#FFDAB9',
        purple: '#E6E6FA',
        teal: '#B0E0E6',
        pink: '#FFB6C1',
        mint: '#F0FFF0',
      },
      {
        baseTop: '#E6E6FA',
        baseBottom: '#D8BFD8',
        purple: '#DDA0DD',
        teal: '#AFEEEE',
        pink: '#FFF0F5',
        mint: '#F5FFFA',
      },
      {
        baseTop: '#F0FFF0',
        baseBottom: '#98FB98',
        purple: '#E0FFFF',
        teal: '#FFD700',
        pink: '#FFE4E1',
        mint: '#F0F8FF',
      },
    ],
    [],
  );

  const modes: { id: Mode; label: string; icon: React.ReactNode; color: string; glow: string }[] = [
    {
      id: 'normal',
      label: '일반 모드',
      icon: <Home className="w-7 h-7 text-white" />,
      color: 'from-teal-200/60 to-cyan-100/40',
      glow: 'bg-teal-200/50',
    },
    {
      id: 'study',
      label: '학습 모드',
      icon: <BookOpen className="w-7 h-7 text-white" />,
      color: 'from-pink-200/60 to-rose-100/40',
      glow: 'bg-pink-200/50',
    },
    {
      id: 'counseling',
      label: '상담 모드',
      icon: <Heart className="w-7 h-7 text-white" />,
      color: 'from-indigo-200/60 to-blue-100/40',
      glow: 'bg-indigo-300/50',
    },
  ];

  // 모드별 배경 색상 팔레트
  const bgColors: Record<
    Mode,
    {
      baseTop?: string;
      baseBottom?: string;
      purple?: string;
      teal?: string;
      pink?: string;
      mint?: string;
      plume?: string;
      streak?: string;
    }
  > = {
    normal: {}, // 기본값 (AnimatedBackground 내부 default 사용)
    study: {
      baseTop: '#EDE5D4', // 따뜻한 크림 상단
      baseBottom: '#7BA0B4', // 파우더 블루-그레이 하단
      purple: '#D4B890', // 밀색/위트 (우상단)
      teal: '#C8804A', // 앰버-테라코타 (중앙 포인트)
      pink: '#E0C898', // 따뜻한 피치 (우측)
      mint: '#8FBACF', // 밝은 하늘색 (좌하단)
      plume: '#FAF4E8', // 아이보리 크림 블룸
      streak: '#E8DDC8', // 따뜻한 크림 스트리크
    },
    counseling: {
      baseTop: '#C8DCC8', // 연한 세이지 그린 (상단 베이스)
      baseBottom: '#8CBCC0', // 틸-세이지 (하단)
      purple: '#E0B0C0', // 소프트 핑크 (중앙 상단 포인트)
      teal: '#90C8D8', // 스카이 블루 (중앙)
      pink: '#F0C08C', // 복숭아-살구 (우측)
      mint: '#C8DC88', // 노랑-연두/차트리즈 (좌하단)
      plume: '#F4FAF0', // 밝은 민트-화이트 블룸
      streak: '#E8D4E8', // 소프트 라벤더 스트리크
    },
  };

  // --- 함수(Functions) ---
  const handleVisit = useCallback(
    (name: string, isReturn: boolean = false) => {
      setVisitedFriendName(name);
      setIsVisitorMode(true);
      setIsUsersModalOpen(false);
      setIsDualAiMode(false);

      const randomPalette = visitorPalettes[Math.floor(Math.random() * visitorPalettes.length)];
      setVisitorBg(randomPalette);

      setTriggerText(`${name} : 우리집에 왜 왔니 ?`);
      setMyTriggerText('');

      if (!isReturn) {
        alert(`${name}님의 방으로 방문합니다.`);
      }
    },
    [visitorPalettes],
  );

  const handleDeleteFriend = (id: number) => {
    setFriends((prev) => prev.filter((f) => f.id !== id));
  };

  const handleAcceptRequest = (id: number, name: string) => {
    setFriendRequests((prev) => prev.filter((req) => req.id !== id));
    alert(`${name}님의 친구 요청을 수락했습니다.`);
  };

  const handleRejectRequest = (id: number) => {
    setFriendRequests((prev) => prev.filter((req) => req.id !== id));
  };

  const handleReadAllAlarms = () => setAlarms((prev) => prev.map((a) => ({ ...a, isRead: true })));
  const handleDeleteAllAlarms = () => setAlarms([]);
  const handleAlarmClick = (alarm: Alarm) => {
    setAlarms((prev) => prev.map((a) => (a.id === alarm.id ? { ...a, isRead: true } : a)));
    if (alarm.type === 'follow') {
      setIsAlarmModalOpen(false);
      setIsUsersModalOpen(true);
    }
  };

  const changeFace = () => setFaceType((prev) => (prev + 1) % 6);
  const handleSpeakStart = useCallback(() => setIsSpeaking(true), []);
  const handleSpeakEnd = useCallback(() => setIsSpeaking(false), []);
  const handleMyAiSpeakStart = useCallback(() => setIsMyAiSpeaking(true), []);
  const handleMyAiSpeakEnd = useCallback(() => setIsMyAiSpeaking(false), []);

  const enterModePanel = useCallback(() => {
    if (modePanelTimer.current) clearTimeout(modePanelTimer.current);
    setShowModePanel(true);
  }, []);

  const leaveModePanel = useCallback(() => {
    modePanelTimer.current = setTimeout(() => setShowModePanel(false), 800);
  }, []);

  // --- Effects ---
  useEffect(() => {
    const timer = setTimeout(() => {
      setTriggerText('서영님 눈물닦고 할일하세요');
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isSpeaking) return;
    const ani = setInterval(() => {
      setMouthOpenRadius((prev) => (prev === 2 ? 8 : 2));
    }, 150);
    return () => {
      clearInterval(ani);
      setMouthOpenRadius(2);
    };
  }, [isSpeaking]);

  useEffect(() => {
    if (!isMyAiSpeaking) return;
    const ani = setInterval(() => {
      setMyMouthOpenRadius((prev) => (prev === 2 ? 8 : 2));
    }, 150);
    return () => {
      clearInterval(ani);
      setMyMouthOpenRadius(2);
    };
  }, [isMyAiSpeaking]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isUsersModalOpen && sidebarRef.current) {
        if (!sidebarRef.current.contains(event.target as Node)) {
          setIsUsersModalOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [isUsersModalOpen]);

  // 탭 전환 시 드롭다운 닫기 (useEffect 대신 클릭 시 처리 권장되나 네비게이션 동기화 위해 유지 시 린트 준수 필요)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveFriendMenuId(null);
  }, [sidebarView]);

  useEffect(() => {
    if (location.state?.fromPersona && location.state?.friendName) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      handleVisit(location.state.friendName, true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, handleVisit]);

  // 배경 그라데이션 (현재는 애니메이션 CSS 클래스로 구현)
  // 투명한 캐릭터를 위해 backdrop-blur 적용

  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col justify-between">
      {/* 프리미엄 유체 배경 — 모드에 따라 색상 변경 */}
      <AnimatedBackground {...(isVisitorMode ? visitorBg : bgColors[currentMode])} />

      {/* 상단 헤더 */}
      <header className="flex justify-between items-center px-5 py-2 w-full z-10 text-gray-700">
        <div className="flex flex-col items-start gap-2">
          <div className="text-3xl font-extrabold tracking-wider text-white drop-shadow-md">
            SSARVIS
          </div>
          {isVisitorMode && (
            <button
              onClick={() => {
                setIsVisitorMode(false);
                setIsDualAiMode(false);
                setIsInteractionModalOpen(false);
                setTriggerText('서영님 눈물닦고 할일하세요'); // 내 집으로 돌아올 때 인사말 복구
                setMyTriggerText('');
              }}
              className="group flex items-center justify-center w-10 h-10 rounded-full bg-white/20 hover:bg-red-500/40 backdrop-blur-md border border-white/40 transition-all duration-300 shadow-lg text-white"
              title="내 집으로 돌아가기"
            >
              <LogOut className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
            </button>
          )}
        </div>
        <div className="flex gap-4">
          <button className="p-2 rounded-full bg-white/30 hover:bg-white/50 backdrop-blur-sm transition">
            <Maximize className="w-6 h-6" />
          </button>
          <button
            onClick={() => setIsAlarmModalOpen(!isAlarmModalOpen)}
            className="relative p-2 rounded-full bg-white/30 hover:bg-white/50 backdrop-blur-sm transition"
          >
            <Bell className="w-6 h-6" />
            {alarms.some((a) => !a.isRead) && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-400 rounded-full border border-white" />
            )}
          </button>
          <button className="p-2 rounded-full bg-white/30 hover:bg-white/50 backdrop-blur-sm transition">
            <User className="w-6 h-6" />
          </button>
        </div>

        {/* 알림 드롭다운 (헤더 바로 아래 우측 위치) */}
        {isAlarmModalOpen && (
          <div className="absolute top-[60px] right-20 z-50 w-[300px] bg-white/30 backdrop-blur-2xl rounded-3xl p-5 shadow-2xl border border-white/40 text-gray-800 animate-in fade-in slide-in-from-top-4 duration-200">
            <div className="flex flex-col gap-4 mb-6">
              {alarms.length === 0 ? (
                <div className="text-center text-sm text-gray-600 py-4">알림이 없습니다.</div>
              ) : (
                alarms.map((alarm, idx) => (
                  <React.Fragment key={alarm.id}>
                    {idx > 0 && <div className="h-px bg-white/40 my-1" />}
                    <div
                      onClick={() => handleAlarmClick(alarm)}
                      className="flex items-center gap-3 cursor-pointer group"
                    >
                      <div
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${!alarm.isRead ? 'bg-red-400' : 'bg-transparent'}`}
                      />
                      <p
                        className={`text-sm tracking-tight transition ${alarm.isRead ? 'text-gray-500' : 'text-gray-800 font-medium group-hover:text-black'}`}
                      >
                        {alarm.message}
                      </p>
                    </div>
                  </React.Fragment>
                ))
              )}
            </div>

            <div className="flex justify-end items-center gap-2 text-xs text-white drop-shadow-md font-medium">
              <button onClick={handleDeleteAllAlarms} className="hover:text-white/80 transition">
                전체 삭제
              </button>
              <span className="text-white/60">|</span>
              <button onClick={handleReadAllAlarms} className="hover:text-white/80 transition">
                모두 읽음
              </button>
            </div>
          </div>
        )}
      </header>

      {/* 메인 뷰 (캐릭터 중앙) */}
      <main className="flex-1 flex items-center justify-center relative w-full h-full">
        {/* 좌측 모드 선택 — 방문 모드일 때는 숨김 */}
        <div
          className="absolute left-6 top-1/2 -translate-y-1/2 z-50 text-center flex flex-col items-center gap-2"
          onMouseEnter={!isVisitorMode ? enterModePanel : undefined}
          onMouseLeave={!isVisitorMode ? leaveModePanel : undefined}
        >
          {/* 트리거 버튼 — 평소엔 모드 선택, 방문 시엔 상호작용 */}
          <div
            onClick={() => isVisitorMode && setIsInteractionModalOpen(!isInteractionModalOpen)}
            className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md border border-white/40 shadow-lg flex flex-col items-center justify-center gap-1 hover:bg-white/30 transition-all duration-300 cursor-pointer"
          >
            {isVisitorMode ? (
              <>
                <Plus className="w-7 h-7 text-pink-500" />
                <span className="text-[8px] font-semibold text-white/80 leading-none">
                  모드선택
                </span>
              </>
            ) : (
              <>
                {modes.find((m) => m.id === currentMode)?.icon}
                <span className="text-[8px] font-semibold text-white/80 leading-none">
                  {currentMode === 'normal' ? '일반' : currentMode === 'study' ? '학습' : '상담'}
                </span>
              </>
            )}
          </div>

          {/* 1) 평소 모드: 모드 선택 팝업 */}
          {!isVisitorMode && (
            <div
              className={`
                absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2
                flex flex-col items-center gap-3 p-4 rounded-[50px]
                bg-white/20 backdrop-blur-xl border border-white/40 shadow-2xl
                transition-all duration-400 ease-out
                ${
                  showModePanel
                    ? 'opacity-100 translate-x-0 pointer-events-auto'
                    : 'opacity-0 -translate-x-2 pointer-events-none'
                }
              `}
              onMouseEnter={enterModePanel}
              onMouseLeave={leaveModePanel}
            >
              {modes.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setCurrentMode(mode.id)}
                  className={`
                    relative w-14 h-14 rounded-full flex items-center justify-center
                    bg-gradient-to-br ${mode.color} border-2 transition-all duration-300
                    ${
                      currentMode === mode.id
                        ? 'border-white/80 scale-105 shadow-lg'
                        : 'border-white/20 hover:border-white/50 hover:scale-105'
                    }
                  `}
                >
                  {currentMode === mode.id && (
                    <div className={`absolute inset-0 rounded-full ${mode.glow} blur-md -z-10`} />
                  )}
                  {mode.icon}
                  {currentMode === mode.id && (
                    <span className="absolute -right-1 -top-1 w-2.5 h-2.5 bg-white rounded-full border-2 border-white/60 shadow" />
                  )}
                </button>
              ))}
              <div className="w-8 h-px bg-white/40 my-1 font-semibold" />
              <button
                onClick={changeFace}
                className="relative w-14 h-14 rounded-full flex flex-col items-center justify-center gap-1 bg-white/20 border-2 border-white/20 hover:border-white/50 hover:scale-105 transition-all duration-300 shadow-sm"
                title="표정 변경"
              >
                <Smile className="w-7 h-7 text-white" />
                <span className="text-[10px] font-bold text-white leading-none">표정</span>
              </button>
            </div>
          )}

          {/* 2) 방문 모드: 상호작용 팝업 */}
          {isVisitorMode && isInteractionModalOpen && (
            <div className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 flex flex-col items-center gap-4 p-4 rounded-[50px] bg-white/10 backdrop-blur-xl border border-white/40 shadow-2xl animate-in fade-in slide-in-from-left-4 duration-300">
              <button
                onClick={() => {
                  setIsDualAiMode(true);
                  setIsInteractionModalOpen(false);
                  setMyTriggerText('나 : 우와, 네 방 정말 멋지다!');
                  setTimeout(() => {
                    setTriggerText(`${visitedFriendName} : 고마워! 놀러와줘서 기뻐.`);
                  }, 3000);
                }}
                className="w-14 h-14 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-400/60 to-indigo-300/40 border-2 border-white/20 hover:border-white/60 hover:scale-110 transition-all shadow-lg group"
                title="AI 끼리 대화"
              >
                <MessageSquare className="w-7 h-7 text-white" />
              </button>
              <button
                onClick={() => {
                  navigate(`/persona/${visitedFriendName}`);
                  setIsInteractionModalOpen(false);
                }}
                className="w-14 h-14 rounded-full flex items-center justify-center bg-gradient-to-br from-pink-400/60 to-rose-300/40 border-2 border-white/20 hover:border-white/60 hover:scale-110 transition-all shadow-lg group"
                title="친구 페르소나 설정"
              >
                <PenTool className="w-7 h-7 text-white" />
              </button>
              {isDualAiMode && (
                <>
                  <div className="w-8 h-px bg-white/30 my-1 font-semibold" />
                  <button
                    onClick={() => {
                      setIsDualAiMode(false);
                      setIsInteractionModalOpen(false);
                    }}
                    className="w-14 h-14 rounded-full flex items-center justify-center bg-white/20 border-2 border-white/20 hover:border-white/60 hover:bg-white/40 hover:scale-110 transition-all shadow-lg"
                    title="친구 AI만 보기"
                  >
                    <RefreshCcw className="w-7 h-7 text-white" />
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* 우측 슬라이딩 사이드바 (친구 목록) */}
        <motion.div
          ref={sidebarRef}
          className="absolute top-0 right-0 h-full w-[350px] bg-white/20 backdrop-blur-2xl border-l border-white/40 shadow-2xl z-40 flex flex-col"
          initial={false}
          animate={{ x: isUsersModalOpen ? 0 : 350 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          drag="x"
          dragConstraints={{ left: 0, right: 350 }}
          dragElastic={0.05}
          onDragEnd={(_e, info) => {
            // 오른쪽으로 스와이프하면 닫기, 왼쪽으로 스와이프하면 열기
            if (info.offset.x > 50 || info.velocity.x > 500) {
              setIsUsersModalOpen(false);
            } else if (info.offset.x < -50 || info.velocity.x < -500) {
              setIsUsersModalOpen(true);
            }
          }}
        >
          {/* 당기기 탭 (사이드바에 부착되어 항상 보임) */}
          <button
            onClick={() => setIsUsersModalOpen(!isUsersModalOpen)}
            className="absolute -left-[70px] top-1/2 -translate-y-1/2 w-[70px] h-32 bg-white/20 backdrop-blur-xl border border-r-0 border-white/40 rounded-l-3xl shadow-lg flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <Users className="w-7 h-7 text-gray-700" />
          </button>

          {/* 사이드바 내용 */}
          <div className="p-6 pb-4 flex flex-col gap-5 border-b border-white/30">
            {/* 검색 바 (친구 목록/요청 제목보다 위로 이동) */}
            <div className="relative w-full mt-2">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/40 border border-white/50 rounded-full py-2.5 pl-4 pr-10 text-sm text-gray-800 placeholder-gray-500 outline-none focus:bg-white/60 transition shadow-sm"
              />
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            </div>

            {/* 타이틀 헤더 영역 */}
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                {sidebarView === 'friends' ? (
                  <>
                    <Users className="w-6 h-6 text-pink-500" /> 친구 목록
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setSidebarView('friends')}
                      className="mr-1 p-1 hover:bg-white/40 rounded-full transition"
                    >
                      <ChevronLeft className="w-5 h-5 text-gray-700" />
                    </button>
                    <UserPlus className="w-6 h-6 text-pink-500" /> 친구 요청
                  </>
                )}
              </h2>
              <button
                onClick={() => {
                  if (sidebarView === 'requests') {
                    setSidebarView('friends');
                  } else {
                    setIsUsersModalOpen(false);
                  }
                }}
                className="p-2 hover:bg-white/40 rounded-full transition"
              >
                <X className="w-5 h-5 text-gray-700" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            {sidebarView === 'friends' ? (
              <>
                {/* 1) 친구 요청 N건 버튼 (탭 전환) */}
                <button
                  onClick={() => setSidebarView('requests')}
                  className="w-full flex items-center justify-between p-3 px-2 rounded-2xl hover:bg-white/30 transition border border-transparent hover:border-white/40 text-left cursor-pointer"
                >
                  <span className="text-gray-700 font-semibold text-sm">
                    친구 요청 {friendRequests.length}건
                  </span>
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                </button>

                <hr className="border-white/30 my-1" />

                {/* 3) 친구 목록 출력 */}
                <div className="flex flex-col gap-2">
                  {friends
                    .filter((f) => f.name.includes(searchQuery))
                    .map((friend) => (
                      <div
                        key={friend.id}
                        className="flex items-center justify-between p-2 hover:bg-white/30 rounded-2xl transition group"
                      >
                        <div className="flex items-center gap-3">
                          {/* 프로필 이미지 (임시) */}
                          <div
                            className={`w-10 h-10 rounded-full ${friend.color} flex items-center justify-center shadow-inner`}
                          >
                            <span className="text-xs font-bold text-gray-700">
                              {friend.profileExp}
                            </span>
                          </div>
                          <span className="text-gray-800 font-medium text-sm">{friend.name}</span>
                        </div>
                        {/* 우측 버튼 영역 (방문 + 더보기) */}
                        <div className="flex items-center gap-1">
                          {/* 방문 버튼 */}
                          {isVisitorMode && visitedFriendName === friend.name ? (
                            <div className="px-3 py-1.5 bg-pink-50/80 text-pink-600 text-[11px] font-bold rounded-lg border border-pink-200 flex items-center gap-1.5 shadow-sm">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500"></span>
                              </span>
                              방문 중
                            </div>
                          ) : (
                            <button
                              onClick={() => handleVisit(friend.name)}
                              className="px-3 py-1.5 bg-white shadow-sm border border-gray-100 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-lg transition"
                            >
                              방문
                            </button>
                          )}

                          {/* 더보기(삭제) 메뉴 영역 */}
                          <div className="relative">
                            <button
                              onClick={() =>
                                setActiveFriendMenuId((prev) =>
                                  prev === friend.id ? null : friend.id,
                                )
                              }
                              className="p-1 px-1.5 hover:bg-white/50 rounded-md text-gray-500 hover:text-gray-800 transition outline-none"
                              title="친구 관리"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {/* 드롭다운 메뉴 */}
                            {activeFriendMenuId === friend.id && (
                              <div className="absolute right-0 top-full mt-1 w-24 bg-white/95 backdrop-blur-md border border-gray-100 rounded-xl shadow-lg z-50 overflow-hidden text-[13px] animate-in slide-in-from-top-2 fade-in">
                                <button
                                  onClick={() => {
                                    handleDeleteFriend(friend.id);
                                    setActiveFriendMenuId(null);
                                  }}
                                  className="w-full text-left px-4 py-2 text-red-500 font-semibold hover:bg-red-50 transition"
                                >
                                  삭제
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  {/* 검색 결과 없음 처리 */}
                  {friends.filter((f) => f.name.includes(searchQuery)).length === 0 && (
                    <div className="text-center text-sm text-gray-500 py-6">
                      검색된 친구가 없어요.
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* 친구 요청 탭 뷰 */
              <div className="flex flex-col gap-2">
                {friendRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between p-2 hover:bg-white/30 rounded-2xl transition"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full ${req.color} flex items-center justify-center shadow-inner`}
                      >
                        <span className="text-xs font-bold text-gray-700">{req.profileExp}</span>
                      </div>
                      <span className="text-gray-800 font-medium text-sm">{req.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleAcceptRequest(req.id, req.name)}
                        className="px-3 py-1.5 bg-pink-100 hover:bg-pink-200 text-pink-700 text-xs font-semibold rounded-lg shadow-sm transition"
                      >
                        수락
                      </button>
                      <button
                        onClick={() => handleRejectRequest(req.id)}
                        className="px-3 py-1.5 bg-white shadow-sm border border-gray-100 hover:bg-gray-50 text-gray-500 text-xs font-semibold rounded-lg transition"
                      >
                        거절
                      </button>
                    </div>
                  </div>
                ))}
                {friendRequests.length === 0 && (
                  <div className="text-center text-sm text-gray-500 py-6">
                    새로운 친구 요청이 없어요.
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* 중앙 캐릭터 컨테이너 */}
        <div className="relative flex flex-col items-center justify-center">
          {/* 메인 캐릭터 영역 하위로 오디오 파형 이동 (여기서는 삭제) */}

          <div className="absolute left-[-100px] top-1/2 -translate-y-1/2">
            <button className="p-4 rounded-full bg-white/30 backdrop-blur-md shadow-lg border border-white/50 hover:bg-white/40 transition">
              <Mic className="w-6 h-6 text-green-600" />
            </button>
          </div>

          <div className="absolute right-[-100px] top-1/2 -translate-y-1/2">
            {!isVisitorMode && (
              <button className="p-4 rounded-full bg-white/30 backdrop-blur-md shadow-lg border border-white/50 hover:bg-white/40 transition">
                <Lock className="w-6 h-6 text-gray-700" />
              </button>
            )}
          </div>

          {/* 메인 캐릭터 구체 (Three.js Real 3D) 및 오디오 파형(Visualizer) 통합 컨테이너 */}
          <div className="flex items-center justify-center gap-20">
            {/* 듀얼 모드일 때 내 AI (왼쪽 등장) */}
            {isDualAiMode && (
              <div
                className="w-[300px] h-[300px] relative z-20 flex flex-col items-center justify-center
                              animate-in slide-in-from-left-20 fade-in duration-700"
              >
                <div className="relative w-full h-full flex items-center justify-center">
                  <WaveformRing isActive={isMyAiSpeaking} />
                  <Canvas camera={{ position: [0, 0, 4.5], fov: 45 }} className="w-full h-full">
                    <ambientLight intensity={0.6} />
                    <spotLight
                      position={[0, 5, 5]}
                      intensity={6}
                      angle={0.4}
                      penumbra={0.6}
                      color="#ffffff"
                      castShadow
                    />
                    <pointLight position={[-4, 3, 3]} intensity={4} color="#e0f0ff" />
                    <pointLight position={[4, -2, 2]} intensity={3} color="#ffeeff" />
                    <directionalLight position={[10, 10, 10]} intensity={2.0} color="#ffffff" />
                    <Environment preset="studio" />
                    <Character3D
                      faceType={faceType}
                      mouthOpenRadius={myMouthOpenRadius}
                      mode={currentMode}
                    />
                  </Canvas>
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white/40 backdrop-blur-md px-4 py-1 rounded-full border border-white/50 text-xs font-bold text-gray-700 whitespace-nowrap">
                    나의 AI
                  </div>
                </div>
                {/* 각자의 말풍선 */}
                <SpeechBubble
                  triggerText={myTriggerText}
                  onStart={handleMyAiSpeakStart}
                  onEnd={handleMyAiSpeakEnd}
                />
              </div>
            )}

            {/* 메인 캐릭터 영역 (평소에는 내 AI, 방문 모드에서는 친구 AI) */}
            <div
              className={`relative z-10 flex flex-col items-center justify-center
                            transition-all duration-700 ease-in-out ${isDualAiMode ? 'w-[300px] h-[300px]' : 'w-[350px] h-[350px]'}`}
            >
              <div className="relative w-full h-full flex items-center justify-center">
                <WaveformRing isActive={isSpeaking} />
                <Canvas camera={{ position: [0, 0, 4.5], fov: 45 }} className="w-full h-full">
                  <ambientLight intensity={0.6} />
                  <spotLight
                    position={[0, 5, 5]}
                    intensity={6}
                    angle={0.4}
                    penumbra={0.6}
                    color="#ffffff"
                    castShadow
                  />
                  <pointLight position={[-4, 3, 3]} intensity={4} color="#e0f0ff" />
                  <pointLight position={[4, -2, 2]} intensity={3} color="#ffeeff" />
                  <directionalLight position={[10, 10, 10]} intensity={2.0} color="#ffffff" />
                  <Environment preset="studio" />
                  <Character3D
                    faceType={isVisitorMode ? (faceType + 2) % 6 : faceType}
                    mouthOpenRadius={mouthOpenRadius}
                    mode={isVisitorMode ? 'normal' : currentMode}
                  />
                </Canvas>
                {isVisitorMode || isDualAiMode ? (
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white/40 backdrop-blur-md px-4 py-1 rounded-full border border-white/50 text-xs font-bold text-gray-700 whitespace-nowrap">
                    {isVisitorMode ? `${visitedFriendName}님의 AI` : '나의 AI'}
                  </div>
                ) : null}
              </div>

              {/* 각자의 말풍선 (중앙/친구 AI용) */}
              <SpeechBubble
                triggerText={triggerText}
                onStart={handleSpeakStart}
                onEnd={handleSpeakEnd}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Three.js 3D 캐릭터 컴포넌트
function Character3D({
  faceType,
  mouthOpenRadius,
  mode,
}: {
  faceType: number;
  mouthOpenRadius: number;
  mode: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      // 화면 중앙 기준 -1 ~ 1 정규화 위치
      mouse.current.x = (e.clientX - centerX) / centerX;
      mouse.current.y = (e.clientY - centerY) / centerY;
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useFrame((_state, delta) => {
    if (!meshRef.current) return;
    // 마우스 위치에 따른 부드러운 회전 보간
    // 회전 반경(민감도)
    const targetX = mouse.current.y * Math.PI * 0.15;
    const targetY = mouse.current.x * Math.PI * 0.15;

    // delta 값을 이용해 프레임과 독립적인 부드러운 애니메이션(lerp) 적용
    // 초기 로딩이나 메모리 부하 시의 급격한 변화(shaking)를 막기 위해 delta 값을 제한
    const safeDelta = Math.min(delta, 0.1);

    meshRef.current.rotation.x = THREE.MathUtils.lerp(
      meshRef.current.rotation.x,
      targetX,
      6 * safeDelta,
    );
    meshRef.current.rotation.y = THREE.MathUtils.lerp(
      meshRef.current.rotation.y,
      targetY,
      6 * safeDelta,
    );
  });

  return (
    <Float speed={1.5} rotationIntensity={0.05} floatIntensity={0.3}>
      <Sphere ref={meshRef} args={[1.5, 64, 64]}>
        {/* 유리 질감을 극대화하기 위한 물리 기반 머티리얼 속성 조정 */}
        <meshPhysicalMaterial
          transmission={0.35} // 투과율을 낮춰 배경색이 덜 비치고 흰끼가 살아남
          thickness={2.0} // 두께감을 올려 굴절을 더 풍부하게
          roughness={0.0} // 0에 가까울수록 거울처럼 매끄럽게 = 선명한 반짝임
          ior={1.6} // 굴절률 높여 유리/크리스탈 느낌 강화
          color="#ffffff"
          emissive="#c8e8ff" // 은은한 하늘빛 자가발광으로 블링 느낌
          emissiveIntensity={0.25} // 발광 강도 높임
          clearcoat={1} // 코팅 최대
          clearcoatRoughness={0.0} // 코팅 표면도 완전 매끄럽게 → 가장 선명한 반짝임
          opacity={0.95}
          transparent={true}
          envMapIntensity={4.0} // 환경 반사 강도 대폭 올려 주변 빛이 구체에 풍부하게 반사
        />
        {/* 구체 겉표면에 HTML 기반 얼굴 UI 매핑 및 크기 확대 */}
        <Html
          transform
          sprite={false}
          position={[0, 0, 1.48]} // 구체 표면 (반지름 1.5)과 거의 비슷하게 배치
          distanceFactor={0.8} // 1.2 -> 0.8 로 대폭 줄여서 화면에 훨씬 더 크게 보이게 설정
          zIndexRange={[100, 0]}
        >
          {/* 표정 컨테이너 크기 자체를 기존 280px에서 400px로 더욱 확대 */}
          <div className="w-[400px] h-[400px] pointer-events-none flex items-center justify-center [transform-style:preserve-3d] scale-150">
            <FaceDesign type={faceType} mouthOpenRadius={mouthOpenRadius} mode={mode} />
          </div>
        </Html>
      </Sphere>
    </Float>
  );
}

// 6가지 얼굴 디자인 컴포넌트
function FaceDesign({
  type,
  mouthOpenRadius,
  mode,
}: {
  type: number;
  mouthOpenRadius: number;
  mode: string;
}) {
  // 공통 눈 렌더링 함수 (크기 대폭 확대)
  const renderEyes = (eyeStyle: React.CSSProperties) => (
    <>
      <div
        className="absolute top-[40%] left-[25%] bg-gray-800 rounded-full"
        style={{ ...eyeStyle, transform: 'translateZ(30px)' }}
      />
      <div
        className="absolute top-[40%] right-[25%] bg-gray-800 rounded-full"
        style={{ ...eyeStyle, transform: 'translateZ(30px)' }}
      />
    </>
  );

  // 공통 눈썹 렌더링 함수
  const renderEyebrows = () => (
    <>
      {/* 왼쪽 눈썹 */}
      <div
        className="absolute top-[25%] left-[25%] w-10 h-3 bg-gray-700 rounded-full opacity-80"
        style={{ transform: 'translateZ(30px) rotate(-10deg)' }}
      />
      {/* 오른쪽 눈썹 */}
      <div
        className="absolute top-[25%] right-[25%] w-10 h-3 bg-gray-700 rounded-full opacity-80"
        style={{ transform: 'translateZ(30px) rotate(10deg)' }}
      />
    </>
  );

  return (
    <div className="absolute inset-0 w-full h-full flex items-center justify-center [transform-style:preserve-3d]">
      {renderEyebrows()}

      {/* 학습모드 전용 3D 사각 뿔테 안경 (HTML CSS 3D 완벽 적용)
          얼굴 요소들과 동일한 DOM 레이어에서 렌더링되어 투명도 및 깊이(z-index) 완벽 연동 */}
      {mode === 'study' && (
        <div
          className="absolute pointer-events-none"
          style={{
            top: '50%',
            left: '50%',
            // Z축 돌출을 통해 코보다 넉넉하게 앞에 띄워서 캐릭터 뺨이나 눈썹과 충돌 방지
            transform: 'translate(-50%, -50%) translateZ(65px)',
            width: '420px', // 안경테 잘림 현상 방지를 위해 좌우 너비 대폭 확보
            transformStyle: 'preserve-3d',
            zIndex: 50,
          }}
        >
          {/* 안경 전면부 SVG (사각 뿔테) - 여백을 포함하여 중앙 정렬되도록 오프셋(x +40 추가) */}
          <svg
            viewBox="0 0 420 140"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              width: '100%',
              height: 'auto',
              filter: 'drop-shadow(0 15px 15px rgba(180,0,0,0.5))',
              position: 'relative',
              zIndex: 10,
              display: 'block',
              transformStyle: 'preserve-3d',
            }}
          >
            {/* 코 브리지 */}
            <path
              d="M 192 50 Q 210 42 228 50"
              fill="none"
              stroke="#D30000"
              strokeWidth="12"
              strokeLinecap="square"
            />

            {/* 왼쪽 사각 렌즈 */}
            <rect
              x="65"
              y="15"
              width="127"
              height="90"
              rx="12"
              fill="rgba(255,255,255,0.15)"
              stroke="#D30000"
              strokeWidth="16"
            />
            {/* 왼쪽 렌즈 빛 반사 (픽셀아트 느낌) */}
            <rect x="80" y="30" width="18" height="18" fill="white" opacity="0.8" />
            <rect x="104" y="30" width="8" height="18" fill="white" opacity="0.8" />

            {/* 오른쪽 사각 렌즈 */}
            <rect
              x="228"
              y="15"
              width="127"
              height="90"
              rx="12"
              fill="rgba(255,255,255,0.15)"
              stroke="#D30000"
              strokeWidth="16"
            />
            {/* 오른쪽 렌즈 빛 반사 */}
            <rect x="243" y="30" width="18" height="18" fill="white" opacity="0.8" />
            <rect x="267" y="30" width="8" height="18" fill="white" opacity="0.8" />
          </svg>
        </div>
      )}

      {/* 상담모드 전용: 양손으로 소중히 안고 있는 커피잔 (우측 하단) */}
      {mode === 'counseling' && (
        <div
          className="absolute pointer-events-none flex items-center justify-center"
          style={{
            // 좀 더 오른쪽으로 치우치게 배치하고 사이즈를 줄임
            top: '75%',
            left: '95%', // 80% -> 95%로 더 오른쪽으로 밀어내기
            transform: 'translate(-50%, -50%) translateZ(120px) rotateY(-15deg)',
            width: '180px', // 220px -> 180px로 사이즈 축소
            height: '180px',
            transformStyle: 'preserve-3d',
            zIndex: 60,
          }}
        >
          {/* 전체 요소(손+컵+김)가 아주 천천히 상하로 둥둥 떠다니도록 애니메이션 */}
          <div
            className="w-full h-full relative"
            style={{
              transformStyle: 'preserve-3d',
              animation: 'floatCoffee 3s ease-in-out infinite alternate',
            }}
          >
            {/* 1) 모락모락 김 (Coffee Steam) - 빵빵한 구름(☁️) 이모지를 겹쳐 풍성한 증기 효과 */}
            <div
              className="absolute top-[-80px] left-[50%] -translate-x-1/2 w-full h-full"
              style={{ transform: 'translateZ(15px)' }}
            >
              <style>
                {`
                  @keyframes steamRise {
                    0% { transform: translateY(30px) scale(0.5) rotate(-5deg); opacity: 0; }
                    40% { opacity: 0.8; }
                    100% { transform: translateY(-70px) scale(1.5) rotate(15deg); opacity: 0; }
                  }
                  @keyframes floatCoffee {
                    0% { transform: translateY(0px) rotateZ(0deg); }
                    100% { transform: translateY(-12px) rotateZ(3deg); }
                  }
                `}
              </style>
              {/* 핑크빛 하트 김 (하트 형태가 뚜렷하게 보이도록 블러 제거, 더 연한 핑크톤) */}
              <div
                className="absolute text-pink-200 drop-shadow-md"
                style={{
                  top: '60px',
                  left: '80px',
                  fontSize: '60px',
                  opacity: 0,
                  animation: 'steamRise 3s infinite ease-in-out',
                }}
              >
                💕
              </div>
              <div
                className="absolute text-pink-100 drop-shadow-md"
                style={{
                  top: '70px',
                  left: '110px',
                  fontSize: '50px',
                  opacity: 0,
                  animation: 'steamRise 3.5s infinite delay-[1.2s] ease-in-out',
                }}
              >
                🤍
              </div>
              <div
                className="absolute text-pink-200 drop-shadow-md"
                style={{
                  top: '50px',
                  left: '140px',
                  fontSize: '70px',
                  opacity: 0,
                  animation: 'steamRise 4s infinite delay-[0.6s] ease-in-out',
                }}
              >
                🩷
              </div>
              <div
                className="absolute text-pink-100 drop-shadow-md"
                style={{
                  top: '40px',
                  left: '100px',
                  fontSize: '65px',
                  opacity: 0,
                  animation: 'steamRise 3.2s infinite delay-[2s] ease-in-out',
                }}
              >
                💖
              </div>
            </div>

            {/* 몸통 쪽 (왼) 손 삭제 요청에 따라 해당 div 영역 제거 */}

            {/* 3) 커피 머그컵 (시안과 유사한 그라데이션, 받침대 포함된 고급 3D 형태) */}
            <svg
              viewBox="0 0 240 200"
              className="absolute inset-0 w-[150%] h-[150%] left-[-25%] top-[-25%]"
              style={{
                transform: 'translateZ(10px) rotateX(15deg) rotateZ(-5deg)', // 앞으로 살짝 기울어진 3D 시점 추가
                filter: 'drop-shadow(0 20px 20px rgba(0,0,0,0.25))',
              }}
            >
              <defs>
                {/* 컵 몸통 부드러운 라디얼 그라데이션 (차분한 노란색/머스타드 톤) */}
                <radialGradient id="cupBodyGradient" cx="50%" cy="30%" r="70%" fx="30%" fy="30%">
                  <stop offset="0%" stopColor="#FFEEA3" />
                  <stop offset="60%" stopColor="#F5D374" />
                  <stop offset="100%" stopColor="#DAA520" />
                </radialGradient>
                {/* 컵 안쪽 벽 (연한 크림색, 살짝 어둡게 투시) */}
                <radialGradient id="cupInside" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#F4F0EA" />
                  <stop offset="100%" stopColor="#D5CBBB" />
                </radialGradient>
                {/* 받침대(접시) 그라데이션 */}
                <radialGradient id="saucerGradient" cx="50%" cy="50%" r="50%" fx="30%" fy="30%">
                  <stop offset="0%" stopColor="#FFEEA3" />
                  <stop offset="80%" stopColor="#E3BB58" />
                  <stop offset="100%" stopColor="#C99324" />
                </radialGradient>
              </defs>

              <g fill="none" strokeLinecap="round" strokeLinejoin="round">
                {/* 1. 밑받침 접시 (Saucer) */}
                <ellipse cx="120" cy="160" rx="90" ry="25" fill="url(#saucerGradient)" />
                <ellipse cx="120" cy="160" rx="90" ry="25" stroke="#FDEBB0" strokeWidth="3" />

                {/* 1-1. 접시 안쪽 파인 부분 (커피잔 닿는 곳) */}
                <ellipse cx="120" cy="162" rx="50" ry="14" fill="#DAA520" opacity="0.4" />
                <ellipse cx="120" cy="163" rx="40" ry="10" fill="#C99324" opacity="0.6" />

                {/* 2. 컵 손잡이 (오른쪽 둥근 그립) */}
                <path
                  d="M 160 90 Q 220 80 210 120 Q 200 150 150 145"
                  stroke="url(#cupBodyGradient)"
                  strokeWidth="12"
                />
                <path
                  d="M 160 90 Q 220 80 210 120 Q 200 150 150 145"
                  stroke="#F5C6CB"
                  strokeWidth="4"
                  opacity="0.4"
                />

                {/* 3. 머그컵 바깥쪽 둥근 몸통 (통통한 항아리형) */}
                {/* 베지에 곡선으로 하단으로 갈수록 좁아지게 구현 */}
                <path
                  d="M 60 70 Q 60 150 85 155 L 155 155 Q 180 150 180 70 Z"
                  fill="url(#cupBodyGradient)"
                />

                {/* 3-1. 입체 반사광 (하이라이트 곡선) */}
                <path
                  d="M 70 80 Q 70 135 88 140"
                  stroke="white"
                  strokeWidth="4"
                  opacity="0.4"
                  strokeLinecap="round"
                />

                {/* 4. 컵 주둥이 안쪽 공간 (투시) */}
                <ellipse cx="120" cy="70" rx="60" ry="18" fill="url(#cupInside)" />
                {/* 4-1. 커피 수면 (타원, 찰랑거리는 깊이) */}
                <ellipse cx="120" cy="73" rx="48" ry="12" fill="#3B261D" />
                {/* 커피 반사 하이라이트 */}
                <ellipse
                  cx="100"
                  cy="72"
                  rx="10"
                  ry="3"
                  fill="white"
                  opacity="0.2"
                  transform="rotate(-15 100 72)"
                />

                {/* 5. 컵 주둥이 가장자리 제일 도톰한 테두리 (입 닿는 곳) */}
                <ellipse cx="120" cy="70" rx="60" ry="18" stroke="#FFF7D8" strokeWidth="6" />
              </g>
            </svg>

            {/* 4) 컵 조심스럽게 받치고 있는 둥근 손 (맨 밑바닥 중앙 집중) */}
            <div
              className="absolute bg-[#FDF9F1] border-[6px] border-gray-800 rounded-full"
              style={{
                width: '65px', // 더 편안하게 받치도록 약간 확장
                height: '40px', // 높이를 낮춰 접시 밑에 딱 붙은 느낌 강조
                bottom: '-20px', // 컵 최하단부를 완전히 벗어나 완전 하단 접시 아래로 내림
                left: '50%', // 정확한 중앙 기준점
                transform: 'translateX(-50%) translateZ(40px) rotateX(-10deg)', // 접시보다 살짝 앞, 자연스러운 각도
                boxShadow: 'inset -4px -8px 10px rgba(0,0,0,0.15)',
                zIndex: 20,
              }}
            />
          </div>
        </div>
      )}

      {type === 0 && (
        // 디자인 1: 세로로 긴 타원 눈, 알파벳 O 모양 입
        <>
          {renderEyes({ width: '24px', height: '48px' })}
          <div
            className="absolute top-[60%] left-1/2 -translate-x-1/2 border-[8px] border-gray-800 rounded-full transition-all duration-150"
            style={{
              width: `${mouthOpenRadius * 4 + 30}px`,
              height: `${mouthOpenRadius * 6 + 40}px`,
              backgroundColor: mouthOpenRadius > 2 ? '#ffb3ba' : 'transparent',
              transform: 'translateX(-50%) translateZ(35px)',
            }}
          />
        </>
      )}

      {type === 1 && (
        // 디자인 2: 엄청 큰 왕눈이 동그란 눈
        <>
          {renderEyes({ width: '40px', height: '40px' })}
          <div
            className="absolute top-[65%] left-1/2 -translate-x-1/2 bg-gray-800 rounded-full transition-all duration-150"
            style={{
              width: `${mouthOpenRadius > 2 ? 60 : 30}px`,
              height: `${mouthOpenRadius > 2 ? 40 : 10}px`,
              transform: 'translateX(-50%) translateZ(35px)',
            }}
          />
        </>
      )}

      {type === 2 && (
        // 디자인 3: 가로 라인 눈 (감은 눈 혹은 웃는 눈)
        <>
          <div
            className="absolute top-[40%] left-[20%] w-16 h-4 bg-gray-800 rounded-full"
            style={{ transform: 'translateZ(30px)' }}
          />
          <div
            className="absolute top-[40%] right-[20%] w-16 h-4 bg-gray-800 rounded-full"
            style={{ transform: 'translateZ(30px)' }}
          />
          <div
            className="absolute top-[60%] left-1/2 -translate-x-1/2 bg-gray-800 transition-all duration-150 rounded-b-full"
            style={{
              width: '80px',
              height: `${mouthOpenRadius * 4 + 10}px`,
              transform: 'translateX(-50%) translateZ(35px)',
            }}
          />
        </>
      )}

      {type === 3 && (
        // 디자인 4: 사각형 눈
        <>
          {renderEyes({ width: '36px', height: '36px', borderRadius: '8px' })}
          <div
            className="absolute top-[65%] left-1/2 -translate-x-1/2 bg-gray-800 transition-all duration-150"
            style={{
              width: '48px',
              height: `${mouthOpenRadius > 2 ? 32 : 8}px`,
              borderRadius: '8px',
              transform: 'translateX(-50%) translateZ(35px)',
            }}
          />
        </>
      )}

      {type === 4 && (
        // 디자인 5: V 모양 입꼬리 상승
        <>
          {renderEyes({ width: '32px', height: '40px' })}
          <svg
            className="absolute top-[60%] left-1/2 -translate-x-1/2 w-24 h-20 overflow-visible"
            style={{ transform: 'translateX(-50%) translateZ(35px)' }}
          >
            <path
              d={mouthOpenRadius > 2 ? 'M 10 20 Q 48 60 86 20' : 'M 10 20 Q 48 40 86 20'}
              fill="transparent"
              stroke="#1f2937"
              strokeWidth="8"
              strokeLinecap="round"
              className="transition-all duration-150"
            />
          </svg>
        </>
      )}

      {type === 5 && (
        // 디자인 6: 깜찍한 반달 눈
        <>
          <svg
            className="absolute top-[35%] left-[20%] w-16 h-16"
            style={{ transform: 'translateZ(30px)' }}
          >
            <path
              d="M 10 40 Q 30 10 50 40"
              fill="transparent"
              stroke="#1f2937"
              strokeWidth="8"
              strokeLinecap="round"
            />
          </svg>
          <svg
            className="absolute top-[35%] right-[20%] w-16 h-16"
            style={{ transform: 'translateZ(30px)' }}
          >
            <path
              d="M 10 40 Q 30 10 50 40"
              fill="transparent"
              stroke="#1f2937"
              strokeWidth="8"
              strokeLinecap="round"
            />
          </svg>
          <div
            className="absolute top-[60%] left-1/2 -translate-x-1/2 bg-pink-400 rounded-full transition-all duration-150 opacity-80"
            style={{
              width: `${mouthOpenRadius * 4 + 30}px`,
              height: `${mouthOpenRadius * 4 + 30}px`,
              transform: 'translateX(-50%) translateZ(35px)',
            }}
          />
        </>
      )}
    </div>
  );
}
