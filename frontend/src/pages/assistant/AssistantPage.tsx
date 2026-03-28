import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { UserResponse } from '../../apis/userApi';
import userApi from '../../apis/userApi';
import AssistantConversationStage from '../../components/features/assistant/AssistantConversationStage';
import { CONVERSATION_UI } from '../../constants/conversationUi';
import { useAICharacter } from '../../hooks/useAICharacter';
import { useChat } from '../../hooks/useChat';
import { useConversationStageState } from '../../hooks/useConversationStageState';
import { useUserStore } from '../../store/useUserStore';

export default function AssistantPage() {
  const { userInfo, currentMode, setCurrentMode } = useUserStore();
  const didAutoStartRef = useRef(false);
  const [pageNotice, setPageNotice] = useState('');
  const [isTextInputMode, setIsTextInputMode] = useState(false);

  const { isMicOn, mouthOpenRadius, faceType, toggleMic, isSpeaking, setIsSpeaking, triggerText } =
    useAICharacter();

  const {
    chatInput,
    chatMessages,
    latestAiText,
    aiSpeechProgress,
    isLockMode,
    sttText,
    isAiSpeaking,
    isAwaitingResponse,
    connectionNotice,
    setChatInput,
    setChatMessages,
    toggleLock,
    sendMessage,
    startRecording,
    stopRecordingAndSendSTT,
    cancelTurn,
  } = useChat();

  const [profile, setProfile] = useState<UserResponse | null>(null);
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
      if (!sessionStorage.getItem('assistant-mode-migrated-notice')) {
        setPageNotice('일상 모드는 홈으로 이동되었어요. AI 비서에서는 학습 모드로 이어집니다.');
        sessionStorage.setItem('assistant-mode-migrated-notice', '1');
      }
    }
  }, [currentMode, setCurrentMode]);

  useEffect(() => {
    const prevMode = prevModeRef.current;
    if (prevMode !== currentMode) {
      cancelTurn();

      setModeHistories((prev) => ({
        ...prev,
        [prevMode]: chatMessages,
      }));

      const history = modeHistories[currentMode] || [];
      setChatMessages(history);
      prevModeRef.current = currentMode;
    }
  }, [cancelTurn, chatMessages, currentMode, modeHistories, setChatMessages]);

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
    connectionNotice,
  });

  const profileImage =
    profile?.userProfileImageUrl ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
      profile?.nickname || userInfo?.nickname || 'User',
    )}`;

  const assistantDisplayName = `${userInfo?.nickname || profile?.nickname || 'User'} AI`;
  const userDisplayName = profile?.nickname || userInfo?.nickname || 'User';

  const handleMicToggle = () => {
    toggleMic();
    if (!isMicOn) {
      setIsTextInputMode(false);
      startRecording(null, assistantType, isLockMode ? 'SECRET' : 'GENERAL', 'USER_AI');
    } else {
      setIsTextInputMode(true);
      stopRecordingAndSendSTT();
    }
  };

  const handleSendText = () => {
    if (!chatInput.trim()) return;
    sendMessage(chatInput);
  };

  useEffect(() => {
    if (didAutoStartRef.current || isMicOn) return;

    didAutoStartRef.current = true;
    setIsTextInputMode(false);
    toggleMic();
    startRecording(null, assistantType, isLockMode ? 'SECRET' : 'GENERAL', 'USER_AI');
  }, [assistantType, isLockMode, isMicOn, startRecording, toggleMic]);

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
    />
  );
}
