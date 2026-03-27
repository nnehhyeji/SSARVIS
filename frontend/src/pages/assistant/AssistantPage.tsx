import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Lock, Unlock, Square, Send } from 'lucide-react';

import { useAICharacter } from '../../hooks/useAICharacter';
import { useChat } from '../../hooks/useChat';
import { useUserStore } from '../../store/useUserStore';
import userApi from '../../apis/userApi';
import type { UserResponse } from '../../apis/userApi';
import CharacterScene from '../../components/features/character/CharacterScene';

const ACTIVE_SPEECH_COLOR = '#F7576E';
const PENDING_TEXT_CLASS = 'text-[#D9D9D9]';
const SIDEBAR_SAFE_PADDING = 'pl-[104px] md:pl-[120px] lg:pl-[132px]';
const PAGE_INSET = 'px-8 pt-8 md:px-12 md:pt-12';

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

function getActiveSegment(text: string) {
  const trimmed = text.trimEnd();
  if (!trimmed) return { doneLength: 0, activeLength: 0 };

  const lastWhitespace = Math.max(trimmed.lastIndexOf(' '), trimmed.lastIndexOf('\n'));
  const activeStart = lastWhitespace >= 0 ? lastWhitespace + 1 : 0;

  return {
    doneLength: activeStart,
    activeLength: trimmed.length - activeStart,
  };
}

