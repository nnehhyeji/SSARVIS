import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useAICharacter } from '../../hooks/useAICharacter';
import { useChat } from '../../hooks/useChat';
import { useUserStore } from '../../store/useUserStore';
import { useAIToAIChat } from '../../hooks/useAIToAIChat';
import { useMicStore } from '../../store/useMicStore';
import { useConversationStageState } from '../../hooks/useConversationStageState';
import AiTopicModal from '../../components/features/assistant/AiTopicModal';
import AssistantConversationStage from '../../components/features/assistant/AssistantConversationStage';
import NamnaConversationStage from '../../components/features/namna/NamnaConversationStage';
import { initialsAvatarFallback } from '../../utils/avatar';
import { getEvaluationList } from '../../apis/aiApi';
import SharePersonaModal from '../../components/features/follow/SharePersonaModal';
import { PAGE_INSET, SIDEBAR_SAFE_PADDING } from '../../constants/conversationUi';

export default function NamnaPage() {
  const NAMNA_PROMPT_THRESHOLD = 5;
  const { userInfo } = useUserStore();
  const [searchParams] = useSearchParams();
  const aiToAiChat = useAIToAIChat();
  const isDualParamEnabled = searchParams.get('dual') === 'true';

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
  } = useAICharacter();
  const micStoreHydrated = useMicStore((state) => state.hasHydrated);

  const {
    chatInput,
    chatMessages,
    latestAiText,
    isLockMode,
    sttText,
    isAiSpeaking,
    isAwaitingResponse,
    aiSpeechProgress,
    aiTextStreamingComplete,
    aiStreamComplete,
    isAiTextTyping,
    setChatInput,
    sendMessage,
    startRecording,
    stopRecordingAndSendSTT,
    toggleLock,
    cancelTurn,
  } = useChat();

  const [isDualAiMode, setIsDualAiMode] = useState(isDualParamEnabled);
  const [isInteractionModalOpen, setIsInteractionModalOpen] = useState(isDualParamEnabled);
  const [isTextInputMode, setIsTextInputMode] = useState(!isMicOn);
  const [evaluationCount, setEvaluationCount] = useState(0);
  const [isSharePersonaModalOpen, setIsSharePersonaModalOpen] = useState(false);
  const hasStartedDualBattleRef = useRef(false);
  const didAutoStartRef = useRef(false);

  const isNamnaReady = evaluationCount >= NAMNA_PROMPT_THRESHOLD;
  const namnaLevel = isNamnaReady ? Math.floor(evaluationCount / NAMNA_PROMPT_THRESHOLD) : 0;
  const namnaCycleCount = evaluationCount % NAMNA_PROMPT_THRESHOLD;
  const namnaProgressCurrent = namnaCycleCount;
  const namnaRemainingCount = NAMNA_PROMPT_THRESHOLD - namnaProgressCurrent;
  const namnaHeaderLabel = isNamnaReady
    ? `남나 AI LV ${namnaLevel}`
    : `남나 AI 생성 중 · ${namnaProgressCurrent}/${NAMNA_PROMPT_THRESHOLD}`;
  const namnaHeaderSubtext = isNamnaReady
    ? `업데이트 진행도 ${namnaProgressCurrent}/${NAMNA_PROMPT_THRESHOLD} · 총 ${evaluationCount}개 문답`
    : `AI가 열리려면 ${namnaRemainingCount}개 더 필요해요`;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (isDualParamEnabled) {
        setIsDualAiMode(true);
        setIsInteractionModalOpen(false);
        hasStartedDualBattleRef.current = false;
      } else {
        setIsDualAiMode(false);
        setIsInteractionModalOpen(false);
        hasStartedDualBattleRef.current = false;
      }
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isDualParamEnabled]);

  useEffect(() => {
    if (!isNamnaReady) {
      setIsInteractionModalOpen(false);
    }
  }, [isNamnaReady]);

  useEffect(() => {
    if (!userInfo?.id) return;

    void (async () => {
      try {
        const response = await getEvaluationList();
        setEvaluationCount(response.data.totalCount);
      } catch (error) {
        console.error('남이 보는 나 평가 현황 조회 실패:', error);
      }
    })();
  }, [userInfo?.id]);

  useEffect(() => {
    setIsTextInputMode(!isMicOn);
  }, [isMicOn]);

  useEffect(() => {
    if (
      !isNamnaReady ||
      !micStoreHydrated ||
      !micPreferenceEnabled ||
      didAutoStartRef.current ||
      isMicOn
    ) {
      return;
    }

    void (async () => {
      setIsTextInputMode(false);
      const started = await startRecording(
        null,
        'PERSONA',
        isLockMode ? 'SECRET' : 'GENERAL',
        'USER_AI',
      );
      setMicRuntimeActive(Boolean(started));
      if (!started) {
        setIsTextInputMode(true);
      }
      didAutoStartRef.current = true;
    })();
  }, [
    isLockMode,
    isNamnaReady,
    isMicOn,
    micPreferenceEnabled,
    micStoreHydrated,
    setMicRuntimeActive,
    startRecording,
  ]);

  useEffect(() => {
    return () => {
      setMicRuntimeActive(false);
    };
  }, [setMicRuntimeActive]);

  useEffect(() => {
    if (triggerText) {
      setIsSpeaking(true);
      const t = setTimeout(() => setIsSpeaking(false), triggerText.length * 100 + 500);
      return () => clearTimeout(t);
    }
  }, [setIsSpeaking, triggerText]);

  useEffect(() => {
    if (myTriggerText) {
      setIsMyAiSpeaking(true);
      const t = setTimeout(() => setIsMyAiSpeaking(false), myTriggerText.length * 100 + 500);
      return () => clearTimeout(t);
    }
  }, [myTriggerText, setIsMyAiSpeaking]);

  useEffect(() => {
    if (!isDualAiMode || !hasStartedDualBattleRef.current || aiToAiChat.isBattling) return;
    hasStartedDualBattleRef.current = false;

    const timeoutId = window.setTimeout(() => {
      setIsDualAiMode(isDualParamEnabled);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [aiToAiChat.isBattling, isDualAiMode, isDualParamEnabled]);

  const {
    aiCaptionText,
    aiCaptionSegments,
    userCaptionText,
    userCaptionSegments,
    activeSpeaker,
    statusText,
    statusSubtext,
  } = useConversationStageState({
    chatMessages,
    latestAiText,
    triggerText,
    aiSpeechProgress,
    isMicOn,
    sttText,
    isAiSpeaking,
    isAwaitingResponse,
    isCharacterSpeaking: isAiSpeaking || isSpeaking,
    aiTextStreamingComplete,
    aiStreamComplete,
    isAiTextTyping,
  });

  const leftCaptionText = isDualAiMode ? aiToAiChat.targetLatestText || triggerText : aiCaptionText;
  const leftDoneLength = isDualAiMode
    ? aiToAiChat.activeSpeaker === 'target' && leftCaptionText.trim()
      ? Math.max(0, leftCaptionText.length - 1)
      : leftCaptionText.length
    : aiCaptionSegments.doneLength;
  const leftActiveLength = isDualAiMode
    ? aiToAiChat.activeSpeaker === 'target' && leftCaptionText.trim()
      ? 1
      : 0
    : aiCaptionSegments.activeLength;

  const rightCaptionText = isDualAiMode
    ? aiToAiChat.myLatestText || myTriggerText
    : userCaptionText;
  const rightDoneLength = isDualAiMode
    ? aiToAiChat.activeSpeaker === 'mine' && rightCaptionText.trim()
      ? Math.max(0, rightCaptionText.length - 1)
      : rightCaptionText.length
    : userCaptionSegments.doneLength;
  const rightActiveLength = isDualAiMode
    ? aiToAiChat.activeSpeaker === 'mine' && rightCaptionText.trim()
      ? 1
      : 0
    : userCaptionSegments.activeLength;

  const stageActiveSpeaker: 'left' | 'right' | null = isDualAiMode
    ? aiToAiChat.activeSpeaker === 'target'
      ? 'left'
      : aiToAiChat.activeSpeaker === 'mine'
        ? 'right'
        : null
    : activeSpeaker === 'ai'
      ? 'left'
      : activeSpeaker === 'user'
        ? 'right'
        : null;

  const handleDualAiTopicSubmit = useCallback(
    async (topic: string) => {
      if (!userInfo?.id || !isNamnaReady) return;

      const started = await aiToAiChat.startBattle({
        topic,
        myUserId: userInfo.id,
        targetUserId: userInfo.id,
        myAssistantType: 'DAILY',
        targetAssistantType: 'PERSONA',
      });

      if (!started) return;

      hasStartedDualBattleRef.current = true;
      setIsDualAiMode(true);
      setIsInteractionModalOpen(false);
      setMyTriggerText('');
      setTriggerText('');
    },
    [aiToAiChat, isNamnaReady, setMyTriggerText, setTriggerText, userInfo],
  );

  const handleMicToggle = useCallback(() => {
    if (!isNamnaReady) return;

    if (isMicOn) {
      setMicPreferenceEnabled(false);
      setMicRuntimeActive(false);
      setIsTextInputMode(true);
      stopRecordingAndSendSTT();
      return;
    }

    void (async () => {
      setMicPreferenceEnabled(true);
      setIsTextInputMode(false);
      const started = await startRecording(
        null,
        'PERSONA',
        isLockMode ? 'SECRET' : 'GENERAL',
        'USER_AI',
      );
      setMicRuntimeActive(Boolean(started));
      if (!started) {
        setIsTextInputMode(true);
      }
    })();
  }, [
    isLockMode,
    isNamnaReady,
    isMicOn,
    setMicPreferenceEnabled,
    setMicRuntimeActive,
    startRecording,
    stopRecordingAndSendSTT,
  ]);

  const handleSendText = useCallback(() => {
    if (!isNamnaReady) return;
    if (!chatInput.trim()) return;
    sendMessage(chatInput);
  }, [chatInput, isNamnaReady, sendMessage]);

  const handleCancel = useCallback(() => {
    if (aiToAiChat.isBattling || aiToAiChat.topic) {
      hasStartedDualBattleRef.current = false;
      aiToAiChat.stopBattle();
      setIsDualAiMode(isDualParamEnabled);
      setIsInteractionModalOpen(false);
      return;
    }

    cancelTurn();
  }, [aiToAiChat, cancelTurn, isDualParamEnabled]);

  const profileImage = initialsAvatarFallback(userInfo?.nickname || 'User');
  const namnaDisplayName = `남이 본 ${userInfo?.nickname || '나'}`;

  if (!isNamnaReady) {
    return (
      <>
        <div className={`relative h-full w-full overflow-hidden bg-white ${SIDEBAR_SAFE_PADDING}`}>
          <header className={`flex shrink-0 items-end justify-between pb-6 ${PAGE_INSET}`}>
            <h1 className="text-[46px] font-black tracking-[-0.06em] text-black md:text-[54px]">
              남이 보는 나
            </h1>
          </header>

          <div className="w-full shrink-0 border-t border-[#E5E5E5]" />

          <div className="relative flex h-[calc(100%-10rem)] items-center justify-center">
            <div className="absolute inset-0 bg-gray/20" />
            <div className="relative z-10 w-full max-w-[560px] px-6">
              <div className="rounded-[10px] border border-[#ECE4E6] bg-white px-8 py-10 shadow-[0_24px_70px_rgba(0,0,0,0.12)]">
                <div className="mx-auto mb-10 flex max-w-[280px] flex-col gap-3 rounded-[24px] border border-[#F2D9DE] bg-[#FFF8F9] px-5 py-4 shadow-sm">
                  <div className="text-center text-sm font-black tracking-[-0.03em] text-[#D84D66]">
                    남나 AI 생성 중 · {namnaProgressCurrent}/{NAMNA_PROMPT_THRESHOLD}
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-[#EFE6E8]">
                    <div
                      className="h-full rounded-full transition-[width] duration-500"
                      style={{
                        width: `${(namnaProgressCurrent / NAMNA_PROMPT_THRESHOLD) * 100}%`,
                        backgroundColor: 'var(--color-primary)',
                      }}
                    />
                  </div>
                  <div className="text-center text-xs font-semibold tracking-[-0.02em] text-[#7C7280]">
                    AI가 열리려면 {namnaRemainingCount}개 더 필요해요
                  </div>
                </div>

                <div className="mb-10 text-center">
                  <h2 className="text-[clamp(2rem,3vw,2.7rem)] font-black tracking-[-0.01em] text-[#111111]">
                    아직 남이보는 나 AI가 생성되지 않았어요!
                  </h2>
                  <p className="mt-3 text-[clamp(1.15rem,1.8vw,1.5rem)] font-bold tracking-[-0.03em] text-[#232323]">
                    {namnaRemainingCount}개가 더 모이면 AI가 생성돼요.
                  </p>
                </div>

                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => setIsSharePersonaModalOpen(true)}
                    className="rounded-2xl px-10 py-4 text-xl font-black tracking-[-0.04em] text-white shadow-[0_16px_36px_rgba(247,87,110,0.28)] transition-transform hover:-translate-y-0.5"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    문답 공유하기
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <SharePersonaModal
          isOpen={isSharePersonaModalOpen}
          onClose={() => setIsSharePersonaModalOpen(false)}
        />
      </>
    );
  }

  return (
    <>
      {isDualAiMode ? (
        <NamnaConversationStage
          title="남이 보는 나"
          isLockMode={isLockMode}
          isMicOn={isMicOn}
          isTextInputMode={isTextInputMode}
          headerRightActionLabel="링크 공유"
          onHeaderRightAction={() => setIsSharePersonaModalOpen(true)}
          headerCenterLabel={
            aiToAiChat.topic ? `주제: ${aiToAiChat.topic}` : '주제를 입력해주세요!'
          }
          onHeaderCenterAction={() => setIsInteractionModalOpen(true)}
          onHeaderCenterClear={aiToAiChat.topic ? handleCancel : undefined}
          leftFaceType={(faceType + 2) % 6}
          leftMouthOpenRadius={mouthOpenRadius}
          leftMode="persona"
          leftIsSpeaking={aiToAiChat.activeSpeaker === 'target'}
          leftDisplayName={namnaDisplayName}
          leftCaptionText={leftCaptionText}
          leftDoneLength={leftDoneLength}
          leftActiveLength={leftActiveLength}
          rightFaceType={faceType}
          rightMouthOpenRadius={myMouthOpenRadius}
          rightMode="normal"
          rightIsSpeaking={aiToAiChat.activeSpeaker === 'mine'}
          rightDisplayName={`${userInfo?.nickname || '내'} AI`}
          rightCaptionText={rightCaptionText}
          rightDoneLength={rightDoneLength}
          rightActiveLength={rightActiveLength}
          activeSpeaker={stageActiveSpeaker}
          statusText={aiToAiChat.statusMessage}
          statusSubtext={statusSubtext}
          connectionNotice={aiToAiChat.errorMessage || undefined}
          progressCurrent={aiToAiChat.turnCount}
          progressTotal={aiToAiChat.maxTurn}
          progressLabel="AI 대화 진행"
          useProgressFooter
          showContinuationPrompt={aiToAiChat.isAwaitingContinuation}
          onContinueConversation={aiToAiChat.continueBattle}
          onStopConversation={handleCancel}
          chatInput={chatInput}
          onChatInputChange={setChatInput}
          onMicToggle={handleMicToggle}
          onSendText={handleSendText}
          onCancel={handleCancel}
          onToggleLock={toggleLock}
        />
      ) : (
        <AssistantConversationStage
          title="남이 보는 나"
          currentMode="persona"
          isLockMode={isLockMode}
          isMicOn={isMicOn}
          isTextInputMode={isTextInputMode}
          headerRightActionLabel="링크 공유"
          onHeaderRightAction={() => setIsSharePersonaModalOpen(true)}
          headerCenterLabel={namnaHeaderLabel}
          headerCenterSubtext={namnaHeaderSubtext}
          headerCenterProgressCurrent={namnaProgressCurrent}
          headerCenterProgressTotal={NAMNA_PROMPT_THRESHOLD}
          faceType={(faceType + 2) % 6}
          mouthOpenRadius={mouthOpenRadius}
          isCharacterSpeaking={isAiSpeaking || isSpeaking}
          assistantDisplayName={namnaDisplayName}
          userDisplayName={userInfo?.nickname || '나'}
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
          chatInput={chatInput}
          onChatInputChange={setChatInput}
          onMicToggle={handleMicToggle}
          onSendText={handleSendText}
          onCancel={handleCancel}
          onToggleLock={toggleLock}
        />
      )}

      {isNamnaReady ? (
        <>
          <AiTopicModal
            isOpen={isInteractionModalOpen}
            onClose={() => setIsInteractionModalOpen(false)}
            onSubmit={handleDualAiTopicSubmit}
          />
          <SharePersonaModal
            isOpen={isSharePersonaModalOpen}
            onClose={() => setIsSharePersonaModalOpen(false)}
          />
        </>
      ) : null}
    </>
  );
}
