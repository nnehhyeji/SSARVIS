import React from 'react';
import { Bell, X } from 'lucide-react';
import type { Alarm } from '../../../types';

interface NotificationsPanelProps {
  alarms: Alarm[];
  onAlarmClick: (alarm: Alarm) => void;
  onReadAllAlarms: () => void;
  onDeleteAllAlarms: () => void;
  onRemoveAlarm: (id: number) => void;
  onAccept: (id: number, name: string) => void;
}

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({
  alarms,
  onAlarmClick,
  onReadAllAlarms,
  onDeleteAllAlarms,
  onRemoveAlarm,
  onAccept,
}) => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-end items-center px-8 mb-8 gap-4 text-sm font-bold text-gray-500">
        <button onClick={onReadAllAlarms} className="hover:text-rose-500 transition-colors">
          모두 읽음
        </button>
        <span className="text-gray-300">|</span>
        <button
          onClick={onDeleteAllAlarms}
          className="text-rose-500 hover:text-rose-600 transition-colors"
        >
          모두 지우기
        </button>
      </div>
      <div className="px-4 space-y-2 overflow-y-auto pb-8">
        {alarms.map((alarm) => (
          <div
            key={alarm.id}
            onClick={() => onAlarmClick(alarm)}
            className="flex items-center gap-4 py-3 px-4 group/alarm transition-all hover:bg-black/5 rounded-2xl cursor-pointer relative"
          >
            {/* 읽지 않은 알림 표시 (빨간 점) */}
            <div
              className={`w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 ${
                alarm.isRead ? 'opacity-0' : 'opacity-100'
              }`}
            />
            <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-gray-100 shadow-sm bg-gray-50">
              <img
                src={(alarm.payload as { senderProfileImage?: string })?.senderProfileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=Alarm${alarm.id}`}
                alt="profile"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800 leading-snug">{alarm.message}</p>
              <p className="text-[11px] text-gray-400 font-bold mt-1 tracking-tight uppercase italic">
                {alarm.time}
              </p>
              {alarm.type === 'follow' &&
                alarm.payload &&
                !!(alarm.payload as { followRequestId?: number }).followRequestId && (
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const payload = alarm.payload as Record<string, number | string>;
                        onAccept(
                          payload.followRequestId as number,
                          (payload.senderCustomId as string) || (payload.senderName as string) || '사용자',
                        );
                        onRemoveAlarm(alarm.id);
                      }}
                      className="px-3 py-1.5 bg-rose-500 text-white text-[11px] font-black rounded-xl hover:bg-rose-600 transition-colors shadow-sm"
                    >
                      수락
                    </button>
                  </div>
                )}
            </div>
            <button
              onClick={() => onRemoveAlarm(alarm.id)}
              className="opacity-0 group-hover/alarm:opacity-100 p-1 hover:bg-gray-100 rounded-full transition-all"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        ))}
        {alarms.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 opacity-20 text-gray-400">
            <Bell className="w-12 h-12 mb-2" />
            <p className="font-bold lowercase italic tracking-tight">no notifications</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPanel;
