import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PATHS } from '../../routes/paths';
import type { Alarm, Mode, Follow, FollowRequest } from '../../types';
import { getChatSessions, getChatMessages } from '../../apis/chatApi';
import type { ChatSession, ChatMessageData } from '../../apis/chatApi';

// Sub-panels
import SearchPanel from './sidebar/SearchPanel';
import type { RecentSearchItem } from './sidebar/SearchPanel';
import NotificationsPanel from './sidebar/NotificationsPanel';
import FriendsPanel from './sidebar/FriendsPanel';
import ChatPanel from './sidebar/ChatPanel';
import AssistantPanel from './sidebar/AssistantPanel';
import PersonaPanel from './sidebar/PersonaPanel';
import ChatHistoryView from './sidebar/ChatHistoryView';

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
  requestFollow: (receiverId: number, name: string) => void;

  // View count
  viewCount?: number;
}

const RECENT_SEARCHES_KEY = 'sidebar_recent_searches_v1';
const RECENT_SEARCH_LIMIT = 5;

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
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTertiary, setActiveTertiary] = useState<
    'friends' | 'chat' | 'notifications' | 'search' | 'assistant' | 'persona' | null
  >(null);
  const [friendTab, setFriendTab] = useState<'following' | 'followers'>('following');
  const [friendView, setFriendView] = useState<'main' | 'requests'>('main');
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<RecentSearchItem[]>(() => {
    try {
      const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved) as RecentSearchItem[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  // Chat Archive States
  const [chatTab, setChatTab] = useState<'archive' | 'guestbook'>('archive');
  const [chatCategory, setChatCategory] = useState<'assistant' | 'persona' | 'friend'>('assistant');
  const [chatView, setChatView] = useState<'categories' | 'list'>('categories');
  const [assistantFilters, setAssistantFilters] = useState<string[]>(['daily']);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [chatMessagesData, setChatMessagesData] = useState<ChatMessageData[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (activeTertiary !== 'chat') return;

    const loadSessions = async () => {
      try {
        setIsChatLoading(true);
        let type = 'SECRETARY';
        if (chatTab === 'guestbook') {
          type = 'GUESTBOOK';
        } else {
          if (chatCategory === 'assistant') type = 'SECRETARY';
          else if (chatCategory === 'persona') type = 'PERSONA';
          else if (chatCategory === 'friend') type = 'VISIT';
        }
        const data = await getChatSessions({ type });
        if (isMounted) setChatSessions(data.contents || []);
      } catch (err) {
        console.error('채팅 세션 조회 실패:', err);
      } finally {
        if (isMounted) setIsChatLoading(false);
      }
    };
    void loadSessions();
    return () => {
      isMounted = false;
    };
  }, [activeTertiary, chatTab, chatCategory]);

  useEffect(() => {
    let isMounted = true;
    if (!selectedChatId) {
      if (isMounted) setChatMessagesData([]);
      return;
    }
    const loadMessages = async () => {
      try {
        const data = await getChatMessages(selectedChatId);
        if (isMounted) setChatMessagesData(data.contents || []);
      } catch (err) {
        console.error('채팅 메시지 조회 실패:', err);
      }
    };
    void loadMessages();
    return () => {
      isMounted = false;
    };
  }, [selectedChatId]);

  const displaySessions = chatSessions.filter((session) => {
    if (chatTab === 'archive' && chatCategory === 'assistant') {
      const typeMap: Record<string, string> = {
        daily: 'DAILY',
        study: 'STUDY',
        counsel: 'COUNSEL',
      };
      return assistantFilters.some((f) => typeMap[f] === session.assistantType);
    }
    return true;
  });

  interface MenuItem {
    id: string;
    icon: React.ElementType<{ className?: string }>;
    label?: string;
    path?: string;
    hasTertiary?: boolean;
    tertiaryId?: 'friends' | 'chat' | 'notifications' | 'search' | 'assistant' | 'persona';
    color?: string;
    action?: () => void;
    hasSub?: boolean;
    subItems?: { label: string; mode: Mode }[];
    badge?: number;
  }

  const menuItems: MenuItem[] = [
    { id: 'home', icon: Home, label: '홈', path: PATHS.HOME, color: 'text-rose-500' },
    { id: 'myinfo', icon: User, label: '내 정보', action: onMyCardClick, color: 'text-rose-500' },
    {
      id: 'ai_assistant',
      icon: Bot,
      label: 'Ai 비서',
      hasTertiary: true,
      tertiaryId: 'assistant',
      color: 'text-rose-500',
    },
    {
      id: 'eye',
      icon: Eye,
      label: '남이 보는 나',
      hasTertiary: true,
      tertiaryId: 'persona',
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
      path: PATHS.SETTINGS_PARAM.replace(':tab', 'account'),
      color: 'text-stone-400',
    },
    { id: 'logout', icon: LogOut, label: '로그아웃', action: onLogout, color: 'text-stone-400' },
  ];

  useEffect(() => {
    try {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recentSearches));
    } catch {
      /* ignore storage errors */
    }
  }, [recentSearches]);

  const persistRecentSearches = (items: RecentSearchItem[]) => {
    try {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(items));
    } catch {
      /* ignore storage errors */
    }
  };

  const addRecentSearch = (user: RecentSearchItem) => {
    setRecentSearches((prev) => {
      const next = [user, ...prev.filter((item) => item.id !== user.id)].slice(
        0,
        RECENT_SEARCH_LIMIT,
      );
      persistRecentSearches(next);
      return next;
    });
  };

  const removeRecentSearch = (id: number) => {
    setRecentSearches((prev) => {
      const next = prev.filter((item) => item.id !== id);
      persistRecentSearches(next);
      return next;
    });
  };

  const handleRecentSearchClick = (item: RecentSearchItem) => {
    setSearchQuery(item.name);
    onSearch(item.name);
  };

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
      setIsExpanded(false);

      if (item.tertiaryId === 'chat') {
        setChatView('categories');
        setSelectedChatId(null);
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
      <AnimatePresence>
        {/* 모든 패널은 이제 고정형(Fixed)으로 동작하며, 배경 클릭으로 닫히지 않습니다. */}
      </AnimatePresence>

      <motion.aside
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        initial={{ width: 80 }}
        animate={{
          width: isExpanded ? 240 : 100,
          opacity:
            !isExpanded && (activeTertiary === 'notifications' || activeTertiary === 'search')
              ? 0
              : 1,
        }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="h-full bg-[#eee5df] border-r border-gray-200 pointer-events-auto flex flex-col items-center py-8 shadow-xl z-[130]"
      >
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="w-12 h-12 bg-white flex items-center justify-center rounded-lg shadow-sm">
            <span className="font-bold text-gray-800 text-sm">로고</span>
          </div>
        </div>

        <nav className="flex-1 w-full px-3 flex flex-col gap-2">
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
                  <Search className="w-5 h-5 text-white/80 shrink-0" />
                  <span className="text-gray-400 font-bold whitespace-nowrap">Search</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.id} className="relative group/item">
                <button
                  onClick={() => handleItemClick(item)}
                  className={`w-full flex items-center gap-4 p-4 rounded-lg transition-all duration-200 hover:bg-black/5`}
                >
                  <div className={`shrink-0 w-10 h-10 flex items-center justify-center relative`}>
                    <Icon className={`w-8 h-8 ${item.color || 'text-rose-500'}`} />
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[12px] flex items-center justify-center rounded-full font-bold">
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
                        className="text-[18px] font-medium text-gray-700 whitespace-nowrap"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </div>
            );
          })}
        </nav>

        <div className="w-full px-3 mt-auto flex flex-col gap-2 pt-6 border-t border-gray-300/50">
          {bottomItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                className="w-full flex items-center gap-4 p-4 rounded-lg hover:bg-black/5 transition-all duration-300"
              >
                <div className="shrink-0 w-8 h-8 flex items-center justify-center">
                  <Icon className={`w-8 h-8 ${item.color}`} />
                </div>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="font-semibold text-gray-500 whitespace-nowrap"
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

      <AnimatePresence>
        {activeTertiary && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{
              x: 0,
              opacity: 1,
              left: activeTertiary === 'notifications' || activeTertiary === 'search' ? 0 : 100,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`fixed top-0 h-full w-[400px] bg-[#eee5df] border-r border-gray-200 pointer-events-auto shadow-2xl overflow-hidden flex flex-col ${activeTertiary === 'notifications' || activeTertiary === 'search' ? 'z-[140]' : 'z-[120]'}`}
          >
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
                        : activeTertiary === 'assistant'
                          ? 'Ai 비서'
                          : activeTertiary === 'persona'
                            ? '남이 보는 나'
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

            <div className="flex-1 flex flex-col pt-4">
              {activeTertiary === 'search' && (
                <SearchPanel
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  onSearch={onSearch}
                  isSearchLoading={isSearchLoading}
                  searchResults={searchResults}
                  recentSearches={recentSearches}
                  addRecentSearch={addRecentSearch}
                  removeRecentSearch={removeRecentSearch}
                  persistRecentSearches={persistRecentSearches}
                  handleRecentSearchClick={handleRecentSearchClick}
                  onVisit={onVisit}
                  onRequest={onRequest}
                  setRecentSearches={setRecentSearches}
                  onAccept={onAccept}
                />
              )}
              {activeTertiary === 'notifications' && (
                <NotificationsPanel
                  alarms={alarms}
                  onAlarmClick={onAlarmClick}
                  onReadAllAlarms={onReadAllAlarms}
                  onDeleteAllAlarms={onDeleteAllAlarms}
                  onRemoveAlarm={onRemoveAlarm}
                  onAccept={onAccept}
                />
              )}
              {activeTertiary === 'friends' && (
                <FriendsPanel
                  friendView={friendView}
                  setFriendView={setFriendView}
                  followRequests={followRequests}
                  friendTab={friendTab}
                  setFriendTab={setFriendTab}
                  follows={follows}
                  onVisit={onVisit}
                  onDelete={onDelete}
                  onAccept={onAccept}
                  onReject={onReject}
                  onSearchOpen={() => setActiveTertiary('search')}
                />
              )}
              {activeTertiary === 'chat' && (
                <ChatPanel
                  chatTab={chatTab}
                  setChatTab={setChatTab}
                  chatView={chatView}
                  setChatView={setChatView}
                  chatCategory={chatCategory}
                  setChatCategory={setChatCategory}
                  assistantFilters={assistantFilters}
                  setAssistantFilters={setAssistantFilters}
                  displaySessions={displaySessions}
                  isChatLoading={isChatLoading}
                  selectedChatId={selectedChatId}
                  setSelectedChatId={setSelectedChatId}
                />
              )}
              {activeTertiary === 'assistant' && (
                <AssistantPanel
                  currentMode={currentMode}
                  onModeChange={onModeChange}
                  setActiveTertiary={setActiveTertiary}
                />
              )}
              {activeTertiary === 'persona' && (
                <PersonaPanel onModeChange={onModeChange} setActiveTertiary={setActiveTertiary} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeTertiary === 'chat' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ChatHistoryView
              selectedChatId={selectedChatId}
              chatMessagesData={chatMessagesData}
              isChatLoading={isChatLoading}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
