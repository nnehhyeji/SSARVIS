import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Mic, MicOff, Lock, Unlock, Zap } from 'lucide-react';

// Hooks
import { useAICharacter } from '../../hooks/useAICharacter';
import { useChat } from '../../hooks/useChat';
import { useUserStore } from '../../store/useUserStore';

// Components
import SpeechBubble from '../../components/common/SpeechBubble';
import CharacterScene from '../../components/features/character/CharacterScene';
import ChatWindow from '../../components/features/chat/ChatWindow';

export default function AssistantPage() {
  const { userInfo, currentMode } = useUserStore();

  // interaction hooks (same as home)
  const { isMicOn, mouthOpenRadius, faceType, toggleMic, isSpeaking, setIsSpeaking, triggerText } =
    useAICharacter();

  const {
    chatInput,
    chatMessages,
    isLockMode,
    sttText,
    isAiSpeaking,
    isAwaitingResponse,
    setChatInput,
    setChatMessages,
    toggleLock,
    sendMessage,
    startRecording,
    stopRecordingAndSendSTT,
    cancelTurn,
  } = useChat();

  const [isChatHistoryOpen, setIsChatHistoryOpen] = useState(!isMicOn);

  // 모드별 대화 내역을 저장할 상태
  const [modeHistories, setModeHistories] = useState<Record<string, any[]>>({
    normal: [{ sender: 'ai', text: '안녕하세요! 일반 모드입니다. 무엇을 도와드릴까요?' }],
    study: [{ sender: 'ai', text: '학습 모드입니다. 어떤 것을 공부할까요?' }],
    counseling: [{ sender: 'ai', text: '상담 모드입니다. 고민이 있으신가요?' }],
    persona: [{ sender: 'ai', text: '페르소나 모드입니다. 대화를 시작해봐요!' }]
  });
  const prevModeRef = useRef(currentMode);

  // Sync: Default behavior when mic state changes
  useEffect(() => {
    setIsChatHistoryOpen(!isMicOn);
  }, [isMicOn]);

  // 모드 변경 시: 현재 모드 내용 저장 -> 바뀔 모드 내용 불러오기 (세션 유지)
  useEffect(() => {
    const prevMode = prevModeRef.current;
    if (prevMode !== currentMode) {
      // 0. 진행 중인 동작(재생 등) 중지
      cancelTurn();
      
      // 1. 현재 대화 내역을 이전 모드 저장소에 보관
      setModeHistories(prev => ({
        ...prev,
        [prevMode]: chatMessages
      }));
      
      // 2. 새로운 모드에 저장되어 있던 히스토리를 불러와서 대화창에 세팅
      const history = modeHistories[currentMode] || [];
      setChatMessages(history);
      
      // 3. 현재 모드 업데이트
      prevModeRef.current = currentMode;
    }
  }, [currentMode, chatMessages, setChatMessages, modeHistories]);

  // AI 발화 말풍선용 데이터 추출
  const lastAiMessage = useMemo(() => {
    return (
      chatMessages
        .slice()
        .reverse()
        .find((m) => m.sender === 'ai')?.text || ''
    );
  }, [chatMessages]);

  const finalIsSpeaking = isAiSpeaking || isSpeaking;

  const handleStartSpeaking = useCallback(() => setIsSpeaking(true), [setIsSpeaking]);
  const handleEndSpeaking = useCallback(() => setIsSpeaking(false), [setIsSpeaking]);

  useEffect(() => {
    if (triggerText) {
      handleStartSpeaking();
      const t = setTimeout(handleEndSpeaking, triggerText.length * 100 + 500);
      return () => clearTimeout(t);
    }
  }, [triggerText, handleStartSpeaking, handleEndSpeaking]);

  return (
    <div
      className={`relative w-full h-full overflow-hidden flex flex-col justify-between transition-colors duration-500 ${isLockMode ? 'bg-black' : 'bg-white'}`}
    >
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-rose-100/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-100/20 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4 pointer-events-none" />

      <main className="flex-1 flex items-center justify-center relative w-full h-full z-10">
        <motion.div
          className="relative flex flex-col items-center justify-center"
          animate={{
            y: isMicOn ? 0 : -100,
            scale: isMicOn ? 1 : 0.85,
          }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        >
          {/* Controls */}
          <div className="absolute left-[-110px] top-1/2 -translate-y-1/2 z-40">
            <button
              onClick={() => {
                toggleMic();
                if (!isMicOn) {
                  const assistantType =
                    currentMode === 'counseling'
                      ? 'COUNSEL'
                      : currentMode === 'normal'
                        ? 'DAILY'
                        : currentMode.toUpperCase();
                  startRecording(null, assistantType, isLockMode ? 'SECRET' : 'GENERAL', 'USER_AI');
                } else {
                  stopRecordingAndSendSTT();
                }
              }}
              className={`p-4 rounded-full backdrop-blur-md shadow-lg border transition-all duration-300 ${isMicOn ? 'bg-white/10 border-white/30 hover:bg-white/20' : 'bg-red-500/10 border-red-500/30'}`}
            >
              <div className="flex items-center justify-center">
                {isMicOn ? (
                  <Mic className="w-8 h-8 text-green-400 fill-green-400/20" />
                ) : (
                  <MicOff className="w-8 h-8 text-red-400" />
                )}
              </div>
            </button>
          </div>

          <div className="absolute right-[-110px] top-1/2 -translate-y-1/2 z-40">
            <button
              onClick={toggleLock}
              className={`p-4 rounded-full backdrop-blur-md shadow-lg border transition-all duration-300 ${isLockMode ? 'bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20' : 'bg-white/10 border-white/30 hover:bg-white/20'}`}
            >
              <div className="flex items-center justify-center">
                {isLockMode ? (
                  <Lock className="w-8 h-8 text-yellow-400 fill-yellow-400/20" />
                ) : (
                  <Unlock className="w-8 h-8 text-gray-300" />
                )}
              </div>
            </button>
          </div>

          <div
            className={`relative z-10 w-[450px] h-[450px] flex flex-col items-center justify-center`}
          >
            <CharacterScene
              faceType={faceType}
              mouthOpenRadius={mouthOpenRadius}
              mode={currentMode}
              isLockMode={isLockMode}
              isSpeaking={finalIsSpeaking}
              isMicOn={isMicOn}
              label={userInfo?.nickname || '나의 AI'}
            />
            {(isMicOn ? triggerText : lastAiMessage) && (
              <SpeechBubble text={isMicOn ? triggerText : lastAiMessage} />
            )}
          </div>

          {/* STT Text */}
          {isMicOn && (isAwaitingResponse || sttText) && (
            <div className="absolute bottom-[-180px] left-1/2 -translate-x-1/2 px-8 py-4 bg-black/40 backdrop-blur-xl text-white font-black text-lg rounded-3xl shadow-2xl border border-white/20 z-50 min-w-[280px] text-center max-w-[80vw] whitespace-pre-wrap">
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
            const assistantType =
              currentMode === 'counseling'
                ? 'COUNSEL'
                : currentMode === 'normal'
                  ? 'DAILY'
                  : currentMode.toUpperCase();
            sendMessage(
              chatInput,
              null,
              assistantType,
              isLockMode ? 'SECRET' : 'GENERAL',
              'USER_AI',
            );
          }}
          onClose={() => setIsChatHistoryOpen(false)}
        />
        <button
          onClick={() => setIsChatHistoryOpen(!isChatHistoryOpen)}
          className={`absolute bottom-8 right-8 p-4 rounded-2xl backdrop-blur-xl border shadow-2xl transition-all duration-300 z-40 group ${isChatHistoryOpen ? 'opacity-0' : 'bg-white/20 hover:scale-110'}`}
        >
          <MessageCircle className={`w-8 h-8 ${isLockMode ? 'text-white' : 'text-gray-800'}`} />
        </button>
      </main>

      <div className="absolute bottom-10 right-10 opacity-[0.03] select-none pointer-events-none">
        <Zap className="w-[200px] h-[200px]" />
      </div>
    </div>
  );
}
