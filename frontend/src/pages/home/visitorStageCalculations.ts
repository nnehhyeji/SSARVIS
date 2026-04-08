import { getDualCaptionSegments, type CaptionSegments } from './captionSegments';

type ActiveSpeaker = 'target' | 'mine' | null;

type AiToAiStageInput = {
  isBattling: boolean;
  targetLatestText: string;
  targetSpeechProgress: number;
  myLatestText: string;
  mySpeechProgress: number;
  activeSpeaker: ActiveSpeaker;
  statusMessage: string;
  topic?: string | null;
};

type VisitorStageCalculationInput = {
  isMyHome: boolean;
  isVisitorDualAiMode: boolean;
  hasVisitorConversationStarted: boolean;
  visitorConnectionNotice: string;
  isMicOn: boolean;
  voicePhase: string;
  wakeWordDetectedAt: number | null;
  triggerText: string;
  myTriggerText: string;
  visitorAiCaptionText: string;
  visitorAiCaptionSegments: CaptionSegments;
  visitorIdleMessageIndex: number;
  visitorIntroText: string;
  visitorWakeWordGuide: string;
  isAwaitingResponse: boolean;
  visitorListeningStatus: string;
  visitorStageStatusText: string;
  aiToAiChat: AiToAiStageInput;
  now: number;
};

type VisitorDualActiveSpeaker = 'left' | 'right' | null;

export function calculateVisitorStageState(input: VisitorStageCalculationInput) {
  const {
    isMyHome,
    isVisitorDualAiMode,
    hasVisitorConversationStarted,
    visitorConnectionNotice,
    isMicOn,
    voicePhase,
    wakeWordDetectedAt,
    triggerText,
    myTriggerText,
    visitorAiCaptionText,
    visitorAiCaptionSegments,
    visitorIdleMessageIndex,
    visitorIntroText,
    visitorWakeWordGuide,
    isAwaitingResponse,
    visitorListeningStatus,
    visitorStageStatusText,
    aiToAiChat,
    now,
  } = input;

  const visitorIsListening = voicePhase === 'speech';
  const visitorNeedsWakeWordGuide =
    !isMyHome &&
    !aiToAiChat.isBattling &&
    !hasVisitorConversationStarted &&
    !visitorConnectionNotice &&
    isMicOn &&
    voicePhase === 'wake';
  const visitorWakeDetected =
    wakeWordDetectedAt !== null && now - wakeWordDetectedAt < 1000;
  const shouldRotateVisitorIdleMessages = visitorNeedsWakeWordGuide;

  const shouldUseTriggerText =
    !hasVisitorConversationStarted && triggerText.trim().length > 0;
  const visitorBaseCaptionText = shouldUseTriggerText ? triggerText : visitorAiCaptionText;
  const visitorBaseDoneLength = shouldUseTriggerText
    ? triggerText.length
    : visitorAiCaptionSegments.doneLength;
  const visitorBaseActiveLength = shouldUseTriggerText
    ? 0
    : visitorAiCaptionSegments.activeLength;

  const battleCaptionText =
    aiToAiChat.isBattling && aiToAiChat.targetLatestText.trim()
      ? aiToAiChat.targetLatestText
      : visitorBaseCaptionText;
  const battleCaptionSegments = getDualCaptionSegments(
    battleCaptionText,
    aiToAiChat.activeSpeaker === 'target' && battleCaptionText.trim().length > 0,
    aiToAiChat.targetSpeechProgress,
  );
  const visitorStageCaptionText = aiToAiChat.isBattling
    ? battleCaptionText
    : visitorBaseCaptionText;
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
    : isAwaitingResponse
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
  const visitorDualRightCaptionText = aiToAiChat.myLatestText || myTriggerText;
  const visitorDualRightSegments = getDualCaptionSegments(
    visitorDualRightCaptionText,
    aiToAiChat.activeSpeaker === 'mine',
    aiToAiChat.mySpeechProgress,
  );
  const visitorDualActiveSpeaker: VisitorDualActiveSpeaker =
    aiToAiChat.activeSpeaker === 'target'
      ? 'left'
      : aiToAiChat.activeSpeaker === 'mine'
        ? 'right'
        : null;

  return {
    visitorIsListening,
    visitorNeedsWakeWordGuide,
    visitorWakeDetected,
    shouldRotateVisitorIdleMessages,
    visitorWakeWordGuide,
    visitorCaptionText,
    visitorCaptionDoneLength,
    visitorCaptionActiveLength,
    visitorStageStatus,
    isVisitorDualAiSceneOpen,
    visitorDualLeftCaptionText,
    visitorDualLeftDoneLength: visitorDualLeftSegments.doneLength,
    visitorDualLeftActiveLength: visitorDualLeftSegments.activeLength,
    visitorDualRightCaptionText,
    visitorDualRightDoneLength: visitorDualRightSegments.doneLength,
    visitorDualRightActiveLength: visitorDualRightSegments.activeLength,
    visitorDualActiveSpeaker,
  };
}
