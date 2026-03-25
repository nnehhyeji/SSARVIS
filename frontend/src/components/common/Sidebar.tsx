import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  User,
  Bot,
  Eye,
  Users,
  MessageSquare,
  Bell,
  Settings,
  LogOut,
  ChevronRight,
  Search,
  Mic,
  MoreHorizontal,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PATHS } from '../../routes/paths';
import type { Alarm, Mode, Follow, FollowRequest } from '../../types';

interface SidebarProps {
  // User Info & Basic Actions
  userInfo?: {
    nickname: string | null;
    email: string | null;
    id: number | null;
  } | null;
  onLogout: () => void;
  onMyCardClick: () => void;

  // AI Mode
  currentMode: Mode;
  onModeChange: (mode: Mode) => void;

  // Alarms
  alarms: Alarm[];
  onAlarmClick: (alarm: Alarm) => void;
  onReadAllAlarms: () => void;
  onDeleteAllAlarms: () => void;
  onRemoveAlarm: (id: number) => void;

  // Follows/Friends (3rd level)
  follows: Follow[];
  followRequests: FollowRequest[];
  onSearch: (nickname: string) => void;
  onRequest: (id: number, name: string) => void;
  onVisit: (id: number) => void;
  onAccept: (id: number, name: string) => void;
  onReject: (id: number) => void;
  onDelete: (follow: Follow) => void;
  searchResults: Follow[];
  isSearchLoading: boolean;

  // View count
  viewCount?: number;
}

