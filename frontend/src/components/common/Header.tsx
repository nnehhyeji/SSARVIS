import React from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, User, QrCode, LogOut, Eye, Sparkles } from 'lucide-react';

import type { Alarm } from '../../types';

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
  onSharePersonaClick?: () => void;
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
  onSharePersonaClick,
}: HeaderProps) {
  const location = useLocation();
  const isCardPage = location.pathname.startsWith('/card/');

  return (
    <header className="relative z-50 flex w-full items-center justify-between px-5 py-2 text-gray-700">
      <div className="flex flex-col items-start gap-2">
        <div className="flex items-center gap-3">
          <div className="text-3xl font-extrabold tracking-wider text-white drop-shadow-md">
            SSARVIS
          </div>
          {!isVisitorMode && !isCardPage && (
            <div className="flex gap-2">
              <button
                onClick={onMyCardClick}
                aria-label="내 카드 보기"
                className="rounded-full border border-white/40 bg-white/20 p-2 text-white shadow-md backdrop-blur-md transition-all duration-300 hover:bg-white/40"
                title="내 카드 보기"
              >
                <QrCode className="h-5 w-5" />
              </button>
              {onSharePersonaClick && (
                <button
                  onClick={onSharePersonaClick}
                  aria-label="페르소나 공유"
                  className="group flex items-center gap-1 rounded-full border border-yellow-300/50 bg-yellow-400/20 p-2 text-yellow-300 shadow-md backdrop-blur-md transition-all duration-300 hover:bg-yellow-400/50"
                  title="페르소나 공유"
                >
                  <Sparkles className="h-5 w-5 transition-transform group-hover:scale-110" />
                  <span className="ml-1 hidden text-xs leading-none font-bold sm:block">공유</span>
                </button>
              )}
            </div>
          )}
        </div>
        {isVisitorMode && (
          <button
            onClick={onLeaveVisitor}
            aria-label="방문자 모드 나가기"
            className="group flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-white/20 text-white shadow-lg backdrop-blur-md transition-all duration-300 hover:bg-red-500/40"
            title="방문자 모드 나가기"
          >
            <LogOut className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
          </button>
        )}
      </div>

      {!isCardPage && (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-full border border-white/40 bg-white/20 px-4 py-1.5 text-sm font-medium text-white shadow-sm backdrop-blur-md transition-all duration-300 hover:bg-white/30">
            <Eye className="h-4 w-4" />
            <span>{viewCount.toLocaleString()}</span>
          </div>
          <div className="flex gap-4">
            <button
              onClick={onToggleAlarm}
              aria-label="알림 열기"
              className="relative rounded-full bg-white/30 p-2 backdrop-blur-sm transition hover:bg-white/50"
              title="알림 열기"
            >
              <Bell className="h-6 w-6" />
              {alarms.some((alarm) => !alarm.isRead) && (
                <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full border border-white bg-red-400" />
              )}
            </button>
            <button
              onClick={onUsersClick}
              aria-label="사용자 보기"
              className="rounded-full bg-white/30 p-2 text-white backdrop-blur-sm transition hover:bg-white/50"
              title="사용자 보기"
            >
              <User className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}

      {isAlarmModalOpen && !isCardPage && (
        <>
          <div className="fixed inset-0 z-50 cursor-default" onClick={onToggleAlarm} />
          <div className="animate-in slide-in-from-top-4 absolute right-20 top-[60px] z-[60] w-[300px] rounded-3xl border border-white/40 bg-white/30 p-5 text-gray-800 shadow-2xl backdrop-blur-2xl fade-in duration-200">
            <div className="relative z-[61] mb-6 flex flex-col gap-4">
              {alarms.length === 0 ? (
                <div className="py-4 text-center text-sm text-gray-600">알림이 없습니다.</div>
              ) : (
                alarms.map((alarm, idx) => (
                  <React.Fragment key={alarm.id}>
                    {idx > 0 && <div className="my-1 h-px bg-white/40" />}
                    <div
                      onClick={() => onAlarmClick(alarm)}
                      className="group flex cursor-pointer items-center gap-3"
                    >
                      <div
                        className={`h-2 w-2 flex-shrink-0 rounded-full ${!alarm.isRead ? 'bg-red-400' : 'bg-transparent'}`}
                      />
                      <p
                        className={`text-sm tracking-tight transition ${alarm.isRead ? 'text-gray-500' : 'font-medium text-gray-800 group-hover:text-black'}`}
                      >
                        {alarm.message}
                      </p>
                    </div>
                  </React.Fragment>
                ))
              )}
            </div>

            <div className="relative z-[61] flex items-center justify-end gap-2 text-xs font-medium text-white drop-shadow-md">
              <button onClick={onDeleteAllAlarms} className="transition hover:text-white/80">
                전체 삭제
              </button>
              <span className="text-white/60">|</span>
              <button onClick={onReadAllAlarms} className="transition hover:text-white/80">
                모두 읽음
              </button>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
