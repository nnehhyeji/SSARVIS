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
import NamnaConversationStage from '../../components/features/namna/NamnaConversationStage';

import { WAKE_WORD } from '../../constants/voice';
import { PATHS } from '../../routes/paths';
import followApi from '../../apis/followApi';
import userApi from '../../apis/userApi';
import type { UserResponse } from '../../apis/userApi';
import { toast } from '../../store/useToastStore';

const VISITOR_LISTENING_STATUS_OPTIONS = ['\uB4E3\uB294 \uC911', '\uACBD\uCCAD \uC911'] as const;
const VISITOR_ROTATING_MESSAGE_INTERVAL_MS = 2200;

function getActiveSegment(text: string) {
  const trimmed = text.trimEnd();
  if (!trimmed) return { doneLength: 0, activeLength: 0 };

  const lastWhitespace = Math.max(trimmed.lastIndexOf(' '), trimmed.lastIndexOf('\n'));
  const activeStart = lastWhitespace >= 0 ? lastWhitespace + 1 : 0;

  return {
    doneLength: activeStart,
    activeLength: trimmed.length - activeStart,
  };
}

function getSegmentAroundIndex(text: string, index: number) {
  const trimmed = text.trimEnd();
  if (!trimmed) return { doneLength: 0, activeLength: 0 };

  const clampedIndex = Math.max(0, Math.min(index, trimmed.length));
  const targetIndex = Math.max(0, Math.min(clampedIndex - 1, trimmed.length - 1));

  if (/\s/.test(trimmed[targetIndex] ?? '')) {
    return getActiveSegment(trimmed.slice(0, clampedIndex));
  }

  let activeStart = targetIndex;
  while (activeStart > 0 && !/\s/.test(trimmed[activeStart - 1])) {
    activeStart -= 1;
  }

  let activeEnd = targetIndex + 1;
  while (activeEnd < trimmed.length && !/\s/.test(trimmed[activeEnd])) {
    activeEnd += 1;
  }

  return {
    doneLength: activeStart,
    activeLength: activeEnd - activeStart,
  };
}

function getDualCaptionSegments(text: string, isSpeaking: boolean, progress: number) {
  if (!text.trim()) return { doneLength: 0, activeLength: 0 };
  if (!isSpeaking) return { doneLength: text.length, activeLength: 0 };

  const spokenLength = Math.max(0, Math.min(Math.floor(text.length * progress), text.length));
  if (spokenLength === 0) return { doneLength: 0, activeLength: 0 };
  return getSegmentAroundIndex(text, spokenLength);
}

