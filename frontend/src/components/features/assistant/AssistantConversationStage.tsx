import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Lock, Unlock, Send, Square, Link2 } from 'lucide-react';

import CharacterScene from '../character/CharacterScene';
import {
  hasVisibleCaptionLine,
  renderCaptionLine,
  splitCaptionLineSegments,
} from '../../../utils/captionSegments';
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
  size,
}: {
  text: string;
  doneLength: number;
  activeLength: number;
  align: 'left' | 'right';
  isLockMode: boolean;
  size?: 'default' | 'compact';
}) {
  const lines = splitCaptionLineSegments(text, doneLength, activeLength);
  if (!hasVisibleCaptionLine(lines, true)) return null;

  const doneClassName = isLockMode ? 'text-white' : 'text-black';
  const pendingClassName = isLockMode ? 'text-[#3F3A42]' : PENDING_TEXT_CLASS;

  return (
    <div
      className={`max-w-[min(28vw,24rem)] whitespace-pre-wrap break-words font-black tracking-[-0.05em] ${
        size === 'compact'
          ? 'text-[clamp(1.3rem,1.9vw,2.3rem)] leading-[1.08]'
          : 'text-[clamp(1.6rem,2.3vw,3rem)] leading-[1.1]'
      } ${align === 'right' ? 'text-right' : 'text-left'}`}
    >
      {lines.map((line, index) => (
        <div key={`${align}-${index}`} className={index === 0 ? '' : 'mt-[0.08em]'}>
          {renderCaptionLine(
            line,
            (value) => <span className={doneClassName}>{value}</span>,
            (value) => <span style={{ color: ACTIVE_SPEECH_COLOR }}>{value}</span>,
            (value) => <span className={pendingClassName}>{value}</span>,
          )}
        </div>
      ))}
    </div>
  );
}

interface AssistantConversationStageProps {
  title: string;
  currentMode: string;
  isLockMode: boolean;
  isMicOn: boolean;
  isTextInputMode?: boolean;
  headerCenterLabel?: string;
  headerCenterSubtext?: string;
  headerCenterProgressCurrent?: number;
  headerCenterProgressTotal?: number;
  headerRightActionLabel?: string;
  onHeaderRightAction?: () => void;
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
  isLongAiCaption?: boolean;
  isLongUserCaption?: boolean;
  isLongActiveCaption?: boolean;
  pageNotice?: string;
  connectionNotice?: string;
  chatInput: string;
  onChatInputChange: (value: string) => void;
  onMicToggle: () => void;
  onSendText: () => void;
  onCancel: () => void;
  onToggleLock: () => void;
  isInteractionDisabled?: boolean;
  disabledPlaceholder?: string;
  isContinuousConversationEnabled?: boolean;
  onToggleContinuousConversation?: () => void;
}

