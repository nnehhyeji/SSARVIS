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

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userInfo, logout: logoutStore, isLoggedIn, currentMode, setCurrentMode } = useUserStore();

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

  const handleLogout = async () => {
    if (window.confirm('로그아웃 하시겠습니까?')) {
      try {
        await authApi.logout();
      } finally {
        logoutStore();
        navigate(PATHS.LOGIN);
      }
    }
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
