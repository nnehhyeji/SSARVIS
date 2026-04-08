import { useEffect } from 'react';

type ChatMessage = { sender: 'ai' | 'me'; text: string };

type PageContextRef = {
  current: string;
};

type ModeRef = {
  current: string;
};

type UseUserMainPageContextInput = {
  isMyHome: boolean;
  isLoggedIn: boolean;
  targetId: number | null;
  currentMode: string;
  pageContextKey: string;
  prevPageContextKeyRef: PageContextRef;
  prevModeRef: ModeRef;
  chatMessages: ChatMessage[];
  modeHistories: Record<string, ChatMessage[]>;
  cancelTurn: () => void;
  resetConversationRuntime: () => void;
  setChatMessages: (messages: ChatMessage[]) => void;
  setModeHistories: React.Dispatch<React.SetStateAction<Record<string, ChatMessage[]>>>;
  setChatInput: (value: string) => void;
  setTriggerText: (value: string) => void;
  setMyTriggerText: (value: string) => void;
  setMicRuntimeActive: (active: boolean) => void;
  closeDualAiScene: () => void;
  didAutoStartRef: { current: boolean };
  visitFollow: (targetId: number, preserve?: boolean) => unknown;
  leaveFollow: () => void;
  setIsVisitorMode: (value: boolean) => void;
  setVisitedFollowName: (value: string) => void;
  setVisitedUserId: (value: number) => void;
  setVisitorVisibility: (value: 'public' | 'private') => void;
  setVisitedProfileImage: (value: string) => void;
  loadVisitorProfileFallback: (targetId: number) => Promise<{ nickname: string; profileImageUrl?: string }>;
};

export function useUserMainPageContext(input: UseUserMainPageContextInput) {
  const {
    isMyHome,
    isLoggedIn,
    targetId,
    currentMode,
    pageContextKey,
    prevPageContextKeyRef,
    prevModeRef,
    chatMessages,
    modeHistories,
    cancelTurn,
    resetConversationRuntime,
    setChatMessages,
    setModeHistories,
    setChatInput,
    setTriggerText,
    setMyTriggerText,
    setMicRuntimeActive,
    closeDualAiScene,
    didAutoStartRef,
    visitFollow,
    leaveFollow,
    setIsVisitorMode,
    setVisitedFollowName,
    setVisitedUserId,
    setVisitorVisibility,
    setVisitedProfileImage,
    loadVisitorProfileFallback,
  } = input;

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
  }, [
    cancelTurn,
    chatMessages,
    currentMode,
    isMyHome,
    modeHistories,
    prevModeRef,
    setChatMessages,
    setModeHistories,
  ]);

  useEffect(() => {
    if (isMyHome || !targetId || !isLoggedIn) return;

    const result = visitFollow(targetId, true);

    if (!result) {
      let isMounted = true;
      void (async () => {
        try {
          const profile = await loadVisitorProfileFallback(targetId);
          if (!isMounted) return;
          setVisitedFollowName(profile.nickname);
          setVisitedUserId(targetId);
          setIsVisitorMode(true);
          setVisitorVisibility('public');
          setVisitedProfileImage(profile.profileImageUrl || '');
        } catch (error) {
          console.error('Failed to load visitor profile fallback:', error);
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
  }, [
    isLoggedIn,
    isMyHome,
    leaveFollow,
    loadVisitorProfileFallback,
    setIsVisitorMode,
    setVisitedFollowName,
    setVisitedProfileImage,
    setVisitedUserId,
    setVisitorVisibility,
    targetId,
    visitFollow,
  ]);

  useEffect(() => {
    closeDualAiScene();
    setMyTriggerText('');
  }, [closeDualAiScene, setMyTriggerText, targetId]);

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
    didAutoStartRef.current = false;
    setMicRuntimeActive(false);
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
    didAutoStartRef,
    isMyHome,
    modeHistories,
    pageContextKey,
    prevPageContextKeyRef,
    resetConversationRuntime,
    setChatInput,
    setChatMessages,
    setMicRuntimeActive,
    setModeHistories,
    setTriggerText,
  ]);
}
