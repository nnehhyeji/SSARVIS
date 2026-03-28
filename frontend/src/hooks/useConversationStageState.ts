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
  connectionNotice?: string;
  liveCaptionWindowMs?: number;
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
  connectionNotice,
  liveCaptionWindowMs = 1600,
}: UseConversationStageStateParams) {
  const [lastUserSpeechAt, setLastUserSpeechAt] = useState(0);
  const [statusSubtext, setStatusSubtext] = useState('');

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
      setStatusSubtext('');
      return;
    }

    const variants = CONVERSATION_UI.status.awaitingVariants;
    const next = variants[Math.floor(Math.random() * variants.length)] ?? '';
    setStatusSubtext(next);
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

    return { doneLength: aiCaptionText.length, activeLength: 0 };
  }, [aiCaptionText, aiSpeechProgress, isCharacterSpeaking]);

  const activeSpeaker: 'ai' | 'user' | null = isAiSpeaking ? 'ai' : isLiveUserCaption ? 'user' : null;

  const statusText = connectionNotice
    ? connectionNotice
    : isAiSpeaking
      ? CONVERSATION_UI.status.aiSpeaking
      : isLiveUserCaption
        ? CONVERSATION_UI.status.userSpeaking
        : isAwaitingResponse
          ? CONVERSATION_UI.status.awaiting
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
    statusSubtext,
    lastAiMessage,
    lastUserMessage,
    isLiveUserCaption,
  };
}
