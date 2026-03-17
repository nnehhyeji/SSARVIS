import { useState, useEffect, useCallback, useMemo } from 'react';
import { MessageCircle } from 'lucide-react';

import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

// Hooks
import { useAICharacter } from '../hooks/useAICharacter';
import { useChat } from '../hooks/useChat';
import { useFollow } from '../hooks/useFollow';

// Components
import AnimatedBackground from '../components/AnimatedBackground';
import Header from '../components/common/Header';
import SpeechBubble from '../components/common/SpeechBubble';
import CharacterScene from '../components/features/character/CharacterScene';
import ChatWindow from '../components/features/chat/ChatWindow';
import FollowSidebar from '../components/features/follow/FollowSidebar';
import MyCardModal from '../components/features/follow/MyCardModal';
import ModePanel from '../components/features/assistant/ModePanel';

// Constants & Types
import { BG_COLORS, LOCK_MODE_PALETTE } from '../constants/theme';
import type { Alarm, Mode } from '../types';

export default function MainPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // --- Custom Hooks ---
  const {
    isMicOn,
    isSpeaking,
    mouthOpenRadius,
    triggerText,
    faceType,
    isMyAiSpeaking,
    myMouthOpenRadius,
    myTriggerText,
    toggleMic,
    changeFace,
    setTriggerText,
    setMyTriggerText,
    setIsSpeaking,
    setIsMyAiSpeaking,
  } = useAICharacter();

  const { chatInput, chatMessages, isLockMode, setChatInput, toggleLock, sendMessage } = useChat();

  const {
    follows,
    followRequests,
    isVisitorMode,
    visitedFollowName,
    isDualAiMode,
    isInteractionModalOpen,
    visitorBg,
    setIsDualAiMode,
    setIsInteractionModalOpen,
    visitFollow,
    leaveFollow,
    deleteFollow,
    acceptRequest,
    rejectRequest,
  } = useFollow();

  // --- Callbacks for Stability ---
  const handleStartSpeaking = useCallback(() => setIsSpeaking(true), [setIsSpeaking]);
  const handleEndSpeaking = useCallback(() => setIsSpeaking(false), [setIsSpeaking]);
  const handleStartMyAiSpeaking = useCallback(() => setIsMyAiSpeaking(true), [setIsMyAiSpeaking]);
  const handleEndMyAiSpeaking = useCallback(() => setIsMyAiSpeaking(false), [setIsMyAiSpeaking]);

  // --- Local States ---
  const [currentMode, setCurrentMode] = useState<Mode>('normal');
  const [isAlarmModalOpen, setIsAlarmModalOpen] = useState(false);
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
  const [isMyCardModalOpen, setIsMyCardModalOpen] = useState(false);
  const [my_view_count] = useState(1234); // 나의 실제 방문 횟수 (추후 API 연동)
  const [isChatHistoryOpen, setIsChatHistoryOpen] = useState(false);

  // 알림 데이터 (원본 MainPage.tsx 유지)
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

  // --- Page Logic ---
  const handleVisit = useCallback(
    (name: string, isReturn: boolean = false) => {
      const welcomeMsg = visitFollow(name, isReturn);
      setTriggerText(welcomeMsg);
      setMyTriggerText('');
      setIsUsersModalOpen(false);
    },
    [visitFollow, setTriggerText, setMyTriggerText],
  );

  const handleLeaveVisitor = useCallback(() => {
    const defaultMsg = leaveFollow();
    setTriggerText(defaultMsg);
    setMyTriggerText('');
  }, [leaveFollow, setTriggerText, setMyTriggerText]);

  const handleAlarmClick = useCallback((alarm: Alarm) => {
    setAlarms((prev) => prev.map((a) => (a.id === alarm.id ? { ...a, isRead: true } : a)));
    if (alarm.type === 'follow') {
      setIsAlarmModalOpen(false);
      setIsUsersModalOpen(true);
    }
  }, []);

  useEffect(() => {
    if (location.state?.fromPersona && location.state?.followName) {
      const { followName } = location.state;
      requestAnimationFrame(() => {
        handleVisit(followName, true);
        window.history.replaceState({}, document.title);
      });
    }
  }, [location.state, handleVisit]);

  const backgroundProps = useMemo(() => {
    if (isLockMode) return LOCK_MODE_PALETTE;
    if (isVisitorMode) return visitorBg;
    return BG_COLORS[currentMode] || {};
  }, [isLockMode, isVisitorMode, visitorBg, currentMode]);

  // --- Dynamic View Count Logic ---
  const displayViewCount = useMemo(() => {
    if (isVisitorMode && visitedFollowName) {
      const follow = follows.find((f) => f.name === visitedFollowName);
      return follow?.view_count ?? 0;
    }
    return my_view_count;
  }, [isVisitorMode, visitedFollowName, follows, my_view_count]);

  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col justify-between">
      <AnimatedBackground {...backgroundProps} />

      {/* 잠금 모드 스포트라이트 효과 */}
      <AnimatePresence>
        {isLockMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
          >
            <div className="absolute inset-0 bg-black/40" />
            <motion.div
              animate={{ y: isMicOn ? 0 : -220, scale: isMicOn ? 1 : 0.8 }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 translate-y-[100px] w-[500px] h-[150px] opacity-60"
              style={{
                background:
                  'radial-gradient(ellipse at center, rgba(255,255,255,0.4) 0%, transparent 70%)',
                filter: 'blur(20px)',
              }}
            />
            <motion.div
              animate={{ y: isMicOn ? 0 : -220 }}
              className="absolute left-1/2 top-0 w-[800px] h-[120vh] origin-top -translate-x-1/2"
              style={{
                background:
                  'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 50%, transparent 90%)',
                clipPath: 'polygon(45% 0, 55% 0, 100% 100%, 0% 100%)',
                filter: 'blur(30px)',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <Header
        alarms={alarms}
        isAlarmModalOpen={isAlarmModalOpen}
        onToggleAlarm={() => setIsAlarmModalOpen(!isAlarmModalOpen)}
        onReadAllAlarms={() => setAlarms((prev) => prev.map((a) => ({ ...a, isRead: true })))}
        onDeleteAllAlarms={() => setAlarms([])}
        onAlarmClick={handleAlarmClick}
        onMyCardClick={() => setIsMyCardModalOpen(true)}
        isVisitorMode={isVisitorMode}
        onLeaveVisitor={handleLeaveVisitor}
        viewCount={displayViewCount} // 모드에 따라 동적으로 변경
        onUsersClick={() => setIsUsersModalOpen(true)}
      />

      <main className="flex-1 flex items-center justify-center relative w-full h-full">
        {/* 중앙 캐릭터 컨테이너 */}
        <motion.div
          className="relative flex flex-col items-center justify-center"
          animate={{
            y: isMicOn ? 0 : -220,
            scale: isMicOn ? 1 : 0.75,
          }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        >
          {/* 제어 버튼 영역 */}
          <div className="absolute left-[-100px] top-1/2 -translate-y-1/2 z-40">
            <button
              onClick={toggleMic}
              className={`p-4 rounded-full backdrop-blur-md shadow-lg border transition-all duration-300 ${isMicOn ? 'bg-white/30 border-white/50 hover:bg-white/40' : 'bg-red-500/20 border-red-500/40 hover:bg-red-500/30'}`}
              title={isMicOn ? '마이크 끄기' : '마이크 켜기'}
            >
              {isMicOn ? (
                <motion.svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#16a34a"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" x2="12" y1="19" y2="22" />
                </motion.svg>
              ) : (
                <motion.svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="1" x2="23" y1="1" y2="23" />
                  <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6" />
                  <path d="M17 16.95A7 7 0 0 1 5 12v-2" />
                  <line x1="12" x2="12" y1="19" y2="22" />
                </motion.svg>
              )}
            </button>
          </div>

          {!isVisitorMode && (
            <div className="absolute right-[-100px] top-1/2 -translate-y-1/2 z-40">
              <button
                onClick={toggleLock}
                className={`p-4 rounded-full backdrop-blur-md shadow-lg border transition-all duration-300 ${isLockMode ? 'bg-yellow-500/20 border-yellow-500/40 hover:bg-yellow-500/30' : 'bg-white/30 border-white/50 hover:bg-white/40'}`}
                title={isLockMode ? '잠금 해제' : '시크릿 모드'}
              >
                {isLockMode ? (
                  <motion.svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#ca8a04"
                    strokeWidth="2.5"
                  >
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </motion.svg>
                ) : (
                  <motion.svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#374151"
                    strokeWidth="2.5"
                  >
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </motion.svg>
                )}
              </button>
            </div>
          )}

          <div className="flex items-center justify-center gap-20">
            {isDualAiMode && (
              <div className="w-[300px] h-[300px] relative z-20 flex flex-col items-center justify-center animate-in slide-in-from-left-20 fade-in duration-700">
                <CharacterScene
                  faceType={faceType}
                  mouthOpenRadius={myMouthOpenRadius}
                  mode={currentMode}
                  isLockMode={isLockMode}
                  isSpeaking={isMyAiSpeaking}
                  isMicOn={isMicOn}
                  label="나의 AI"
                />
                <SpeechBubble
                  triggerText={myTriggerText}
                  onStart={handleStartMyAiSpeaking}
                  onEnd={handleEndMyAiSpeaking}
                />
              </div>
            )}

            <div
              className={`relative z-10 flex flex-col items-center justify-center transition-all duration-700 ease-in-out ${isDualAiMode ? 'w-[300px] h-[300px]' : 'w-[350px] h-[350px]'}`}
            >
              <CharacterScene
                faceType={isVisitorMode ? (faceType + 2) % 6 : faceType}
                mouthOpenRadius={mouthOpenRadius}
                mode={isVisitorMode ? 'normal' : currentMode}
                isLockMode={isLockMode}
                isSpeaking={isSpeaking}
                isMicOn={isMicOn}
                label={
                  isVisitorMode
                    ? `${visitedFollowName}님의 AI`
                    : isDualAiMode
                      ? '상대 AI'
                      : undefined
                }
              />
              {isMicOn && (
                <SpeechBubble
                  triggerText={triggerText}
                  onStart={handleStartSpeaking}
                  onEnd={handleEndSpeaking}
                />
              )}
            </div>
          </div>
        </motion.div>

        <ChatWindow
          isVisible={!isMicOn || isChatHistoryOpen}
          messages={chatMessages}
          input={chatInput}
          onInputChange={setChatInput}
          onSend={() => sendMessage(chatInput, isVisitorMode, visitedFollowName || '')}
          onClose={() => setIsChatHistoryOpen(false)}
        />

        {/* 채팅 내역 토글 버튼 (우하단) */}
        <button
          onClick={() => setIsChatHistoryOpen(!isChatHistoryOpen)}
          className={`absolute bottom-8 right-8 p-4 rounded-2xl backdrop-blur-xl border shadow-2xl transition-all duration-300 z-40 group ${
            isChatHistoryOpen
              ? 'bg-pink-400 border-pink-300 text-white scale-90 opacity-0 pointer-events-none'
              : 'bg-white/20 border-white/40 text-white hover:bg-white/30 hover:scale-110'
          }`}
          title="대화 내역 보기"
        >
          <div className="relative">
            <MessageCircle className="w-8 h-8" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-pink-500 rounded-full border-2 border-white animate-bounce" />
          </div>
        </button>
      </main>

      <ModePanel
        currentMode={currentMode}
        isVisitorMode={isVisitorMode}
        isInteractionModalOpen={isInteractionModalOpen}
        isDualAiMode={isDualAiMode}
        onToggleInteraction={() => setIsInteractionModalOpen(!isInteractionModalOpen)}
        onModeChange={(m) => setCurrentMode(m)}
        onChangeFace={changeFace}
        onStartDualAi={() => {
          setIsDualAiMode(true);
          setIsInteractionModalOpen(false);
          setMyTriggerText('나 : 우와, 네 방 정말 멋지다!');
          setTimeout(() => setTriggerText(`${visitedFollowName} : 고마워! 놀러와줘서 기뻐.`), 3000);
        }}
        onPersonaClick={() => {
          if (visitedFollowName) navigate(`/persona/${visitedFollowName}`);
        }}
        onStopDualAi={() => setIsDualAiMode(false)}
      />

      <FollowSidebar
        isOpen={isUsersModalOpen}
        follows={follows}
        requests={followRequests}
        visitedName={visitedFollowName}
        isVisitorMode={isVisitorMode}
        onVisit={handleVisit}
        onDelete={deleteFollow}
        onAccept={acceptRequest}
        onReject={rejectRequest}
        onClose={() => setIsUsersModalOpen(false)}
        onToggle={() => setIsUsersModalOpen(!isUsersModalOpen)}
      />

      <MyCardModal isOpen={isMyCardModalOpen} onClose={() => setIsMyCardModalOpen(false)} />
    </div>
  );
}
