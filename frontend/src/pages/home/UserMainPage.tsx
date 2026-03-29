import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { useAICharacter } from '../../hooks/useAICharacter';
import { useChat } from '../../hooks/useChat';
import { useGuestChat } from '../../hooks/useGuestChat';
import { useFollow } from '../../hooks/useFollow';
import { useAIToAIChat } from '../../hooks/useAIToAIChat';
import { useConversationStageState } from '../../hooks/useConversationStageState';
import { useMicStore } from '../../store/useMicStore';
import { useUserStore } from '../../store/useUserStore';

import AiTopicModal from '../../components/features/assistant/AiTopicModal';
import MyHomeConversationView from '../../components/features/home/MyHomeConversationView';
import VisitorConversationStage from '../../components/features/home/VisitorConversationStage';

import { PATHS } from '../../routes/paths';
import followApi from '../../apis/followApi';
import userApi from '../../apis/userApi';
import type { UserResponse } from '../../apis/userApi';

export default function UserMainPage() {
  const { userId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { hasHydrated, userInfo, isLoggedIn, currentMode, setCurrentMode } = useUserStore();
  const didAutoStartRef = useRef(false);
  const visitorGreetingAppliedRef = useRef(false);

  const currentUserId = userInfo?.id ?? null;
  const targetId = userId ? Number(userId) : currentUserId;
  const isMyHome = !userId || Number(userId) === currentUserId;

  const isPersonaShared = searchParams.get('mode') === 'persona';
  const hasPersonaAnswers = searchParams.get('empty') !== 'true';

  const {
    isMicOn,
    micPreferenceEnabled,
    mouthOpenRadius,
    faceType,
    isSpeaking,
    setIsSpeaking,
    triggerText,
    setTriggerText,
    setMicPreferenceEnabled,
    setMicRuntimeActive,
  } = useAICharacter({ enableDefaultTriggerText: isMyHome });
  const micStoreHydrated = useMicStore((state) => state.hasHydrated);

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
    sendMessage,
    startRecording,
    stopRecordingAndSendSTT,
    cancelTurn,
  } = useChat({ initialGreeting: isMyHome ? undefined : '' });

  const guestChat = useGuestChat({ enabled: !isLoggedIn && !isMyHome, targetUserId: targetId });
  const aiToAiChat = useAIToAIChat();
  const shouldUseGuestChat = hasHydrated && !isLoggedIn && !isMyHome;

  const activeChat = useMemo(
    () =>
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
          },
    [
      chatInput,
      chatMessages,
      guestChat,
      isAiSpeaking,
      isAwaitingResponse,
      isLockMode,
      sendMessage,
      setChatInput,
      shouldUseGuestChat,
      startRecording,
      stopRecordingAndSendSTT,
      sttText,
      toggleLock,
    ],
  );

  const { follows, isVisitorMode, visitedFollowName, visitFollow, leaveFollow } = useFollow();

  const [profile, setProfile] = useState<UserResponse | null>(null);
  const [guestOwnerName, setGuestOwnerName] = useState('');
  const [isTextInputMode, setIsTextInputMode] = useState(false);
  const [isAiTopicModalOpen, setIsAiTopicModalOpen] = useState(false);
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

    visitFollow(targetId, true);

    return () => {
      leaveFollow();
    };
  }, [isLoggedIn, isMyHome, leaveFollow, targetId, visitFollow]);

  useEffect(() => {
    let isMounted = true;

    if (isMyHome || !targetId || isLoggedIn) {
      setGuestOwnerName('');
      return;
    }

    const loadGuestOwnerName = async () => {
      try {
        const data = await followApi.getFollowAi(targetId);
        if (!isMounted) return;
        setGuestOwnerName(data.name.split('_')[0]?.trim() || '');
      } catch (error) {
        if (!isMounted) return;
        console.error('Failed to load guest owner name:', error);
        setGuestOwnerName('');
      }
    };

    void loadGuestOwnerName();

    return () => {
      isMounted = false;
    };
  }, [isLoggedIn, isMyHome, targetId]);

  const finalIsSpeaking = isAiSpeaking || isSpeaking;
  const ownerName = isMyHome
    ? userInfo?.nickname || 'User'
    : visitedFollowName || guestOwnerName || 'Visitor';
  const visitorDescription =
    follows.find((follow) => follow.id === targetId)?.description?.trim() || '';
  const visitorIntroText = visitorDescription || `어서와, ${ownerName} ai한테 말을 걸어봐`;
  const showEmptyPersonaMessage = !isMyHome && !hasPersonaAnswers && currentMode === 'persona';

  useEffect(() => {
    if (isMyHome) {
      visitorGreetingAppliedRef.current = false;
      return;
    }

    if (!visitedFollowName || visitorGreetingAppliedRef.current) return;

    setTriggerText(visitorIntroText);
    visitorGreetingAppliedRef.current = true;
  }, [isMyHome, setTriggerText, visitedFollowName, visitorIntroText]);

  useEffect(() => {
    visitorGreetingAppliedRef.current = false;
  }, [targetId]);

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

  const visitorLatestAiText = shouldUseGuestChat ? '' : latestAiText;
  const visitorAiSpeechProgress = shouldUseGuestChat ? 0 : aiSpeechProgress;
  const visitorConnectionNotice = shouldUseGuestChat ? '' : connectionNotice;

  const {
    aiCaptionText: visitorAiCaptionText,
    aiCaptionSegments: visitorAiCaptionSegments,
    statusText: visitorStageStatusText,
  } = useConversationStageState({
    chatMessages: activeChat.chatMessages,
    latestAiText: visitorLatestAiText,
    triggerText,
    aiSpeechProgress: visitorAiSpeechProgress,
    isMicOn,
    sttText: activeChat.sttText,
    isAiSpeaking: activeChat.isAiSpeaking,
    isAwaitingResponse: activeChat.isAwaitingResponse,
    isCharacterSpeaking: activeChat.isAiSpeaking || isSpeaking,
    connectionNotice: visitorConnectionNotice,
  });

  const hasVisitorConversationStarted =
    activeChat.chatMessages.some((message) => message.sender === 'me') ||
    activeChat.isAwaitingResponse ||
    activeChat.isAiSpeaking ||
    activeChat.sttText.trim().length > 0;
  const visitorBaseCaptionText =
    !hasVisitorConversationStarted && triggerText.trim().length > 0
      ? triggerText
      : visitorAiCaptionText;
  const visitorBaseDoneLength =
    !hasVisitorConversationStarted && triggerText.trim().length > 0
      ? triggerText.length
      : visitorAiCaptionSegments.doneLength;
  const visitorBaseActiveLength =
    !hasVisitorConversationStarted && triggerText.trim().length > 0
      ? 0
      : visitorAiCaptionSegments.activeLength;

  const battleCaptionText =
    aiToAiChat.isBattling && aiToAiChat.targetLatestText.trim()
      ? aiToAiChat.targetLatestText
      : visitorBaseCaptionText;
  const battleIsTargetSpeaking =
    aiToAiChat.activeSpeaker === 'target' && battleCaptionText.trim().length > 0;
  const visitorCaptionDoneLength = aiToAiChat.isBattling
    ? battleIsTargetSpeaking
      ? Math.max(0, battleCaptionText.length - 1)
      : battleCaptionText.length
    : visitorBaseDoneLength;
  const visitorCaptionActiveLength = aiToAiChat.isBattling
    ? battleIsTargetSpeaking
      ? 1
      : 0
    : visitorBaseActiveLength;
  const visitorStageCaptionText = aiToAiChat.isBattling
    ? battleCaptionText
    : visitorBaseCaptionText;
  const visitorStageStatus = aiToAiChat.isBattling
    ? aiToAiChat.statusMessage
    : visitorStageStatusText;

  const homeProfileImage =
    profile?.userProfileImageUrl ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
      profile?.nickname || userInfo?.nickname || 'User',
    )}`;

  const homeAssistantDisplayName = `${userInfo?.nickname || profile?.nickname || 'User'} AI`;
  const homeUserDisplayName = profile?.nickname || userInfo?.nickname || 'User';

  useEffect(() => {
    if (
      !micStoreHydrated ||
      !micPreferenceEnabled ||
      !hasHydrated ||
      didAutoStartRef.current ||
      isMicOn ||
      !targetId ||
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
    didAutoStartRef.current = true;

    void (async () => {
      setIsTextInputMode(false);
      const started = await activeChat.startRecording(
        null,
        assistantType,
        memoryPolicy,
        category,
        recordingTargetId,
      );
      setMicRuntimeActive(Boolean(started));
      if (!started) {
        setIsTextInputMode(true);
        return;
      }
    })();
  }, [
    activeChat,
    currentMode,
    hasHydrated,
    isLockMode,
    isMicOn,
    isMyHome,
    isPersonaShared,
    micPreferenceEnabled,
    micStoreHydrated,
    setMicRuntimeActive,
    showEmptyPersonaMessage,
    targetId,
  ]);

  const handleStartSpeaking = useCallback(() => setIsSpeaking(true), [setIsSpeaking]);
  const handleEndSpeaking = useCallback(() => setIsSpeaking(false), [setIsSpeaking]);

  useEffect(() => {
    if (!triggerText) return;

    handleStartSpeaking();
    const timeout = setTimeout(handleEndSpeaking, triggerText.length * 100 + 500);
    return () => clearTimeout(timeout);
  }, [handleEndSpeaking, handleStartSpeaking, triggerText]);

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

    if (!isMicOn) {
      void (async () => {
        setMicPreferenceEnabled(true);
        setIsTextInputMode(false);
        const started = await startRecording(null, assistantType, memoryPolicy, 'USER_AI');
        setMicRuntimeActive(Boolean(started));
        if (!started) {
          setIsTextInputMode(true);
        }
      })();
      return;
    }

    setMicPreferenceEnabled(false);
    setMicRuntimeActive(false);
    setIsTextInputMode(true);
    stopRecordingAndSendSTT();
  }, [
    getAssistantType,
    getMemoryPolicy,
    isMicOn,
    setMicPreferenceEnabled,
    setMicRuntimeActive,
    startRecording,
    stopRecordingAndSendSTT,
  ]);

  const handleHomeSendText = useCallback(() => {
    if (!chatInput.trim()) return;

    sendMessage(chatInput);
  }, [chatInput, sendMessage]);

  const handleVisitorMicToggle = useCallback(() => {
    const assistantType = getAssistantType();
    const memoryPolicy = getMemoryPolicy();
    const category = getSessionCategory();
    const recordingTargetId = category === 'USER_AI' ? null : targetId;

    if (!isMicOn) {
      void (async () => {
        setMicPreferenceEnabled(true);
        setIsTextInputMode(false);
        const started = await activeChat.startRecording(
          null,
          assistantType,
          memoryPolicy,
          category,
          recordingTargetId,
        );
        setMicRuntimeActive(Boolean(started));
        if (!started) {
          setIsTextInputMode(true);
        }
      })();
      return;
    }

    setMicPreferenceEnabled(false);
    setMicRuntimeActive(false);
    setIsTextInputMode(true);
    activeChat.stopRecordingAndSendSTT();
  }, [
    activeChat,
    getAssistantType,
    getMemoryPolicy,
    getSessionCategory,
    isMicOn,
    setMicPreferenceEnabled,
    setMicRuntimeActive,
    targetId,
  ]);

  const handleVisitorSendChat = useCallback(() => {
    if (!activeChat.chatInput.trim()) return;

    if (shouldUseGuestChat) {
      guestChat.sendMessage(
        guestChat.chatInput,
        null,
        getAssistantType(),
        getMemoryPolicy(),
        getSessionCategory(),
        targetId,
      );
      return;
    }

    sendMessage(chatInput);
  }, [
    activeChat.chatInput,
    chatInput,
    getAssistantType,
    getMemoryPolicy,
    getSessionCategory,
    guestChat,
    sendMessage,
    shouldUseGuestChat,
    targetId,
  ]);

  const handleOpenPersona = useCallback(() => {
    if (!targetId) return;
    navigate(PATHS.PERSONA(targetId));
  }, [navigate, targetId]);

  const handleToggleDualAi = useCallback(() => {
    if (aiToAiChat.isBattling) {
      aiToAiChat.stopBattle();
      return;
    }

    if (!isLoggedIn || !currentUserId || !targetId) return;

    setIsAiTopicModalOpen(true);
  }, [aiToAiChat, currentUserId, isLoggedIn, targetId]);

  const handleDualAiTopicSubmit = useCallback(
    async (topic: string) => {
      if (!currentUserId || !targetId) return;

      const started = await aiToAiChat.startBattle({
        topic,
        myUserId: currentUserId,
        targetUserId: targetId,
        myAssistantType: 'DAILY',
        targetAssistantType: 'DAILY',
      });

      if (!started) return;

      setIsAiTopicModalOpen(false);
      setIsTextInputMode(false);
      setTriggerText('');
    },
    [aiToAiChat, currentUserId, setTriggerText, targetId],
  );

  useEffect(() => {
    return () => {
      setMicRuntimeActive(false);
    };
  }, [setMicRuntimeActive]);

  if (!isMyHome && isLoggedIn && (!isVisitorMode || !visitedFollowName)) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#FDFCFB]">
        <p className="font-bold text-gray-500">방문 중인 친구 정보를 불러오는 중입니다.</p>
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
      />
    );
  }

  return (
    <>
      <VisitorConversationStage
        title={ownerName}
        currentMode={currentMode}
        isMicOn={isMicOn}
        isTextInputMode={isTextInputMode}
        faceType={faceType}
        mouthOpenRadius={mouthOpenRadius}
        isCharacterSpeaking={battleIsTargetSpeaking || activeChat.isAiSpeaking || isSpeaking}
        assistantDisplayName={`${ownerName} AI`}
        aiCaptionText={visitorStageCaptionText}
        aiDoneLength={visitorCaptionDoneLength}
        aiActiveLength={visitorCaptionActiveLength}
        statusText={visitorStageStatus}
        connectionNotice={visitorConnectionNotice}
        isDualAiRunning={aiToAiChat.isBattling}
        canStartDualAi={Boolean(isLoggedIn && currentUserId && targetId)}
        chatInput={activeChat.chatInput}
        onChatInputChange={activeChat.setChatInput}
        onMicToggle={handleVisitorMicToggle}
        onSendText={handleVisitorSendChat}
        onCancel={() => {
          if (aiToAiChat.isBattling) {
            aiToAiChat.stopBattle();
            return;
          }
          if (shouldUseGuestChat) {
            guestChat.stopRecordingAndSendSTT();
            return;
          }
          cancelTurn();
        }}
        onOpenPersona={handleOpenPersona}
        onToggleDualAi={handleToggleDualAi}
      />

      <AiTopicModal
        isOpen={isAiTopicModalOpen}
        onClose={() => setIsAiTopicModalOpen(false)}
        onSubmit={handleDualAiTopicSubmit}
      />
    </>
  );
}
