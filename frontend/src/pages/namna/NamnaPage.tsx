import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Mic, MicOff, Lock, Unlock, Eye } from 'lucide-react';

// Hooks
import { useAICharacter } from '../../hooks/useAICharacter';
import { useChat } from '../../hooks/useChat';
import { useUserStore } from '../../store/useUserStore';

// Components
import SpeechBubble from '../../components/common/SpeechBubble';
import CharacterScene from '../../components/features/character/CharacterScene';
import ChatWindow from '../../components/features/chat/ChatWindow';

export default function NamnaPage() {
  const { userInfo } = useUserStore();
  
  // interaction hooks
  const { 
    isMicOn, mouthOpenRadius, faceType, toggleMic,
    isSpeaking, setIsSpeaking, triggerText
  } = useAICharacter();

  const {
    chatInput, chatMessages, isLockMode, sttText, isAiSpeaking, isAwaitingResponse,
    setChatInput, toggleLock, sendMessage, startRecording, stopRecordingAndSendSTT,
  } = useChat();

  const [isChatHistoryOpen, setIsChatHistoryOpen] = useState(!isMicOn);

  // Sync: Default behavior when mic state changes
  useEffect(() => {
    setIsChatHistoryOpen(!isMicOn);
  }, [isMicOn]);

  const lastAiMessage = useMemo(() => {
    return chatMessages.slice().reverse().find((m) => m.sender === 'ai')?.text || '';
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
    <div className={`relative w-full h-full overflow-hidden flex flex-col justify-between transition-colors duration-500 ${isLockMode ? 'bg-[#1a1a1a]' : 'bg-[#fdfcfb]'}`}>
      
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
                toggleMic();
                if (!isMicOn) {
                  // Always PERSONA in this page
                  startRecording(null, 'PERSONA', isLockMode ? 'SECRET' : 'GENERAL', 'USER_AI');
                } else {
                  stopRecordingAndSendSTT();
                }
              }}
              className={`p-5 rounded-full backdrop-blur-md shadow-2xl border transition-all duration-300 ${isMicOn ? 'bg-white/10 border-white/30 hover:bg-white/20' : 'bg-red-500/10 border-red-500/30'}`}
            >
              {isMicOn ? <Mic className="w-10 h-10 text-green-400 fill-green-400/20" /> : <MicOff className="w-10 h-10 text-red-400" />}
            </button>
          </div>

          <div className="absolute right-[-110px] top-1/2 -translate-y-1/2 z-40">
            <button
              onClick={toggleLock}
              className={`p-5 rounded-full backdrop-blur-md shadow-2xl border transition-all duration-300 ${isLockMode ? 'bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20' : 'bg-white/10 border-white/30 hover:bg-white/20'}`}
            >
              {isLockMode ? <Lock className="w-10 h-10 text-yellow-400 fill-yellow-400/20" /> : <Unlock className="w-10 h-10 text-gray-300" />}
            </button>
          </div>

          <div className={`relative z-10 w-[500px] h-[500px] flex flex-col items-center justify-center`}>
            {/* Persona Scene uses offset face type for variety */}
            <CharacterScene
              faceType={(faceType + 2) % 6}
              mouthOpenRadius={mouthOpenRadius}
              mode="persona"
              isLockMode={isLockMode}
              isSpeaking={finalIsSpeaking}
              isMicOn={isMicOn}
              label={userInfo?.nickname || '나의 페르소나'}
            />
            {(isMicOn ? triggerText : lastAiMessage) && <SpeechBubble text={isMicOn ? triggerText : lastAiMessage} />}
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
            sendMessage(chatInput, null, 'PERSONA', isLockMode ? 'SECRET' : 'GENERAL', 'USER_AI');
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

      <div className="absolute bottom-12 left-10 opacity-[0.03] select-none pointer-events-none">
        <Eye className="w-[300px] h-[300px]" />
      </div>
    </div>
  );
}
