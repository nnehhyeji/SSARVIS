import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { UserResponse } from '../../apis/userApi';
import userApi from '../../apis/userApi';
import AssistantConversationStage from '../../components/features/assistant/AssistantConversationStage';
import { CONVERSATION_UI } from '../../constants/conversationUi';
import { useAICharacter } from '../../hooks/useAICharacter';
import { useChat } from '../../hooks/useChat';
import { useConversationStageState } from '../../hooks/useConversationStageState';
import { useMicStore } from '../../store/useMicStore';
import { useUserStore } from '../../store/useUserStore';

export default function AssistantPage() {
  const { userInfo, currentMode, setCurrentMode } = useUserStore();
  const didAutoStartRef = useRef(false);
  const [isTextInputMode, setIsTextInputMode] = useState(false);
  const [showMigrationNotice] = useState(!sessionStorage.getItem('assistant-mode-migrated-notice'));

  const {
    isMicOn,
    micPreferenceEnabled,
    mouthOpenRadius,
    faceType,
    isSpeaking,
    setIsSpeaking,
    triggerText,
    setMicPreferenceEnabled,
    setMicRuntimeActive,
  } = useAICharacter();
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
    updateRecordingContext,
    discardCurrentTurn,
    resetConversationRuntime,
  } = useChat();

  const [profile, setProfile] = useState<UserResponse | null>(null);
  const modeHistoriesRef = useRef<Record<string, { sender: 'ai' | 'me'; text: string }[]>>({
    normal: [],
    study: [],
    counseling: [],
    persona: [],
  });
  const prevModeRef = useRef(currentMode);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        const data = await userApi.getUserProfile();
        if (isMounted) setProfile(data);
      } catch (error) {
        console.error('Failed to load assistant profile:', error);
      }
    };

    void loadProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (currentMode === 'normal') {
      setCurrentMode('study');
      if (showMigrationNotice) {
        sessionStorage.setItem('assistant-mode-migrated-notice', '1');
      }
    }
  }, [currentMode, setCurrentMode, showMigrationNotice]);

  const pageNotice =
    currentMode === 'normal' || showMigrationNotice
      ? '일상 모드는 홈으로 이동되었어요. AI 비서에서는 학습 모드로 이어집니다.'
      : '';

  const finalIsSpeaking = isAiSpeaking || isSpeaking;

  const handleStartSpeaking = useCallback(() => setIsSpeaking(true), [setIsSpeaking]);
  const handleEndSpeaking = useCallback(() => setIsSpeaking(false), [setIsSpeaking]);

  useEffect(() => {
    if (!triggerText) return;

    handleStartSpeaking();
    const timer = setTimeout(handleEndSpeaking, triggerText.length * 100 + 500);
    return () => clearTimeout(timer);
  }, [triggerText, handleEndSpeaking, handleStartSpeaking]);

  const assistantType = useMemo(() => {
    if (currentMode === 'counseling') return 'COUNSEL';
    return 'STUDY';
  }, [currentMode]);

  useEffect(() => {
    const prevMode = prevModeRef.current;
    if (prevMode === currentMode) return;

    const nextMemoryPolicy = isLockMode ? 'SECRET' : 'GENERAL';

    const nextHistories = {
      ...modeHistoriesRef.current,
      [prevMode]: chatMessages,
    };
    modeHistoriesRef.current = nextHistories;
    setChatMessages(nextHistories[currentMode] || []);

    resetConversationRuntime();
    updateRecordingContext(null, assistantType, nextMemoryPolicy, 'USER_AI', null);
    prevModeRef.current = currentMode;

    void (async () => {
      if (!isMicOn) return;

      discardCurrentTurn();
      const started = await startRecording(null, assistantType, nextMemoryPolicy, 'USER_AI');
      setMicRuntimeActive(Boolean(started));
      if (!started) {
        setMicPreferenceEnabled(false);
        setIsTextInputMode(true);
      }
    })();
  }, [
    assistantType,
    chatMessages,
    currentMode,
    discardCurrentTurn,
    isLockMode,
    isMicOn,
    resetConversationRuntime,
    setChatMessages,
    setMicPreferenceEnabled,
    setMicRuntimeActive,
    startRecording,
    updateRecordingContext,
  ]);

  const {
    aiCaptionText,
    aiCaptionSegments,
    userCaptionText,
    userCaptionSegments,
    activeSpeaker,
    statusText,
    statusSubtext,
    isLongAiCaption,
    isLongUserCaption,
    isLongActiveCaption,
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

  const profileImage =
    profile?.userProfileImageUrl ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
      profile?.nickname || userInfo?.nickname || 'User',
    )}`;

  const assistantDisplayName = `${userInfo?.nickname || profile?.nickname || 'User'} AI`;
  const userDisplayName = profile?.nickname || userInfo?.nickname || 'User';

  const enableMic = useCallback(async () => {
    updateRecordingContext(null, assistantType, isLockMode ? 'SECRET' : 'GENERAL', 'USER_AI', null);
    setMicPreferenceEnabled(true);
    setIsTextInputMode(false);
    const started = await startRecording(
      null,
      assistantType,
      isLockMode ? 'SECRET' : 'GENERAL',
      'USER_AI',
    );
    setMicRuntimeActive(started);
    if (!started) {
      setIsTextInputMode(true);
    }
    return started;
  }, [
    assistantType,
    isLockMode,
    setMicPreferenceEnabled,
    setMicRuntimeActive,
    startRecording,
    updateRecordingContext,
  ]);

  const disableMic = useCallback(() => {
    setMicPreferenceEnabled(false);
    setMicRuntimeActive(false);
    setIsTextInputMode(true);
    stopRecordingAndSendSTT();
  }, [setMicPreferenceEnabled, setMicRuntimeActive, stopRecordingAndSendSTT]);

  const handleMicToggle = useCallback(() => {
    if (isMicOn) {
      disableMic();
      return;
    }
    void enableMic();
  }, [disableMic, enableMic, isMicOn]);

  const handleSendText = () => {
    if (!chatInput.trim()) return;
    sendMessage(chatInput);
  };

  useEffect(() => {
    if (!micStoreHydrated || !micPreferenceEnabled || didAutoStartRef.current || isMicOn) return;

    didAutoStartRef.current = true;
    const timeoutId = window.setTimeout(() => {
      void enableMic();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [enableMic, isMicOn, micPreferenceEnabled, micStoreHydrated]);

  useEffect(() => {
    return () => {
      setMicRuntimeActive(false);
    };
  }, [setMicRuntimeActive]);

  return (
    <AssistantConversationStage
      title={CONVERSATION_UI.titles.assistant}
      currentMode={currentMode}
      isLockMode={isLockMode}
      isMicOn={isMicOn}
      isTextInputMode={isTextInputMode}
      faceType={faceType}
      mouthOpenRadius={mouthOpenRadius}
      isCharacterSpeaking={finalIsSpeaking}
      assistantDisplayName={assistantDisplayName}
      userDisplayName={userDisplayName}
      profileImage={profileImage}
      aiCaptionText={aiCaptionText}
      aiDoneLength={aiCaptionSegments.doneLength}
      aiActiveLength={aiCaptionSegments.activeLength}
      userCaptionText={userCaptionText}
      userDoneLength={userCaptionSegments.doneLength}
      userActiveLength={userCaptionSegments.activeLength}
      activeSpeaker={activeSpeaker}
      statusText={statusText}
      statusSubtext={statusSubtext}
      isLongAiCaption={isLongAiCaption}
      isLongUserCaption={isLongUserCaption}
      isLongActiveCaption={isLongActiveCaption}
      pageNotice={pageNotice}
      connectionNotice={connectionNotice}
      chatInput={chatInput}
      onChatInputChange={setChatInput}
      onMicToggle={handleMicToggle}
      onSendText={handleSendText}
      onCancel={cancelTurn}
      onToggleLock={toggleLock}
      isContinuousConversationEnabled={isContinuousConversationEnabled}
    />
  );
}