export default function AssistantConversationStage({
  title,
  currentMode,
  isLockMode,
  isMicOn,
  isTextInputMode = false,
  headerCenterLabel,
  headerCenterSubtext,
  headerCenterProgressCurrent,
  headerCenterProgressTotal,
  headerRightActionLabel,
  onHeaderRightAction,
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
  isLongAiCaption = false,
  isLongUserCaption = false,
  isLongActiveCaption = false,
  pageNotice,
  connectionNotice,
  chatInput,
  onChatInputChange,
  onMicToggle,
  onSendText,
  onCancel,
  onToggleLock,
  isInteractionDisabled = false,
  disabledPlaceholder,
  isContinuousConversationEnabled = false,
  onToggleContinuousConversation,
}: AssistantConversationStageProps) {
  const [isNarrowLayout, setIsNarrowLayout] = useState(false);
  const showTextInput = isTextInputMode || !isMicOn;
  const headerProgressPercent =
    headerCenterProgressTotal && headerCenterProgressTotal > 0
      ? Math.min(
          100,
          Math.max(0, ((headerCenterProgressCurrent ?? 0) / headerCenterProgressTotal) * 100),
        )
      : null;

  useEffect(() => {
    const updateLayout = () => {
      setIsNarrowLayout(window.innerWidth < SINGLE_SPEAKER_BREAKPOINT);
    };

    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, []);

  const longCaptionThreshold = isNarrowLayout ? 30 : 42;
  const shouldFocusActiveSpeaker =
    (isNarrowLayout && activeSpeaker !== null) ||
    isLongActiveCaption ||
    isLongAiCaption ||
    isLongUserCaption;
  const showAiSection = shouldFocusActiveSpeaker
    ? activeSpeaker !== 'user'
    : !isNarrowLayout || activeSpeaker !== 'user';
  const showUserSection = shouldFocusActiveSpeaker
    ? activeSpeaker !== 'ai'
    : !isNarrowLayout || activeSpeaker !== 'ai';
  const aiCaptionSize = isLongAiCaption ? 'compact' : 'default';
  const userCaptionSize = isLongUserCaption ? 'compact' : 'default';
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
        <header className={`flex shrink-0 items-start justify-between gap-6 pb-6 ${PAGE_INSET}`}>
          <h1
            className={`text-[46px] font-black tracking-[-0.06em] md:text-[54px] ${
              isLockMode ? 'text-white' : 'text-black'
            }`}
          >
            {title}
          </h1>

          {headerCenterLabel || (headerRightActionLabel && onHeaderRightAction) ? (
            <div className="hidden shrink-0 items-stretch gap-3 md:flex md:ml-auto">
              {headerRightActionLabel && onHeaderRightAction ? (
                <button
                  type="button"
                  onClick={onHeaderRightAction}
                  className={`flex shrink-0 items-center gap-2 self-center rounded-full px-4 py-2 text-sm font-bold transition-all active:scale-95 ${
                    isLockMode
                      ? 'border border-white/12 bg-white/6 text-white hover:bg-white/10'
                      : 'border border-[#E7E7E7] bg-white text-[#555555] hover:bg-[#F8F8F8]'
                  }`}
                >
                  <Link2 className="h-4 w-4" />
                  {headerRightActionLabel}
                </button>
              ) : null}

              {headerCenterLabel ? (
                <div
                  className={`min-w-[280px] max-w-[420px] shrink-0 flex-col gap-2 rounded-[24px] px-5 py-4 shadow-sm md:flex ${
                    isLockMode
                      ? 'border border-white/12 bg-white/6'
                      : 'border border-[#F2D9DE] bg-[#FFF8F9]'
                  }`}
                >
                  <div
                    className={`text-center text-sm font-black tracking-[-0.03em] ${
                      isLockMode ? 'text-white/88' : 'text-[#D84D66]'
                    }`}
                  >
                    {headerCenterLabel}
                  </div>
                  {typeof headerProgressPercent === 'number' ? (
                    <div
                      className={`h-2.5 overflow-hidden rounded-full ${
                        isLockMode ? 'bg-white/10' : 'bg-[#EFE6E8]'
                      }`}
                    >
                      <div
                        className="h-full rounded-full transition-[width] duration-500"
                        style={{
                          width: `${headerProgressPercent}%`,
                          backgroundColor: 'var(--color-primary)',
                        }}
                      />
                    </div>
                  ) : null}
                  {headerCenterSubtext ? (
                    <div
                      className={`text-center text-xs font-semibold tracking-[-0.02em] ${
                        isLockMode ? 'text-white/58' : 'text-[#7C7280]'
                      }`}
                    >
                      {headerCenterSubtext}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </header>

        <div
          className={`w-full shrink-0 border-t ${
            isLockMode ? 'border-white/30' : 'border-[#E5E5E5]'
          }`}
        />

        {pageNotice ? (
          <div className="shrink-0 px-8 pt-4 md:px-12">
            <div
              className={`mx-auto max-w-[920px] rounded-2xl px-4 py-3 text-sm font-semibold ${
                isLockMode
                  ? 'border border-white/10 bg-white/[0.04] text-white/75'
                  : 'border border-[#EFE7D7] bg-[#FFF9EE] text-[#7A6642]'
              }`}
            >
              {pageNotice}
            </div>
          </div>
        ) : null}

        <main className="relative flex-1 overflow-hidden px-6 pb-5 pt-5 md:px-10 md:pb-6 md:pt-6">
          <div className="relative h-full min-h-[420px] md:min-h-[500px]">
            <div className="absolute inset-0 -translate-y-3 md:-translate-y-4">
              <section
                className={`absolute left-0 flex items-start gap-7 transition-opacity duration-200 max-xl:w-[60%] max-lg:w-[70%] ${
                  showUserSection
                    ? 'top-[6%] w-[50%]'
                    : 'top-[8%] w-[68%] max-xl:w-[74%] max-lg:w-[80%]'
                } ${
                  showAiSection
                    ? 'pointer-events-auto opacity-100'
                    : 'pointer-events-none opacity-0'
                }`}
                aria-hidden={!showAiSection}
              >
                <div className="relative h-[170px] w-[170px] shrink-0 md:h-[190px] md:w-[190px]">
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
                    className={`absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-black/5 bg-gray-100/55 px-3 py-1 text-sm font-black tracking-[-0.04em] backdrop-blur-sm ${
                      isLockMode ? 'text-white' : 'text-black'
                    }`}
                  >
                    {assistantDisplayName}
                  </div>
                </div>

                <div
                  className={
                    aiCaptionText.trim().length >= longCaptionThreshold ? 'pt-16' : 'pt-10'
                  }
                >
                  <AnimatePresence>
                    <motion.div
                      initial={false}
                      animate={{ opacity: aiCaptionText ? 1 : 0, y: aiCaptionText ? 0 : 14 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                    >
                      <CaptionLine
                        text={aiCaptionText}
                        doneLength={aiDoneLength}
                        activeLength={aiActiveLength}
                        align="left"
                        isLockMode={isLockMode}
                        size={aiCaptionSize}
                      />
                    </motion.div>
                  </AnimatePresence>
                </div>
              </section>

              <section
                className={`absolute right-0 flex items-start justify-end gap-8 transition-opacity duration-200 ${
                  showAiSection
                    ? 'bottom-[14%] w-[48%] max-xl:w-[54%] max-lg:w-[64%]'
                    : 'bottom-[12%] w-[68%] max-xl:w-[74%] max-lg:w-[80%]'
                } ${
                  showUserSection
                    ? 'pointer-events-auto opacity-100'
                    : 'pointer-events-none opacity-0'
                }`}
                aria-hidden={!showUserSection}
              >
                <div
                  className={`max-w-[min(28vw,24rem)] ${userCaptionText.trim().length >= longCaptionThreshold ? 'pt-6' : 'pt-3'}`}
                >
                  <AnimatePresence>
                    <motion.div
                      initial={false}
                      animate={{ opacity: userCaptionText ? 1 : 0, y: userCaptionText ? 0 : 14 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                    >
                      <CaptionLine
                        text={userCaptionText}
                        doneLength={userDoneLength}
                        activeLength={userActiveLength}
                        align="right"
                        isLockMode={isLockMode}
                        size={userCaptionSize}
                      />
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="relative h-[150px] w-[150px] shrink-0 md:h-[164px] md:w-[164px]">
                  <motion.div
                    className="h-full w-full overflow-hidden rounded-[20px] bg-[#F4F4F4]"
                    animate={{
                      y: activeSpeaker === 'user' ? -4 : 0,
                      scale: activeSpeaker === 'user' ? 1.01 : 1,
                    }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                  >
                    <img
                      src={profileImage}
                      alt="User profile"
                      fetchPriority="high"
                      decoding="async"
                      width="164"
                      height="164"
                      className="h-full w-full object-cover"
                    />
                  </motion.div>
                  <div
                    className={`absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-black/5 bg-gray-100/55 px-3 py-1 text-center text-sm font-black tracking-[-0.04em] backdrop-blur-sm ${
                      isLockMode ? 'text-white' : 'text-black'
                    }`}
                  >
                    {userDisplayName}
                  </div>
                </div>
              </section>
            </div>
          </div>
        </main>

        <footer className="shrink-0 px-6 pb-5 pt-2 md:px-10 md:pb-6">
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
                className={`rounded-full border px-4 py-2 text-sm font-bold ${
                  isLockMode ? 'border-white/10 text-white/70' : 'border-[#E7E7E7] text-[#707070]'
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
            className={`mx-auto flex max-w-[860px] items-center gap-3 rounded-[24px] px-4 py-3 ${
              isLockMode
                ? 'border border-white/10 bg-white/[0.04] shadow-[0_12px_32px_rgba(0,0,0,0.28)]'
                : 'border border-[#E7E7E7] bg-white shadow-[0_12px_32px_rgba(0,0,0,0.06)]'
            }`}
          >
            <button
              type="button"
              onClick={onMicToggle}
              disabled={isInteractionDisabled}
              aria-label={isMicOn ? '마이크 끄기' : '마이크 켜기'}
              title={isMicOn ? '마이크 끄기' : '마이크 켜기'}
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full border transition-all duration-200 ${
                isInteractionDisabled
                  ? isLockMode
                    ? 'cursor-not-allowed border-white/10 bg-white/5 text-white/30'
                    : 'cursor-not-allowed border-[#E5E5E5] bg-[#F5F5F5] text-[#B5B5B5]'
                  : isMicOn
                    ? 'border-[#F7576E]/25 bg-[#F7576E]/10 text-[#F7576E]'
                    : isLockMode
                      ? 'border-white/10 bg-white/5 text-white/70'
                      : 'border-[#DADADA] bg-[#F8F8F8] text-[#666666]'
              }`}
            >
              {isMicOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
            </button>

            {showTextInput && (
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
                  placeholder={disabledPlaceholder || CONVERSATION_UI.placeholder.chatInput}
                  disabled={isInteractionDisabled}
                  className={`min-w-0 flex-1 bg-transparent text-[15px] font-medium outline-none placeholder:text-[#B7B7B7] ${
                    isLockMode ? 'text-white' : 'text-black'
                  }`}
                />
                <button
                  type="button"
                  onClick={onSendText}
                  disabled={isInteractionDisabled || !chatInput.trim()}
                  aria-label="메시지 전송"
                  title="메시지 전송"
                  className={`flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 ${
                    !isInteractionDisabled && chatInput.trim()
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

            {onToggleContinuousConversation ? (
              <button
                onClick={onToggleContinuousConversation}
                className={`flex h-14 shrink-0 items-center gap-2 rounded-full border px-5 text-sm font-bold transition-all duration-200 ${
                  isContinuousConversationEnabled
                    ? 'border-[#F7576E]/20 bg-[#F7576E]/10 text-[#F7576E]'
                    : isLockMode
                      ? 'border-white/10 bg-white/5 text-white/75 hover:bg-white/10'
                      : 'border-[#E4E4E4] bg-[#FAFAFA] text-[#555555] hover:bg-[#F4F4F4]'
                }`}
              >
                {isContinuousConversationEnabled ? '연속 대화 ON' : '연속 대화 OFF'}
              </button>
            ) : null}
          </div>
        </footer>
      </div>
    </div>
  );
}
