import { useCallback } from 'react';

type AssistantTypeGetter = () => string;
type MemoryPolicyGetter = () => string;
type SessionCategoryGetter = () => 'USER_AI' | 'AVATAR_AI';

type StartRecordingFn = (
  sessionId: string | null,
  assistantType: string,
  memoryPolicy: string,
  category?: string,
  targetId?: number | null,
) => Promise<boolean>;

type StopRecordingFn = () => void;
type SendMessageFn = (message: string) => void;
type UpdateRecordingContextFn = (
  sessionId: string | null,
  assistantType: string,
  memoryPolicy: string,
  category?: string,
  targetId?: number | null,
) => void;

type ActiveChatControls = {
  chatInput: string;
  startRecording: StartRecordingFn;
  stopRecordingAndSendSTT: StopRecordingFn;
};

type GuestChatControls = {
  chatInput: string;
  sendMessage: (
    message: string,
    sessionId: string | null,
    assistantType: string,
    memoryPolicy: string,
    category?: string,
    targetId?: number | null,
  ) => void | Promise<void>;
};

type UserMainConversationControlsInput = {
  isMicOn: boolean;
  shouldUseGuestChat: boolean;
  targetId: number | null;
  chatInput: string;
  sendMessage: SendMessageFn;
  startRecording: StartRecordingFn;
  stopRecordingAndSendSTT: StopRecordingFn;
  updateRecordingContext: UpdateRecordingContextFn;
  activeChat: ActiveChatControls;
  guestChat: GuestChatControls;
  getAssistantType: AssistantTypeGetter;
  getMemoryPolicy: MemoryPolicyGetter;
  getSessionCategory: SessionCategoryGetter;
  setMicPreferenceEnabled: (enabled: boolean) => void;
  setMicRuntimeActive: (active: boolean) => void;
  setIsTextInputMode: (enabled: boolean) => void;
};

export function useUserMainConversationControls(input: UserMainConversationControlsInput) {
  const {
    isMicOn,
    shouldUseGuestChat,
    targetId,
    chatInput,
    sendMessage,
    startRecording,
    stopRecordingAndSendSTT,
    updateRecordingContext,
    activeChat,
    guestChat,
    getAssistantType,
    getMemoryPolicy,
    getSessionCategory,
    setMicPreferenceEnabled,
    setMicRuntimeActive,
    setIsTextInputMode,
  } = input;

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
    setIsTextInputMode,
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
    setIsTextInputMode,
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

  return {
    handleHomeMicToggle,
    handleHomeSendText,
    handleVisitorMicToggle,
    handleVisitorSendChat,
  };
}
