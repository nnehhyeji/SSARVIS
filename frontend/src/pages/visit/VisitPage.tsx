import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { MessageCircle, Mic, MicOff, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

// Hooks
import { useAICharacter } from '../../hooks/useAICharacter';
import { useAIToAIChat } from '../../hooks/useAIToAIChat';
import { useChat } from '../../hooks/useChat';
import { useFollow } from '../../hooks/useFollow';
import { useUserStore } from '../../store/useUserStore';

// Components
import Header from '../../components/common/Header';
import SpeechBubble from '../../components/common/SpeechBubble';
import CharacterScene from '../../components/features/character/CharacterScene';
import AiTopicModal from '../../components/features/assistant/AiTopicModal';
import ChatWindow from '../../components/features/chat/ChatWindow';
import FollowSidebar from '../../components/features/follow/FollowSidebar';
import ModePanel from '../../components/features/assistant/ModePanel';
import PersonaModal from '../../components/features/follow/PersonaModal';
import UserMenuModal from '../../components/features/user/UserMenuModal';

// Constants & Types
import { PATHS } from '../../routes/paths';
import type { Mode } from '../../types';

export default function VisitPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const targetId = Number(userId);

  const { isLoggedIn, userInfo } = useUserStore();

  // --- Custom Hooks ---
  const {
    isMicOn,
    isSpeaking,
    mouthOpenRadius,
    triggerText,
    faceType,
    isMyAiSpeaking,
    myMouthOpenRadius,
    myTriggerText,
    toggleMic,
    changeFace,
    setTriggerText,
    setMyTriggerText,
    setIsSpeaking,
    setIsMyAiSpeaking,
  } = useAICharacter();

  // 방문 페이지에서는 시크릿 모드(isLockMode)를 사용하지 않으므로 제거
  const {
    chatInput,
    chatMessages,
    sttText,
    isAiSpeaking,
    setChatInput,
    sendMessage,
    startRecording,
    stopRecordingAndSendSTT,
  } = useChat();
  const {
    isBattling,
    isPaused,
    turnCount,
    myLatestText,
    targetLatestText,
    activeSpeaker,
    statusMessage,
    topic: aiTopic,
    errorMessage: aiBattleError,
    battleMessages,
    maxTurn,
    startBattle,
    pauseBattle,
    resumeBattle,
    stopBattle,
  } = useAIToAIChat();

  const {
    follows,
    followRequests,
    searchResults,
    isSearchLoading,
    isVisitorMode,
    visitedFollowName,
    visitedUserId,
    isDualAiMode,
    isInteractionModalOpen,
    visitorVisibility,
    setIsDualAiMode,
    setIsInteractionModalOpen,
    visitFollow,
    leaveFollow,
    deleteFollow,
    requestFollow,
    acceptRequest,
    rejectRequest,
    handleSearch,
  } = useFollow();

  // --- Callbacks for Stability ---
  const handleStartSpeaking = useCallback(() => setIsSpeaking(true), [setIsSpeaking]);
  const handleEndSpeaking = useCallback(() => setIsSpeaking(false), [setIsSpeaking]);
  const handleStartMyAiSpeaking = useCallback(() => setIsMyAiSpeaking(true), [setIsMyAiSpeaking]);
  const handleEndMyAiSpeaking = useCallback(() => setIsMyAiSpeaking(false), [setIsMyAiSpeaking]);

  // --- Local States ---
  const [searchParams] = useSearchParams();
  const isPersonaShared = searchParams.get('mode') === 'persona';
  const hasPersonaAnswers = searchParams.get('empty') !== 'true'; // URL로 mock 상태 활용

  const [isAlarmModalOpen, setIsAlarmModalOpen] = useState(false);
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isChatHistoryOpen, setIsChatHistoryOpen] = useState(true);
  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);
  const [isAiTopicModalOpen, setIsAiTopicModalOpen] = useState(false);
  const [isAiTopicSubmitting, setIsAiTopicSubmitting] = useState(false);
  const [currentMode, setCurrentMode] = useState<Mode>(isPersonaShared ? 'persona' : 'normal');
  const [sidebarView, setSidebarView] = useState<'followers' | 'following' | 'requests'>(
    'following',
  );
  const visitAssistantType = isPersonaShared ? 'PERSONA' : 'DAILY';
  const myAssistantType = currentMode === 'persona' ? 'PERSONA' : 'DAILY';
  const isConversationMicOn = isMicOn && !isDualAiMode;
  const isCharacterAudioActive = isConversationMicOn || isDualAiMode;
  const isChatWindowVisible = isChatHistoryOpen && !isConversationMicOn;

  // --- API / Logic ---
  useEffect(() => {
    if (targetId) {
      if (isLoggedIn) {
        const welcome = visitFollow(targetId, true);
        if (welcome) setTriggerText(welcome);
      } else {
        // 비회원일 경우: API 없이 기본 환영 인사 설정
        setTriggerText('안녕! 반가워!');
      }
    }
  }, [targetId, visitFollow, isLoggedIn, setTriggerText]);

  useEffect(() => {
    if (!isDualAiMode) return;
    setMyTriggerText(myLatestText);
  }, [isDualAiMode, myLatestText, setMyTriggerText]);

  useEffect(() => {
    if (!isDualAiMode) return;
    setTriggerText(targetLatestText);
  }, [isDualAiMode, setTriggerText, targetLatestText]);

  useEffect(() => {
    if (!isDualAiMode) return;
    setIsMyAiSpeaking(activeSpeaker === 'mine');
    setIsSpeaking(activeSpeaker === 'target');
  }, [activeSpeaker, isDualAiMode, setIsMyAiSpeaking, setIsSpeaking]);

  const handleBackToHome = useCallback(() => {
    stopBattle();
    leaveFollow();
    navigate(PATHS.HOME);
  }, [leaveFollow, navigate, stopBattle]);

  const viewCount = useMemo(() => {
    const user = follows.find((f) => f.id === targetId);
    return user?.view_count ?? 0;
  }, [targetId, follows]);

  // 듀얼모드 로컬 텍스트 시뮬레이션용 자동 립싱크
  useEffect(() => {
    if (myTriggerText) {
      handleStartMyAiSpeaking();
      const t = setTimeout(handleEndMyAiSpeaking, myTriggerText.length * 100 + 500);
      return () => clearTimeout(t);
    }
  }, [myTriggerText, handleStartMyAiSpeaking, handleEndMyAiSpeaking]);

  useEffect(() => {
    if (triggerText) {
      handleStartSpeaking();
      const t = setTimeout(handleEndSpeaking, triggerText.length * 100 + 500);
      return () => clearTimeout(t);
    }
  }, [triggerText, handleStartSpeaking, handleEndSpeaking]);

  const displayFollowName = isLoggedIn ? visitedFollowName : '친구';
  const showEmptyPersonaMessage = !hasPersonaAnswers && currentMode === 'persona';

  // 실시간 AI 음성 재생(isAiSpeaking) + 로컬 인사말 텍스트 상태(isSpeaking) 병합
  const finalIsSpeaking = isAiSpeaking || isSpeaking;
  const lastAiMessage = useMemo(() => {
    return (
      chatMessages
        .slice()
        .reverse()
        .find((m) => m.sender === 'ai')?.text || ''
    );
  }, [chatMessages]);
  const displayedChatMessages = useMemo(
    () => (isDualAiMode ? battleMessages : chatMessages),
    [battleMessages, chatMessages, isDualAiMode],
  );

  // 비로그인 사용자는 isVisitorMode가 false여도 렌더링되게 우회
  if (isLoggedIn && (!isVisitorMode || !visitedFollowName)) {
    return (
      <div className="flex w-full h-screen items-center justify-center bg-gray-100">
        <p className="text-gray-500 font-bold">사용자 정보를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col justify-between bg-white">
      {isLoggedIn ? (
        <Header
          alarms={[]}
          isAlarmModalOpen={isAlarmModalOpen}
          onToggleAlarm={() => setIsAlarmModalOpen(!isAlarmModalOpen)}
          onReadAllAlarms={() => {}}
          onDeleteAllAlarms={() => {}}
          onAlarmClick={() => {}}
          onMyCardClick={() => {}}
          isVisitorMode={true}
          onLeaveVisitor={handleBackToHome}
          viewCount={viewCount}
          onUsersClick={() => setIsUserMenuOpen(true)}
        />
      ) : (
        <header className="relative z-50 flex justify-between items-center px-6 py-4 w-full">
          <div className="flex items-center gap-3 text-3xl font-extrabold tracking-wider text-gray-800">
            SSARVIS
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate(PATHS.LOGIN)}
              className="px-5 py-2 text-sm font-bold bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-full shadow-sm transition-all text-gray-800"
            >
              로그인
            </button>
            <button
              onClick={() => navigate(PATHS.SIGNUP)}
              className="px-5 py-2 text-sm font-bold bg-gradient-to-r from-pink-500 to-rose-400 hover:scale-[1.03] active:scale-95 border border-pink-400/50 rounded-full shadow-lg shadow-pink-500/20 transition-all font-black"
            >
              회원가입
            </button>
          </div>
        </header>
      )}

      {/* 우상단 고정 - 페르소나 문답 아이콘 (회원/비회원 모두 노출) */}
      <button
        onClick={() => navigate(PATHS.PERSONA(targetId))}
        className="absolute top-24 right-5 sm:right-6 p-3 bg-gradient-to-br from-pink-400/80 to-rose-300/80 hover:from-pink-400 hover:to-rose-300 rounded-2xl shadow-xl shadow-pink-500/20 text-white flex flex-col items-center justify-center gap-1 transition-all hover:scale-105 z-50 border border-white/20 group"
        title="페르소나 문답 작성"
      >
        <Sparkles className="w-6 h-6 group-hover:animate-pulse" />
        <span className="text-[10px] font-black leading-none drop-shadow-md">문답작성</span>
      </button>

      <main className="flex-1 flex items-center justify-center relative w-full h-full z-10">
        <motion.div
          className="relative flex flex-col items-center justify-center"
          animate={{
            y: isDualAiMode ? -110 : isCharacterAudioActive ? 0 : -220,
            scale: isCharacterAudioActive ? 1 : 0.75,
          }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        >
          {/* 마이크 버튼 (방문 페이지에서는 잠금 모드 제외, 빈 문답 화면일 땐 숨김) */}
          {!showEmptyPersonaMessage && !isDualAiMode && (
            <div className="absolute left-[-140px] top-1/2 -translate-y-1/2 z-40">
              <button
                onClick={() => {
                  toggleMic();
                  if (!isConversationMicOn) {
                    startRecording(null, visitAssistantType, 'GENERAL', 'AVATAR_AI', targetId);
                  } else {
                    stopRecordingAndSendSTT();
                  }
                }}
                className={`p-4 rounded-full backdrop-blur-md shadow-lg border transition-all duration-300 ${isConversationMicOn ? 'bg-white/10 border-white/30 hover:bg-white/20' : 'bg-red-500/10 border-red-500/30'}`}
              >
                <div className="flex items-center justify-center">
                  {isConversationMicOn ? (
                    <Mic className="w-8 h-8 text-green-400 fill-green-400/20" />
                  ) : (
                    <MicOff className="w-8 h-8 text-red-400" />
                  )}
                </div>
              </button>
            </div>
          )}

          <div className="flex items-center justify-center gap-20">
            {isDualAiMode && (
              <div className="w-[300px] h-[300px] relative z-20 flex flex-col items-center justify-center animate-in slide-in-from-left-20 fade-in duration-700">
                <div className="absolute top-[-40px] px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-200 text-[10px] font-bold tracking-wider uppercase backdrop-blur-md">
                  My AI
                </div>
                <CharacterScene
                  faceType={faceType}
                  mouthOpenRadius={myMouthOpenRadius}
                  mode={currentMode}
                  isLockMode={false}
                  isSpeaking={isMyAiSpeaking}
                  isMicOn={isCharacterAudioActive}
                  label="나의 AI"
                />
                <SpeechBubble text={myTriggerText} />
              </div>
            )}

            <div
              className={`relative z-10 flex flex-col items-center justify-center transition-all duration-700 ease-in-out ${isDualAiMode ? 'w-[300px] h-[300px]' : 'w-[350px] h-[350px]'}`}
            >
              {showEmptyPersonaMessage ? (
                <div className="flex flex-col items-center justify-center bg-white border border-gray-100 shadow-2xl rounded-[3rem] p-8 text-center gap-5 absolute z-50 w-full h-full">
                  <div className="p-4 bg-yellow-100/90 rounded-full shadow-inner mb-2">
                    <Sparkles className="w-10 h-10 text-yellow-500" />
                  </div>
                  <h3 className="text-2xl font-black text-gray-800 tracking-tight">
                    아직 페르소나 AI가 없어요!
                  </h3>
                  <p className="text-gray-600 font-bold leading-relaxed mb-2">
                    {displayFollowName}님의 페르소나를 키우기 위해
                    <br />
                    아래 버튼을 눌러 문답을 남겨주세요!
                  </p>
                  <button
                    onClick={() => navigate(`${PATHS.PERSONA(targetId)}?isFirst=true`)}
                    className="px-6 py-3 w-full bg-gradient-to-r from-pink-500 to-rose-400 hover:scale-[1.03] active:scale-95 text-white font-black rounded-full shadow-lg transition-transform"
                  >
                    문답 작성하러 가기
                  </button>
                </div>
              ) : (
                <>
                  <div
                    className={`absolute top-[-40px] px-3 py-1 rounded-full border text-[10px] font-bold tracking-wider uppercase backdrop-blur-md transition-all duration-500 ${visitorVisibility === 'private' ? 'bg-pink-100 border-pink-200 text-pink-600' : 'bg-gray-100 border-gray-200 text-gray-600'}`}
                  >
                    {visitorVisibility} Access
                  </div>
                  <CharacterScene
                    faceType={(faceType + 2) % 6}
                    mouthOpenRadius={mouthOpenRadius}
                    mode={currentMode}
                    isLockMode={false}
                    isSpeaking={finalIsSpeaking}
                    isMicOn={isCharacterAudioActive}
                    label={`${displayFollowName}님의 AI`}
                  />
                  {((isConversationMicOn && lastAiMessage) || (isDualAiMode && triggerText)) && (
                    <SpeechBubble text={isDualAiMode ? triggerText : lastAiMessage} />
                  )}
                </>
              )}
            </div>

            {/* STT 실시간 말풍선 (화면 아래쪽) / 듀얼 모드일 시 조금 더 넓게 */}
            {isConversationMicOn && sttText && (
              <div className="absolute bottom-[-220px] left-1/2 -translate-x-1/2 px-8 py-4 bg-black/40 backdrop-blur-xl text-white font-black text-lg rounded-3xl shadow-2xl border border-white/20 z-50 min-w-[280px] text-center max-w-[80vw] whitespace-pre-wrap">
                🎙️ {sttText}
              </div>
            )}

          </div>
        </motion.div>

        {/* 채팅창 및 아이콘 (빈 페르소나 화면일 땐 숨김) */}
        {!showEmptyPersonaMessage && (
          <>
            <ChatWindow
              isVisible={isChatWindowVisible}
              messages={displayedChatMessages}
              input={chatInput}
              onInputChange={setChatInput}
              inputPlaceholder={
                isDualAiMode ? 'AI끼리 대화 중입니다. 아래 상태 버튼으로 제어하세요.' : '메시지를 입력하세요...'
              }
              isInputDisabled={isDualAiMode}
              heightClassName={isDualAiMode ? 'h-[48%]' : 'h-[65%]'}
              onSend={() => {
                if (isDualAiMode) {
                  return;
                }
                const memoryPolicy = 'GENERAL'; // Visit 페이지에서는 시크릿 모드를 사용하지 않음

                sendMessage(
                  chatInput,
                  null,
                  visitAssistantType,
                  memoryPolicy,
                  'AVATAR_AI',
                  targetId,
                );
              }}
              onClose={() => setIsChatHistoryOpen(false)}
            />

            {isDualAiMode && (
              <div className="absolute bottom-[calc(48%-18px)] left-1/2 -translate-x-1/2 w-full max-w-4xl px-8 z-40 pointer-events-none">
                <div className="mx-auto rounded-2xl bg-white/80 backdrop-blur-xl border border-white/70 shadow-lg px-5 py-4 flex items-center justify-between gap-4 pointer-events-auto">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.26em] text-rose-400 font-black">
                      AI TO AI
                    </p>
                    <p className="text-sm font-black text-gray-800 mt-1 truncate">
                      {aiTopic || '주제 준비 중...'}
                    </p>
                    <p className="text-xs font-semibold text-gray-500 mt-1">{statusMessage}</p>
                    {aiBattleError && (
                      <p className="text-xs font-bold text-rose-500 mt-1">{aiBattleError}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <p className="text-[11px] font-bold text-gray-400">진행 턴</p>
                      <p className="text-xl font-black text-gray-800">
                        {turnCount}/{maxTurn}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (isPaused) {
                          resumeBattle();
                        } else {
                          pauseBattle();
                        }
                      }}
                      className="px-4 py-2 rounded-full bg-white border border-gray-200 text-gray-800 text-sm font-bold hover:bg-gray-50 transition-colors"
                    >
                      {isPaused ? '대화 재개' : '일시정지'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        stopBattle();
                        setIsDualAiMode(false);
                        setIsInteractionModalOpen(false);
                      }}
                      className="px-4 py-2 rounded-full bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors"
                    >
                      대화 중지
                    </button>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => setIsChatHistoryOpen(!isChatHistoryOpen)}
              className={`absolute bottom-8 right-8 p-4 rounded-2xl backdrop-blur-xl border shadow-2xl transition-all duration-300 z-40 group ${isChatWindowVisible ? 'opacity-0 pointer-events-none' : 'bg-white hover:scale-110 shadow-lg border-gray-100'}`}
            >
              <MessageCircle className="w-8 h-8 text-gray-800" />
            </button>
          </>
        )}
      </main>

      {isLoggedIn && (
        <>
          <ModePanel
            currentMode={currentMode}
            isVisitorMode={true}
            isInteractionModalOpen={isInteractionModalOpen}
            isDualAiMode={isDualAiMode}
            onToggleInteraction={() => setIsInteractionModalOpen(!isInteractionModalOpen)}
            onModeChange={(m) => setCurrentMode(m)}
            onChangeFace={changeFace}
            onStartDualAi={() => {
              setIsInteractionModalOpen(false);
              setIsAiTopicModalOpen(true);
            }}
            onStopDualAi={() => {
              stopBattle();
              setIsDualAiMode(false);
            }}
          />

          <FollowSidebar
            isOpen={isUsersModalOpen}
            view={sidebarView}
            onViewChange={setSidebarView}
            follows={follows}
            requests={followRequests}
            searchResults={searchResults}
            isSearchLoading={isSearchLoading}
            onSearch={handleSearch}
            visitedId={visitedUserId}
            isVisitorMode={true}
            onVisit={(id) => {
              if (typeof id === 'number') navigate(PATHS.VISIT(id));
              setIsUsersModalOpen(false);
            }}
            onDelete={deleteFollow}
            onRequest={requestFollow}
            onAccept={acceptRequest}
            onReject={rejectRequest}
            onClose={() => {
              setIsUsersModalOpen(false);
              setSidebarView('following');
            }}
            onToggle={() => {
              if (isUsersModalOpen) setSidebarView('following');
              setIsUsersModalOpen(!isUsersModalOpen);
            }}
          />

          <PersonaModal
            isOpen={isPersonaModalOpen}
            onClose={() => setIsPersonaModalOpen(false)}
            followName={visitedFollowName || ''}
          />

          <UserMenuModal
            isOpen={isUserMenuOpen}
            onClose={() => setIsUserMenuOpen(false)}
            user={{
              name: userInfo?.nickname || '회원',
              email: userInfo?.email || '이메일 정보 없음',
            }}
          />

          <AiTopicModal
            isOpen={isAiTopicModalOpen}
            onClose={() => setIsAiTopicModalOpen(false)}
            isSubmitting={isAiTopicSubmitting}
            onSubmit={async (topic) => {
              if (!userInfo?.id || !visitedUserId) return;

              setIsAiTopicSubmitting(true);
              const started = await startBattle({
                topic,
                myUserId: userInfo.id,
                targetUserId: visitedUserId,
                myAssistantType,
                targetAssistantType: visitAssistantType,
              });
              setIsAiTopicSubmitting(false);

              if (started) {
                setIsDualAiMode(true);
                setIsAiTopicModalOpen(false);
              }
            }}
          />
        </>
      )}
    </div>
  );
}
