import { useState } from 'react';
import {
  Plus,
  Home,
  BookOpen,
  Heart,
  Smile,
  MessageSquare,
  RefreshCcw,
  Sparkles,
} from 'lucide-react';
import type { Mode } from '../../../types';

// ─── ModePanel ───
// 역할: 좌측 플로팅 모드 전환 및 상호작용 패널
// - 일반 모드: AI의 모드(일반/학습/상담) 및 표정을 변경합니다.
// - 팔로우 방문 모드: '+' 버튼을 눌러 AI간 대화, 페르소나 설정 등의 메뉴를 엽니다.

interface ModePanelProps {
  currentMode: Mode;
  isVisitorMode: boolean;
  isInteractionModalOpen: boolean;
  isDualAiMode: boolean;
  onToggleInteraction: () => void;
  onModeChange: (mode: Mode) => void;
  onChangeFace: () => void;
  onStartDualAi: () => void;
  onStopDualAi: () => void;
}

export default function ModePanel({
  currentMode,
  isVisitorMode,
  isInteractionModalOpen,
  isDualAiMode,
  onToggleInteraction,
  onModeChange,
  onChangeFace,
  onStartDualAi,
  onStopDualAi,
}: ModePanelProps) {
  const [showModePanel, setShowModePanel] = useState(false);

  const modes: { id: Mode; icon: React.ReactNode; color: string; glow: string }[] = [
    {
      id: 'normal',
      icon: <Home className="w-7 h-7 text-white" />,
      color: 'from-teal-200/60 to-cyan-100/40',
      glow: 'bg-teal-200/50',
    },
    {
      id: 'study',
      icon: <BookOpen className="w-7 h-7 text-white" />,
      color: 'from-pink-200/60 to-rose-100/40',
      glow: 'bg-pink-200/50',
    },
    {
      id: 'counseling',
      icon: <Heart className="w-7 h-7 text-white" />,
      color: 'from-indigo-200/60 to-blue-100/40',
      glow: 'bg-indigo-300/50',
    },
    {
      id: 'persona',
      icon: <Sparkles className="w-7 h-7 text-white" />,
      color: 'from-amber-200/60 to-yellow-100/40',
      glow: 'bg-yellow-200/50',
    },
  ];

  const enterModePanel = () => setShowModePanel(true);
  const leaveModePanel = () => setShowModePanel(false);

  return (
    <div
      className="absolute left-6 top-1/2 -translate-y-1/2 z-50 text-center flex flex-col items-center gap-2"
      onMouseEnter={enterModePanel}
      onMouseLeave={leaveModePanel}
    >
      {/* 트리거 버튼 */}
      <div
        onClick={() => isVisitorMode && onToggleInteraction()}
        className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md border border-white/40 shadow-lg flex flex-col items-center justify-center gap-1 hover:bg-white/30 transition-all duration-300 cursor-pointer"
      >
        {isVisitorMode ? (
          <>
            <Plus className="w-7 h-7 text-pink-500" />
            <span className="text-[8px] font-semibold text-white/80 leading-none">모드선택</span>
          </>
        ) : (
          <>
            {modes.find((m) => m.id === currentMode)?.icon}
            <span className="text-[8px] font-semibold text-white/80 leading-none">
              {currentMode === 'normal'
                ? '일반'
                : currentMode === 'study'
                  ? '학습'
                  : currentMode === 'counseling'
                    ? '상담'
                    : '페르소나'}
            </span>
          </>
        )}
      </div>

      {/* 1) 일반 모드 전용: 모드 선택 팝업 (내 집에만 표시) */}
      {!isVisitorMode && (
        <div
          className={`
            absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2
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
          {/* 브릿지 레이어: 버튼과 메뉴 사이의 빈 공간을 채워 호버 유지 */}
          <div className="absolute -left-4 top-0 w-4 h-full pointer-events-auto cursor-default" />
          {modes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => {
                onModeChange(mode.id);
                setShowModePanel(false);
              }}
              title={`${mode.id === 'persona' ? '페르소나 모드' : mode.id}`}
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
            onClick={onChangeFace}
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
        <div className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 flex flex-col items-center gap-4 p-4 rounded-[50px] bg-white/10 backdrop-blur-xl border border-white/40 shadow-2xl animate-in fade-in slide-in-from-left-4 duration-300">
          <div className="absolute -left-4 top-0 w-4 h-full pointer-events-auto cursor-default" />

          {/* 방문 모드에서 친구 페르소나를 체험하는 토글 버튼 */}
          <button
            onClick={() => onModeChange(currentMode === 'persona' ? 'normal' : 'persona')}
            className={`relative w-14 h-14 rounded-full flex items-center justify-center bg-gradient-to-br from-amber-200/60 to-yellow-100/40 border-2 transition-all duration-300 shadow-lg ${
              currentMode === 'persona'
                ? 'border-white/80 scale-105'
                : 'border-white/20 hover:border-white/50 hover:scale-105'
            }`}
            title={currentMode === 'persona' ? '일반 모드로 돌아가기' : '친구 페르소나 모드 체험'}
          >
            {currentMode === 'persona' && (
              <div className="absolute inset-0 rounded-full bg-yellow-200/50 blur-md -z-10" />
            )}
            <Sparkles className="w-7 h-7 text-white" />
          </button>

          <button
            onClick={onStartDualAi}
            className="w-14 h-14 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-400/60 to-indigo-300/40 border-2 border-white/20 hover:border-white/60 hover:scale-110 transition-all shadow-lg group"
            title="AI 끼리 대화"
          >
            <MessageSquare className="w-7 h-7 text-white" />
          </button>

          {isDualAiMode && (
            <>
              <div className="w-8 h-px bg-white/30 my-1 font-semibold" />
              <button
                onClick={onStopDualAi}
                className="w-14 h-14 rounded-full flex items-center justify-center bg-white/20 border-2 border-white/20 hover:border-white/60 hover:bg-white/40 hover:scale-110 transition-all shadow-lg"
                title="상대 AI만 보기"
              >
                <RefreshCcw className="w-7 h-7 text-white" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