export default function Sidebar({
  onLogout,
  onMyCardClick,
  currentMode,
  onModeChange,
  alarms,
  onAlarmClick,
  onReadAllAlarms,
  onDeleteAllAlarms,
  onRemoveAlarm,
  follows,
  followRequests,
  onSearch,
  onRequest,
  onVisit,
  onAccept,
  onReject,
  onDelete,
  searchResults,
  isSearchLoading,
}: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTertiary, setActiveTertiary] = useState<
    'friends' | 'chat' | 'notifications' | 'search' | null
  >(null);
  const [friendTab, setFriendTab] = useState<'following' | 'followers'>('following');
  const [friendView, setFriendView] = useState<'main' | 'requests'>('main');
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState([
    { id: 'seoyoung', name: '임서영' },
    { id: 'nnah', name: '냥혜' },
    { id: 'karina', name: 'ae카리나' },
  ]);

  // Chat Archive States
  const [chatTab, setChatTab] = useState<'archive' | 'guestbook'>('archive');
  const [chatCategory, setChatCategory] = useState<'assistant' | 'persona' | 'friend'>('assistant');
  const [chatView, setChatView] = useState<'categories' | 'list'>('categories');
  const [assistantFilters, setAssistantFilters] = useState<string[]>(['daily', 'study', 'counsel']);
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  interface MenuItem {
    id: string;
    icon?: React.ElementType;
    label?: string;
    path?: string;
    hasTertiary?: boolean;
    tertiaryId?: 'friends' | 'chat' | 'notifications' | 'search';
    color?: string;
    action?: () => void;
    hasSub?: boolean;
    subItems?: { label: string; mode: Mode }[];
    badge?: number;
  }

  const menuItems: MenuItem[] = [
    { id: 'home', icon: Home, label: '홈', path: PATHS.HOME, color: 'text-rose-500' },
    {
      id: 'search',
      icon: Search,
      label: '검색',
      hasTertiary: true,
      tertiaryId: 'search',
      color: 'text-rose-500',
    },
    { id: 'myinfo', icon: User, label: '내 정보', action: onMyCardClick, color: 'text-rose-500' },
    {
      id: 'ai_assistant',
      icon: Bot,
      label: 'Ai 비서',
      hasSub: true,
      subItems: [
        { label: '일반 모드', mode: 'normal' as Mode },
        { label: '학습 모드', mode: 'study' as Mode },
        { label: '상담 모드', mode: 'counseling' as Mode },
      ],
    },
    {
      id: 'eye',
      icon: Eye,
      label: '남이 보는 나',
      action: () => onModeChange('persona'),
      color: 'text-rose-500',
    },
    {
      id: 'friends',
      icon: Users,
      label: '친구',
      hasTertiary: true,
      tertiaryId: 'friends',
      color: 'text-rose-500',
    },
    {
      id: 'chat',
      icon: MessageSquare,
      label: '대화 보관함',
      hasTertiary: true,
      tertiaryId: 'chat',
      color: 'text-rose-500',
    },
    {
      id: 'notifications',
      icon: Bell,
      label: '알림',
      hasTertiary: true,
      tertiaryId: 'notifications',
      color: 'text-rose-500',
      badge: alarms.filter((a) => !a.isRead).length,
    },
  ];

  const bottomItems: MenuItem[] = [
    {
      id: 'settings',
      icon: Settings,
      label: '설정',
      path: PATHS.SETTINGS,
      color: 'text-stone-400',
    },
    { id: 'logout', icon: LogOut, label: '로그아웃', action: onLogout, color: 'text-stone-400' },
  ];
  const handleItemClick = (item: MenuItem) => {
    if (item.path) {
      setActiveTertiary(null);
      navigate(item.path);
    } else if (item.action) {
      setActiveTertiary(null);
      item.action();
    } else if (item.hasTertiary) {
      const isClosing = activeTertiary === item.tertiaryId;
      setActiveTertiary(isClosing ? null : item.tertiaryId || null);
      if (item.tertiaryId === 'chat') {
        setChatView('categories');
        setSelectedChatId(null);
        setIsExpanded(false); // Force collapse sidebar on chat click
      }
      if (item.tertiaryId === 'friends') {
        setFriendView('main');
        setFriendTab('following');
      }
      if (item.tertiaryId !== 'chat') setSelectedChatId(null);
    }
  };

  return (
    <div className="fixed left-0 top-0 h-full z-[100] flex pointer-events-none w-full">
      {/* Background Overlay for closing panels */}
      <AnimatePresence>
        {(activeTertiary === 'notifications' ||
          activeTertiary === 'search' ||
          activeTertiary === 'friends') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveTertiary(null)}
            className="fixed inset-0 pointer-events-auto bg-black/5 z-[115]"
          />
        )}
      </AnimatePresence>

      {/* 1st & 2nd Level Sidebar */}
      <motion.aside
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        initial={{ width: 80 }}
        animate={{
          width: isExpanded ? 240 : 80,
          opacity:
            !isExpanded &&
            (activeTertiary === 'notifications' ||
              activeTertiary === 'search' ||
              activeTertiary === 'friends')
              ? 0
              : 1,
        }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="h-full bg-[#eee5df] border-r border-gray-200 pointer-events-auto flex flex-col items-center py-8 shadow-xl z-[130]"
      >
        {/* Logo Section */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="w-12 h-12 bg-white flex items-center justify-center rounded-lg shadow-sm">
            <span className="font-bold text-gray-800 text-sm">로고</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 w-full px-3 flex flex-col gap-2">
          {/* Fake Search Bar on Hover */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="overflow-hidden"
              >
                <div
                  onClick={() => setActiveTertiary('search')}
                  className="w-full bg-[#e5e0dc] rounded-xl flex items-center gap-3 py-3 px-4 cursor-pointer hover:bg-[#dcd2ca] transition-colors"
                >
                  <Mic className="w-5 h-5 text-white/80 shrink-0" />
                  <span className="text-gray-400 font-bold whitespace-nowrap">Search</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.hasTertiary && activeTertiary === item.tertiaryId);

            return (
              <div key={item.id} className="relative group/item">
                <button
                  onClick={() => handleItemClick(item)}
                  className={`
                    w-full flex items-center gap-4 p-3 rounded-lg transition-all duration-200
                    ${isActive ? 'bg-[#dcd2ca] shadow-sm' : 'hover:bg-black/5'}
                  `}
                >
                  <div className={`shrink-0 w-8 h-8 flex items-center justify-center relative`}>
                    <Icon className={`w-6 h-6 ${item.color || 'text-rose-500'}`} />
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[10px] flex items-center justify-center rounded-full font-bold">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="font-bold text-gray-700 whitespace-nowrap"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {isExpanded && item.hasSub && (
                    <ChevronRight className="ml-auto w-4 h-4 text-gray-400" />
                  )}
                </button>

                {/* Sub Menu for AI Assistant (2nd Level inside 2nd Level) */}
                {item.hasSub && isExpanded && (
                  <div className="hidden group-hover/item:flex absolute left-full top-0 ml-2 p-2 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 flex-col gap-1 min-w-[120px] z-[110]">
                    {/* Bridge for maintaining hover */}
                    <div className="absolute -left-4 top-0 w-4 h-[120%] -translate-y-[10%]" />
                    {item.subItems?.map((sub) => (
                      <button
                        key={sub.mode}
                        onClick={() => {
                          onModeChange(sub.mode);
                          setActiveTertiary(null);
                        }}
                        className={`px-4 py-2 rounded-xl text-sm font-bold text-left transition-colors ${currentMode === sub.mode ? 'bg-rose-50 text-rose-500' : 'text-gray-600 hover:bg-gray-100'}`}
                      >
                        {sub.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="w-full px-3 mt-auto flex flex-col gap-2 pt-6 border-t border-gray-300/50">
          {bottomItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-black/5 transition-all duration-300"
              >
                <div className="shrink-0 w-8 h-8 flex items-center justify-center">
                  <Icon className={`w-6 h-6 ${item.color}`} />
                </div>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="font-bold text-gray-500 whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            );
          })}
        </div>
      </motion.aside>

      {/* 3rd Level Sidebar Panels */}
      <AnimatePresence>
        {activeTertiary && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{
              x: 0,
              opacity: 1,
              left:
                activeTertiary === 'notifications' ||
                activeTertiary === 'search' ||
                activeTertiary === 'friends'
                  ? 0
                  : 80,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`fixed top-0 h-full w-[360px] bg-[#eee5df] border-r border-gray-200 pointer-events-auto shadow-2xl overflow-hidden flex flex-col ${activeTertiary === 'notifications' || activeTertiary === 'search' || activeTertiary === 'friends' ? 'z-[140]' : 'z-[120]'}`}
          >
            {/* Tertiary Header */}
            <div className="p-8 pb-4 flex items-flex-start justify-between">
              <div className="flex flex-col gap-1">
                {activeTertiary === 'chat' && chatView === 'list' && (
                  <button
                    onClick={() => {
                      setChatView('categories');
                      setSelectedChatId(null);
                    }}
                    className="flex items-center gap-1 text-rose-500 text-xs font-black mb-1 hover:underline group"
                  >
                    <ChevronRight className="w-3 h-3 rotate-180 group-hover:-translate-x-0.5 transition-transform" />
                    이전으로
                  </button>
                )}
                <h2 className="text-4xl font-black text-gray-800">
                  {activeTertiary === 'friends'
                    ? '팔로우 목록'
                    : activeTertiary === 'chat'
                      ? '대화 보관함'
                      : activeTertiary === 'search'
                        ? '검색'
                        : '알림'}
                </h2>
              </div>
              <button
                onClick={() => setActiveTertiary(null)}
                className="p-2 hover:bg-black/5 rounded-full transition-colors mt-2"
              >
                <X className="w-8 h-8 text-gray-800" />
              </button>
            </div>

            {/* Tertiary Content */}
            <div className="flex-1 flex flex-col pt-4">
              {activeTertiary === 'search' && (
                <div className="px-8 space-y-8 flex flex-col h-full">
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <Mic className="w-5 h-5 text-white/80" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search"
                      value={searchQuery}
                      onChange={(e) => {
                        const nextQuery = e.target.value;
                        setSearchQuery(nextQuery);
                        onSearch(nextQuery);
                      }}
                      className="w-full bg-[#e5e0dc] rounded-xl py-3 pl-12 pr-10 text-lg font-medium text-gray-800 placeholder-white/80 focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        onSearch('');
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-gray-300 rounded-full p-0.5"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                  {searchQuery.trim() && (
                    <div className="flex-1 overflow-y-auto">
                      <div className="mb-6 flex items-center justify-between">
                        <h4 className="text-lg font-black text-gray-800">Search Results</h4>
                      </div>
                      <div className="space-y-4">
                        {isSearchLoading ? (
                          <div className="flex items-center justify-center py-20">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-rose-200 border-t-rose-500" />
                          </div>
                        ) : (
                          searchResults.map((user) => (
                            <div
                              key={user.id}
                              className="flex items-center gap-4 rounded-2xl border border-white/50 bg-white/40 px-4 py-3 shadow-sm"
                            >
                              <div className="w-14 h-14 rounded-full overflow-hidden bg-white shadow-sm border border-black/5">
                                <img
                                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`}
                                  alt={user.name}
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-bold text-gray-800">{user.name}</p>
                                <p className="truncate text-sm text-gray-500">{user.email}</p>
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => onVisit(user.id)}
                                  className="rounded-lg bg-white/70 px-3 py-1.5 text-xs font-bold text-gray-700 transition hover:bg-white"
                                >
                                  Visit
                                </button>
                                {user.followStatus === 'REQUESTED' ? (
                                  <span className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600">
                                    Requested
                                  </span>
                                ) : user.followStatus === 'FOLLOWING' || user.isFollowing ? (
                                  <span className="rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700">
                                    Following
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => onRequest(user.id, user.name)}
                                    className="rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-rose-600"
                                  >
                                    Add
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                        {!isSearchLoading && searchResults.length === 0 && (
                          <div className="flex items-center justify-center py-20">
                            <p className="text-sm font-bold text-gray-400">No matching users.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {!searchQuery.trim() && (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="text-lg font-black text-gray-800">최근 검색 항목</h4>
                      <button
                        onClick={() => setRecentSearches([])}
                        className="text-sm font-black text-rose-500 hover:text-rose-600"
                      >
                        모두 지우기
                      </button>
                    </div>
                    <div className="space-y-4">
                      {recentSearches.map((s, idx) => (
                        <div key={idx} className="flex items-center gap-4 group/searchItem">
                          <div className="w-14 h-14 rounded-full overflow-hidden bg-white shadow-sm border border-black/5">
                            <img
                              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${s.id}`}
                              alt={s.id}
                            />
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-gray-800">{s.id}</p>
                            <p className="text-sm text-gray-500">{s.name}</p>
                          </div>
                          <button className="p-1 hover:bg-gray-100 rounded-full transition-all">
                            <X className="w-5 h-5 text-gray-300" />
                          </button>
                        </div>
                      ))}
                      {recentSearches.length === 0 && (
                        <div className="flex-1 flex items-center justify-center py-20">
                          <p className="text-gray-400 font-bold text-sm">최근 검색 내역 없음.</p>
                        </div>
                      )}
                    </div>
                  </div>
                  )}
                </div>
              )}

              {activeTertiary === 'notifications' && (
                <div className="flex flex-col h-full">
                  <div className="flex justify-end items-center px-8 mb-8 gap-4 text-sm font-bold text-gray-500">
                    <button
                      onClick={onReadAllAlarms}
                      className="hover:text-rose-500 transition-colors"
                    >
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
                        className="flex items-center gap-4 py-3 px-4 group/alarm transition-all hover:bg-black/5 rounded-2xl cursor-pointer"
                      >
                        <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-gray-100 shadow-sm">
                          <img
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Alarm${alarm.id}`}
                            alt="profile"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800 leading-snug">
                            {alarm.message}
                          </p>
                          <p className="text-[11px] text-gray-400 font-bold mt-1 tracking-tight uppercase italic">
                            {alarm.time}
                          </p>
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
                        <p className="font-bold lowercase italic tracking-tight">
                          no notifications
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTertiary === 'friends' && (
                <div className="flex flex-col h-full bg-[#eee5df]">
                  {friendView === 'main' ? (
                    <>
                      {/* Requests Link */}
                      <div
                        className="flex items-center justify-between px-8 py-3 cursor-pointer group hover:bg-black/5 transition-colors"
                        onClick={() => setFriendView('requests')}
                      >
                        <span className="text-lg font-black text-gray-600">
                          새로운 팔로우 요청 {followRequests.length}건
                        </span>
                        <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-rose-500 group-hover:translate-x-1 transition-all" />
                      </div>

                      {/* Tabs */}
                      <div className="flex border-b border-gray-300 w-full mt-4">
                        <button
                          onClick={() => setFriendTab('following')}
                          className={`flex-1 py-4 text-sm font-black text-center transition-colors ${friendTab === 'following' ? 'border-b-2 border-rose-500 text-rose-500' : 'text-gray-400 hover:text-gray-500'}`}
                        >
                          팔로잉
                        </button>
                        <button
                          onClick={() => setFriendTab('followers')}
                          className={`flex-1 py-4 text-sm font-black text-center transition-colors ${friendTab === 'followers' ? 'border-b-2 border-rose-500 text-rose-500' : 'text-gray-400 hover:text-gray-500'}`}
                        >
                          팔로워
                        </button>
                      </div>

                      {/* Lists */}
                      <div className="flex-1 overflow-y-auto w-full px-4 pt-4 space-y-1">
                        {friendTab === 'following' ? (
                          follows.map((f) => (
                            <div
                              key={f.id}
                              className="flex items-center gap-4 p-4 hover:bg-white/40 rounded-[20px] transition-all cursor-pointer group/friend"
                              onClick={() => onVisit(f.id)}
                            >
                              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-gray-100 to-gray-200 border border-white shadow-sm overflow-hidden shrink-0">
                                <img
                                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${f.name}`}
                                  alt={f.name}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-black text-[17px] text-gray-800 leading-tight truncate">
                                  {f.name}
                                </p>
                                <p className="text-[11px] text-gray-400 font-bold tracking-tight mt-0.5">
                                  상태메시지가 표시됩니다.
                                </p>
                              </div>
                              <X
                                className="w-5 h-5 text-gray-300 opacity-0 group-hover/friend:opacity-100 hover:text-rose-500 transition-all shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDelete(f);
                                }}
                              />
                            </div>
                          ))
                        ) : (
                          <div className="flex flex-col items-center justify-center py-20 opacity-40 text-gray-500">
                            <Users className="w-10 h-10 mb-2" />
                            <span className="font-bold text-sm tracking-widest uppercase">
                              팔로워가 없습니다
                            </span>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 overflow-y-auto px-4 flex flex-col">
                      {/* Back Button within request view */}
                      <div className="px-4 pb-4">
                        <button
                          onClick={() => setFriendView('main')}
                          className="text-gray-500 text-sm font-bold hover:text-rose-500 transition-colors"
                        >
                          &lt; 뒤로 가기
                        </button>
                      </div>

                      {followRequests.length > 0 ? (
                        <div className="space-y-3">
                          {followRequests.map((req) => (
                            <div
                              key={req.id}
                              className="flex items-center gap-3 p-4 bg-white/60 rounded-2xl border border-white shadow-sm"
                            >
                              <div className="w-12 h-12 rounded-full overflow-hidden shrink-0">
                                <img
                                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${req.name}`}
                                  alt={req.name}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-black text-gray-800 text-[15px] truncate">
                                  {req.name}
                                </p>
                                <p className="text-[11px] text-gray-400 font-bold mt-0.5">
                                  팔로우 요청
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => onAccept(req.id, req.name)}
                                  className="px-4 py-2 bg-rose-500 text-white text-[13px] font-black rounded-xl hover:bg-rose-600 transition-colors shadow-sm"
                                >
                                  수락
                                </button>
                                <button
                                  onClick={() => onReject(req.id)}
                                  className="px-4 py-2 bg-gray-200 text-gray-600 text-[13px] font-black rounded-xl hover:bg-gray-300 transition-colors"
                                >
                                  거절
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-20 opacity-40 text-gray-500">
                          <span className="font-bold text-sm tracking-widest uppercase">
                            새로운 요청이 없습니다
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTertiary === 'chat' && (
                <div className="flex flex-col h-full">
                  {/* Tabs: 대화 vs 방명록 */}
                  <div className="flex mb-2 border-b border-gray-300 w-full">
                    <button
                      onClick={() => setChatTab('archive')}
                      className={`flex-1 py-3 text-lg font-black transition-colors text-center ${chatTab === 'archive' ? 'text-rose-500 border-b-2 border-rose-500' : 'text-gray-400 hover:text-gray-500'}`}
                    >
                      대화
                    </button>
                    <button
                      onClick={() => setChatTab('guestbook')}
                      className={`flex-1 py-3 text-lg font-black transition-colors text-center ${chatTab === 'guestbook' ? 'text-rose-500 border-b-2 border-rose-500' : 'text-gray-400 hover:text-gray-500'}`}
                    >
                      방명록
                    </button>
                  </div>

                  {chatTab === 'archive' ? (
                    <div className="flex-1 flex flex-col pt-2 overflow-hidden">
                      {chatView === 'categories' ? (
                        /* Category List - Aligned with first header line */
                        <div className="flex flex-col gap-10 px-10 pt-10">
                          <button
                            onClick={() => {
                              setChatCategory('assistant');
                              setChatView('list');
                            }}
                            className="text-left text-2xl font-black text-gray-500 hover:text-rose-500 transition-all flex items-center justify-between group"
                          >
                            Ai 비서
                            <ChevronRight className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                          </button>
                          <button
                            onClick={() => {
                              setChatCategory('persona');
                              setChatView('list');
                            }}
                            className="text-left text-2xl font-black text-gray-500 hover:text-rose-500 transition-all flex items-center justify-between group"
                          >
                            남이 보는 나
                            <ChevronRight className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                          </button>
                          <button
                            onClick={() => {
                              setChatCategory('friend');
                              setChatView('list');
                            }}
                            className="text-left text-2xl font-black text-gray-500 hover:text-rose-500 transition-all flex items-center justify-between group"
                          >
                            친구
                            <ChevronRight className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                          </button>
                        </div>
                      ) : (
                        /* List View with IMAGE STYLE UI */
                        <div className="flex-1 flex flex-col">
                          {chatCategory === 'assistant' && (
                            <div className="flex flex-wrap gap-2 px-8 py-4 border-b border-gray-200">
                              {['daily', 'study', 'counsel'].map((mode) => (
                                <button
                                  key={mode}
                                  onClick={() => {
                                    setAssistantFilters((prev) =>
                                      prev.includes(mode)
                                        ? prev.filter((m) => m !== mode)
                                        : [...prev, mode],
                                    );
                                  }}
                                  className={`px-3 py-1.5 rounded-full text-xs font-black transition-all ${assistantFilters.includes(mode) ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                                >
                                  {mode === 'daily'
                                    ? '일상 모드'
                                    : mode === 'study'
                                      ? '학습 모드'
                                      : '상담 모드'}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Chat List: SCROLLABLE, Transparent items, hover only bg color */}
                          <div className="flex-1 overflow-y-auto pt-2">
                            <h4 className="text-sm font-black text-gray-800 mb-4 px-10">메시지</h4>
                            <div className="flex flex-col">
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => {
                                const isAiVsAi = i % 2 === 0;
                                const isActive = selectedChatId === i;
                                return (
                                  <div
                                    key={i}
                                    onClick={() => setSelectedChatId(i)}
                                    className={`
                                      flex items-center gap-4 px-10 py-5 cursor-pointer transition-all border-l-4
                                      ${isActive ? 'bg-black/5 border-rose-500 shadow-inner' : 'border-transparent hover:bg-black/5'}
                                    `}
                                  >
                                    <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 bg-white border border-gray-100 shadow-sm">
                                      <img
                                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${chatCategory === 'assistant' ? 'AI' : isAiVsAi ? 'BothAI' : 'Person'}${i}`}
                                        alt="profile"
                                      />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex justify-between items-center pr-2">
                                        <p className="font-extrabold text-gray-900 text-[15px] truncate">
                                          {i === 1
                                            ? '배지연님'
                                            : i === 2
                                              ? '박서연님'
                                              : `사용자 ${i}`}
                                        </p>
                                        <div className="flex items-center gap-2">
                                          <div className="w-2 h-2 rounded-full bg-blue-600 shadow-sm" />
                                          <button className="p-1 hover:bg-gray-200 rounded-full">
                                            <MoreHorizontal className="w-4 h-4 text-gray-400" />
                                          </button>
                                        </div>
                                      </div>
                                      <p className="text-sm text-gray-600 font-bold truncate mt-0.5">
                                        {i === 1
                                          ? '배지연 sent an attachment.'
                                          : i === 2
                                            ? '3 new messages'
                                            : '최근 대화 내용이 표시됩니다.'}
                                        <span className="text-gray-400 ml-1">
                                          · {i === 1 ? '1분' : i + '분'}
                                        </span>
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Guestbook Content */
                    <div className="flex-1 px-4 overflow-y-auto space-y-3">
                      <h4 className="text-sm font-black text-gray-400 mb-4 px-2 tracking-widest uppercase">
                        방문자 기록
                      </h4>
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="flex items-center gap-4 p-4 bg-white/40 rounded-[24px] border border-white/50 hover:bg-white/60 transition-all cursor-pointer shadow-sm"
                        >
                          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-green-100 to-teal-100 shadow-inner" />
                          <div className="flex-1">
                            <p className="font-black text-gray-800 text-sm">친구 {i}님</p>
                            <p className="text-xs text-gray-500 mt-1 truncate">
                              내 AI와 재미있는 이야기를 나누고 감...
                            </p>
                          </div>
                          <span className="text-[10px] text-gray-400 font-bold">{i}시간 전</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area (for Chat View) */}
      <AnimatePresence>
        {activeTertiary === 'chat' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute left-[440px] right-0 h-full bg-white pointer-events-auto shadow-2xl overflow-hidden flex flex-col z-[110]"
          >
            {/* Top Right Profile (Fixed like in image) */}
            <div className="absolute top-8 right-8 z-10">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-lg">
                <img
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=MainUser"
                  alt="Main User"
                />
              </div>
            </div>

            {selectedChatId === null ? (
              /* Empty State */
              <div className="flex-1 flex flex-col items-center justify-center gap-6">
                <div className="w-24 h-24 rounded-full border-2 border-gray-800 flex items-center justify-center -rotate-12">
                  <svg
                    viewBox="0 0 24 24"
                    className="w-12 h-12 text-gray-800 fill-none stroke-current stroke-2"
                  >
                    <path
                      d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <p className="text-xl font-bold text-gray-400">ai 와 대화를 나누어보세요 !</p>
              </div>
            ) : (
              /* Chat History View */
              <div className="flex-1 flex flex-col p-12 gap-12 max-w-5xl mx-auto w-full">
                {/* AI Side (Left Top) */}
                <div className="flex gap-6 items-start">
                  <div className="shrink-0 flex flex-col items-center gap-2">
                    <div className="w-24 h-24 rounded-2xl bg-[#eee5df] shadow-lg border border-white/50 overflow-hidden">
                      <img src="https://api.dicebear.com/7.x/bottts/svg?seed=Jerry" alt="Jerry" />
                    </div>
                    <span className="text-lg font-black text-gray-900">Jerry</span>
                  </div>
                  <div className="pt-8 flex flex-col gap-2">
                    <h2 className="text-4xl font-black text-gray-900 max-w-xl leading-snug">
                      싸비스와 <span className="text-rose-500">대화하</span>는 시간을
                      <br />
                      <span className="text-gray-200">가져보아요</span>
                    </h2>
                  </div>
                </div>

                {/* User Side (Right Bottom) */}
                <div className="mt-20 flex gap-6 items-end justify-end self-end">
                  <div className="pb-8 text-right">
                    <h2 className="text-4xl font-black text-gray-900 max-w-xl leading-snug">
                      제리야 <span className="text-rose-500">밥은 먹</span>었니 내 말에
                      <br />
                      <span className="text-gray-200">먼저 대답해줘</span>
                    </h2>
                  </div>
                  <div className="shrink-0 flex flex-col items-center gap-2">
                    <div className="w-24 h-24 rounded-2xl bg-black shadow-2xl relative overflow-hidden">
                      <img
                        src="https://api.dicebear.com/7.x/avataaars/svg?seed=Seoyoung"
                        alt="Seoyoung"
                      />
                    </div>
                    <span className="text-lg font-black text-gray-900">Seoyoung</span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
