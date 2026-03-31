import { useMemo } from 'react';

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

function getVisibleSegmentAroundIndex(text: string, index: number) {
  const trimmed = text.trimEnd();
  if (!trimmed) {
    return {
      text: '',
      doneLength: 0,
      activeLength: 0,
    };
  }

  const segment = getSegmentAroundIndex(trimmed, index);
  const visibleLength = Math.min(
    trimmed.length,
    segment.doneLength + segment.activeLength,
  );

  return {
    text: trimmed.slice(0, visibleLength),
    doneLength: segment.doneLength,
    activeLength: segment.activeLength,
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

  const isLiveUserCaption =
    isMicOn && !isAiSpeaking && !isAwaitingResponse && sttText.trim().length > 0;

  void liveCaptionWindowMs;

  const awaitingStatusText = connectionNotice
    ? CONVERSATION_UI.status.awaiting
    : CONVERSATION_UI.status.awaitingVariants[0] || CONVERSATION_UI.status.awaiting;

  const userCaptionText = isLiveUserCaption ? sttText.trim() : lastUserMessage;
  const userCaptionSegments = isLiveUserCaption
    ? getActiveSegment(userCaptionText)
    : { doneLength: userCaptionText.length, activeLength: 0 };

  const aiCaptionState = useMemo(() => {
    const fullAiText = latestAiText || triggerText || lastAiMessage;
    if (!fullAiText) {
      return {
        text: '',
        doneLength: 0,
        activeLength: 0,
      };
    }

    if (isCharacterSpeaking) {
      const spokenLength = Math.max(
        0,
        Math.min(Math.floor(fullAiText.length * aiSpeechProgress), fullAiText.length),
      );

      if (spokenLength === 0) {
        return { text: '', doneLength: 0, activeLength: 0 };
      }

      return getVisibleSegmentAroundIndex(fullAiText, spokenLength);
    }

    if (isAiTextTyping) {
      const typedText = lastAiMessage || '';
      return {
        text: typedText,
        ...(typedText
          ? getActiveSegment(typedText)
          : { doneLength: 0, activeLength: 0 }),
      };
    }

    if (aiStreamComplete || (aiTextStreamingComplete && !isAiSpeaking && !isAiTextTyping)) {
      return {
        text: fullAiText,
        doneLength: fullAiText.length,
        activeLength: 0,
      };
    }

    return {
      text: fullAiText,
      ...getActiveSegment(fullAiText),
    };
  }, [
    aiSpeechProgress,
    aiStreamComplete,
    aiTextStreamingComplete,
    isAiSpeaking,
    isAiTextTyping,
    isCharacterSpeaking,
    lastAiMessage,
    latestAiText,
    triggerText,
  ]);
  const aiCaptionText = aiCaptionState.text;
  const aiCaptionSegments = {
    doneLength: aiCaptionState.doneLength,
    activeLength: aiCaptionState.activeLength,
  };

  const activeSpeaker: 'ai' | 'user' | null = isAiSpeaking
    ? 'ai'
    : isLiveUserCaption
      ? 'user'
      : null;
  const activeCaptionText =
    activeSpeaker === 'ai' ? aiCaptionText : activeSpeaker === 'user' ? userCaptionText : '';
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
