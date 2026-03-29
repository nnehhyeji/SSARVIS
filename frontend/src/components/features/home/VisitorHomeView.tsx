import { MessageCircle, Mic, MicOff, Sparkles, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';

import SpeechBubble from '../../common/SpeechBubble';
import CharacterScene from '../character/CharacterScene';
import ChatWindow from '../chat/ChatWindow';
import type { ChatMessage } from '../../../types';

interface ActiveChatLike {
  chatMessages: ChatMessage[];
  chatInput: string;
  sttText: string;
  isAwaitingResponse: boolean;
  isLockMode: boolean;
  setChatInput: (value: string) => void;
}

interface VisitorHomeViewProps {
  ownerName: string;
  roomViewCount: number;
  currentMode: string;
  isMicOn: boolean;
  isLockMode: boolean;
  isDualAiMode: boolean;
  showEmptyPersonaMessage: boolean;
  visitorVisibility: string;
  faceType: number;
  mouthOpenRadius: number;
  myMouthOpenRadius: number;
  myAiIsSpeaking: boolean;
  myAiSpeech: string;
  visitorAiIsSpeaking: boolean;
  visitorAiSpeech: string;
  isChatHistoryOpen: boolean;
  activeChat: ActiveChatLike;
  battleMessages: ChatMessage[];
  onNavigatePersona: () => void;
  onNavigatePersonaSetup: () => void;
  onToggleDualAi: () => void;
  onMicToggle: () => void;
  onSendChat: () => void;
  onCloseChatHistory: () => void;
  onToggleChatHistory: () => void;
}

export default function VisitorHomeView({
  ownerName,
  roomViewCount,
  currentMode,
  isMicOn,
  isLockMode,
  isDualAiMode,
  showEmptyPersonaMessage,
  visitorVisibility,
  faceType,
  mouthOpenRadius,
  myMouthOpenRadius,
  myAiIsSpeaking,
  myAiSpeech,
  visitorAiIsSpeaking,
  visitorAiSpeech,
  isChatHistoryOpen,
  activeChat,
  battleMessages,
  onNavigatePersona,
  onNavigatePersonaSetup,
  onToggleDualAi,
  onMicToggle,
  onSendChat,
  onCloseChatHistory,
  onToggleChatHistory,
}: VisitorHomeViewProps) {
  const assistantLabel = `${ownerName} AI`;

  return (
    <div
      className={`relative flex h-full w-full flex-col justify-between overflow-hidden transition-colors duration-500 ${
        isLockMode ? 'bg-black' : 'bg-white'
      }`}
    >
      <div className="absolute left-1/2 top-8 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
        <h2 className="text-2xl font-black tracking-tight text-gray-800">{ownerName}님의 공간</h2>
        <div className="rounded-full bg-gray-100 px-4 py-1.5 text-xs font-bold text-gray-500 shadow-sm">
          방문 수 {roomViewCount}
        </div>
      </div>

      <div className="absolute right-8 top-8 z-50 flex flex-col items-end gap-4">
        <button
          onClick={onNavigatePersona}
          className="group flex flex-col items-center gap-1 rounded-2xl border border-white/20 bg-gradient-to-br from-pink-400/80 to-rose-300/80 p-4 text-white shadow-xl transition-all hover:scale-105 active:scale-95"
          title="페르소나 보러가기"
        >
          <Sparkles className="h-6 w-6 group-hover:animate-pulse" />
          <span className="text-[10px] font-black leading-none">페르소나</span>
        </button>

        <button
          onClick={onToggleDualAi}
          className={`group/btn flex flex-col items-center gap-1 rounded-2xl border p-4 shadow-xl transition-all duration-300 ${
            isDualAiMode
              ? 'border-indigo-400/50 bg-indigo-500/80 text-white'
              : 'border-white/40 bg-white/80 text-indigo-500 hover:bg-amber-50'
          }`}
          title="AI 끼리 대화"
        >
          <MessageSquare className="h-6 w-6" />
          <span className="text-[10px] font-black leading-none">
            {isDualAiMode ? '대화 중지' : 'AI 대화'}
          </span>
        </button>
      </div>

      <main className="relative z-10 flex h-full w-full flex-1 items-center justify-center">
        <motion.div
          className="relative flex flex-col items-center justify-center"
          animate={{
            y: isMicOn ? 0 : -220,
            scale: isMicOn ? 1 : 0.75,
          }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        >
          {!showEmptyPersonaMessage && (
            <div className="absolute left-[-140px] top-1/2 z-40 -translate-y-1/2">
              <button
                onClick={onMicToggle}
                className={`rounded-full border p-4 shadow-lg backdrop-blur-md transition-all duration-300 ${
                  isMicOn
                    ? 'border-white/30 bg-white/10 hover:bg-white/20'
                    : 'border-red-500/30 bg-red-500/10'
                }`}
              >
                <div className="flex items-center justify-center">
                  {isMicOn ? (
                    <Mic className="h-8 w-8 fill-green-400/20 text-green-400" />
                  ) : (
                    <MicOff className="h-8 w-8 text-red-400" />
                  )}
                </div>
              </button>
            </div>
          )}

          <div className="flex items-center justify-center gap-20">
            {isDualAiMode && (
              <div className="relative z-20 flex h-[300px] w-[300px] animate-in flex-col items-center justify-center slide-in-from-left-2 fade-in duration-700">
                <div className="absolute top-[-40px] rounded-full border border-blue-500/40 bg-blue-500/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-200 backdrop-blur-md">
                  My AI
                </div>
                <CharacterScene
                  faceType={faceType}
                  mouthOpenRadius={myMouthOpenRadius}
                  mode={currentMode}
                  isLockMode={false}
                  isSpeaking={myAiIsSpeaking}
                  isMicOn={isMicOn}
                  label="내 AI"
                />
                <SpeechBubble text={myAiSpeech} />
              </div>
            )}

            <div
              className={`relative z-10 flex flex-col items-center justify-center transition-all duration-700 ease-in-out ${
                isDualAiMode ? 'h-[300px] w-[300px]' : 'h-[450px] w-[450px]'
              }`}
            >
              {showEmptyPersonaMessage ? (
                <div className="absolute z-50 flex h-full w-full flex-col items-center justify-center gap-5 rounded-[3rem] border border-gray-100 bg-white p-8 text-center shadow-2xl">
                  <div className="mb-2 rounded-full bg-yellow-100/90 p-4 shadow-inner">
                    <Sparkles className="h-10 w-10 text-yellow-500" />
                  </div>
                  <h3 className="text-2xl font-black tracking-tight text-gray-800">
                    페르소나 응답이 아직 없어요
                  </h3>
                  <p className="mb-2 font-bold leading-relaxed text-gray-600">
                    {ownerName}님의 페르소나가 아직 완성되지 않았어요.
                    <br />
                    먼저 페르소나를 설정한 뒤 다시 방문해보세요.
                  </p>
                  <button
                    onClick={onNavigatePersonaSetup}
                    className="w-full rounded-full bg-gradient-to-r from-pink-500 to-rose-400 px-6 py-3 font-black text-white shadow-lg transition-transform hover:scale-[1.03] active:scale-95"
                  >
                    페르소나 설정하러 가기
                  </button>
                </div>
              ) : (
                <>
                  <div
                    className={`absolute top-[-40px] rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md transition-all duration-500 ${
                      visitorVisibility === 'private'
                        ? 'border-pink-200 bg-pink-100 text-pink-600'
                        : 'border-gray-200 bg-gray-100 text-gray-600'
                    }`}
                  >
                    {visitorVisibility} Access
                  </div>
                  <CharacterScene
                    faceType={(faceType + 2) % 6}
                    mouthOpenRadius={mouthOpenRadius}
                    mode={currentMode}
                    isLockMode={activeChat.isLockMode}
                    isSpeaking={visitorAiIsSpeaking}
                    isMicOn={isMicOn}
                    label={assistantLabel}
                  />
                  {isDualAiMode && visitorAiSpeech && <SpeechBubble text={visitorAiSpeech} />}
                </>
              )}
            </div>

            {isMicOn && (activeChat.isAwaitingResponse || activeChat.sttText) && (
              <div className="absolute bottom-[-220px] left-1/2 z-50 min-w-[280px] max-w-[80vw] -translate-x-1/2 whitespace-pre-wrap rounded-3xl border border-white/20 bg-black/40 px-8 py-4 text-center text-lg font-black text-white shadow-2xl backdrop-blur-xl">
                {activeChat.sttText}
              </div>
            )}
          </div>
        </motion.div>

        {!showEmptyPersonaMessage && (
          <>
            <ChatWindow
              isVisible={isChatHistoryOpen}
              messages={isDualAiMode ? battleMessages : activeChat.chatMessages}
              input={isDualAiMode ? '' : activeChat.chatInput}
              onInputChange={(value) => {
                if (!isDualAiMode) {
                  activeChat.setChatInput(value);
                }
              }}
              onSend={onSendChat}
              onClose={onCloseChatHistory}
              inputPlaceholder={
                isDualAiMode
                  ? 'AI끼리 대화 중에는 직접 입력할 수 없습니다.'
                  : '메시지를 입력하세요.'
              }
              isInputDisabled={isDualAiMode}
            />
            <button
              onClick={onToggleChatHistory}
              className={`group absolute bottom-8 right-8 z-40 rounded-2xl border p-4 shadow-2xl backdrop-blur-xl transition-all duration-300 ${
                isChatHistoryOpen ? 'opacity-0' : 'bg-white/20 hover:scale-110'
              }`}
            >
              <MessageCircle className="h-8 w-8 text-gray-800" />
            </button>
          </>
        )}
      </main>
    </div>
  );
}
