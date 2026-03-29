import { AnimatePresence, motion } from 'framer-motion';
import { MessageSquare, Mic, MicOff, Send, Sparkles, Square } from 'lucide-react';

import CharacterScene from '../character/CharacterScene';
import {
  ACTIVE_SPEECH_COLOR,
  CONVERSATION_UI,
  PAGE_INSET,
  PENDING_TEXT_CLASS,
  SIDEBAR_SAFE_PADDING,
} from '../../../constants/conversationUi';

function CaptionLine({
  text,
  doneLength,
  activeLength,
}: {
  text: string;
  doneLength: number;
  activeLength: number;
}) {
  if (!text.trim()) return null;

  const safeDoneLength = Math.max(0, Math.min(doneLength, text.length));
  const safeActiveLength = Math.max(0, Math.min(activeLength, text.length - safeDoneLength));
  const doneText = text.slice(0, safeDoneLength);
  const activeText = text.slice(safeDoneLength, safeDoneLength + safeActiveLength);
  const pendingText = text.slice(safeDoneLength + safeActiveLength);

  return (
    <div className="max-w-[min(32vw,28rem)] whitespace-pre-wrap break-words text-left text-[clamp(1.5rem,2.2vw,3rem)] font-black leading-[1.26] tracking-[-0.05em] text-black">
      {doneText ? <span className="text-black">{doneText}</span> : null}
      {activeText ? <span style={{ color: ACTIVE_SPEECH_COLOR }}>{activeText}</span> : null}
      {pendingText ? <span className={PENDING_TEXT_CLASS}>{pendingText}</span> : null}
    </div>
  );
}

interface VisitorConversationStageProps {
  title: string;
  currentMode: string;
  isMicOn: boolean;
  isTextInputMode?: boolean;
  faceType: number;
  mouthOpenRadius: number;
  isCharacterSpeaking: boolean;
  assistantDisplayName: string;
  aiCaptionText: string;
  aiDoneLength: number;
  aiActiveLength: number;
  statusText: string;
  connectionNotice?: string;
  isDualAiRunning?: boolean;
  canStartDualAi?: boolean;
  chatInput: string;
  onChatInputChange: (value: string) => void;
  onMicToggle: () => void;
  onSendText: () => void;
  onCancel: () => void;
  onOpenPersona: () => void;
  onToggleDualAi: () => void;
}

