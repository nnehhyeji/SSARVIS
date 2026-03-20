import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MessageCircle, Mic, MicOff } from 'lucide-react';
import { motion } from 'framer-motion';

// Hooks
import { useAICharacter } from '../../hooks/useAICharacter';
import { useChat } from '../../hooks/useChat';
import { useFollow } from '../../hooks/useFollow';

// Components
import AnimatedBackground from '../../components/AnimatedBackground';
import Header from '../../components/common/Header';
import SpeechBubble from '../../components/common/SpeechBubble';
import CharacterScene from '../../components/features/character/CharacterScene';
import ChatWindow from '../../components/features/chat/ChatWindow';
import FollowSidebar from '../../components/features/follow/FollowSidebar';
import ModePanel from '../../components/features/assistant/ModePanel';
import PersonaModal from '../../components/features/follow/PersonaModal';

// Constants & Types
import { PATHS } from '../../routes/paths';
import type { Follow } from '../../types';

export default function VisitPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const targetId = Number(userId);

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

  // 방문 페이지에서는 시크릿 모드(isLockMode)를 사용하지 않으므로 제거
  const { chatInput, chatMessages, setChatInput, sendMessage } = useChat();

  const {
    follows,
    followRequests,
    isVisitorMode,
    visitedFollowName,
    visitedUserId,
    isDualAiMode,
    isInteractionModalOpen,
    visitorBg,
    visitorVisibility,
    setIsDualAiMode,
    setIsInteractionModalOpen,
    visitFollow,
    leaveFollow,
    deleteFollow,
    requestFollow,
    acceptRequest,
    rejectRequest,
    searchAllUsers,
  } = useFollow();

  // --- Callbacks for Stability ---
  const handleStartSpeaking = useCallback(() => setIsSpeaking(true), [setIsSpeaking]);
  const handleEndSpeaking = useCallback(() => setIsSpeaking(false), [setIsSpeaking]);
  const handleStartMyAiSpeaking = useCallback(() => setIsMyAiSpeaking(true), [setIsMyAiSpeaking]);
  const handleEndMyAiSpeaking = useCallback(() => setIsMyAiSpeaking(false), [setIsMyAiSpeaking]);

  // --- Local States ---
  const [isAlarmModalOpen, setIsAlarmModalOpen] = useState(false);
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
  const [isChatHistoryOpen, setIsChatHistoryOpen] = useState(false);
  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);
  const [sidebarView, setSidebarView] = useState<'followers' | 'following' | 'requests'>(
    'following',
  );
  const [searchResults, setSearchResults] = useState<Follow[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- API / Logic ---
  useEffect(() => {
    if (targetId) {
      const welcome = visitFollow(targetId, true);
      if (welcome) setTriggerText(welcome);
    }
  }, [targetId, visitFollow, setTriggerText]);

  const handleBackToHome = useCallback(() => {
    leaveFollow();
    navigate(PATHS.HOME);
  }, [leaveFollow, navigate]);

  const viewCount = useMemo(() => {
    const user = follows.find((f) => f.id === targetId);
    return user?.view_count ?? 0;
  }, [targetId, follows]);

  // 방문 페이지에서는 내 시크릿 모드 상태와 상관없이 항상 상대방 배경(visitorBg)만 표시
  const backgroundProps = useMemo(() => {
    return visitorBg;
  }, [visitorBg]);

  const handleSearch = useCallback(
    async (query: string) => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      setIsSearchLoading(true);
      searchTimeoutRef.current = setTimeout(async () => {
        const results = await searchAllUsers(query);
        setSearchResults(results);
        setIsSearchLoading(false);
      }, 500);
    },
    [searchAllUsers],
  );

  if (!isVisitorMode || !visitedFollowName) {
    return (
      <div className="flex w-full h-screen items-center justify-center bg-gray-100">
        <p className="text-gray-500 font-bold">사용자 정보를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col justify-between">
      <AnimatedBackground {...backgroundProps} />

      <Header
        alarms={[]}
        isAlarmModalOpen={isAlarmModalOpen}
        onToggleAlarm={() => setIsAlarmModalOpen(!isAlarmModalOpen)}
        onReadAllAlarms={() => {}}
        onDeleteAllAlarms={() => {}}
        onAlarmClick={() => {}}
        onMyCardClick={() => {}}
        isVisitorMode={true}
        onLeaveVisitor={handleBackToHome}
        viewCount={viewCount}
        onUsersClick={() => setIsUsersModalOpen(true)}
      />

      <main className="flex-1 flex items-center justify-center relative w-full h-full z-10">
        <motion.div
          className="relative flex flex-col items-center justify-center"
          animate={{
            y: isMicOn ? 0 : -220,
            scale: isMicOn ? 1 : 0.75,
          }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        >
          {/* 마이크 버튼 (방문 페이지에서는 잠금 모드 제외) */}
          <div className="absolute left-[-140px] top-1/2 -translate-y-1/2 z-40">
            <button
              onClick={toggleMic}
              className={`p-4 rounded-full backdrop-blur-md shadow-lg border transition-all duration-300 ${isMicOn ? 'bg-white/10 border-white/30 hover:bg-white/20' : 'bg-red-500/10 border-red-500/30'}`}
            >
              <div className="flex items-center justify-center">
                {isMicOn ? (
                  <Mic className="w-8 h-8 text-green-400 fill-green-400/20" />
                ) : (
                  <MicOff className="w-8 h-8 text-red-400" />
                )}
              </div>
            </button>
          </div>

          <div className="flex items-center justify-center gap-20">
            {isDualAiMode && (
              <div className="w-[300px] h-[300px] relative z-20 flex flex-col items-center justify-center animate-in slide-in-from-left-20 fade-in duration-700">
                <div className="absolute top-[-40px] px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-200 text-[10px] font-bold tracking-wider uppercase backdrop-blur-md">
                  My AI
                </div>
                <CharacterScene
                  faceType={faceType}
                  mouthOpenRadius={myMouthOpenRadius}
                  mode={'normal'}
                  isLockMode={false}
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
              <div
                className={`absolute top-[-40px] px-3 py-1 rounded-full border text-[10px] font-bold tracking-wider uppercase backdrop-blur-md transition-all duration-500 ${visitorVisibility === 'private' ? 'bg-pink-500/20 border-pink-500/40 text-pink-200' : 'bg-gray-500/20 border-gray-500/40 text-gray-300'}`}
              >
                {visitorVisibility} Access
              </div>
              <CharacterScene
                faceType={(faceType + 2) % 6}
                mouthOpenRadius={mouthOpenRadius}
                mode={'normal'}
                isLockMode={false}
                isSpeaking={isSpeaking}
                isMicOn={isMicOn}
                label={`${visitedFollowName}님의 AI`}
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
          onSend={() => sendMessage(chatInput, true, visitedFollowName || '')}
          onClose={() => setIsChatHistoryOpen(false)}
        />

        <button
          onClick={() => setIsChatHistoryOpen(!isChatHistoryOpen)}
          className={`absolute bottom-8 right-8 p-4 rounded-2xl backdrop-blur-xl border shadow-2xl transition-all duration-300 z-40 group ${isChatHistoryOpen ? 'opacity-0' : 'bg-white/20 hover:scale-110'}`}
        >
          <MessageCircle className="w-8 h-8 text-white" />
        </button>
      </main>

      <ModePanel
        currentMode={'normal'}
        isVisitorMode={true}
        isInteractionModalOpen={isInteractionModalOpen}
        isDualAiMode={isDualAiMode}
        onToggleInteraction={() => setIsInteractionModalOpen(!isInteractionModalOpen)}
        onModeChange={() => {}}
        onChangeFace={changeFace}
        onStartDualAi={() => {
          setIsDualAiMode(true);
          setIsInteractionModalOpen(false);
          setMyTriggerText('나 : 우와, 네 방 정말 멋지다!');
          setTimeout(() => setTriggerText(`${visitedFollowName} : 고마워! 놀러와줘서 기뻐.`), 3000);
        }}
        onPersonaClick={() => setIsPersonaModalOpen(true)}
        onStopDualAi={() => setIsDualAiMode(false)}
      />

      <FollowSidebar
        isOpen={isUsersModalOpen}
        view={sidebarView}
        onViewChange={setSidebarView}
        follows={follows}
        requests={followRequests}
        searchResults={searchResults}
        isSearchLoading={isSearchLoading}
        onSearch={handleSearch}
        visitedId={visitedUserId}
        isVisitorMode={true}
        onVisit={(id) => {
          if (typeof id === 'number') navigate(PATHS.VISIT(id));
          setIsUsersModalOpen(false);
        }}
        onDelete={deleteFollow}
        onRequest={requestFollow}
        onAccept={acceptRequest}
        onReject={rejectRequest}
        onClose={() => {
          setIsUsersModalOpen(false);
          setSidebarView('following');
        }}
        onToggle={() => {
          if (isUsersModalOpen) setSidebarView('following');
          setIsUsersModalOpen(!isUsersModalOpen);
        }}
      />

      <PersonaModal
        isOpen={isPersonaModalOpen}
        onClose={() => setIsPersonaModalOpen(false)}
        followName={visitedFollowName || ''}
      />
    </div>
  );
}
