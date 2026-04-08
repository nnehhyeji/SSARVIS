import { useCallback, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { PATHS } from '../../routes/paths';

interface UseVisitorHomeActionsParams {
  isLoggedIn: boolean;
  currentUserId: number | null;
  targetId: number | null;
  aiToAiChat: {
    isBattling: boolean;
    startBattle: (params: {
      topic: string;
      myUserId: number;
      targetUserId: number;
      myAssistantType: string;
      targetAssistantType: string;
    }) => Promise<boolean>;
    stopBattle: () => void;
  };
  onClearVisitorCaptions: () => void;
}

export function useVisitorHomeActions({
  isLoggedIn,
  currentUserId,
  targetId,
  aiToAiChat,
  onClearVisitorCaptions,
}: UseVisitorHomeActionsParams) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isVisitorDualAiMode, setIsVisitorDualAiMode] = useState(false);
  const [isAiTopicModalOpen, setIsAiTopicModalOpen] = useState(false);
  const startBattleRef = useRef(aiToAiChat.startBattle);
  const stopBattleRef = useRef(aiToAiChat.stopBattle);
  const onClearVisitorCaptionsRef = useRef(onClearVisitorCaptions);
  startBattleRef.current = aiToAiChat.startBattle;
  stopBattleRef.current = aiToAiChat.stopBattle;
  onClearVisitorCaptionsRef.current = onClearVisitorCaptions;

  const handleOpenPersona = useCallback(() => {
    if (!targetId) return;

    navigate(PATHS.PERSONA(targetId), {
      state: {
        returnTo: `${location.pathname}${location.search}`,
      },
    });
  }, [location.pathname, location.search, navigate, targetId]);

  const closeDualAiScene = useCallback(() => {
    stopBattleRef.current();
    setIsVisitorDualAiMode(false);
    setIsAiTopicModalOpen(false);
  }, []);

  const handleToggleDualAi = useCallback(() => {
    if (aiToAiChat.isBattling) {
      closeDualAiScene();
      return;
    }

    if (isVisitorDualAiMode) {
      setIsVisitorDualAiMode(false);
      setIsAiTopicModalOpen(false);
      return;
    }

    if (!isLoggedIn || !currentUserId || !targetId) return;

    setIsVisitorDualAiMode(false);
    setIsAiTopicModalOpen(true);
  }, [aiToAiChat.isBattling, closeDualAiScene, currentUserId, isLoggedIn, isVisitorDualAiMode, targetId]);

  const handleDualAiTopicSubmit = useCallback(
    async (topic: string) => {
      if (!currentUserId || !targetId) return;

      const started = await startBattleRef.current({
        topic,
        myUserId: currentUserId,
        targetUserId: targetId,
        myAssistantType: 'DAILY',
        targetAssistantType: 'DAILY',
      });

      if (!started) return;

      setIsVisitorDualAiMode(true);
      setIsAiTopicModalOpen(false);
      onClearVisitorCaptionsRef.current();
    },
    [currentUserId, targetId],
  );

  return {
    isVisitorDualAiMode,
    isAiTopicModalOpen,
    setIsAiTopicModalOpen,
    closeDualAiScene,
    handleOpenPersona,
    handleToggleDualAi,
    handleDualAiTopicSubmit,
  };
}
