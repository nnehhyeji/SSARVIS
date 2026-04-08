import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../common/Sidebar';
import { useUserStore } from '../../store/useUserStore';
import { useFollow } from '../../hooks/useFollow';
import { useNotification } from '../../hooks/useNotification';
import { PATHS } from '../../routes/paths';
import authApi from '../../apis/authApi';
import type { Alarm } from '../../types';
import userApi from '../../apis/userApi';
import { useVoiceLockTimer } from '../../hooks/useVoiceLockTimer';
import VoiceLockOverlay from '../common/VoiceLockOverlay';
import { toast } from '../../store/useToastStore';
import { useMicStore } from '../../store/useMicStore';
import type {
  SpeechRecognitionErrorEventLike,
  SpeechRecognitionEventLike,
  SpeechRecognitionLike,
} from '../../hooks/chat/speechRecognitionTypes';
import {
  containsWakeWord as sharedContainsWakeWord,
  extractSpeechAfterWakeWord as sharedExtractSpeechAfterWakeWord,
  normalizeWakeWordText,
} from '../../constants/voice';

const WAKE_WORD = '싸비스';
const WAKE_WORD_ALIASES = [
  WAKE_WORD,
  '사비스',
  '싸비쓰',
  '서비스',
  '싸비스야',
  '비스',
  '싸비',
  '싸쓰',
];

function normalizeText(text: string) {
  return normalizeWakeWordText(text);
}

function containsWakeWord(text: string) {
  return sharedContainsWakeWord(text);
}

function extractSpeechAfterWakeWord(text: string): string {
  return sharedExtractSpeechAfterWakeWord(text);
}

function resolveRemoteRouteCommand(text: string, userId?: number | null): string | null {
  const normalized = normalizeText(text);

  if (normalized === '대화보관함' || normalized === '보관함') {
    return PATHS.CHAT;
  }
  if (normalized === '설정') {
    return PATHS.SETTINGS_PARAM.replace(':tab', 'account');
  }
  if (normalized === '홈' || normalized === '홈으로' || normalized === '메인화면') {
    return userId ? PATHS.USER_HOME(userId) : PATHS.HOME;
  }

  return null;
}

void WAKE_WORD_ALIASES;

