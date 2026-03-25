import { useState, useCallback, useMemo, useEffect } from 'react';
import { MessageCircle, Mic, MicOff, Lock, Unlock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import userApi from '../../apis/userApi';

// Hooks
import { useAICharacter } from '../../hooks/useAICharacter';
import { useChat } from '../../hooks/useChat';
import { useFollow } from '../../hooks/useFollow';
import { useNotification } from '../../hooks/useNotification';
import { useUserStore } from '../../store/useUserStore';

// Components
import AnimatedBackground from '../../components/AnimatedBackground';
import Sidebar from '../../components/common/Sidebar';
import SpeechBubble from '../../components/common/SpeechBubble';
import CharacterScene from '../../components/features/character/CharacterScene';
import ChatWindow from '../../components/features/chat/ChatWindow';
import MyCardModal from '../../components/features/follow/MyCardModal';
import SharePersonaModal from '../../components/features/follow/SharePersonaModal';

// Constants & Types
import { BG_COLORS, LOCK_MODE_PALETTE } from '../../constants/theme';
import type { Alarm, Mode } from '../../types';

import { PATHS } from '../../routes/paths';
import authApi from '../../apis/authApi';

export default function HomePage() {
  const navigate = useNavigate();
  const { userInfo, logout: logoutStore } = useUserStore();

  // --- Custom Hooks ---
  const { isMicOn, mouthOpenRadius, faceType, toggleMic } = useAICharacter();

  const {
    chatInput,
    chatMessages,
    isLockMode,
    sttText,
    isAiSpeaking,
    isAwaitingResponse,
    setChatInput,
    toggleLock,
    sendMessage,
    startRecording,
    stopRecordingAndSendSTT,
  } = useChat();

  const {
    follows,
    followRequests,
    searchResults,
    isSearchLoading,
    deleteFollow,
    acceptRequest,
    rejectRequest,
    handleSearch,
  } = useFollow();

  const { alarms, readAlarm, readAllAlarms, removeAllAlarms, removeAlarm } = useNotification();

  // 가장 최근 작성된 AI의 메시지를 SpeechBubble용으로 추출
  const lastAiMessage = useMemo(() => {
    return (
      chatMessages
        .slice()
        .reverse()
        .find((m) => m.sender === 'ai')?.text || ''
    );
  }, [chatMessages]);

  // --- Local States ---
  const [currentMode, setCurrentMode] = useState<Mode>('normal');
  const [isMyCardModalOpen, setIsMyCardModalOpen] = useState(false);
  const [isSharePersonaOpen, setIsSharePersonaOpen] = useState(false);
  const [myViewCount, setMyViewCount] = useState(0);
  const [isChatHistoryOpen, setIsChatHistoryOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadMyViewCount = async () => {
      try {
        const profile = await userApi.getUserProfile();
        if (isMounted) {
          setMyViewCount(profile.viewCount ?? 0);
        }
      } catch (error) {
        if (isMounted) {
          setMyViewCount(0);
        }
        console.warn('방문 수 조회 실패:', error);
      }
    };

    void loadMyViewCount();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleAlarmClick = useCallback(
    (alarm: Alarm) => {
      readAlarm(alarm.id);
    },
    [readAlarm],
  );

  const backgroundProps = useMemo(() => {
    if (isLockMode) return LOCK_MODE_PALETTE;
    return BG_COLORS[currentMode] || {};
  }, [isLockMode, currentMode]);

  const handleVisit = useCallback(
    (id: number) => {
      navigate(PATHS.VISIT(id));
    },
    [navigate],
  );

  const handleLogout = async () => {
    if (window.confirm('로그아웃 하시겠습니까?')) {
      try {
        await authApi.logout();
        logoutStore();
        navigate(PATHS.LOGIN);
      } catch {
        logoutStore();
        navigate(PATHS.LOGIN);
      }
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col justify-between">
      <AnimatedBackground {...backgroundProps} />

      {/* 시크릿 모드 상단 조명 효과 (Beam of Light) */}
      <AnimatePresence>
        {isLockMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="fixed inset-0 pointer-events-none z-[8]"
          >
            {/* 가시적인 빛의 기둥 (정중앙 수직 조명) */}
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] opacity-50 blur-[4px]"
              style={{
                background:
                  'linear-gradient(to bottom, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.2) 60%, transparent 100%)',
                clipPath: 'polygon(45% 0, 55% 0, 100% 100%, 0% 100%)',
              }}
            />
            {/* 주변을 살짝 어둡게 하는 비네팅 (배경은 보이게) */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_150px,rgba(0,0,0,0.4)_500px)]" />
          </motion.div>
        )}
      </AnimatePresence>

      <Sidebar
        userInfo={userInfo}
        onLogout={handleLogout}
        onMyCardClick={() => setIsMyCardModalOpen(true)}
        currentMode={currentMode}
        onModeChange={(m) => setCurrentMode(m)}
        alarms={alarms}
        onAlarmClick={handleAlarmClick}
        onReadAllAlarms={readAllAlarms}
        onDeleteAllAlarms={removeAllAlarms}
        onRemoveAlarm={removeAlarm}
        follows={follows}
        followRequests={followRequests}
        onSearch={handleSearch}
        onVisit={handleVisit}
        onAccept={acceptRequest}
        onReject={rejectRequest}
        onDelete={deleteFollow}
        searchResults={searchResults}
        isSearchLoading={isSearchLoading}
        viewCount={myViewCount}
      />

      <main className="flex-1 flex items-center justify-center relative w-full h-full z-10">
        <motion.div
          className="relative flex flex-col items-center justify-center"
          animate={{
            y: isMicOn ? 0 : -220,
            scale: isMicOn ? 1 : 0.75,
          }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        >
          {/* 마이크 및 잠금 버튼 */}
          <div className="absolute left-[-140px] top-1/2 -translate-y-1/2 z-40">
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
                  startRecording(
                    null,
                    assistantType,
                    isLockMode ? 'SECRET' : 'GENERAL',
                    'USER_AI',
                    currentUserId,
                  );
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

          <div className="absolute right-[-140px] top-1/2 -translate-y-1/2 z-40">
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

          <div className="w-[350px] h-[350px] relative z-10 flex flex-col items-center justify-center">
            <CharacterScene
              faceType={faceType}
              mouthOpenRadius={mouthOpenRadius}
              mode={currentMode}
              isLockMode={isLockMode}
              isSpeaking={isAiSpeaking}
              isMicOn={isMicOn}
            />
            {isMicOn && lastAiMessage && <SpeechBubble text={lastAiMessage} />}

            {/* STT 실시간 말풍선 (화면 아래쪽) */}
            {isMicOn && (isAwaitingResponse || sttText) && (
              <div className="absolute bottom-[-220px] left-1/2 -translate-x-1/2 px-8 py-4 bg-black/40 backdrop-blur-xl text-white font-black text-lg rounded-3xl shadow-2xl border border-white/20 z-50 min-w-[280px] text-center max-w-[80vw] whitespace-pre-wrap">
                🎙️ {sttText}
              </div>
            )}
          </div>
        </motion.div>

        <ChatWindow
          isVisible={!isMicOn || isChatHistoryOpen}
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
            const memoryPolicy = isLockMode ? 'SECRET' : 'GENERAL';

            sendMessage(chatInput, null, assistantType, memoryPolicy, 'USER_AI', currentUserId);
          }}
          onClose={() => setIsChatHistoryOpen(false)}
        />

        <button
          onClick={() => setIsChatHistoryOpen(!isChatHistoryOpen)}
          className={`absolute bottom-8 right-8 p-4 rounded-2xl backdrop-blur-xl border shadow-2xl transition-all duration-300 z-40 group ${
            isChatHistoryOpen ? 'opacity-0' : 'bg-white/20 hover:scale-110'
          }`}
        >
          <MessageCircle className="w-8 h-8 text-white" />
        </button>
      </main>

      <MyCardModal
        isOpen={isMyCardModalOpen}
        onClose={() => setIsMyCardModalOpen(false)}
        userId={userInfo?.id ?? null}
        userName={userInfo?.nickname || '내 프로필'}
        userHandle={userInfo?.email ? `@${userInfo.email.split('@')[0]}` : '@ssarvis_me'}
        followingCount={follows.filter((follow) => follow.isFollowing).length}
        followerCount={follows.filter((follow) => follow.isFollower).length}
      />

      <SharePersonaModal isOpen={isSharePersonaOpen} onClose={() => setIsSharePersonaOpen(false)} />
    </div>
  );
}