export default function UserMainPage() {
  const { userId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { hasHydrated, userInfo, isLoggedIn, currentMode, setCurrentMode } = useUserStore();
  const didAutoStartRef = useRef(false);
  const visitorGreetingAppliedRef = useRef(false);
  const [visitorListeningStatus, setVisitorListeningStatus] = useState<
    (typeof VISITOR_LISTENING_STATUS_OPTIONS)[number]
  >(
    VISITOR_LISTENING_STATUS_OPTIONS[0],
  );
  const [visitorIdleMessageIndex, setVisitorIdleMessageIndex] = useState(0);

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
    setIsMyAiSpeaking,
    myMouthOpenRadius,
    myTriggerText,
    setMyTriggerText,
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
    voicePhase,
    wakeWordDetectedAt,
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
    updateRecordingContext,
    resetConversationRuntime,
    startRecording,
    stopRecordingAndSendSTT,
    cancelTurn,
    sleepConversation,
    discardCurrentTurn,
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
            voicePhase,
            wakeWordDetectedAt,
            isAiSpeaking,
            isAwaitingResponse,
            setChatInput,
            toggleLock,
            sendMessage,
            startRecording,
            stopRecordingAndSendSTT,
            sleepConversation,
          },
    [
      chatInput,
      chatMessages,
      guestChat,
      isAiSpeaking,
      isAwaitingResponse,
      isLockMode,
      sendMessage,
      sleepConversation,
      setChatInput,
      shouldUseGuestChat,
      startRecording,
      stopRecordingAndSendSTT,
      sttText,
      voicePhase,
      wakeWordDetectedAt,
      toggleLock,
    ],
  );

  const {
    follows,
    isVisitorMode,
    visitedFollowName,
    visitFollow,
    leaveFollow,
    setIsVisitorMode,
    setVisitedFollowName,
    setVisitedUserId,
    setVisitorVisibility,
  } = useFollow();

  const [profile, setProfile] = useState<UserResponse | null>(null);
  const [visitedProfileImage, setVisitedProfileImage] = useState('');
  const [isTextInputMode, setIsTextInputMode] = useState(false);
  const [isVisitorDualAiMode, setIsVisitorDualAiMode] = useState(false);
  const [isAiTopicModalOpen, setIsAiTopicModalOpen] = useState(false);
  const [visitorFollowStatus, setVisitorFollowStatus] = useState<
    'NONE' | 'REQUESTED' | 'FOLLOWING' | null
  >(null);
  const [isVisitorFollowLoading, setIsVisitorFollowLoading] = useState(false);
  const [visitorFollowCustomId, setVisitorFollowCustomId] = useState('');
  const [modeHistories, setModeHistories] = useState<
    Record<string, { sender: 'ai' | 'me'; text: string }[]>
  >({
    normal: [],
    study: [],
    counseling: [],
    persona: [],
  });
  const prevModeRef = useRef(currentMode);
  const pageContextKey = isMyHome ? `home:${currentMode}` : `visit:${targetId ?? 'unknown'}`;
  const prevPageContextKeyRef = useRef(pageContextKey);

  useEffect(() => {
    if (isPersonaShared) {
      setCurrentMode('persona');
    }
  }, [isPersonaShared, setCurrentMode]);

  useEffect(() => {
    let isMounted = true;

    if (!isLoggedIn) return;

    const loadProfile = async () => {
      try {
        const data = await userApi.getUserProfile();
        if (!isMounted) return;
        setProfile(data);
      } catch (error) {
        console.error('Failed to load user profile:', error);
      }
    };

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, [isLoggedIn]);

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

    // 팔로우 목록에서 찾아 방문자 모드 진입 시도
    const result = visitFollow(targetId, true);

    if (!result) {
      // 팔로우 관계 없는 유저 - API로 프로필 조회 후 방문자 상태 직접 설정
      let isMounted = true;
      void (async () => {
        try {
          const profile = await userApi.getUserProfileById(targetId);
          if (!isMounted) return;
          setVisitedFollowName(profile.nickname);
          setVisitedUserId(targetId);
          setIsVisitorMode(true);
          setVisitorVisibility('public');
          setVisitedProfileImage(profile.profileImageUrl || '');
          // customId가 있으면 팔로우 상태 새로고침에 활용
          if (profile.customId) {
            setVisitorFollowCustomId(profile.customId);
            setVisitorFollowStatus('NONE');
          }
        } catch (error) {
          console.error('방문한 유저 프로필 조회 실패:', error);
        }
      })();

      return () => {
        isMounted = false;
        leaveFollow();
      };
    }

    return () => {
      leaveFollow();
    };
  }, [isLoggedIn, isMyHome, leaveFollow, targetId, visitFollow, setIsVisitorMode, setVisitedFollowName, setVisitedUserId, setVisitorVisibility, setVisitorFollowCustomId, setVisitorFollowStatus]);

  useEffect(() => {
    setIsVisitorDualAiMode(false);
    setIsAiTopicModalOpen(false);
    setMyTriggerText('');
    aiToAiChat.stopBattle();
    // targetId가 바뀔 때만 방문 듀얼 AI 상태를 초기화한다.
    // aiToAiChat 객체 전체를 의존성에 넣으면 렌더마다 effect가 다시 돌아
    // "둘이 대화" 진입 직후 모드가 바로 꺼질 수 있다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setMyTriggerText, targetId]);

  const finalIsSpeaking = isAiSpeaking || isSpeaking;
  const ownerName = isMyHome ? userInfo?.nickname || 'User' : visitedFollowName || 'Visitor';
  const visitorFollow = follows.find((follow) => follow.id === targetId) ?? null;
  const visitorDescription =
    visitorFollow?.description?.trim() || '';
  const visitorIntroText = visitorDescription || '\uC5B4\uC11C \uC640, ' + ownerName + ' AI\uC5D0\uAC8C \uB9D0\uC744 \uAC78\uC5B4\uBCF4\uC138\uC694';
  const showEmptyPersonaMessage = !isMyHome && !hasPersonaAnswers && currentMode === 'persona';
  const visitorProfileImage =
    visitedProfileImage || visitorFollow?.profileImgUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(ownerName)}`;

  const refreshVisitorFollowStatus = useCallback(
    async (customId: string) => {
      if (!targetId || !customId) return null;

      const response = await followApi.searchUsers(customId);
      const matchedUser = (response.data || []).find(
        (user) => user.userId === targetId && user.customId === customId,
      );

      return matchedUser?.followStatus ?? null;
    },
    [targetId],
  );

  useEffect(() => {
    if (isMyHome || !isLoggedIn || !targetId) {
      setVisitorFollowStatus(null);
      setVisitorFollowCustomId('');
      return;
    }

    const initialCustomId = visitorFollow?.customId || '';
    setVisitorFollowCustomId(initialCustomId);

    if (visitorFollow?.followId) {
      setVisitorFollowStatus('FOLLOWING');
    } else {
      setVisitorFollowStatus('NONE');
    }

    if (!initialCustomId) return;

    let isMounted = true;

    void (async () => {
      try {
        const status = await refreshVisitorFollowStatus(initialCustomId);
        if (!isMounted || !status) return;
        setVisitorFollowStatus(status);
      } catch (error) {
        console.error('Failed to load visitor follow status:', error);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [isLoggedIn, isMyHome, refreshVisitorFollowStatus, targetId, visitorFollow]);

  useEffect(() => {
    if (isMyHome) {
      setVisitedProfileImage('');
      return;
    }

    if (visitorFollow?.profileImgUrl) {
      setVisitedProfileImage(visitorFollow.profileImgUrl);
    }
  }, [isMyHome, visitorFollow?.profileImgUrl]);

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
    (activeChat.voicePhase === 'speech' && activeChat.sttText.trim().length > 0);
  const visitorIsListening = activeChat.voicePhase === 'speech';
  const visitorNeedsWakeWordGuide =
    !isMyHome &&
    !aiToAiChat.isBattling &&
    !hasVisitorConversationStarted &&
    !visitorConnectionNotice &&
    isMicOn &&
    activeChat.voicePhase === 'wake';
  const visitorWakeDetected =
    activeChat.wakeWordDetectedAt !== null && Date.now() - activeChat.wakeWordDetectedAt < 1000;
  const shouldRotateVisitorIdleMessages = visitorNeedsWakeWordGuide;
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
  const battleCaptionSegments = getDualCaptionSegments(
    battleCaptionText,
    battleIsTargetSpeaking,
    aiToAiChat.targetSpeechProgress,
  );
  const visitorStageCaptionText = aiToAiChat.isBattling
    ? battleCaptionText
    : visitorBaseCaptionText;
  const visitorWakeWordGuide = '"' + WAKE_WORD + '"\uB77C\uACE0 \uB9D0\uD55C \uB4A4 \uCE5C\uAD6C AI\uC5D0\uAC8C \uB9D0\uC744 \uAC78\uC5B4\uBCF4\uC138\uC694';
  const visitorRotatingCaptionText =
    visitorIdleMessageIndex === 0 ? visitorIntroText : visitorWakeWordGuide;
  const visitorCaptionText = shouldRotateVisitorIdleMessages
    ? visitorRotatingCaptionText
    : visitorStageCaptionText;
  const visitorCaptionDoneLength = aiToAiChat.isBattling
    ? battleCaptionSegments.doneLength
    : shouldRotateVisitorIdleMessages
      ? visitorCaptionText.length
      : visitorBaseDoneLength;
  const visitorCaptionActiveLength = aiToAiChat.isBattling
    ? battleCaptionSegments.activeLength
    : shouldRotateVisitorIdleMessages
      ? 0
      : visitorBaseActiveLength;
  const visitorStageStatus = aiToAiChat.isBattling
    ? aiToAiChat.statusMessage
    : activeChat.isAwaitingResponse
      ? '\uC751\uB2F5 \uC911'
      : visitorWakeDetected
        ? '\uB4E4\uC5C8\uC5B4\uC694'
      : visitorIsListening
        ? visitorListeningStatus
        : visitorNeedsWakeWordGuide
          ? ''
          : visitorStageStatusText;
  const isVisitorDualAiSceneOpen =
    !isMyHome && (isVisitorDualAiMode || aiToAiChat.isBattling || Boolean(aiToAiChat.topic));
  const visitorDualLeftCaptionText = aiToAiChat.targetLatestText || triggerText;
  const visitorDualLeftSegments = getDualCaptionSegments(
    visitorDualLeftCaptionText,
    aiToAiChat.activeSpeaker === 'target',
    aiToAiChat.targetSpeechProgress,
  );
  const visitorDualLeftDoneLength = visitorDualLeftSegments.doneLength;
  const visitorDualLeftActiveLength = visitorDualLeftSegments.activeLength;
  const visitorDualRightCaptionText = aiToAiChat.myLatestText || myTriggerText;
  const visitorDualRightSegments = getDualCaptionSegments(
    visitorDualRightCaptionText,
    aiToAiChat.activeSpeaker === 'mine',
    aiToAiChat.mySpeechProgress,
  );
  const visitorDualRightDoneLength = visitorDualRightSegments.doneLength;
  const visitorDualRightActiveLength = visitorDualRightSegments.activeLength;
  const visitorDualActiveSpeaker: 'left' | 'right' | null =
    aiToAiChat.activeSpeaker === 'target'
      ? 'left'
      : aiToAiChat.activeSpeaker === 'mine'
        ? 'right'
        : null;

  useEffect(() => {
    if (!isVisitorDualAiSceneOpen) return;

    discardCurrentTurn();
    setMicRuntimeActive(false);
  }, [discardCurrentTurn, isVisitorDualAiSceneOpen, setMicRuntimeActive]);

  useEffect(() => {
    if (!visitorIsListening) return;

    const randomIndex = Math.floor(Math.random() * VISITOR_LISTENING_STATUS_OPTIONS.length);
    setVisitorListeningStatus(VISITOR_LISTENING_STATUS_OPTIONS[randomIndex]);
  }, [visitorIsListening]);

  useEffect(() => {
    if (!shouldRotateVisitorIdleMessages) {
      setVisitorIdleMessageIndex(0);
      return;
    }

    const interval = window.setInterval(() => {
      setVisitorIdleMessageIndex((prev) => (prev === 0 ? 1 : 0));
    }, VISITOR_ROTATING_MESSAGE_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [shouldRotateVisitorIdleMessages]);

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

  useEffect(() => {
    if (!myTriggerText) return;

    setIsMyAiSpeaking(true);
    const timeout = setTimeout(() => setIsMyAiSpeaking(false), myTriggerText.length * 100 + 500);
    return () => clearTimeout(timeout);
  }, [myTriggerText, setIsMyAiSpeaking]);

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

  useEffect(() => {
    const prevContextKey = prevPageContextKeyRef.current;
    if (prevContextKey === pageContextKey) return;

    const wasMyHome = prevContextKey.startsWith('home:');
    if (wasMyHome) {
      const prevMode = prevContextKey.replace('home:', '');
      setModeHistories((prev) => ({
        ...prev,
        [prevMode]: chatMessages,
      }));
    }

    cancelTurn();
    resetConversationRuntime();
    setChatInput('');

    if (isMyHome) {
      setChatMessages(modeHistories[currentMode] || []);
    } else {
      setChatMessages([]);
      setTriggerText('');
    }

    prevPageContextKeyRef.current = pageContextKey;
  }, [
    cancelTurn,
    chatMessages,
    currentMode,
    isMyHome,
    modeHistories,
    pageContextKey,
    resetConversationRuntime,
    setChatInput,
    setChatMessages,
    setTriggerText,
  ]);

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

    updateRecordingContext(
      null,
      getAssistantType(),
      getMemoryPolicy(),
      getSessionCategory(),
      targetId,
    );
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
    updateRecordingContext,
  ]);

  const handleOpenPersona = useCallback(() => {
    if (!targetId) return;
    navigate(PATHS.PERSONA(targetId));
  }, [navigate, targetId]);

  const handleToggleDualAi = useCallback(() => {
    if (aiToAiChat.isBattling) {
      aiToAiChat.stopBattle();
      setIsVisitorDualAiMode(false);
      setIsAiTopicModalOpen(false);
      return;
    }

    if (isVisitorDualAiMode) {
      setIsVisitorDualAiMode(false);
      setIsAiTopicModalOpen(false);
      return;
    }

    if (!isLoggedIn || !currentUserId || !targetId) return;

    setIsVisitorDualAiMode(true);
    setIsAiTopicModalOpen(false);
  }, [aiToAiChat, currentUserId, isLoggedIn, isVisitorDualAiMode, targetId]);

  const handleVisitorFollow = useCallback(async () => {
    if (!isLoggedIn || isMyHome || !targetId || visitorFollowStatus === 'FOLLOWING') return;
    if (visitorFollowStatus === 'REQUESTED') return;

    setIsVisitorFollowLoading(true);

    try {
      await followApi.requestFollow({ receiverId: targetId });

      let nextStatus: 'NONE' | 'REQUESTED' | 'FOLLOWING' = 'REQUESTED';
      if (visitorFollowCustomId) {
        const refreshedStatus = await refreshVisitorFollowStatus(visitorFollowCustomId);
        if (refreshedStatus) {
          nextStatus = refreshedStatus;
        }
      }

      setVisitorFollowStatus(nextStatus);
      toast.success(
        nextStatus === 'FOLLOWING'
          ? `${ownerName}님을 팔로우했어요.`
          : `${ownerName}님에게 팔로우 요청을 보냈어요.`,
      );
    } catch (error) {
      console.error('Failed to request follow from visitor page:', error);
      toast.error('팔로우 요청에 실패했어요.');
    } finally {
      setIsVisitorFollowLoading(false);
    }
  }, [
    isLoggedIn,
    isMyHome,
    ownerName,
    refreshVisitorFollowStatus,
    targetId,
    visitorFollowCustomId,
    visitorFollowStatus,
  ]);

  const visitorFollowButtonLabel =
    !isMyHome && isLoggedIn
      ? visitorFollowStatus === 'FOLLOWING'
        ? '팔로우중'
        : visitorFollowStatus === 'REQUESTED'
          ? '요청중'
          : '팔로우'
      : null;
  const isVisitorFollowButtonDisabled =
    isVisitorFollowLoading ||
    visitorFollowStatus === 'FOLLOWING' ||
    visitorFollowStatus === 'REQUESTED';

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

      setIsVisitorDualAiMode(true);
      setIsAiTopicModalOpen(false);
      setIsTextInputMode(false);
      setTriggerText('');
      setMyTriggerText('');
    },
    [aiToAiChat, currentUserId, setMyTriggerText, setTriggerText, targetId],
  );

  useEffect(() => {
    return () => {
      setMicRuntimeActive(false);
    };
  }, [setMicRuntimeActive]);

  const handleSleepConversation = useCallback(() => {
    setMicPreferenceEnabled(true);
    setMicRuntimeActive(true);
    setIsTextInputMode(false);

    if (shouldUseGuestChat) {
      guestChat.sleepConversation();
      return;
    }

    sleepConversation();
  }, [
    guestChat,
    setMicPreferenceEnabled,
    setMicRuntimeActive,
    shouldUseGuestChat,
    sleepConversation,
  ]);

  if (!isMyHome && isLoggedIn && (!isVisitorMode || !visitedFollowName)) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#FDFCFB]">
        <p className="font-bold text-gray-500">\uBC29\uBB38 \uC911\uC778 \uCE5C\uAD6C \uC815\uBCF4\uB97C \uBD88\uB7EC\uC624\uB294 \uC911\uC785\uB2C8\uB2E4.</p>
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
        onCancel={handleSleepConversation}
        onToggleLock={toggleLock}
        isContinuousConversationEnabled={isContinuousConversationEnabled}
      />
    );
  }

  return (
    <>
      {isVisitorDualAiSceneOpen ? (
        <NamnaConversationStage
          title={ownerName}
          isLockMode={activeChat.isLockMode}
          isMicOn={isMicOn}
          isTextInputMode={isTextInputMode}
          headerCenterLabel={aiToAiChat.topic ? `주제: ${aiToAiChat.topic}` : '주제를 입력해주세요!'}
          onHeaderCenterAction={() => setIsAiTopicModalOpen(true)}
          onHeaderCenterClear={
            aiToAiChat.topic || aiToAiChat.isBattling
              ? () => {
                  aiToAiChat.stopBattle();
                  setIsVisitorDualAiMode(true);
                  setIsAiTopicModalOpen(false);
                }
              : undefined
          }
          leftFaceType={(faceType + 2) % 6}
          leftMouthOpenRadius={mouthOpenRadius}
          leftMode={currentMode}
          leftIsSpeaking={aiToAiChat.activeSpeaker === 'target'}
          leftDisplayName={`${ownerName} AI`}
          leftProfileImage={visitorProfileImage}
          leftCaptionText={visitorDualLeftCaptionText}
          leftDoneLength={visitorDualLeftDoneLength}
          leftActiveLength={visitorDualLeftActiveLength}
          rightFaceType={faceType}
          rightMouthOpenRadius={myMouthOpenRadius}
          rightMode="normal"
          rightIsSpeaking={aiToAiChat.activeSpeaker === 'mine'}
          rightDisplayName={`${userInfo?.nickname || '내'} AI`}
          rightProfileImage={homeProfileImage}
          rightCaptionText={visitorDualRightCaptionText}
          rightDoneLength={visitorDualRightDoneLength}
          rightActiveLength={visitorDualRightActiveLength}
          activeSpeaker={visitorDualActiveSpeaker}
          statusText={aiToAiChat.statusMessage}
          connectionNotice={aiToAiChat.errorMessage || undefined}
          progressCurrent={aiToAiChat.turnCount}
          progressTotal={aiToAiChat.maxTurn}
          progressLabel="AI 대화 진행"
          useProgressFooter
          showContinuationPrompt={aiToAiChat.isAwaitingContinuation}
          onContinueConversation={aiToAiChat.continueBattle}
          onStopConversation={() => {
            aiToAiChat.stopBattle();
            setIsVisitorDualAiMode(true);
            setIsAiTopicModalOpen(false);
          }}
          chatInput={activeChat.chatInput}
          onChatInputChange={activeChat.setChatInput}
          onMicToggle={handleVisitorMicToggle}
          onSendText={handleVisitorSendChat}
          onCancel={() => {
            aiToAiChat.stopBattle();
            setIsVisitorDualAiMode(true);
            setIsAiTopicModalOpen(false);
          }}
          onToggleLock={toggleLock}
        />
      ) : (
        <VisitorConversationStage
          title={ownerName}
          currentMode={currentMode}
          isMicOn={isMicOn}
          isTextInputMode={isTextInputMode}
          faceType={faceType}
          mouthOpenRadius={mouthOpenRadius}
          isCharacterSpeaking={battleIsTargetSpeaking || activeChat.isAiSpeaking || isSpeaking}
          assistantDisplayName={`${ownerName} AI`}
          assistantProfileImage={visitorProfileImage}
          userDisplayName={userInfo?.nickname || '나'}
          profileImage={homeProfileImage}
          aiCaptionText={visitorCaptionText}
          aiDoneLength={visitorCaptionDoneLength}
          aiActiveLength={visitorCaptionActiveLength}
          statusText={visitorStageStatus}
          isListeningStatus={visitorIsListening}
          showWakeCue={visitorWakeDetected}
          liveUserTranscript={activeChat.sttText}
          showLiveTranscript={activeChat.voicePhase === 'speech'}
          connectionNotice={visitorConnectionNotice}
          isDualAiRunning={aiToAiChat.isBattling}
          canStartDualAi={Boolean(isLoggedIn && currentUserId && targetId)}
          followButtonLabel={visitorFollowButtonLabel}
          isFollowButtonDisabled={isVisitorFollowButtonDisabled}
          isFollowButtonLoading={isVisitorFollowLoading}
          chatInput={activeChat.chatInput}
          onChatInputChange={activeChat.setChatInput}
          onMicToggle={handleVisitorMicToggle}
          onSendText={handleVisitorSendChat}
          onCancel={() => {
            if (aiToAiChat.isBattling) {
              aiToAiChat.stopBattle();
              return;
            }
            handleSleepConversation();
          }}
          onOpenPersona={handleOpenPersona}
          onToggleDualAi={handleToggleDualAi}
          onFollowClick={handleVisitorFollow}
        />
      )}

      <AiTopicModal
        isOpen={isAiTopicModalOpen}
        onClose={() => setIsAiTopicModalOpen(false)}
        onSubmit={handleDualAiTopicSubmit}
      />
    </>
  );
}
