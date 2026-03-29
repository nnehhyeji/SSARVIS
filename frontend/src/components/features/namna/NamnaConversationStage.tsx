import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link2, Lock, Mic, MicOff, Send, Square, Unlock } from 'lucide-react';

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
  size,
}: {
  text: string;
  doneLength: number;
  activeLength: number;
  align: 'left' | 'right';
  isLockMode: boolean;
  size?: 'default' | 'compact';
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
      className={`max-w-[min(28vw,24rem)] whitespace-pre-wrap break-words font-black tracking-[-0.05em] ${
        size === 'compact'
          ? 'text-[clamp(1.3rem,1.9vw,2.3rem)] leading-[1.24]'
          : 'text-[clamp(1.6rem,2.3vw,3rem)] leading-[1.26]'
      } ${align === 'right' ? 'text-right' : 'text-left'}`}
    >
      {doneText ? <span className={doneClassName}>{doneText}</span> : null}
      {activeText ? <span style={{ color: ACTIVE_SPEECH_COLOR }}>{activeText}</span> : null}
      {pendingText ? <span className={pendingClassName}>{pendingText}</span> : null}
    </div>
  );
}

interface NamnaConversationStageProps {
  title: string;
  isLockMode: boolean;
  isMicOn: boolean;
  isTextInputMode?: boolean;
  headerCenterLabel?: string;
  onHeaderCenterAction?: () => void;
  onHeaderCenterClear?: () => void;
  headerRightActionLabel?: string;
  onHeaderRightAction?: () => void;
  leftFaceType: number;
  leftMouthOpenRadius: number;
  leftMode: string;
  leftIsSpeaking: boolean;
  leftDisplayName: string;
  leftCaptionText: string;
  leftDoneLength: number;
  leftActiveLength: number;
  rightFaceType: number;
  rightMouthOpenRadius: number;
  rightMode: string;
  rightIsSpeaking: boolean;
  rightDisplayName: string;
  rightCaptionText: string;
  rightDoneLength: number;
  rightActiveLength: number;
  activeSpeaker: 'left' | 'right' | null;
  statusText: string;
  statusSubtext?: string;
  connectionNotice?: string;
  progressCurrent?: number;
  progressTotal?: number;
  progressLabel?: string;
  useProgressFooter?: boolean;
  showContinuationPrompt?: boolean;
  onContinueConversation?: () => void;
  onStopConversation?: () => void;
  chatInput: string;
  onChatInputChange: (value: string) => void;
  onMicToggle: () => void;
  onSendText: () => void;
  onCancel: () => void;
  onToggleLock: () => void;
}

