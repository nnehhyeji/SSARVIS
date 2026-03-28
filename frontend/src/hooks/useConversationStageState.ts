import { useEffect, useMemo, useState } from 'react';

import type { ChatMessage } from '../types';
import { CONVERSATION_UI } from '../constants/conversationUi';

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

interface UseConversationStageStateParams {
  chatMessages: ChatMessage[];
  latestAiText: string;
  triggerText: string;
  aiSpeechProgress: number;
  isMicOn: boolean;
  sttText: string;
  isAiSpeaking: boolean;
  isAwaitingResponse: boolean;
  isCharacterSpeaking: boolean;
  aiTextStreamingComplete?: boolean;
  aiStreamComplete?: boolean;
  isAiTextTyping?: boolean;
  connectionNotice?: string;
  liveCaptionWindowMs?: number;
  longCaptionThreshold?: number;
}

export function useConversationStageState({
  chatMessages,
  latestAiText,
  triggerText,
  aiSpeechProgress,
  isMicOn,
  sttText,
  isAiSpeaking,
  isAwaitingResponse,
  isCharacterSpeaking,
  aiTextStreamingComplete = true,
  aiStreamComplete = true,
  isAiTextTyping = false,
  connectionNotice,
  liveCaptionWindowMs = 1600,
  longCaptionThreshold = 55,
}: UseConversationStageStateParams) {
  const [lastUserSpeechAt, setLastUserSpeechAt] = useState(0);
  const [awaitingStatusText, setAwaitingStatusText] = useState<string>(CONVERSATION_UI.status.awaiting);

  const lastAiMessage = useMemo(() => {
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

  useEffect(() => {
    if (!isAwaitingResponse || connectionNotice) {
      setAwaitingStatusText(CONVERSATION_UI.status.awaiting);
      return;
    }

    const variants = CONVERSATION_UI.status.awaitingVariants;
    const next = variants[Math.floor(Math.random() * variants.length)] ?? '';
    setAwaitingStatusText(next || CONVERSATION_UI.status.awaiting);
  }, [connectionNotice, isAwaitingResponse]);

  const isLiveUserCaption =
    isMicOn &&
    !isAiSpeaking &&
    !isAwaitingResponse &&
    sttText.trim().length > 0 &&
    Date.now() - lastUserSpeechAt < liveCaptionWindowMs;

  const userCaptionText = isLiveUserCaption ? sttText.trim() : lastUserMessage;
  const userCaptionSegments = isLiveUserCaption
    ? getActiveSegment(userCaptionText)
    : { doneLength: userCaptionText.length, activeLength: 0 };

  const aiCaptionText = latestAiText || triggerText || lastAiMessage;
  const aiCaptionSegments = useMemo(() => {
    if (!aiCaptionText) return { doneLength: 0, activeLength: 0 };
    if (aiStreamComplete || (aiTextStreamingComplete && !isAiSpeaking && !isAiTextTyping)) {
      return { doneLength: aiCaptionText.length, activeLength: 0 };
    }
    if (isCharacterSpeaking) {
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

    return getActiveSegment(aiCaptionText);
  }, [aiCaptionText, aiSpeechProgress, aiStreamComplete, aiTextStreamingComplete, isAiSpeaking, isAiTextTyping, isCharacterSpeaking]);

  const activeSpeaker: 'ai' | 'user' | null = isAiSpeaking ? 'ai' : isLiveUserCaption ? 'user' : null;
  const activeCaptionText = activeSpeaker === 'ai' ? aiCaptionText : activeSpeaker === 'user' ? userCaptionText : '';
  const isLongAiCaption = aiCaptionText.trim().length >= longCaptionThreshold;
  const isLongUserCaption = userCaptionText.trim().length >= longCaptionThreshold;
  const isLongActiveCaption = activeCaptionText.trim().length >= longCaptionThreshold;

  const statusText = connectionNotice
    ? connectionNotice
    : isAiSpeaking
      ? CONVERSATION_UI.status.aiSpeaking
      : isLiveUserCaption
        ? CONVERSATION_UI.status.userSpeaking
        : isAwaitingResponse
          ? awaitingStatusText
          : isMicOn
            ? CONVERSATION_UI.status.idle
            : CONVERSATION_UI.status.textInput;

  return {
    aiCaptionText,
    aiCaptionSegments,
    userCaptionText,
    userCaptionSegments,
    activeSpeaker,
    statusText,
    statusSubtext: '',
    isLongAiCaption,
    isLongUserCaption,
    isLongActiveCaption,
    lastAiMessage,
    lastUserMessage,
    isLiveUserCaption,
  };
}
