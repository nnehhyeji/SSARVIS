import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { useAICharacter } from '../../hooks/useAICharacter';
import { useChat } from '../../hooks/useChat';
import { useGuestChat } from '../../hooks/useGuestChat';
import { useFollow } from '../../hooks/useFollow';
import { useAIToAIChat } from '../../hooks/useAIToAIChat';
import { useConversationStageState } from '../../hooks/useConversationStageState';
import { useUserStore } from '../../store/useUserStore';

import MyCardModal from '../../components/features/follow/MyCardModal';
import SharePersonaModal from '../../components/features/follow/SharePersonaModal';
import ModePanel from '../../components/features/assistant/ModePanel';
import AiTopicModal from '../../components/features/assistant/AiTopicModal';
import PersonaModal from '../../components/features/follow/PersonaModal';
import MyHomeConversationView from '../../components/features/home/MyHomeConversationView';
import VisitorHomeView from '../../components/features/home/VisitorHomeView';

import { PATHS } from '../../routes/paths';
import userApi from '../../apis/userApi';
import type { UserResponse } from '../../apis/userApi';

export default function UserMainPage() {
  const { userId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { hasHydrated, userInfo, isLoggedIn, currentMode, setCurrentMode } = useUserStore();
  const didAutoStartRef = useRef(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [isAutoStartSuppressed, setIsAutoStartSuppressed] = useState(false);

  const currentUserId = userInfo?.id ?? null;
  const targetId = userId ? Number(userId) : currentUserId;
  const isMyHome = !userId || Number(userId) === currentUserId;

  const isPersonaShared = searchParams.get('mode') === 'persona';
  const hasPersonaAnswers = searchParams.get('empty') !== 'true';

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
    latestAiText,
    aiSpeechProgress,
    isLockMode,
    sttText,
    isAiSpeaking,
    isAwaitingResponse,
    isContinuousConversationEnabled,
    aiTextStreamingComplete,
    aiStreamComplete,
    isAiTextTyping,
    connectionNotice,
    setChatInput,
    setChatMessages,
    toggleLock,
    toggleContinuousConversation,
    sendMessage,
    startRecording,
    stopRecordingAndSendSTT,
    cancelTurn,
  } = useChat();

  const guestChat = useGuestChat({ enabled: !isLoggedIn && !isMyHome, targetUserId: targetId });
  const aiToAiChat = useAIToAIChat();

  const shouldUseGuestChat =
    hasHydrated && !isLoggedIn && !isMyHome;

  const activeChat =
    shouldUseGuestChat
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

  const [isMyCardModalOpen, setIsMyCardModalOpen] = useState(false);
  const [isSharePersonaOpen, setIsSharePersonaOpen] = useState(false);
  const [isChatHistoryOpen, setIsChatHistoryOpen] = useState(!isMicOn);
  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);
  const [isDualAiTopicModalOpen, setIsDualAiTopicModalOpen] = useState(false);
  const [roomViewCount, setRoomViewCount] = useState(0);
  const [profile, setProfile] = useState<UserResponse | null>(null);
  const [isTextInputMode, setIsTextInputMode] = useState(false);
  const [modeHistories, setModeHistories] = useState<
    Record<string, { sender: 'ai' | 'me'; text: string }[]>
  >({
    normal: [],
    study: [],
    counseling: [],
    persona: [],
  });
  const prevModeRef = useRef(currentMode);

  useEffect(() => {
    if (isPersonaShared) {
      setCurrentMode('persona');
    }
  }, [isPersonaShared, setCurrentMode]);

  useEffect(() => {
    let isMounted = true;

    if (!isMyHome) return;

    const loadProfile = async () => {
      try {
        const data = await userApi.getUserProfile();
        if (!isMounted) return;
        setProfile(data);
        setRoomViewCount(data.viewCount ?? 0);
      } catch (error) {
        console.error('Failed to load home profile:', error);
      }
    };

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, [isMyHome]);

  useEffect(() => {
    if (!isMyHome) return;

    const prevMode = prevModeRef.current;
    if (prevMode !== currentMode) {
      cancelTurn();
      setModeHistories((prev) => ({
        ...prev,
        [prevMode]: chatMessages,
      }));
      setChatMessages(modeHistories[currentMode] || []);
      prevModeRef.current = currentMode;
    }
  }, [cancelTurn, chatMessages, currentMode, isMyHome, modeHistories, setChatMessages]);

  useEffect(() => {
    if (isMyHome || !targetId || !isLoggedIn) return;

    const welcome = visitFollow(targetId, true);
    if (welcome) {
      setTriggerText(welcome);
    }

    return () => {
      leaveFollow();
    };
  }, [isLoggedIn, isMyHome, leaveFollow, setTriggerText, targetId, visitFollow]);

  useEffect(() => {
    if (isMyHome || !targetId) return;

    const user = follows.find((follow) => follow.id === targetId);
    setRoomViewCount(user?.view_count ?? 0);
  }, [follows, isMyHome, targetId]);

  const finalIsSpeaking = isAiSpeaking || isSpeaking;
  const myAiSpeech = isDualAiMode ? aiToAiChat.myLatestText || myTriggerText : myTriggerText;
  const visitorAiSpeech = isDualAiMode ? aiToAiChat.targetLatestText || triggerText : triggerText;
  const myAiIsSpeaking = isDualAiMode ? aiToAiChat.activeSpeaker === 'mine' : isMyAiSpeaking;
  const visitorAiIsSpeaking = isDualAiMode
    ? aiToAiChat.activeSpeaker === 'target'
    : finalIsSpeaking;
  const ownerName = isMyHome ? userInfo?.nickname || 'User' : visitedFollowName || 'Visitor';
  const showEmptyPersonaMessage = !isMyHome && !hasPersonaAnswers && currentMode === 'persona';

  const {
    aiCaptionText: homeAiCaptionText,
    aiCaptionSegments: homeAiCaptionSegments,
    userCaptionText: homeUserCaptionText,
    userCaptionSegments: homeUserCaptionSegments,
    activeSpeaker: homeStageActiveSpeaker,
    statusText: homeStageStatusText,
    statusSubtext: homeStageStatusSubtext,
    isLongAiCaption: homeIsLongAiCaption,
    isLongUserCaption: homeIsLongUserCaption,
    isLongActiveCaption: homeIsLongActiveCaption,
  } = useConversationStageState({
    chatMessages,
    latestAiText,
    triggerText,
    aiSpeechProgress,
    isMicOn,
    sttText,
    isAiSpeaking,
    isAwaitingResponse,
    isCharacterSpeaking: finalIsSpeaking,
    aiTextStreamingComplete,
    aiStreamComplete,
    isAiTextTyping,
    connectionNotice,
  });

  const homeProfileImage =
    profile?.userProfileImageUrl ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
      profile?.nickname || userInfo?.nickname || 'User',
    )}`;

  const homeAssistantDisplayName = `${userInfo?.nickname || profile?.nickname || 'User'} AI`;
  const homeUserDisplayName = profile?.nickname || userInfo?.nickname || 'User';

  useEffect(() => {
    const markInteracted = () => {
      setHasUserInteracted(true);
    };

    window.addEventListener('pointerdown', markInteracted, { once: true, passive: true });
    window.addEventListener('keydown', markInteracted, { once: true });
    window.addEventListener('touchstart', markInteracted, { once: true, passive: true });

    return () => {
      window.removeEventListener('pointerdown', markInteracted);
      window.removeEventListener('keydown', markInteracted);
      window.removeEventListener('touchstart', markInteracted);
    };
  }, []);

  useEffect(() => {
    if (
      !hasHydrated ||
      !hasUserInteracted ||
      didAutoStartRef.current ||
      isAutoStartSuppressed ||
      isMicOn ||
      !targetId ||
      isDualAiMode ||
      showEmptyPersonaMessage
    ) {
      return;
    }

    const assistantType = isMyHome
      ? currentMode === 'counseling'
        ? 'COUNSEL'
        : currentMode === 'normal'
          ? 'DAILY'
          : currentMode.toUpperCase()
      : isPersonaShared
        ? 'PERSONA'
        : 'DAILY';
    const memoryPolicy = isMyHome && isLockMode ? 'SECRET' : 'GENERAL';
    const category = isMyHome ? 'USER_AI' : 'AVATAR_AI';
    const recordingTargetId = category === 'USER_AI' ? null : targetId;

    setIsTextInputMode(false);
    toggleMic();
    activeChat.startRecording(null, assistantType, memoryPolicy, category, recordingTargetId);
    didAutoStartRef.current = true;
  }, [
    activeChat,
    currentMode,
    hasUserInteracted,
    hasHydrated,
    isAutoStartSuppressed,
    isDualAiMode,
    isLockMode,
    isMicOn,
    isMyHome,
    isPersonaShared,
    showEmptyPersonaMessage,
    targetId,
    toggleMic,
  ]);

  const handleStartSpeaking = useCallback(() => setIsSpeaking(true), [setIsSpeaking]);
  const handleEndSpeaking = useCallback(() => setIsSpeaking(false), [setIsSpeaking]);
  const handleStartMyAiSpeaking = useCallback(() => setIsMyAiSpeaking(true), [setIsMyAiSpeaking]);
  const handleEndMyAiSpeaking = useCallback(() => setIsMyAiSpeaking(false), [setIsMyAiSpeaking]);

  useEffect(() => {
    if (!myTriggerText) return;

    handleStartMyAiSpeaking();
    const timeout = setTimeout(handleEndMyAiSpeaking, myTriggerText.length * 100 + 500);
    return () => clearTimeout(timeout);
  }, [handleEndMyAiSpeaking, handleStartMyAiSpeaking, myTriggerText]);

  useEffect(() => {
    if (!triggerText) return;

    handleStartSpeaking();
    const timeout = setTimeout(handleEndSpeaking, triggerText.length * 100 + 500);
    return () => clearTimeout(timeout);
  }, [handleEndSpeaking, handleStartSpeaking, triggerText]);

  useEffect(() => {
    setIsChatHistoryOpen(!isMicOn);
  }, [isMicOn]);

  useEffect(() => {
    if (!isDualAiMode || aiToAiChat.isBattling) return;
    setIsDualAiMode(false);
  }, [aiToAiChat.isBattling, isDualAiMode, setIsDualAiMode]);

  const openDualAiTopicModal = useCallback(() => {
    if (isMyHome || !targetId) return;

    if (!isLoggedIn) {
      setIsDualAiMode(true);
      setIsInteractionModalOpen(false);
      return;
    }

    setIsInteractionModalOpen(false);
    setIsDualAiTopicModalOpen(true);
  }, [isLoggedIn, isMyHome, setIsDualAiMode, setIsInteractionModalOpen, targetId]);

  const stopDualAiConversation = useCallback(() => {
    aiToAiChat.stopBattle();
    setIsDualAiMode(false);
    setIsDualAiTopicModalOpen(false);
    setMyTriggerText('');
    setTriggerText('');
  }, [aiToAiChat, setIsDualAiMode, setMyTriggerText, setTriggerText]);

  const handleDualAiTopicSubmit = useCallback(
    async (topic: string) => {
      if (!userInfo?.id || !targetId) return;

      const started = await aiToAiChat.startBattle({
        topic,
        myUserId: userInfo.id,
        targetUserId: targetId,
        myAssistantType: 'DAILY',
        targetAssistantType: 'DAILY',
      });

      if (!started) return;

      setIsDualAiMode(true);
      setIsDualAiTopicModalOpen(false);
      setMyTriggerText('');
      setTriggerText('');
      setIsChatHistoryOpen(true);
    },
    [aiToAiChat, setIsDualAiMode, setMyTriggerText, setTriggerText, targetId, userInfo?.id],
  );

  const getAssistantType = useCallback(() => {
    if (isMyHome) {
      if (currentMode === 'counseling') return 'COUNSEL';
      if (currentMode === 'normal') return 'DAILY';
      return currentMode.toUpperCase();
    }

    return isPersonaShared ? 'PERSONA' : 'DAILY';
  }, [currentMode, isMyHome, isPersonaShared]);

  const getMemoryPolicy = useCallback(() => {
    return isMyHome && isLockMode ? 'SECRET' : 'GENERAL';
  }, [isLockMode, isMyHome]);

  const getSessionCategory = useCallback(() => {
    return isMyHome ? 'USER_AI' : 'AVATAR_AI';
  }, [isMyHome]);

  const handleHomeMicToggle = useCallback(() => {
    const assistantType = getAssistantType();
    const memoryPolicy = getMemoryPolicy();

    toggleMic();
    if (!isMicOn) {
      setIsTextInputMode(false);
      startRecording(null, assistantType, memoryPolicy, 'USER_AI');
      return;
    }

    setIsTextInputMode(true);
    stopRecordingAndSendSTT();
  }, [
    getAssistantType,
    getMemoryPolicy,
    isMicOn,
    startRecording,
    stopRecordingAndSendSTT,
    toggleMic,
  ]);

  const handleToggleContinuousConversation = useCallback(() => {
    setIsAutoStartSuppressed(true);
    toggleContinuousConversation();
  }, [toggleContinuousConversation]);

  const handleHomeSendText = useCallback(() => {
    if (!chatInput.trim()) return;

    sendMessage(chatInput, null, getAssistantType(), getMemoryPolicy(), 'USER_AI');
  }, [chatInput, getAssistantType, getMemoryPolicy, sendMessage]);

  const handleVisitorMicToggle = useCallback(() => {
    const assistantType = getAssistantType();
    const memoryPolicy = getMemoryPolicy();
    const category = getSessionCategory();
    const recordingTargetId = category === 'USER_AI' ? null : targetId;

    toggleMic();
    if (!isMicOn) {
      setIsTextInputMode(false);
      activeChat.startRecording(null, assistantType, memoryPolicy, category, recordingTargetId);
      return;
    }

    setIsTextInputMode(true);
    activeChat.stopRecordingAndSendSTT();
  }, [
    activeChat,
    getAssistantType,
    getMemoryPolicy,
    getSessionCategory,
    isMicOn,
    targetId,
    toggleMic,
  ]);

  const handleVisitorSendChat = useCallback(() => {
    activeChat.sendMessage(
      activeChat.chatInput,
      null,
      getAssistantType(),
      getMemoryPolicy(),
      getSessionCategory(),
      targetId,
    );
  }, [activeChat, getAssistantType, getMemoryPolicy, getSessionCategory, targetId]);

  if (!isMyHome && isLoggedIn && (!isVisitorMode || !visitedFollowName)) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#FDFCFB]">
        <p className="font-bold text-gray-500">홈 정보를 불러오는 중입니다.</p>
      </div>
    );
  }

  if (isMyHome) {
    return (
      <MyHomeConversationView
        currentMode={currentMode}
        isLockMode={isLockMode}
        isMicOn={isMicOn}
        isTextInputMode={isTextInputMode}
        faceType={faceType}
        mouthOpenRadius={mouthOpenRadius}
        isCharacterSpeaking={finalIsSpeaking}
        assistantDisplayName={homeAssistantDisplayName}
        userDisplayName={homeUserDisplayName}
        profileImage={homeProfileImage}
        aiCaptionText={homeAiCaptionText}
        aiDoneLength={homeAiCaptionSegments.doneLength}
        aiActiveLength={homeAiCaptionSegments.activeLength}
        userCaptionText={homeUserCaptionText}
        userDoneLength={homeUserCaptionSegments.doneLength}
        userActiveLength={homeUserCaptionSegments.activeLength}
        activeSpeaker={homeStageActiveSpeaker}
        statusText={homeStageStatusText}
        statusSubtext={homeStageStatusSubtext}
        isLongAiCaption={homeIsLongAiCaption}
        isLongUserCaption={homeIsLongUserCaption}
        isLongActiveCaption={homeIsLongActiveCaption}
        connectionNotice={connectionNotice}
        chatInput={chatInput}
        onChatInputChange={setChatInput}
        onMicToggle={handleHomeMicToggle}
        onSendText={handleHomeSendText}
        onCancel={cancelTurn}
        onToggleLock={toggleLock}
        isContinuousConversationEnabled={isContinuousConversationEnabled}
        onToggleContinuousConversation={handleToggleContinuousConversation}
      />
    );
  }

  return (
    <>
      <VisitorHomeView
        ownerName={ownerName}
        roomViewCount={roomViewCount}
        currentMode={currentMode}
        isMicOn={isMicOn}
        isLockMode={isLockMode}
        isDualAiMode={isDualAiMode}
        showEmptyPersonaMessage={showEmptyPersonaMessage}
        visitorVisibility={visitorVisibility}
        faceType={faceType}
        mouthOpenRadius={mouthOpenRadius}
        myMouthOpenRadius={myMouthOpenRadius}
        myAiIsSpeaking={myAiIsSpeaking}
        myAiSpeech={myAiSpeech}
        visitorAiIsSpeaking={visitorAiIsSpeaking}
        visitorAiSpeech={visitorAiSpeech}
        isChatHistoryOpen={isChatHistoryOpen}
        activeChat={activeChat}
        battleMessages={aiToAiChat.battleMessages}
        onNavigatePersona={() => navigate(PATHS.PERSONA(targetId!))}
        onNavigatePersonaSetup={() => navigate(`${PATHS.PERSONA(targetId!)}?isFirst=true`)}
        onToggleDualAi={() => {
          if (isDualAiMode) {
            stopDualAiConversation();
            return;
          }
          openDualAiTopicModal();
        }}
        onMicToggle={handleVisitorMicToggle}
        onSendChat={handleVisitorSendChat}
        onCloseChatHistory={() => setIsChatHistoryOpen(false)}
        onToggleChatHistory={() => setIsChatHistoryOpen((prev) => !prev)}
      />

      <ModePanel
        currentMode={currentMode}
        isVisitorMode={true}
        isInteractionModalOpen={isInteractionModalOpen}
        isDualAiMode={isDualAiMode}
        onToggleInteraction={() => setIsInteractionModalOpen((prev) => !prev)}
        onModeChange={(mode) => setCurrentMode(mode)}
        onChangeFace={changeFace}
        onStartDualAi={openDualAiTopicModal}
        onStopDualAi={stopDualAiConversation}
      />
      <PersonaModal
        isOpen={isPersonaModalOpen}
        onClose={() => setIsPersonaModalOpen(false)}
        followName={ownerName}
        targetUserId={targetId}
      />
      <AiTopicModal
        isOpen={isDualAiTopicModalOpen}
        onClose={() => setIsDualAiTopicModalOpen(false)}
        onSubmit={handleDualAiTopicSubmit}
      />

      <MyCardModal
        isOpen={isMyCardModalOpen}
        onClose={() => setIsMyCardModalOpen(false)}
        userId={currentUserId}
        userName={userInfo?.nickname || '사용자'}
        userHandle={userInfo?.email ? `@${userInfo.email.split('@')[0]}` : '@ssarvis_me'}
        followingCount={0}
        followerCount={0}
      />
      <SharePersonaModal
        isOpen={isSharePersonaOpen}
        onClose={() => setIsSharePersonaOpen(false)}
      />
    </>
  );
}
