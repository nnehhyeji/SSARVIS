import { useState, useCallback, useMemo, useEffect, useRef } from 'react';

import type { UserResponse } from '../../apis/userApi';
import userApi from '../../apis/userApi';
import AssistantConversationStage from '../../components/features/assistant/AssistantConversationStage';
import { useAICharacter } from '../../hooks/useAICharacter';
import { useChat } from '../../hooks/useChat';
import { useUserStore } from '../../store/useUserStore';

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

export default function AssistantPage() {
  const { userInfo, currentMode } = useUserStore();
  const didAutoStartRef = useRef(false);

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
  const [lastUserSpeechAt, setLastUserSpeechAt] = useState(0);
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
    if (currentMode === 'normal') return 'DAILY';
    return currentMode.toUpperCase();
  }, [currentMode]);

  const lastAiRenderedMessage = useMemo(() => {
    return (
      chatMessages
        .slice()
        .reverse()
        .find((message) => message.sender === 'ai')?.text || ''
    );
  }, [chatMessages]);

  const lastUserMessage = useMemo(() => {
    return (
      chatMessages
        .slice()
        .reverse()
        .find((message) => message.sender === 'me')?.text || ''
    );
  }, [chatMessages]);

  useEffect(() => {
    if (sttText.trim() && !isAiSpeaking && !isAwaitingResponse) {
      setLastUserSpeechAt(Date.now());
    }
  }, [sttText, isAiSpeaking, isAwaitingResponse]);

  const isLiveUserCaption =
    isMicOn &&
    !isAiSpeaking &&
    !isAwaitingResponse &&
    sttText.trim().length > 0 &&
    Date.now() - lastUserSpeechAt < 1600;

  const userCaptionText = isLiveUserCaption ? sttText.trim() : lastUserMessage;
  const userCaptionSegments = isLiveUserCaption
    ? getActiveSegment(userCaptionText)
    : { doneLength: userCaptionText.length, activeLength: 0 };

  const aiCaptionText = latestAiText || triggerText || lastAiRenderedMessage;
  const aiCaptionSegments = useMemo(() => {
    if (!aiCaptionText) return { doneLength: 0, activeLength: 0 };
    if (finalIsSpeaking) {
      const spokenLength = Math.max(
        0,
        Math.min(Math.floor(aiCaptionText.length * aiSpeechProgress), aiCaptionText.length),
      );

      if (spokenLength === 0) return { doneLength: 0, activeLength: 0 };

      return {
        doneLength: Math.max(0, spokenLength - 1),
        activeLength: 1,
      };
    }

    return { doneLength: aiCaptionText.length, activeLength: 0 };
  }, [aiCaptionText, aiSpeechProgress, finalIsSpeaking]);

  const profileImage =
    profile?.userProfileImageUrl ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
      profile?.nickname || userInfo?.nickname || 'User',
    )}`;

  const assistantDisplayName = `${userInfo?.nickname || profile?.nickname || 'User'} AI`;
  const userDisplayName = profile?.nickname || userInfo?.nickname || 'User';
  const activeSpeaker: 'ai' | 'user' | null = isAiSpeaking ? 'ai' : isLiveUserCaption ? 'user' : null;

  const statusText = connectionNotice
    ? connectionNotice
    : isAiSpeaking
      ? 'AI 응답 중'
      : isLiveUserCaption
        ? '말하는 중'
        : isAwaitingResponse
          ? '응답 대기 중'
          : isMicOn
            ? '대기 중'
            : '텍스트 입력 가능';

  const handleMicToggle = () => {
    toggleMic();
    if (!isMicOn) {
      startRecording(null, assistantType, isLockMode ? 'SECRET' : 'GENERAL', 'USER_AI');
    } else {
      stopRecordingAndSendSTT();
    }
  };

  const handleSendText = () => {
    if (!chatInput.trim()) return;
    sendMessage(chatInput, null, assistantType, isLockMode ? 'SECRET' : 'GENERAL', 'USER_AI');
  };

  useEffect(() => {
    if (didAutoStartRef.current || isMicOn) return;

    didAutoStartRef.current = true;
    toggleMic();
    startRecording(null, assistantType, isLockMode ? 'SECRET' : 'GENERAL', 'USER_AI');
  }, [assistantType, isLockMode, isMicOn, startRecording, toggleMic]);

  return (
    <AssistantConversationStage
      title="대화"
      currentMode={currentMode}
      isLockMode={isLockMode}
      isMicOn={isMicOn}
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