export default function AssistantPage() {
  const { userInfo, currentMode } = useUserStore();

  const { isMicOn, mouthOpenRadius, faceType, toggleMic, isSpeaking, setIsSpeaking, triggerText } =
    useAICharacter();

  const {
    chatInput,
    chatMessages,
    latestAiText,
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

  const [profile, setProfile] = useState<UserResponse | null>(null);
  const [modeHistories, setModeHistories] = useState<
    Record<string, { sender: 'ai' | 'me'; text: string }[]>
  >({
    normal: [],
    study: [],
    counseling: [],
    persona: [],
  });
  const prevModeRef = useRef(currentMode);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        const data = await userApi.getUserProfile();
        if (isMounted) setProfile(data);
      } catch (error) {
        console.error('Failed to load assistant profile:', error);
      }
    };

    void loadProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const prevMode = prevModeRef.current;
    if (prevMode !== currentMode) {
      cancelTurn();

      setModeHistories((prev) => ({
        ...prev,
        [prevMode]: chatMessages,
      }));

      const history = modeHistories[currentMode] || [];
      setChatMessages(history);
      prevModeRef.current = currentMode;
    }
  }, [cancelTurn, chatMessages, currentMode, modeHistories, setChatMessages]);

  const finalIsSpeaking = isAiSpeaking || isSpeaking;

  const handleStartSpeaking = useCallback(() => setIsSpeaking(true), [setIsSpeaking]);
  const handleEndSpeaking = useCallback(() => setIsSpeaking(false), [setIsSpeaking]);

  useEffect(() => {
    if (!triggerText) return;

    handleStartSpeaking();
    const timer = setTimeout(handleEndSpeaking, triggerText.length * 100 + 500);
    return () => clearTimeout(timer);
  }, [triggerText, handleEndSpeaking, handleStartSpeaking]);

  const assistantType = useMemo(() => {
    if (currentMode === 'counseling') return 'COUNSEL';
    if (currentMode === 'normal') return 'DAILY';
    return currentMode.toUpperCase();
  }, [currentMode]);

  const lastAiRenderedMessage = useMemo(() => {
    return (
      chatMessages
        .slice()
        .reverse()
        .find((message) => message.sender === 'ai')?.text || ''
    );
  }, [chatMessages]);

  const lastUserMessage = useMemo(() => {
    return (
      chatMessages
        .slice()
        .reverse()
        .find((message) => message.sender === 'me')?.text || ''
    );
  }, [chatMessages]);

  const isLiveUserCaption =
    isMicOn && !isAiSpeaking && !isAwaitingResponse && sttText.trim().length > 0;
  const userCaptionText = isLiveUserCaption ? sttText.trim() : lastUserMessage;
  const userCaptionSegments = isLiveUserCaption
    ? getActiveSegment(userCaptionText)
    : { doneLength: userCaptionText.length, activeLength: 0 };

  const aiCaptionText = latestAiText || triggerText || lastAiRenderedMessage;
  const aiCaptionSegments = useMemo(() => {
    if (!aiCaptionText) return { doneLength: 0, activeLength: 0 };
    if (finalIsSpeaking) {
      const visibleLength = Math.max(
        0,
        Math.min(lastAiRenderedMessage.length, aiCaptionText.length),
      );
      if (visibleLength === 0) return { doneLength: 0, activeLength: 0 };
      return {
        doneLength: Math.max(0, visibleLength - 1),
        activeLength: 1,
      };
    }

    return { doneLength: aiCaptionText.length, activeLength: 0 };
  }, [aiCaptionText, finalIsSpeaking, lastAiRenderedMessage.length]);

  const profileImage =
    profile?.userProfileImageUrl ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
      profile?.nickname || userInfo?.nickname || 'User',
    )}`;

  const assistantDisplayName = `${userInfo?.nickname || profile?.nickname || 'User'} AI`;
  const userDisplayName = profile?.nickname || userInfo?.nickname || 'User';
  const statusText = isAiSpeaking
    ? 'AI 응답 중'
    : isLiveUserCaption
      ? '사용자 발화 인식 중'
      : isAwaitingResponse
        ? '응답 대기 중'
        : isMicOn
          ? '리스닝 중'
          : '텍스트 입력 가능';

  const handleMicToggle = () => {
    toggleMic();
    if (!isMicOn) {
      startRecording(null, assistantType, isLockMode ? 'SECRET' : 'GENERAL', 'USER_AI');
    } else {
      stopRecordingAndSendSTT();
    }
  };

  const handleSendText = () => {
    if (!chatInput.trim()) return;
    sendMessage(chatInput, null, assistantType, isLockMode ? 'SECRET' : 'GENERAL', 'USER_AI');
  };

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
            대화
          </h1>
        </header>

        <div
          className={`w-full shrink-0 border-t ${
            isLockMode ? 'border-white/30' : 'border-[#E5E5E5]'
          }`}
        />

        <main className="relative flex-1 overflow-hidden px-8 pb-8 pt-8 md:px-12">
          <div className="relative h-full min-h-[540px]">
            <section className="absolute left-0 top-[11%] flex w-[58%] items-start gap-10">
              <div className="relative h-[220px] w-[220px] shrink-0">
                <CharacterScene
                  faceType={faceType}
                  mouthOpenRadius={mouthOpenRadius}
                  mode={currentMode}
                  isLockMode={isLockMode}
                  isSpeaking={finalIsSpeaking}
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
                    key={`ai-${aiCaptionText}-${aiCaptionSegments.doneLength}-${aiCaptionSegments.activeLength}`}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: aiCaptionText ? 1 : 0, y: aiCaptionText ? 0 : 14 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                  >
                    <CaptionLine
                      text={aiCaptionText}
                      doneLength={aiCaptionSegments.doneLength}
                      activeLength={aiCaptionSegments.activeLength}
                      align="left"
                      isLockMode={isLockMode}
                    />
                  </motion.div>
                </AnimatePresence>
              </div>
            </section>

            <section className="absolute bottom-[18%] right-0 flex w-[54%] items-start justify-end gap-8">
              <div className="max-w-[min(34vw,31rem)] pt-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`user-${userCaptionText}-${userCaptionSegments.doneLength}-${userCaptionSegments.activeLength}`}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: userCaptionText ? 1 : 0, y: userCaptionText ? 0 : 14 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                  >
                    <CaptionLine
                      text={userCaptionText}
                      doneLength={userCaptionSegments.doneLength}
                      activeLength={userCaptionSegments.activeLength}
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
                    y: isLiveUserCaption ? -4 : 0,
                    scale: isLiveUserCaption ? 1.01 : 1,
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
          </div>
        </main>

        <footer className="shrink-0 px-8 pb-8 pt-3 md:px-12">
          <div className="mb-3 flex items-center justify-center">
            <div
              className={`rounded-full px-4 py-2 text-sm font-bold shadow-sm ${
                isLockMode
                  ? 'border border-white/10 bg-white/5 text-white/70'
                  : 'border border-[#E7E7E7] bg-white text-[#707070]'
              }`}
            >
              {statusText}
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
              onClick={handleMicToggle}
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
                  onChange={(event) => setChatInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') handleSendText();
                  }}
                  placeholder="메시지를 입력하세요"
                  className={`min-w-0 flex-1 bg-transparent text-[15px] font-medium outline-none placeholder:text-[#B7B7B7] ${
                    isLockMode ? 'text-white' : 'text-black'
                  }`}
                />
                <button
                  onClick={handleSendText}
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
              onClick={cancelTurn}
              aria-label="중단"
              title="중단"
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full border transition-all duration-200 ${
                isLockMode
                  ? 'border-white/10 bg-white/5 text-white/75 hover:bg-white/10'
                  : 'border-[#E4E4E4] bg-[#FAFAFA] text-[#555555] hover:bg-[#F4F4F4]'
              }`}
            >
              <Square className="h-4 w-4 fill-current" />
            </button>

            <button
              onClick={toggleLock}
              className={`flex h-14 shrink-0 items-center gap-2 rounded-full border px-5 text-sm font-bold transition-all duration-200 ${
                isLockMode
                  ? 'border-[#F7576E]/20 bg-[#F7576E]/10 text-[#F7576E]'
                  : 'border-[#E4E4E4] bg-[#FAFAFA] text-[#555555] hover:bg-[#F4F4F4]'
              }`}
            >
              {isLockMode ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
              {isLockMode ? '시크릿' : '일반'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
