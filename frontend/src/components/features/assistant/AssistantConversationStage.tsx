import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Lock, Unlock, Send, Square } from 'lucide-react';

import CharacterScene from '../character/CharacterScene';
import {
  ACTIVE_SPEECH_COLOR,
  CONVERSATION_UI,
  PAGE_INSET,
  PENDING_TEXT_CLASS,
  SIDEBAR_SAFE_PADDING,
  SINGLE_SPEAKER_BREAKPOINT,
} from '../../../constants/conversationUi';

function CaptionLine({
  text,
  doneLength,
  activeLength,
  align,
  isLockMode,
}: {
  text: string;
  doneLength: number;
  activeLength: number;
  align: 'left' | 'right';
  isLockMode: boolean;
}) {
  if (!text.trim()) return null;

  const safeDoneLength = Math.max(0, Math.min(doneLength, text.length));
  const safeActiveLength = Math.max(0, Math.min(activeLength, text.length - safeDoneLength));
  const doneText = text.slice(0, safeDoneLength);
  const activeText = text.slice(safeDoneLength, safeDoneLength + safeActiveLength);
  const pendingText = text.slice(safeDoneLength + safeActiveLength);
  const doneClassName = isLockMode ? 'text-white' : 'text-black';
  const pendingClassName = isLockMode ? 'text-[#3F3A42]' : PENDING_TEXT_CLASS;

  return (
    <div
      className={`max-w-[min(38vw,34rem)] whitespace-pre-wrap break-words text-[clamp(2rem,2.8vw,3.5rem)] font-black leading-[1.28] tracking-[-0.05em] ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      {doneText ? <span className={doneClassName}>{doneText}</span> : null}
      {activeText ? <span style={{ color: ACTIVE_SPEECH_COLOR }}>{activeText}</span> : null}
      {pendingText ? <span className={pendingClassName}>{pendingText}</span> : null}
    </div>
  );
}

interface AssistantConversationStageProps {
  title: string;
  currentMode: string;
  isLockMode: boolean;
  isMicOn: boolean;
  faceType: number;
  mouthOpenRadius: number;
  isCharacterSpeaking: boolean;
  assistantDisplayName: string;
  userDisplayName: string;
  profileImage: string;
  aiCaptionText: string;
  aiDoneLength: number;
  aiActiveLength: number;
  userCaptionText: string;
  userDoneLength: number;
  userActiveLength: number;
  activeSpeaker: 'ai' | 'user' | null;
  statusText: string;
  statusSubtext?: string;
  connectionNotice?: string;
  chatInput: string;
  onChatInputChange: (value: string) => void;
  onMicToggle: () => void;
  onSendText: () => void;
  onCancel: () => void;
  onToggleLock: () => void;
}

export default function AssistantConversationStage({
  title,
  currentMode,
  isLockMode,
  isMicOn,
  faceType,
  mouthOpenRadius,
  isCharacterSpeaking,
  assistantDisplayName,
  userDisplayName,
  profileImage,
  aiCaptionText,
  aiDoneLength,
  aiActiveLength,
  userCaptionText,
  userDoneLength,
  userActiveLength,
  activeSpeaker,
  statusText,
  statusSubtext,
  connectionNotice,
  chatInput,
  onChatInputChange,
  onMicToggle,
  onSendText,
  onCancel,
  onToggleLock,
}: AssistantConversationStageProps) {
  const [isNarrowLayout, setIsNarrowLayout] = useState(false);

  useEffect(() => {
    const updateLayout = () => {
      setIsNarrowLayout(window.innerWidth < SINGLE_SPEAKER_BREAKPOINT);
    };

    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, []);

  const showAiSection = !isNarrowLayout || activeSpeaker !== 'user';
  const showUserSection = !isNarrowLayout || activeSpeaker !== 'ai';

  return (
    <div
      className={`relative h-full w-full ${isLockMode ? 'bg-[#050505]' : 'bg-white'} ${SIDEBAR_SAFE_PADDING}`}
    >
      {isLockMode && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-12 top-24 h-[24rem] w-[24rem] rounded-full bg-[#F7576E]/10 blur-[140px]" />
          <div className="absolute left-[24%] top-[14%] h-[22rem] w-[22rem] rounded-full bg-white/[0.05] blur-[170px]" />
          <div className="absolute bottom-16 right-[-3rem] h-[22rem] w-[22rem] rounded-full bg-sky-200/[0.05] blur-[150px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.07),_transparent_34%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_72%,_rgba(247,87,110,0.08),_transparent_26%)]" />
        </div>
      )}

      <div className="relative z-10 flex h-full w-full flex-col overflow-hidden">
        <header className={`flex shrink-0 items-end justify-between pb-6 ${PAGE_INSET}`}>
          <h1
            className={`text-[58px] font-black tracking-[-0.06em] md:text-[64px] ${
              isLockMode ? 'text-white' : 'text-black'
            }`}
          >
            {title}
          </h1>
        </header>

        <div
          className={`w-full shrink-0 border-t ${
            isLockMode ? 'border-white/30' : 'border-[#E5E5E5]'
          }`}
        />

        <main className="relative flex-1 overflow-hidden px-8 pb-8 pt-8 md:px-12">
          <div className="relative h-full min-h-[540px]">
            {showAiSection && (
              <section className="absolute left-0 top-[11%] flex w-[58%] items-start gap-10 max-xl:w-[62%] max-lg:w-[72%]">
                <div className="relative h-[220px] w-[220px] shrink-0">
                  <CharacterScene
                    faceType={faceType}
                    mouthOpenRadius={mouthOpenRadius}
                    mode={currentMode}
                    isLockMode={isLockMode}
                    isSpeaking={isCharacterSpeaking}
                    isMicOn={isMicOn}
                    showWaveform={false}
                  />
                  <div
                    className={`absolute -bottom-7 left-6 text-xl font-black tracking-[-0.04em] ${
                      isLockMode ? 'text-white' : 'text-black'
                    }`}
                  >
                    {assistantDisplayName}
                  </div>
                </div>

                <div className="pt-20">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`ai-${title}-${aiCaptionText}`}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: aiCaptionText ? 1 : 0, y: aiCaptionText ? 0 : 14 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                    >
                      <CaptionLine
                        text={aiCaptionText}
                        doneLength={aiDoneLength}
                        activeLength={aiActiveLength}
                        align="left"
                        isLockMode={isLockMode}
                      />
                    </motion.div>
                  </AnimatePresence>
                </div>
              </section>
            )}

            {showUserSection && (
              <section className="absolute bottom-[18%] right-0 flex w-[54%] items-start justify-end gap-8 max-xl:w-[60%] max-lg:w-[72%]">
                <div className="max-w-[min(34vw,31rem)] pt-6">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`user-${title}-${userCaptionText}`}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: userCaptionText ? 1 : 0, y: userCaptionText ? 0 : 14 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                    >
                      <CaptionLine
                        text={userCaptionText}
                        doneLength={userDoneLength}
                        activeLength={userActiveLength}
                        align="right"
                        isLockMode={isLockMode}
                      />
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="relative h-[188px] w-[188px] shrink-0">
                  <motion.div
                    className="h-full w-full overflow-hidden rounded-[20px] bg-[#F4F4F4]"
                    animate={{
                      y: activeSpeaker === 'user' ? -4 : 0,
                      scale: activeSpeaker === 'user' ? 1.01 : 1,
                    }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                  >
                    <img src={profileImage} alt="User profile" className="h-full w-full object-cover" />
                  </motion.div>
                  <div
                    className={`absolute -bottom-10 right-1 text-right text-[22px] font-black tracking-[-0.04em] ${
                      isLockMode ? 'text-white' : 'text-black'
                    }`}
                  >
                    {userDisplayName}
                  </div>
                </div>
              </section>
            )}
          </div>
        </main>

        <footer className="shrink-0 px-8 pb-8 pt-3 md:px-12">
          {connectionNotice && (
            <div className="mb-3 flex items-center justify-center">
              <div
                className={`rounded-full px-4 py-2 text-sm font-bold shadow-sm ${
                  isLockMode
                    ? 'border border-[#F7576E]/30 bg-[#F7576E]/10 text-[#FFD6DC]'
                    : 'border border-[#F7C3CB] bg-[#FFF3F5] text-[#C84358]'
                }`}
              >
                {connectionNotice}
              </div>
            </div>
          )}

          <div className="mb-3 flex items-center justify-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`rounded-full px-4 py-2 text-sm font-bold shadow-sm ${
                  isLockMode
                    ? 'border border-white/10 bg-white/5 text-white/70'
                    : 'border border-[#E7E7E7] bg-white text-[#707070]'
                }`}
              >
                {statusText}
              </div>
              {statusSubtext ? (
                <div
                  className={`text-xs font-semibold tracking-[-0.02em] ${
                    isLockMode ? 'text-white/50' : 'text-[#8A8A8A]'
                  }`}
                >
                  {statusSubtext}
                </div>
              ) : null}
            </div>
          </div>

          <div
            className={`mx-auto flex max-w-[920px] items-center gap-3 rounded-[24px] px-4 py-4 ${
              isLockMode
                ? 'border border-white/10 bg-white/[0.04] shadow-[0_12px_32px_rgba(0,0,0,0.28)]'
                : 'border border-[#E7E7E7] bg-white shadow-[0_12px_32px_rgba(0,0,0,0.06)]'
            }`}
          >
            <button
              onClick={onMicToggle}
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full border transition-all duration-200 ${
                isMicOn
                  ? 'border-[#F7576E]/25 bg-[#F7576E]/10 text-[#F7576E]'
                  : isLockMode
                    ? 'border-white/10 bg-white/5 text-white/70'
                    : 'border-[#DADADA] bg-[#F8F8F8] text-[#666666]'
              }`}
            >
              {isMicOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
            </button>

            {!isMicOn && (
              <div
                className={`flex min-w-0 flex-1 items-center gap-2 rounded-[18px] px-4 py-2 ${
                  isLockMode
                    ? 'border border-white/10 bg-white/[0.04]'
                    : 'border border-[#EEEEEE] bg-[#FAFAFA]'
                }`}
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(event) => onChatInputChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') onSendText();
                  }}
                  placeholder={CONVERSATION_UI.placeholder.chatInput}
                  className={`min-w-0 flex-1 bg-transparent text-[15px] font-medium outline-none placeholder:text-[#B7B7B7] ${
                    isLockMode ? 'text-white' : 'text-black'
                  }`}
                />
                <button
                  onClick={onSendText}
                  disabled={!chatInput.trim()}
                  className={`flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 ${
                    chatInput.trim()
                      ? 'bg-[#F7576E] text-white'
                      : 'bg-[#ECECEC] text-[#AFAFAF]'
                  }`}
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            )}

            <button
              onClick={onCancel}
              aria-label={CONVERSATION_UI.controls.cancel}
              title={CONVERSATION_UI.controls.cancel}
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full border transition-all duration-200 ${
                isLockMode
                  ? 'border-white/10 bg-white/5 text-white/75 hover:bg-white/10'
                  : 'border-[#E4E4E4] bg-[#FAFAFA] text-[#555555] hover:bg-[#F4F4F4]'
              }`}
            >
              <Square className="h-4 w-4 fill-current" />
            </button>

            <button
              onClick={onToggleLock}
              className={`flex h-14 shrink-0 items-center gap-2 rounded-full border px-5 text-sm font-bold transition-all duration-200 ${
                isLockMode
                  ? 'border-[#F7576E]/20 bg-[#F7576E]/10 text-[#F7576E]'
                  : 'border-[#E4E4E4] bg-[#FAFAFA] text-[#555555] hover:bg-[#F4F4F4]'
              }`}
            >
              {isLockMode ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
              {isLockMode ? CONVERSATION_UI.controls.lock : CONVERSATION_UI.controls.unlock}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
