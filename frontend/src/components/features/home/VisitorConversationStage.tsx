import { AnimatePresence, motion } from 'framer-motion';
import { MessageSquare, Mic, MicOff, Send, Square } from 'lucide-react';

import { initialsAvatarFallback } from '../../../utils/avatar';
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
  const lines = splitCaptionLineSegments(text, doneLength, activeLength);
  if (!hasVisibleCaptionLine(lines, true)) return null;

  return (
    <div className="w-full break-words text-left text-[clamp(1.5rem,2.2vw,3rem)] font-black leading-[1.1] tracking-[-0.05em] text-black">
      {lines.map((line, index) => (
        <div key={`visitor-${index}`} className={index === 0 ? '' : 'mt-[0.08em]'}>
          {renderCaptionLine(
            line,
            (value) => <span className="text-black">{value}</span>,
            (value) => <span style={{ color: ACTIVE_SPEECH_COLOR }}>{value}</span>,
            (value) => <span className={PENDING_TEXT_CLASS}>{value}</span>,
          )}
        </div>
      ))}
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
  assistantProfileImage?: string;
  userDisplayName?: string;
  profileImage?: string;
  aiCaptionText: string;
  aiDoneLength: number;
  aiActiveLength: number;
  statusText: string;
  isListeningStatus?: boolean;
  showWakeCue?: boolean;
  liveUserTranscript?: string;
  showLiveTranscript?: boolean;
  connectionNotice?: string;
  isDualAiRunning?: boolean;
  canStartDualAi?: boolean;
  followButtonLabel?: string | null;
  isFollowButtonDisabled?: boolean;
  isFollowButtonLoading?: boolean;
  chatInput: string;
  onChatInputChange: (value: string) => void;
  onMicToggle: () => void;
  onSendText: () => void;
  onCancel: () => void;
  onOpenPersona: () => void;
  onToggleDualAi: () => void;
  onFollowClick?: () => void;
}

