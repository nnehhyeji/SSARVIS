import React from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, User, QrCode, LogOut, Eye } from 'lucide-react';

import type { Alarm } from '../../types';

// ─── Header ───
// 역할: 서비스 로고, 명함 QR, 알림 종, MY 아이콘을 포함하는 상단바
// - 알림 드롭다운 UI와 알림 읽음/삭제 콜백을 처리합니다.
// - 방문 모드일 때는 집으로 돌아가는 버튼을 표시합니다.

interface HeaderProps {
  alarms: Alarm[];
  isAlarmModalOpen: boolean;
  onToggleAlarm: () => void;
  onReadAllAlarms: () => void;
  onDeleteAllAlarms: () => void;
  onAlarmClick: (alarm: Alarm) => void;
  onMyCardClick: () => void;
  isVisitorMode: boolean;
  onLeaveVisitor: () => void;
  viewCount?: number;
  onUsersClick?: () => void;
}

export default function Header({
  alarms,
  isAlarmModalOpen,
  onToggleAlarm,
  onReadAllAlarms,
  onDeleteAllAlarms,
  onAlarmClick,
  onMyCardClick,
  isVisitorMode,
  onLeaveVisitor,
  viewCount = 0,
  onUsersClick,
}: HeaderProps) {
  const location = useLocation();
  const isCardPage = location.pathname.startsWith('/card/');

  return (
    <header className="relative z-50 flex justify-between items-center px-5 py-2 w-full text-gray-700">
      <div className="flex flex-col items-start gap-2">
        <div className="flex items-center gap-3">
          <div className="text-3xl font-extrabold tracking-wider text-white drop-shadow-md">
            SSARVIS
          </div>
          {!isVisitorMode && !isCardPage && (
            <button
              onClick={onMyCardClick}
              className="p-2 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-md border border-white/40 transition-all duration-300 shadow-md text-white"
              title="내 명함 보기"
            >
              <QrCode className="w-5 h-5" />
            </button>
          )}
        </div>
        {isVisitorMode && (
          <button
            onClick={onLeaveVisitor}
            className="group flex items-center justify-center w-10 h-10 rounded-full bg-white/20 hover:bg-red-500/40 backdrop-blur-md border border-white/40 transition-all duration-300 shadow-lg text-white"
            title="내 집으로 돌아가기"
          >
            <LogOut className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
          </button>
        )}
      </div>

      {!isCardPage && (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/40 shadow-sm text-white text-sm font-medium hover:bg-white/30 transition-all duration-300">
            <Eye className="w-4 h-4" />
            <span>{viewCount.toLocaleString()}</span>
          </div>
          <div className="flex gap-4">
            <button
              onClick={onToggleAlarm}
              className="relative p-2 rounded-full bg-white/30 hover:bg-white/50 backdrop-blur-sm transition"
            >
              <Bell className="w-6 h-6" />
              {alarms.some((a) => !a.isRead) && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-400 rounded-full border border-white" />
              )}
            </button>
            <button
              onClick={onUsersClick}
              className="p-2 rounded-full bg-white/30 hover:bg-white/50 backdrop-blur-sm transition text-white"
              title="사용자 메뉴"
            >
              <User className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* 알림 드롭다운 */}
      {isAlarmModalOpen && !isCardPage && (
        <>
          <div className="fixed inset-0 z-50 cursor-default" onClick={onToggleAlarm} />
          <div className="absolute top-[60px] right-20 z-[60] w-[300px] bg-white/30 backdrop-blur-2xl rounded-3xl p-5 shadow-2xl border border-white/40 text-gray-800 animate-in fade-in slide-in-from-top-4 duration-200">
            <div className="flex flex-col gap-4 mb-6 relative z-[61]">
              {alarms.length === 0 ? (
                <div className="text-center text-sm text-gray-600 py-4">알림이 없습니다.</div>
              ) : (
                alarms.map((alarm, idx) => (
                  <React.Fragment key={alarm.id}>
                    {idx > 0 && <div className="h-px bg-white/40 my-1" />}
                    <div
                      onClick={() => onAlarmClick(alarm)}
                      className="flex items-center gap-3 cursor-pointer group"
                    >
                      <div
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${!alarm.isRead ? 'bg-red-400' : 'bg-transparent'}`}
                      />
                      <p
                        className={`text-sm tracking-tight transition ${alarm.isRead ? 'text-gray-500' : 'text-gray-800 font-medium group-hover:text-black'}`}
                      >
                        {alarm.message}
                      </p>
                    </div>
                  </React.Fragment>
                ))
              )}
            </div>

            <div className="flex justify-end items-center gap-2 text-xs text-white drop-shadow-md font-medium relative z-[61]">
              <button onClick={onDeleteAllAlarms} className="hover:text-white/80 transition">
                전체 삭제
              </button>
              <span className="text-white/60">|</span>
              <button onClick={onReadAllAlarms} className="hover:text-white/80 transition">
                모두 읽음
              </button>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
