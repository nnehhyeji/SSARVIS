import { useState, useCallback, useMemo, useEffect } from 'react';
import { MessageCircle, Mic, MicOff, Lock, Unlock, Sparkles } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';

// Hooks
import { useAICharacter } from '../../hooks/useAICharacter';
import { useChat } from '../../hooks/useChat';
import { useGuestChat } from '../../hooks/useGuestChat';
import { useFollow } from '../../hooks/useFollow';
import { useUserStore } from '../../store/useUserStore';

// Components
import SpeechBubble from '../../components/common/SpeechBubble';
import CharacterScene from '../../components/features/character/CharacterScene';
import ChatWindow from '../../components/features/chat/ChatWindow';
import MyCardModal from '../../components/features/follow/MyCardModal';
import SharePersonaModal from '../../components/features/follow/SharePersonaModal';
import ModePanel from '../../components/features/assistant/ModePanel';
import PersonaModal from '../../components/features/follow/PersonaModal';

// Constants & Types
import { PATHS } from '../../routes/paths';
import userApi from '../../apis/userApi';

export default function UserMainPage() {
  const { userId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { userInfo, isLoggedIn, currentMode, setCurrentMode } = useUserStore();

  // --- Determine Home Owner ---
  const currentUserId = userInfo?.id ?? null;
  const targetId = userId ? Number(userId) : currentUserId;
  const isMyHome = !userId || Number(userId) === currentUserId;

  // --- Search Parameters for Visitor Mode ---
  const isPersonaShared = searchParams.get('mode') === 'persona';
  const hasPersonaAnswers = searchParams.get('empty') !== 'true';

  // --- Custom Hooks ---
  const {
    isMicOn,
    mouthOpenRadius,
    faceType,
    toggleMic,
    changeFace,
    isSpeaking,
    setIsSpeaking,
    isMyAiSpeaking,
    setIsMyAiSpeaking,
    myMouthOpenRadius,
    myTriggerText,
    triggerText,
    setTriggerText,
    setMyTriggerText,
  } = useAICharacter();

  const {
    chatInput,
    chatMessages,
    isLockMode,
    sttText,
    isAiSpeaking,
    isAwaitingResponse,
    setChatInput,
    toggleLock,
    sendMessage,
    startRecording,
    stopRecordingAndSendSTT,
  } = useChat();
  const guestChat = useGuestChat({ enabled: !isLoggedIn && !isMyHome, targetUserId: targetId });

  const activeChat = !isLoggedIn && !isMyHome
    ? guestChat
    : {
        chatInput,
        chatMessages,
        isLockMode,
        sttText,
        isAiSpeaking,
        isAwaitingResponse,
        setChatInput,
        toggleLock,
        sendMessage,
        startRecording,
        stopRecordingAndSendSTT,
      };

  const {
    follows,
    isVisitorMode,
    visitedFollowName,
    isDualAiMode,
    isInteractionModalOpen,
    visitorVisibility,
    setIsDualAiMode,
    setIsInteractionModalOpen,
    visitFollow,
    leaveFollow,
  } = useFollow();

  // --- Local States ---
  const [isMyCardModalOpen, setIsMyCardModalOpen] = useState(false);
  const [isSharePersonaOpen, setIsSharePersonaOpen] = useState(false);
  const [isChatHistoryOpen, setIsChatHistoryOpen] = useState(!isMicOn);
  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);
  const [roomViewCount, setRoomViewCount] = useState(0);

  // --- Lifecycle: Room Initialization ---
  useEffect(() => {
    if (isPersonaShared) {
      setCurrentMode('persona');
    }
  }, [isPersonaShared, setCurrentMode]);

  useEffect(() => {
    let isMounted = true;
    if (!targetId) return;

    const initRoom = async () => {
      // 1. Visit Logic for Target User
      if (!isMyHome && isLoggedIn) {
        const welcome = visitFollow(targetId, true);
        if (welcome) setTriggerText(welcome);
      }

      // 2. Load View Count
      try {
        if (isMyHome) {
          const profile = await userApi.getUserProfile();
          if (isMounted) setRoomViewCount(profile.viewCount ?? 0);
        } else {
          const user = follows.find((f) => f.id === targetId);
          if (isMounted) setRoomViewCount(user?.view_count ?? 0);
        }
      } catch (error) {
        console.warn('방문 수 조회 실패:', error);
      }
    };

    void initRoom();
    return () => {
      isMounted = false;
      if (!isMyHome) leaveFollow();
    };
  }, [targetId, isMyHome, isLoggedIn, visitFollow, leaveFollow, follows, setTriggerText]);

  // AI 발화 말풍선용 데이터 추출
  const lastAiMessage = useMemo(() => {
    return activeChat.chatMessages.slice().reverse().find((m) => m.sender === 'ai')?.text || '';
  }, [activeChat.chatMessages]);

  const finalIsSpeaking = activeChat.isAiSpeaking || isSpeaking;
  const ownerName = isMyHome ? (userInfo?.nickname || '나') : (visitedFollowName || '친구');
  const showEmptyPersonaMessage = !isMyHome && !hasPersonaAnswers && currentMode === 'persona';

  // --- Render Helpers ---
  const handleStartSpeaking = useCallback(() => setIsSpeaking(true), [setIsSpeaking]);
  const handleEndSpeaking = useCallback(() => setIsSpeaking(false), [setIsSpeaking]);
  const handleStartMyAiSpeaking = useCallback(() => setIsMyAiSpeaking(true), [setIsMyAiSpeaking]);
  const handleEndMyAiSpeaking = useCallback(() => setIsMyAiSpeaking(false), [setIsMyAiSpeaking]);

  // 립싱크 타이머 시뮬레이션 (수동 발화용)
  useEffect(() => {
    if (myTriggerText) {
      handleStartMyAiSpeaking();
      const t = setTimeout(handleEndMyAiSpeaking, myTriggerText.length * 100 + 500);
      return () => clearTimeout(t);
    }
  }, [myTriggerText, handleStartMyAiSpeaking, handleEndMyAiSpeaking]);

  useEffect(() => {
    if (triggerText) {
      handleStartSpeaking();
      const t = setTimeout(handleEndSpeaking, triggerText.length * 100 + 500);
      return () => clearTimeout(t);
    }
  }, [triggerText, handleStartSpeaking, handleEndSpeaking]);

  // Sync: Default behavior when mic state changes
  useEffect(() => {
    setIsChatHistoryOpen(!isMicOn);
  }, [isMicOn]);

  // 방 로딩 체크 (방문 모드일 때만 적용)
  if (!isMyHome && isLoggedIn && (!isVisitorMode || !visitedFollowName)) {
    return (
      <div className="flex w-full h-full items-center justify-center bg-[#FDFCFB]">
        <p className="text-gray-500 font-bold">방 정보를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full overflow-hidden flex flex-col justify-between transition-colors duration-500 ${activeChat.isLockMode ? 'bg-black' : 'bg-white'}`}>
      
      {/* 상단 룸 정보 (방문 시 노출) */}
      {!isMyHome && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2">
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">{ownerName}님의 공간</h2>
          <div className="px-4 py-1.5 bg-gray-100 rounded-full text-xs font-bold text-gray-500 shadow-sm">
            오늘 방문자 {roomViewCount}
          </div>
        </div>
      )}

      {/* 우상단 페르소나 문답 아이콘 (방문 시) */}
      {!isMyHome && (
        <button
          onClick={() => navigate(PATHS.PERSONA(targetId!))}
          className="absolute top-8 right-8 p-4 bg-gradient-to-br from-pink-400/80 to-rose-300/80 hover:scale-105 rounded-2xl shadow-xl text-white flex flex-col items-center gap-1 z-50 transition-all border border-white/20 group"
        >
          <Sparkles className="w-6 h-6 group-hover:animate-pulse" />
          <span className="text-[10px] font-black leading-none">문답작성</span>
        </button>
      )}

      <main className="flex-1 flex items-center justify-center relative w-full h-full z-10">
        <motion.div
          className="relative flex flex-col items-center justify-center"
          animate={{
            y: isMicOn ? 0 : -220,
            scale: isMicOn ? 1 : 0.75,
          }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        >
          {/* 마이크 및 잠금 버튼 */}
          {!showEmptyPersonaMessage && (
            <div className="absolute left-[-140px] top-1/2 -translate-y-1/2 z-40">
              <button
                onClick={() => {
                  toggleMic();
                  if (!isMicOn) {
                    const assistantType = isMyHome ? (currentMode === 'counseling' ? 'COUNSEL' : currentMode === 'normal' ? 'DAILY' : currentMode.toUpperCase()) : (isPersonaShared ? 'PERSONA' : 'DAILY');
                    const memoryPolicy = isMyHome && activeChat.isLockMode ? 'SECRET' : 'GENERAL';
                    const category = isMyHome ? 'USER_AI' : 'AVATAR_AI';
                    activeChat.startRecording(null, assistantType, memoryPolicy, category, targetId);
                  } else {
                    activeChat.stopRecordingAndSendSTT();
                  }
                }}
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
          )}

          {isMyHome && (
            <div className="absolute right-[-140px] top-1/2 -translate-y-1/2 z-40">
              <button
                onClick={activeChat.toggleLock}
                className={`p-4 rounded-full backdrop-blur-md shadow-lg border transition-all duration-300 ${activeChat.isLockMode ? 'bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20' : 'bg-white/10 border-white/30 hover:bg-white/20'}`}
              >
                <div className="flex items-center justify-center">
                  {activeChat.isLockMode ? <Lock className="w-8 h-8 text-yellow-400 fill-yellow-400/20" /> : <Unlock className="w-8 h-8 text-gray-300" />}
                </div>
              </button>
            </div>
          )}

          <div className="flex items-center justify-center gap-20">
            {/* 듀얼 모드일 시 내 AI 노출 */}
            {!isMyHome && isDualAiMode && (
              <div className="w-[300px] h-[300px] relative z-20 flex flex-col items-center justify-center animate-in slide-in-from-left-2fade-in duration-700">
                <div className="absolute top-[-40px] px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-200 text-[10px] font-bold tracking-wider uppercase backdrop-blur-md">
                  My AI
                </div>
                <CharacterScene
                  faceType={faceType}
                  mouthOpenRadius={myMouthOpenRadius}
                  mode={currentMode}
                  isLockMode={false}
                  isSpeaking={isMyAiSpeaking}
                  isMicOn={isMicOn}
                  label="나의 AI"
                />
                <SpeechBubble text={myTriggerText} />
              </div>
            )}

            <div
              className={`relative z-10 flex flex-col items-center justify-center transition-all duration-700 ease-in-out ${isDualAiMode ? 'w-[300px] h-[300px]' : 'w-[450px] h-[450px]'}`}
            >
              {showEmptyPersonaMessage ? (
                <div className="flex flex-col items-center justify-center bg-white border border-gray-100 shadow-2xl rounded-[3rem] p-8 text-center gap-5 absolute z-50 w-full h-full">
                  <div className="p-4 bg-yellow-100/90 rounded-full shadow-inner mb-2">
                    <Sparkles className="w-10 h-10 text-yellow-500" />
                  </div>
                  <h3 className="text-2xl font-black text-gray-800 tracking-tight">
                    아직 페르소나 AI가 없어요!
                  </h3>
                  <p className="text-gray-600 font-bold leading-relaxed mb-2">
                    {ownerName}님의 페르소나를 키우기 위해
                    <br />
                    아래 버튼을 눌러 문답을 남겨주세요!
                  </p>
                  <button
                    onClick={() => navigate(`${PATHS.PERSONA(targetId!)}?isFirst=true`)}
                    className="px-6 py-3 w-full bg-gradient-to-r from-pink-500 to-rose-400 hover:scale-[1.03] active:scale-95 text-white font-black rounded-full shadow-lg transition-transform"
                  >
                    문답 작성하러 가기
                  </button>
                </div>
              ) : (
                <>
                  {!isMyHome && (
                    <div
                      className={`absolute top-[-40px] px-3 py-1 rounded-full border text-[10px] font-bold tracking-wider uppercase backdrop-blur-md transition-all duration-500 ${visitorVisibility === 'private' ? 'bg-pink-100 border-pink-200 text-pink-600' : 'bg-gray-100 border-gray-200 text-gray-600'}`}
                    >
                      {visitorVisibility} Access
                    </div>
                  )}
                  <CharacterScene
                    faceType={isMyHome ? faceType : (faceType + 2) % 6}
                    mouthOpenRadius={mouthOpenRadius}
                    mode={currentMode}
                    isLockMode={activeChat.isLockMode}
                    isSpeaking={finalIsSpeaking}
                    isMicOn={isMicOn}
                    label={isMyHome ? '나의 AI' : `${ownerName}님의 AI`}
                  />
                  {isMicOn && (isDualAiMode ? triggerText : lastAiMessage) && (
                    <SpeechBubble text={isDualAiMode ? triggerText : lastAiMessage} />
                  )}
                </>
              )}
            </div>

            {/* STT 실시간 말풍선 */}
            {isMicOn && (activeChat.isAwaitingResponse || activeChat.sttText) && (
              <div className="absolute bottom-[-220px] left-1/2 -translate-x-1/2 px-8 py-4 bg-black/40 backdrop-blur-xl text-white font-black text-lg rounded-3xl shadow-2xl border border-white/20 z-50 min-w-[280px] text-center max-w-[80vw] whitespace-pre-wrap">
                🎙️ {activeChat.sttText}
              </div>
            )}
          </div>
        </motion.div>

        {!showEmptyPersonaMessage && (
          <>
            <ChatWindow
              isVisible={isChatHistoryOpen}
              messages={activeChat.chatMessages}
              input={activeChat.chatInput}
              onInputChange={activeChat.setChatInput}
              onSend={() => {
                const assistantType = isMyHome ? (currentMode === 'counseling' ? 'COUNSEL' : currentMode === 'normal' ? 'DAILY' : currentMode.toUpperCase()) : (isPersonaShared ? 'PERSONA' : 'DAILY');
                const memoryPolicy = isMyHome && activeChat.isLockMode ? 'SECRET' : 'GENERAL';
                const category = isMyHome ? 'USER_AI' : 'AVATAR_AI';
                activeChat.sendMessage(activeChat.chatInput, null, assistantType, memoryPolicy, category, targetId);
              }}
              onClose={() => setIsChatHistoryOpen(false)}
            />
            <button
              onClick={() => setIsChatHistoryOpen(!isChatHistoryOpen)}
              className={`absolute bottom-8 right-8 p-4 rounded-2xl backdrop-blur-xl border shadow-2xl transition-all duration-300 z-40 group ${isChatHistoryOpen ? 'opacity-0' : 'bg-white/20 hover:scale-110'}`}
            >
              <MessageCircle className={`w-8 h-8 ${isMyHome ? 'text-white' : 'text-gray-800'}`} />
            </button>
          </>
        )}
      </main>

      {/* Modals & Panels */}
      {isMyHome ? (
        <>
          <MyCardModal
            isOpen={isMyCardModalOpen}
            onClose={() => setIsMyCardModalOpen(false)}
            userId={currentUserId}
            userName={userInfo?.nickname || '내 프로필'}
            userHandle={userInfo?.email ? `@${userInfo.email.split('@')[0]}` : '@ssarvis_me'}
            followingCount={0}
            followerCount={0}
          />
          <SharePersonaModal
            isOpen={isSharePersonaOpen}
            onClose={() => setIsSharePersonaOpen(false)}
          />
        </>
      ) : (
        <>
          <ModePanel
            currentMode={currentMode}
            isVisitorMode={true}
            isInteractionModalOpen={isInteractionModalOpen}
            isDualAiMode={isDualAiMode}
            onToggleInteraction={() => setIsInteractionModalOpen(!isInteractionModalOpen)}
            onModeChange={(m) => setCurrentMode(m)}
            onChangeFace={changeFace}
            onStartDualAi={() => {
              setIsDualAiMode(true);
              setIsInteractionModalOpen(false);
              setMyTriggerText('나: 우와, 네 방 정말 멋지다!');
              setTimeout(() => setTriggerText(`${ownerName}: 고마워! 놀러와줘서 기뻐.`), 3000);
            }}
            onStopDualAi={() => setIsDualAiMode(false)}
          />
          <PersonaModal
            isOpen={isPersonaModalOpen}
            onClose={() => setIsPersonaModalOpen(false)}
            followName={ownerName}
          />
        </>
      )}
    </div>
  );
}