export default function NamnaConversationStage({
  title,
  isLockMode,
  isMicOn,
  isTextInputMode = false,
  headerCenterLabel,
  onHeaderCenterAction,
  onHeaderCenterClear,
  headerRightActionLabel,
  onHeaderRightAction,
  leftFaceType,
  leftMouthOpenRadius,
  leftMode,
  leftIsSpeaking,
  leftDisplayName,
  leftCaptionText,
  leftDoneLength,
  leftActiveLength,
  rightFaceType,
  rightMouthOpenRadius,
  rightMode,
  rightIsSpeaking,
  rightDisplayName,
  rightCaptionText,
  rightDoneLength,
  rightActiveLength,
  activeSpeaker,
  statusText,
  statusSubtext,
  connectionNotice,
  progressCurrent = 0,
  progressTotal = 0,
  progressLabel,
  useProgressFooter = false,
  showContinuationPrompt = false,
  onContinueConversation,
  onStopConversation,
  chatInput,
  onChatInputChange,
  onMicToggle,
  onSendText,
  onCancel,
  onToggleLock,
}: NamnaConversationStageProps) {
  const [isNarrowLayout, setIsNarrowLayout] = useState(false);
  const showTextInput = isTextInputMode || !isMicOn;
  const progressPercent =
    progressTotal > 0 ? Math.min(100, Math.max(0, (progressCurrent / progressTotal) * 100)) : 0;

  useEffect(() => {
    const updateLayout = () => {
      setIsNarrowLayout(window.innerWidth < SINGLE_SPEAKER_BREAKPOINT);
    };

    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, []);

  const longCaptionThreshold = isNarrowLayout ? 30 : 42;
  const leftIsLong = leftCaptionText.trim().length >= longCaptionThreshold;
  const rightIsLong = rightCaptionText.trim().length >= longCaptionThreshold;
  const shouldFocusActiveSpeaker =
    isNarrowLayout && activeSpeaker !== null && (leftCaptionText.trim() || rightCaptionText.trim());
  const showLeftSection = shouldFocusActiveSpeaker ? activeSpeaker !== 'right' : true;
  const showRightSection = shouldFocusActiveSpeaker ? activeSpeaker !== 'left' : true;

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
        <header className={`flex shrink-0 items-end justify-between gap-4 pb-6 ${PAGE_INSET}`}>
          <h1
            className={`text-[46px] font-black tracking-[-0.06em] md:text-[54px] ${
              isLockMode ? 'text-white' : 'text-black'
            }`}
          >
            {title}
          </h1>

          {headerRightActionLabel && onHeaderRightAction ? (
            <button
              type="button"
              onClick={onHeaderRightAction}
              className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-all active:scale-95 ${
                isLockMode
                  ? 'border border-white/12 bg-white/6 text-white hover:bg-white/10'
                  : 'border border-[#E7E7E7] bg-white text-[#555555] hover:bg-[#F8F8F8]'
              }`}
            >
              <Link2 className="h-4 w-4" />
              {headerRightActionLabel}
            </button>
          ) : null}
        </header>

        <div
          className={`w-full shrink-0 border-t ${
            isLockMode ? 'border-white/30' : 'border-[#E5E5E5]'
          }`}
        />

        {headerCenterLabel ? (
          <div className="shrink-0 pt-4">
            <div className="flex justify-center">
              <div
                className={`inline-flex items-center gap-2 rounded-full px-3 py-2 shadow-sm ${
                  isLockMode
                    ? 'border border-white/12 bg-white/6'
                    : 'border border-[#F5C7CF] bg-[#FFF4F6]'
                }`}
              >
                <button
                  type="button"
                  onClick={onHeaderCenterAction}
                  className={`inline-flex items-center rounded-full px-1 py-0 text-sm font-black transition-colors ${
                    onHeaderCenterAction
                      ? isLockMode
                        ? 'text-white/85 hover:text-white'
                        : 'text-[#D84D66] hover:text-[#C93F58]'
                      : isLockMode
                        ? 'text-white/80'
                        : 'text-[#555555]'
                  }`}
                  disabled={!onHeaderCenterAction}
                >
                  {headerCenterLabel}
                </button>
                {onHeaderCenterClear ? (
                  <button
                    type="button"
                    onClick={onHeaderCenterClear}
                    aria-label="주제 대화 취소"
                    className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors ${
                      isLockMode
                        ? 'bg-white/8 text-white/75 hover:bg-white/12 hover:text-white'
                        : 'bg-white text-[#D84D66] hover:bg-[#FFE8EC]'
                    }`}
                  >
                    <span className="text-base font-black leading-none">×</span>
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        <main className="relative flex-1 overflow-hidden px-6 pb-5 md:px-10 md:pb-6">
          <div className="relative h-full min-h-[420px] md:min-h-[500px]">
            <div className="absolute inset-0 -translate-y-3 md:-translate-y-4">
              <section
                className={`absolute left-0 flex items-start gap-7 transition-opacity duration-200 max-xl:w-[60%] max-lg:w-[70%] ${
                  showRightSection
                    ? 'top-[6%] w-[50%]'
                    : 'top-[8%] w-[68%] max-xl:w-[74%] max-lg:w-[80%]'
                } ${
                  showLeftSection
                    ? 'pointer-events-auto opacity-100'
                    : 'pointer-events-none opacity-0'
                }`}
                aria-hidden={!showLeftSection}
              >
                <div className="relative h-[170px] w-[170px] shrink-0 md:h-[190px] md:w-[190px]">
                  <CharacterScene
                    faceType={leftFaceType}
                    mouthOpenRadius={leftMouthOpenRadius}
                    mode={leftMode}
                    isLockMode={isLockMode}
                    isSpeaking={leftIsSpeaking}
                    isMicOn={isMicOn}
                    showWaveform={false}
                  />
                  <div
                    className={`absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-black/5 bg-gray-100/55 px-3 py-1 text-sm font-black tracking-[-0.04em] backdrop-blur-sm ${
                      isLockMode ? 'text-white' : 'text-black'
                    }`}
                  >
                    {leftDisplayName}
                  </div>
                </div>

                <div className={leftIsLong ? 'pt-16' : 'pt-10'}>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`namna-left-${leftCaptionText}`}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: leftCaptionText ? 1 : 0, y: leftCaptionText ? 0 : 14 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                    >
                      <CaptionLine
                        text={leftCaptionText}
                        doneLength={leftDoneLength}
                        activeLength={leftActiveLength}
                        align="left"
                        isLockMode={isLockMode}
                        size={leftIsLong ? 'compact' : 'default'}
                      />
                    </motion.div>
                  </AnimatePresence>
                </div>
              </section>

              <section
                className={`absolute right-0 flex items-start justify-end gap-8 transition-opacity duration-200 ${
                  showLeftSection
                    ? 'bottom-[14%] w-[48%] max-xl:w-[54%] max-lg:w-[64%]'
                    : 'bottom-[12%] w-[68%] max-xl:w-[74%] max-lg:w-[80%]'
                } ${
                  showRightSection
                    ? 'pointer-events-auto opacity-100'
                    : 'pointer-events-none opacity-0'
                }`}
                aria-hidden={!showRightSection}
              >
                <div className={`max-w-[min(28vw,24rem)] ${rightIsLong ? 'pt-6' : 'pt-3'}`}>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`namna-right-${rightCaptionText}`}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: rightCaptionText ? 1 : 0, y: rightCaptionText ? 0 : 14 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                    >
                      <CaptionLine
                        text={rightCaptionText}
                        doneLength={rightDoneLength}
                        activeLength={rightActiveLength}
                        align="right"
                        isLockMode={isLockMode}
                        size={rightIsLong ? 'compact' : 'default'}
                      />
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="relative h-[170px] w-[170px] shrink-0 md:h-[190px] md:w-[190px]">
                  <CharacterScene
                    faceType={rightFaceType}
                    mouthOpenRadius={rightMouthOpenRadius}
                    mode={rightMode}
                    isLockMode={isLockMode}
                    isSpeaking={rightIsSpeaking}
                    isMicOn={isMicOn}
                    showWaveform={false}
                  />
                  <div
                    className={`absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-black/5 bg-gray-100/55 px-3 py-1 text-center text-sm font-black tracking-[-0.04em] backdrop-blur-sm ${
                      isLockMode ? 'text-white' : 'text-black'
                    }`}
                  >
                    {rightDisplayName}
                  </div>
                </div>
              </section>
            </div>
          </div>
        </main>

        <footer className="shrink-0 px-6 pb-5 pt-2 md:px-10 md:pb-6">
          {connectionNotice ? (
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
          ) : null}

          <div className="mb-3 flex items-center justify-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`rounded-full border px-4 py-2 text-sm font-bold ${
                  isLockMode
                    ? 'border-white/10 text-white/70'
                    : 'border-[#E7E7E7] text-[#707070]'
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
            {useProgressFooter ? (
              <div
                className={`flex min-w-0 flex-1 flex-col gap-2 rounded-[18px] px-4 py-3 ${
                  isLockMode
                    ? 'border border-white/10 bg-white/[0.04]'
                    : 'border border-[#EEEEEE] bg-[#FAFAFA]'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={`text-sm font-black tracking-[-0.03em] ${
                      isLockMode ? 'text-white/85' : 'text-[#333333]'
                    }`}
                  >
                    {progressLabel || '대화 진행도'}
                  </span>
                  <span
                    className={`text-xs font-bold ${
                      isLockMode ? 'text-white/60' : 'text-[#7B7B7B]'
                    }`}
                  >
                    {progressCurrent}/{progressTotal || 0}
                  </span>
                </div>
                <div
                  className={`h-3 overflow-hidden rounded-full ${
                    isLockMode ? 'bg-white/10' : 'bg-[#ECECEC]'
                  }`}
                >
                  <div
                    className="h-full rounded-full transition-[width] duration-500"
                    style={{
                      width: `${progressPercent}%`,
                      backgroundColor: 'var(--color-primary)',
                    }}
                  />
                </div>
                {showContinuationPrompt ? (
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={onStopConversation}
                      className={`rounded-full px-4 py-2 text-xs font-black transition-colors ${
                        isLockMode
                          ? 'border border-white/10 bg-white/5 text-white/75 hover:bg-white/10'
                          : 'border border-[#E4E4E4] bg-white text-[#666666] hover:bg-[#F7F7F7]'
                      }`}
                    >
                      여기서 멈추기
                    </button>
                    <button
                      type="button"
                      onClick={onContinueConversation}
                      className="rounded-full bg-[#F7576E] px-4 py-2 text-xs font-black text-white transition-colors hover:bg-[#EB4A61]"
                    >
                      20턴 더 진행하기
                    </button>
                  </div>
                ) : null}
              </div>
            ) : showTextInput ? (
              <button
                type="button"
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
            ) : null}

            {!useProgressFooter && showTextInput ? (
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
            ) : !useProgressFooter ? (
              <div className="flex-1" />
            ) : null}

            <button
              type="button"
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
              type="button"
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