export default function VisitorConversationStage({
  title,
  isMicOn,
  isTextInputMode = false,
  isCharacterSpeaking,
  assistantDisplayName,
  assistantProfileImage,
  userDisplayName = '나',
  profileImage,
  aiCaptionText,
  aiDoneLength,
  aiActiveLength,
  statusText,
  isListeningStatus = false,
  showWakeCue = false,
  liveUserTranscript = '',
  showLiveTranscript = false,
  connectionNotice,
  isDualAiRunning = false,
  canStartDualAi = true,
  followButtonLabel = null,
  isFollowButtonDisabled = false,
  isFollowButtonLoading = false,
  chatInput,
  onChatInputChange,
  onMicToggle,
  onSendText,
  onCancel,
  onOpenPersona,
  onToggleDualAi,
  onFollowClick,
}: VisitorConversationStageProps) {
  const showTextInput = isTextInputMode || !isMicOn;
  const showUserAvatar = Boolean(profileImage?.trim());
  const resolvedAssistantProfileImage =
    assistantProfileImage?.trim() || initialsAvatarFallback(assistantDisplayName);

  return (
    <div className={`relative h-full w-full bg-white ${SIDEBAR_SAFE_PADDING}`}>
      <div className="relative z-10 flex h-full w-full flex-col overflow-hidden">
        <header className={`flex shrink-0 items-end justify-between gap-4 pb-6 ${PAGE_INSET}`}>
          <h1 className="text-[46px] font-black tracking-[-0.06em] text-black md:text-[54px]">
            {title}
          </h1>

          <div className="flex items-center gap-3">
            {followButtonLabel ? (
              <button
                type="button"
                onClick={onFollowClick}
                disabled={isFollowButtonDisabled || isFollowButtonLoading}
                className={`flex h-9 items-center rounded-full px-5 text-sm font-bold transition-all active:scale-95 ${
                  isFollowButtonDisabled || isFollowButtonLoading
                    ? 'bg-[#F3F3F3] text-[#7B7B7B]'
                    : 'bg-rose-500 text-white hover:bg-rose-600'
                }`}
              >
                {isFollowButtonLoading ? '확인 중...' : followButtonLabel}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onOpenPersona}
              className="flex h-9 items-center rounded-full bg-rose-500 px-5 text-sm font-bold text-white transition-all hover:bg-rose-600 active:scale-95"
            >
              페르소나 문답
            </button>
            <button
              type="button"
              onClick={onToggleDualAi}
              disabled={!canStartDualAi && !isDualAiRunning}
              className={`flex h-9 items-center gap-2 rounded-full px-5 text-sm font-bold text-white transition-all active:scale-95 ${
                isDualAiRunning
                  ? 'bg-rose-500 hover:bg-rose-600'
                  : canStartDualAi
                    ? 'bg-rose-500 hover:bg-rose-600'
                    : 'bg-rose-200 text-white/80'
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
            <div className="flex w-full max-w-[1100px] items-center justify-center gap-7">
              <div className="flex flex-col items-center justify-center">
                <div className="relative flex h-[250px] w-[250px] items-center justify-center md:h-[310px] md:w-[310px]">
                  <AnimatePresence>
                    {showWakeCue ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.82 }}
                        animate={{ opacity: 0.9, scale: 1.06 }}
                        exit={{ opacity: 0, scale: 1.16 }}
                        transition={{ duration: 0.45, ease: 'easeOut' }}
                        className="pointer-events-none absolute inset-4 rounded-full border-2 border-[#F6B7C2] bg-[radial-gradient(circle,_rgba(247,87,110,0.18)_0%,_rgba(247,87,110,0.08)_45%,_rgba(247,87,110,0)_75%)]"
                      />
                    ) : null}
                  </AnimatePresence>
                  <div className="relative h-full w-full overflow-hidden rounded-full border border-[#F3D4DA] bg-[#FFF4F6] shadow-[0_18px_50px_rgba(247,87,110,0.18)]">
                    <img
                      src={resolvedAssistantProfileImage}
                      alt={assistantDisplayName}
                      className="h-full w-full object-cover"
                    />
                    <div
                      className={`pointer-events-none absolute inset-0 transition-opacity duration-300 ${
                        isCharacterSpeaking && isMicOn
                          ? 'bg-[radial-gradient(circle,_rgba(247,87,110,0.12)_0%,_rgba(247,87,110,0)_65%)] opacity-100'
                          : 'opacity-0'
                      }`}
                    />
                  </div>
                </div>
                <div className="mt-0.5 text-center text-sm font-normal tracking-[-0.03em] text-black/70">
                  {assistantDisplayName}
                </div>
                <AnimatePresence>
                  {showWakeCue ? (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.22, ease: 'easeOut' }}
                      className="mt-1 text-center text-sm font-bold text-[#C84358]"
                    >
                      들었어요
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>

              <AnimatePresence>
                <motion.div
                  initial={false}
                  animate={{ opacity: aiCaptionText ? 1 : 0, y: aiCaptionText ? 0 : 14 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="min-h-[4.5rem] w-[min(32vw,28rem)] flex-none self-center"
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

          {statusText.trim() ? (
            <div className="mb-3 flex items-center justify-center">
              <div
                className={`rounded-full border px-4 py-2 text-sm font-bold transition-colors ${
                  isListeningStatus
                    ? 'border-[#F7C3CB] text-[#C84358]'
                    : 'border-[#E7E7E7] text-[#707070]'
                }`}
              >
                {statusText}
              </div>
            </div>
          ) : null}

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
                {showUserAvatar ? (
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-[#E7E7E7] bg-[#F1F1F1]">
                    <img
                      src={profileImage}
                      alt={userDisplayName}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : null}
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
            ) : showLiveTranscript ? (
              <div className="flex min-w-0 flex-1 items-center gap-3 rounded-[18px] border border-[#F3D4DA] bg-[#FFF7F8] px-4 py-3">
                {showUserAvatar ? (
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-[#F3D4DA] bg-white">
                    <img
                      src={profileImage}
                      alt={userDisplayName}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F7576E]/12 text-[#F7576E]">
                    <Mic className="h-4 w-4" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="mb-1 text-[11px] font-bold tracking-[0.08em] text-[#C56A78]">
                    실시간 자막
                  </div>
                  <p className="max-h-[3.6rem] overflow-hidden whitespace-pre-wrap break-words text-sm font-medium leading-6 text-[#444444]">
                    {liveUserTranscript.trim() || '말을 듣는 중...'}
                  </p>
                </div>
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
