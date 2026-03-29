import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { MessageCircle, Mic, MicOff, Eye } from 'lucide-react';

// Hooks
import { useAICharacter } from '../../hooks/useAICharacter';
import { useChat } from '../../hooks/useChat';
import { useUserStore } from '../../store/useUserStore';

// Components
import SpeechBubble from '../../components/common/SpeechBubble';
import CharacterScene from '../../components/features/character/CharacterScene';
import ChatWindow from '../../components/features/chat/ChatWindow';
import AiTopicModal from '../../components/features/assistant/AiTopicModal';
import { useAIToAIChat } from '../../hooks/useAIToAIChat';
import { useMicStore } from '../../store/useMicStore';

export default function NamnaPage() {
  const { userInfo } = useUserStore();
  const [searchParams] = useSearchParams();
  const aiToAiChat = useAIToAIChat();

  // interaction hooks
  const {
    isMicOn,
    micPreferenceEnabled,
    mouthOpenRadius,
    faceType,
    isSpeaking,
    setIsSpeaking,
    triggerText,
    setTriggerText,
    isMyAiSpeaking,
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
    setChatInput,
    sendMessage,
    startRecording,
    stopRecordingAndSendSTT,
  } = useChat();

  const [isChatHistoryOpen, setIsChatHistoryOpen] = useState(!isMicOn);
  const [isDualAiMode, setIsDualAiMode] = useState(false);
  const [isInteractionModalOpen, setIsInteractionModalOpen] = useState(false);
  const hasStartedDualBattleRef = useRef(false);
  const didAutoStartRef = useRef(false);

  // URL 파라미터 감지 (With Mine 연동)
  useEffect(() => {
    if (searchParams.get('dual') === 'true') {
      setIsDualAiMode(true);
      setIsInteractionModalOpen(true);
      hasStartedDualBattleRef.current = false;
    } else {
      setIsDualAiMode(false);
      hasStartedDualBattleRef.current = false;
    }
  }, [searchParams]);

  // Sync: Default behavior when mic state changes
  useEffect(() => {
    setIsChatHistoryOpen(!isMicOn);
  }, [isMicOn]);

  useEffect(() => {
    if (!micStoreHydrated || !micPreferenceEnabled || didAutoStartRef.current || isMicOn) return;

    void (async () => {
      const started = await startRecording(
        null,
        'PERSONA',
        isLockMode ? 'SECRET' : 'GENERAL',
        'USER_AI',
      );
      setMicRuntimeActive(Boolean(started));
      didAutoStartRef.current = true;
    })();
  }, [
    isLockMode,
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

  const lastAiMessage = useMemo(() => {
    return (
      chatMessages
        .slice()
        .reverse()
        .find((m) => m.sender === 'ai')?.text || ''
    );
  }, [chatMessages]);

  const finalIsSpeaking = isAiSpeaking || isSpeaking;
  const myAiSpeech = isDualAiMode ? aiToAiChat.myLatestText || myTriggerText : myTriggerText;
  const namnaSpeech = isDualAiMode
    ? aiToAiChat.targetLatestText || triggerText
    : latestAiText || lastAiMessage;
  const myAiIsSpeaking = isDualAiMode ? aiToAiChat.activeSpeaker === 'mine' : isMyAiSpeaking;
  const namnaIsSpeaking = isDualAiMode ? aiToAiChat.activeSpeaker === 'target' : finalIsSpeaking;

  const handleStartSpeaking = useCallback(() => setIsSpeaking(true), [setIsSpeaking]);
  const handleEndSpeaking = useCallback(() => setIsSpeaking(false), [setIsSpeaking]);
  const handleStartMyAiSpeaking = useCallback(() => setIsMyAiSpeaking(true), [setIsMyAiSpeaking]);
  const handleEndMyAiSpeaking = useCallback(() => setIsMyAiSpeaking(false), [setIsMyAiSpeaking]);

  const handleDualAiTopicSubmit = useCallback(
    async (topic: string) => {
      if (!userInfo?.id) return;

      const started = await aiToAiChat.startBattle({
        topic,
        myUserId: userInfo.id,
        targetUserId: userInfo.id,
        myAssistantType: 'DAILY',
        targetAssistantType: 'PERSONA',
      });

      if (!started) return;

      hasStartedDualBattleRef.current = true;
      setIsInteractionModalOpen(false);
      setMyTriggerText('');
      setTriggerText('');
      setIsChatHistoryOpen(true);
    },
    [aiToAiChat, setMyTriggerText, setTriggerText, userInfo?.id],
  );

  const stopDualAiConversation = useCallback(() => {
    hasStartedDualBattleRef.current = false;
    aiToAiChat.stopBattle();
    setIsDualAiMode(false);
    setIsInteractionModalOpen(false);
    setMyTriggerText('');
    setTriggerText('');
  }, [aiToAiChat, setMyTriggerText, setTriggerText]);

  useEffect(() => {
    if (triggerText) {
      handleStartSpeaking();
      const t = setTimeout(handleEndSpeaking, triggerText.length * 100 + 500);
      return () => clearTimeout(t);
    }
  }, [triggerText, handleStartSpeaking, handleEndSpeaking]);

  useEffect(() => {
    if (myTriggerText) {
      handleStartMyAiSpeaking();
      const t = setTimeout(handleEndMyAiSpeaking, myTriggerText.length * 100 + 500);
      return () => clearTimeout(t);
    }
  }, [myTriggerText, handleStartMyAiSpeaking, handleEndMyAiSpeaking]);

  useEffect(() => {
    if (!isDualAiMode || !hasStartedDualBattleRef.current || aiToAiChat.isBattling) return;
    hasStartedDualBattleRef.current = false;
    setIsDualAiMode(false);
  }, [aiToAiChat.isBattling, isDualAiMode]);

  return (
    <div
      className={`relative w-full h-full overflow-hidden flex flex-col justify-between transition-colors duration-500 ${isLockMode ? 'bg-[#1a1a1a]' : 'bg-[#fdfcfb]'}`}
    >
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-rose-200/20 rounded-full blur-[140px] -translate-y-1/2 translate-x-1/4 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-200/20 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/4 pointer-events-none" />

      <main className="flex-1 flex items-center justify-center relative w-full h-full z-10">
        <motion.div
          className="relative flex flex-col items-center justify-center"
          animate={{
            y: isMicOn ? 0 : -80,
            scale: isMicOn ? 1 : 0.9,
          }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        >
          {/* Controls */}
          <div className="absolute left-[-110px] top-1/2 -translate-y-1/2 z-40">
            <button
              onClick={() => {
                if (isMicOn) {
                  setMicPreferenceEnabled(false);
                  setMicRuntimeActive(false);
                  stopRecordingAndSendSTT();
                  return;
                }

                void (async () => {
                  setMicPreferenceEnabled(true);
                  const started = await startRecording(
                    null,
                    'PERSONA',
                    isLockMode ? 'SECRET' : 'GENERAL',
                    'USER_AI',
                  );
                  setMicRuntimeActive(Boolean(started));
                })();
              }}
              className={`p-5 rounded-full backdrop-blur-md shadow-2xl border transition-all duration-300 ${isMicOn ? 'bg-white/10 border-white/30 hover:bg-white/20' : 'bg-red-500/10 border-red-500/30'}`}
            >
              {isMicOn ? (
                <Mic className="w-10 h-10 text-green-400 fill-green-400/20" />
              ) : (
                <MicOff className="w-10 h-10 text-red-400" />
              )}
            </button>
          </div>

          <div className="flex items-center justify-center gap-20">
            {/* 듀얼 모드일 시 내 비서 AI 노출 */}
            {isDualAiMode && (
              <div className="w-[350px] h-[350px] relative z-20 flex flex-col items-center justify-center animate-in slide-in-from-left-4 fade-in duration-700">
                <div className="absolute top-[-40px] px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-200 text-[10px] font-bold tracking-wider uppercase backdrop-blur-md">
                  My AI
                </div>
                <CharacterScene
                  faceType={faceType}
                  mouthOpenRadius={myMouthOpenRadius}
                  mode="normal"
                  isLockMode={false}
                  isSpeaking={myAiIsSpeaking}
                  isMicOn={isMicOn}
                  label="나의 비서"
                />
                <SpeechBubble text={myAiSpeech} />
              </div>
            )}

            <div
              className={`relative z-10 flex flex-col items-center justify-center transition-all duration-700 ease-in-out ${isDualAiMode ? 'w-[350px] h-[350px]' : 'w-[500px] h-[500px]'}`}
            >
              {/* Persona Scene uses offset face type for variety */}
              <CharacterScene
                faceType={(faceType + 2) % 6}
                mouthOpenRadius={mouthOpenRadius}
                mode="persona"
                isLockMode={isLockMode}
                isSpeaking={namnaIsSpeaking}
                isMicOn={isMicOn}
                label={userInfo?.nickname || '나의 페르소나'}
              />
              {namnaSpeech && <SpeechBubble text={namnaSpeech} />}
            </div>
          </div>

          {/* STT Text */}
          {isMicOn && (isAwaitingResponse || sttText) && (
            <div className="absolute bottom-[-160px] left-1/2 -translate-x-1/2 px-10 py-5 bg-black/50 backdrop-blur-2xl text-white font-black text-xl rounded-[2.5rem] shadow-2xl border border-white/10 z-50 min-w-[320px] text-center max-w-[80vw] whitespace-pre-wrap">
              🎙️ {sttText}
            </div>
          )}
        </motion.div>

        <ChatWindow
          isVisible={isChatHistoryOpen}
          messages={chatMessages}
          input={chatInput}
          onInputChange={setChatInput}
          onSend={() => {
            sendMessage(chatInput);
          }}
          onClose={() => setIsChatHistoryOpen(false)}
        />
        <button
          onClick={() => setIsChatHistoryOpen(!isChatHistoryOpen)}
          className={`absolute bottom-8 right-8 p-4 rounded-2xl backdrop-blur-xl border shadow-2xl transition-all duration-300 z-40 group ${isChatHistoryOpen ? 'opacity-0' : 'bg-white/20 hover:scale-110'}`}
        >
          <MessageCircle className={`w-8 h-8 ${isLockMode ? 'text-white' : 'text-gray-800'}`} />
        </button>
        {isDualAiMode && aiToAiChat.isBattling && (
          <button
            onClick={stopDualAiConversation}
            className="absolute top-8 right-8 px-5 py-3 rounded-full bg-white/80 backdrop-blur-md border border-white/60 text-sm font-black text-rose-500 shadow-xl hover:bg-white transition-colors z-40"
          >
            With Mine 종료
          </button>
        )}
        <AiTopicModal
          isOpen={isInteractionModalOpen}
          onClose={() => setIsInteractionModalOpen(false)}
          onSubmit={handleDualAiTopicSubmit}
        />
      </main>

      <div className="absolute bottom-12 left-10 opacity-[0.03] select-none pointer-events-none">
        <Eye className="w-[300px] h-[300px]" />
      </div>
    </div>
  );
}