const MainLayout: React.FC = () => {
  const LOGOUT_CONFIRM_TOAST_ID = 'logout-confirm-toast';
  const navigate = useNavigate();
  const location = useLocation();
  const { userInfo, logout: logoutStore, isLoggedIn, currentMode, setCurrentMode } = useUserStore();
  const micPreferenceEnabled = useMicStore((state) => state.micPreferenceEnabled);
  const setMicRuntimeActive = useMicStore((state) => state.setMicRuntimeActive);

  // Sidebar state & hooks
  const [viewCount, setViewCount] = useState(0);

  const {
    follows,
    followRequests,
    searchResults,
    isSearchLoading,
    requestFollow,
    deleteFollow,
    acceptRequest,
    rejectRequest,
    handleSearch,
    fetchFollows,
    fetchFollowRequests,
  } = useFollow();

  const { alarms, readAlarm, readAllAlarms, removeAllAlarms, removeAlarm } = useNotification();
  const followRequestAlarmSignature = useMemo(
    () =>
      alarms
        .filter((alarm) => alarm.type === 'FOLLOW_REQUEST')
        .map((alarm) => `${alarm.id}:${alarm.isRead ? 'read' : 'unread'}`)
        .join('|'),
    [alarms],
  );
  const followRelationAlarmSignature = useMemo(
    () =>
      alarms
        .filter((alarm) => alarm.type === 'FOLLOW_ACCEPT' || alarm.type === 'FOLLOW_CREATED')
        .map((alarm) => `${alarm.id}:${alarm.type}`)
        .join('|'),
    [alarms],
  );
  const lastFollowRequestAlarmSignatureRef = useRef('');
  const lastFollowRelationAlarmSignatureRef = useRef('');

  // Initialize Voice Lock Timer globally for Main Layout
  useVoiceLockTimer();

  // Load view count (or profile info)
  useEffect(() => {
    let isMounted = true;
    const loadProfile = async () => {
      if (!isLoggedIn) return;
      try {
        const profile = await userApi.getUserProfile();
        if (isMounted) {
          setViewCount(profile.viewCount ?? 0);
        }
      } catch (error) {
        console.warn('프로필 정보 조회 실패:', error);
      }
    };
    void loadProfile();
    return () => {
      isMounted = false;
    };
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn || !followRequestAlarmSignature) return;
    if (lastFollowRequestAlarmSignatureRef.current === followRequestAlarmSignature) return;

    lastFollowRequestAlarmSignatureRef.current = followRequestAlarmSignature;
    void fetchFollowRequests();
  }, [fetchFollowRequests, followRequestAlarmSignature, isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn || !followRelationAlarmSignature) return;
    if (lastFollowRelationAlarmSignatureRef.current === followRelationAlarmSignature) return;

    lastFollowRelationAlarmSignatureRef.current = followRelationAlarmSignature;
    void fetchFollows();
  }, [fetchFollows, followRelationAlarmSignature, isLoggedIn]);

  // Handle "/" redirect
  useEffect(() => {
    if (location.pathname === '/' && userInfo?.id) {
      navigate(`/${userInfo.id}`, { replace: true });
    }
  }, [location.pathname, userInfo?.id, navigate]);

  // Sync Mode with URL path (Reset when leaving assistant/namna)
  useEffect(() => {
    const path = location.pathname;
    if (path !== PATHS.ASSISTANT && path !== PATHS.NAMNA) {
      if (currentMode !== 'normal') {
        setCurrentMode('normal');
      }
    }
  }, [location.pathname, currentMode, setCurrentMode]);

  useEffect(() => {
    const isHomeConversationPage = /^\/\d+$/.test(location.pathname);
    const isConversationPage =
      isHomeConversationPage ||
      location.pathname === PATHS.ASSISTANT ||
      location.pathname === PATHS.NAMNA;

    if (!isLoggedIn || !micPreferenceEnabled || isConversationPage) {
      return;
    }

    const SpeechRecognitionApi =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike })
        .webkitSpeechRecognition;

    if (!SpeechRecognitionApi) {
      setMicRuntimeActive(false);
      return;
    }

    let recognition: SpeechRecognitionLike | null = null;
    let isUnmounted = false;

    const safeStart = () => {
      if (!recognition) return;
      try {
        recognition.start();
      } catch (error) {
        const message = String((error as Error).message || error);
        if (!message.includes('already started')) {
          console.warn('Remote voice control start failed:', message);
        }
      }
    };

    try {
      recognition = new SpeechRecognitionApi();
      recognition.lang = 'ko-KR';
      recognition.continuous = true;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setMicRuntimeActive(true);
      };

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        const lastResult = event.results[event.results.length - 1];
        const heardText = lastResult?.[0]?.transcript?.trim() || '';
        if (!heardText) return;

        const commandSource = containsWakeWord(heardText)
          ? extractSpeechAfterWakeWord(heardText)
          : heardText;
        const route = resolveRemoteRouteCommand(commandSource, userInfo?.id);

        if (route) {
          navigate(route);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
        if (event.error !== 'aborted') {
          console.warn('Remote voice control error:', event.error);
        }
      };

      recognition.onend = () => {
        if (!isUnmounted) {
          safeStart();
        }
      };

      safeStart();
    } catch (error) {
      console.warn('Failed to initialize remote voice control:', error);
      setMicRuntimeActive(false);
    }

    return () => {
      isUnmounted = true;
      setMicRuntimeActive(false);
      if (recognition) {
        recognition.onend = null;
        recognition.stop();
      }
    };
  }, [
    isLoggedIn,
    location.pathname,
    micPreferenceEnabled,
    navigate,
    setMicRuntimeActive,
    userInfo?.id,
  ]);

  const handleLogout = async () => {
    toast.dismiss(LOGOUT_CONFIRM_TOAST_ID);
    toast.show({
      id: LOGOUT_CONFIRM_TOAST_ID,
      title: '로그아웃 하시겠습니까?',
      description: '확인을 누르면 현재 세션이 종료돼요.',
      variant: 'info',
      duration: 7000,
      actionLabel: '로그아웃',
      onAction: async () => {
        try {
          await authApi.logout();
        } finally {
          logoutStore();
          toast.info('로그아웃되었어요.');
          navigate(PATHS.LOGIN);
        }
      },
    });
  };

  const handleAlarmClick = useCallback(
    (alarm: Alarm) => {
      readAlarm(alarm.id);
    },
    [readAlarm],
  );

  const handleVisit = useCallback(
    (id: number) => {
      navigate(PATHS.USER_HOME(id));
    },
    [navigate],
  );

  return (
    <div className="flex w-full h-screen bg-[#FDFCFB] overflow-hidden">
      {isLoggedIn && (
        <Sidebar
          userInfo={userInfo}
          onLogout={handleLogout}
          onMyCardClick={() => navigate(PATHS.PROFILE)}
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
          onRequest={requestFollow}
          onVisit={handleVisit}
          onAccept={acceptRequest}
          onReject={rejectRequest}
          onDelete={deleteFollow}
          searchResults={searchResults}
          isSearchLoading={isSearchLoading}
          requestFollow={requestFollow}
          viewCount={viewCount}
        />
      )}

      <main className="flex-1 relative overflow-hidden">
        <Outlet />
      </main>
      <VoiceLockOverlay />
    </div>
  );
};

export default MainLayout;