export default function VisitorConversationStage({
  title,
  currentMode,
  isMicOn,
  isTextInputMode = false,
  faceType,
  mouthOpenRadius,
  isCharacterSpeaking,
  assistantDisplayName,
  aiCaptionText,
  aiDoneLength,
  aiActiveLength,
  statusText,
  connectionNotice,
  isDualAiRunning = false,
  canStartDualAi = true,
  chatInput,
  onChatInputChange,
  onMicToggle,
  onSendText,
  onCancel,
  onOpenPersona,
  onToggleDualAi,
}: VisitorConversationStageProps) {
  const showTextInput = isTextInputMode || !isMicOn;

  return (
    <div className={`relative h-full w-full bg-white ${SIDEBAR_SAFE_PADDING}`}>
      <div className="relative z-10 flex h-full w-full flex-col overflow-hidden">
        <header className={`flex shrink-0 items-end justify-between gap-4 pb-6 ${PAGE_INSET}`}>
          <h1 className="text-[46px] font-black tracking-[-0.06em] text-black md:text-[54px]">
            {title}
          </h1>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onOpenPersona}
              className="inline-flex h-12 items-center gap-2 rounded-full border border-[#F5C7CF] bg-[#FFF4F6] px-5 text-sm font-black text-[#D84D66] transition-colors hover:bg-[#FFEDEF]"
            >
              <Sparkles className="h-4 w-4" />
              페르소나 문답
            </button>
            <button
              type="button"
              onClick={onToggleDualAi}
              disabled={!canStartDualAi && !isDualAiRunning}
              className={`inline-flex h-12 items-center gap-2 rounded-full px-5 text-sm font-black transition-colors ${
                isDualAiRunning
                  ? 'bg-[#F7576E] text-white hover:bg-[#EB4A61]'
                  : canStartDualAi
                    ? 'border border-[#E7E7E7] bg-white text-[#555555] hover:bg-[#F7F7F7]'
                    : 'border border-[#EFEFEF] bg-[#F7F7F7] text-[#B0B0B0]'
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              {isDualAiRunning ? '둘이 대화 종료' : '둘이 대화하기'}
            </button>
          </div>
        </header>

        <div className="w-full shrink-0 border-t border-[#E5E5E5]" />

        <main className="relative flex-1 overflow-hidden px-6 pb-5 pt-5 md:px-10 md:pb-6 md:pt-6">
          <div className="flex h-full min-h-[420px] items-center justify-center md:min-h-[500px]">
            <div className="flex items-center justify-center gap-7">
              <div className="relative flex h-[250px] w-[250px] items-center justify-center md:h-[310px] md:w-[310px]">
                <CharacterScene
                  faceType={(faceType + 2) % 6}
                  mouthOpenRadius={mouthOpenRadius}
                  mode={currentMode}
                  isLockMode={false}
                  isSpeaking={isCharacterSpeaking}
                  isMicOn={isMicOn}
                  label=""
                />
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-black/5 bg-gray-100/55 px-3 py-1 text-sm font-black tracking-[-0.04em] text-black backdrop-blur-sm">
                  {assistantDisplayName}
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={`visitor-ai-${aiCaptionText}`}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: aiCaptionText ? 1 : 0, y: aiCaptionText ? 0 : 14 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="min-h-[4.5rem] self-center"
                >
                  <CaptionLine
                    text={aiCaptionText}
                    doneLength={aiDoneLength}
                    activeLength={aiActiveLength}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </main>

        <footer className="shrink-0 px-6 pb-5 pt-2 md:px-10 md:pb-6">
          {connectionNotice ? (
            <div className="mb-3 flex items-center justify-center">
              <div className="rounded-full border border-[#F7C3CB] bg-[#FFF3F5] px-4 py-2 text-sm font-bold text-[#C84358] shadow-sm">
                {connectionNotice}
              </div>
            </div>
          ) : null}

          <div className="mb-3 flex items-center justify-center">
            <div className="rounded-full border border-[#E7E7E7] bg-white px-4 py-2 text-sm font-bold text-[#707070] shadow-sm">
              {statusText}
            </div>
          </div>

          <div className="mx-auto flex max-w-[860px] items-center gap-3 rounded-[24px] border border-[#E7E7E7] bg-white px-4 py-3 shadow-[0_12px_32px_rgba(0,0,0,0.06)]">
            <button
              type="button"
              onClick={onMicToggle}
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full border transition-all duration-200 ${
                isMicOn
                  ? 'border-[#F7576E]/25 bg-[#F7576E]/10 text-[#F7576E]'
                  : 'border-[#DADADA] bg-[#F8F8F8] text-[#666666]'
              }`}
            >
              {isMicOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
            </button>

            {showTextInput ? (
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[18px] border border-[#EEEEEE] bg-[#FAFAFA] px-4 py-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(event) => onChatInputChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') onSendText();
                  }}
                  placeholder={CONVERSATION_UI.placeholder.chatInput}
                  className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-black outline-none placeholder:text-[#B7B7B7]"
                />
                <button
                  type="button"
                  onClick={onSendText}
                  disabled={!chatInput.trim()}
                  className={`flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 ${
                    chatInput.trim() ? 'bg-[#F7576E] text-white' : 'bg-[#ECECEC] text-[#AFAFAF]'
                  }`}
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            ) : null}

            <button
              type="button"
              onClick={onCancel}
              aria-label={CONVERSATION_UI.controls.cancel}
              title={CONVERSATION_UI.controls.cancel}
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[#E4E4E4] bg-[#FAFAFA] text-[#555555] transition-all duration-200 hover:bg-[#F4F4F4]"
            >
              <Square className="h-4 w-4 fill-current" />
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
