import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
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
  Search,
  X,
  ChevronLeft,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PATHS } from '../../routes/paths';
import type { Alarm, Mode, Follow, FollowRequest } from '../../types';
import { getChatSessions } from '../../apis/chatApi';
import type { ChatSession } from '../../apis/chatApi';

// Sub-panels
import SearchPanel from './sidebar/SearchPanel';
import type { RecentSearchItem } from './sidebar/SearchPanel';
import NotificationsPanel from './sidebar/NotificationsPanel';
import FriendsPanel from './sidebar/FriendsPanel';
import ChatPanel from './sidebar/ChatPanel';
import AssistantPanel from './sidebar/AssistantPanel';
import PersonaPanel from './sidebar/PersonaPanel';
import ChatArchiveView from './ChatArchiveView';
import SidebarAvatar from './sidebar/SidebarAvatar';

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
const STICKY_TERTIARY_IDS = new Set(['friends', 'chat', 'notifications', 'search']);
const HOVER_LOCK_TERTIARY_IDS = new Set(['assistant', 'persona']);

export default function Sidebar({
  userInfo,
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
  const { sessionId } = useParams<{ sessionId?: string }>();
  const selectedChatId = sessionId || null;

  const location = useLocation();
  const [activeTertiary, setActiveTertiary] = useState<
    'friends' | 'chat' | 'notifications' | 'search' | 'assistant' | 'persona' | null
  >(null);
  const isStickyTertiary = activeTertiary ? STICKY_TERTIARY_IDS.has(activeTertiary) : false;
  const closeHoverPanelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sidebarWidth = isExpanded ? 240 : 80;
  const tertiaryPanelWidth = 320;
  const tertiaryLeft =
    activeTertiary === 'notifications' || activeTertiary === 'search' ? 0 : sidebarWidth;
  const detailPanelLeft = activeTertiary ? sidebarWidth + tertiaryPanelWidth : sidebarWidth;
  const isHoverLockTertiary = activeTertiary ? HOVER_LOCK_TERTIARY_IDS.has(activeTertiary) : false;

  const clearHoverPanelCloseTimer = useCallback(() => {
    if (closeHoverPanelTimerRef.current) {
      clearTimeout(closeHoverPanelTimerRef.current);
      closeHoverPanelTimerRef.current = null;
    }
  }, []);

  const scheduleHoverPanelClose = useCallback(() => {
    clearHoverPanelCloseTimer();
    closeHoverPanelTimerRef.current = setTimeout(() => {
      setIsExpanded(false);
      setActiveTertiary((current) => {
        if (current && HOVER_LOCK_TERTIARY_IDS.has(current)) {
          return null;
        }
        return current;
      });
    }, 120);
  }, [clearHoverPanelCloseTimer]);

  useEffect(() => {
    return () => {
      clearHoverPanelCloseTimer();
    };
  }, [clearHoverPanelCloseTimer]);

  // Sync activeTertiary with URL path
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/chat') || path.startsWith('/chat-archive')) {
      setActiveTertiary('chat');
    } else if (selectedChatId) {
      setActiveTertiary('chat');
    } else {
      // For paths that don't correspond to tertiary panels, but some panels might be open manually
      // We don't necessarily want to close manually opened panels on all navigations,
      // but for 'friends', 'notifications', 'search' we might want to keep current state.
      // However, the rule is "navigating to these pages opens/keeps panels open".
      if (!['/friends', '/notifications', '/search'].includes(path)) {
        if (
          activeTertiary !== 'friends' &&
          activeTertiary !== 'notifications' &&
          activeTertiary !== 'search'
        ) {
          // If we are on Home, close panels unless it's friends etc.
          if (path === PATHS.HOME || path.match(/^\/\d+$/)) {
            setActiveTertiary(null);
          }
        }
      }
    }
  }, [location.pathname, selectedChatId]);

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
  const [assistantFilters, setAssistantFilters] = useState<string[]>([]);

  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const returnToChatList = () => {
    navigate(PATHS.CHAT);
  };

  const returnToChatCategories = () => {
    setChatTab('archive');
    setChatView('categories');
    setChatCategory('assistant');
    setAssistantFilters([]);
    navigate(PATHS.CHAT);
  };

  const openGuestbookRoot = () => {
    setChatTab('guestbook');
    setChatView('categories');
    setChatCategory('assistant');
    setAssistantFilters([]);
    navigate(PATHS.CHAT);
  };

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

  const displaySessions = chatSessions.filter((session) => {
    if (chatTab === 'archive' && chatCategory === 'assistant') {
      if (assistantFilters.length === 0) return true;
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
    {
      id: 'home',
      icon: Home,
      label: '홈',
      path: userInfo?.id ? PATHS.USER_HOME(userInfo.id) : PATHS.HOME,
      color: 'text-rose-500',
    },
    { id: 'myinfo', icon: User, label: '내 정보', action: onMyCardClick, color: 'text-rose-500' },
    {
      id: 'ai_assistant',
      icon: Bot,
      label: 'Ai 비서',
      path: PATHS.ASSISTANT,
      hasTertiary: true,
      tertiaryId: 'assistant',
      color: 'text-rose-500',
    },
    {
      id: 'eye',
      icon: Eye,
      label: '남이 보는 나',
      path: PATHS.NAMNA,
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
      path: PATHS.CHAT,
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

  const handleNotificationClick = (alarm: Alarm) => {
    onAlarmClick(alarm);

    if (alarm.type === 'FOLLOW_REQUEST') {
      if (selectedChatId) {
        navigate(userInfo?.id ? PATHS.USER_HOME(userInfo.id) : PATHS.HOME);
      }

      setActiveTertiary('friends');
      setFriendView('requests');
      setFriendTab('following');
    } else if (alarm.type === 'FOLLOW_CREATED') {
      if (selectedChatId) {
        navigate(userInfo?.id ? PATHS.USER_HOME(userInfo.id) : PATHS.HOME);
      }

      setActiveTertiary('friends');
      setFriendView('main');
      setFriendTab('following');
    } else if (alarm.type === 'FOLLOW_ACCEPT') {
      const senderId = (alarm.payload as any)?.senderId || (alarm.payload as any)?.senderUserId;
      if (senderId) {
        navigate(PATHS.USER_HOME(senderId));
        setActiveTertiary(null);
      }
    }
  };

  const handleItemClick = (item: MenuItem) => {
    if (item.path) {
      // If we're already on this path, manually toggle the tertiary panel
      if (location.pathname === item.path && item.tertiaryId) {
        const isClosing = activeTertiary === item.tertiaryId;
        setActiveTertiary(isClosing ? null : item.tertiaryId);
      } else {
        // If navigating to a new path, let the useEffect handle opening
        navigate(item.path);
      }
    } else if (item.action) {
      setActiveTertiary(null);
      item.action();
    } else if (item.hasTertiary) {
      const isClosing = activeTertiary === item.tertiaryId;
      setActiveTertiary(isClosing ? null : item.tertiaryId || null);
      setIsExpanded(false);

      if (item.tertiaryId === 'chat') {
        setChatView('categories');
        if (selectedChatId) navigate(PATHS.CHAT);
      }
      if (item.tertiaryId === 'friends') {
        setFriendView('main');
        setFriendTab('following');
      }
      if (item.tertiaryId !== 'chat' && selectedChatId) {
        navigate(userInfo?.id ? PATHS.USER_HOME(userInfo.id) : PATHS.HOME);
      }
    }
  };

  const handleItemHover = (item: MenuItem) => {
    if (!item.tertiaryId || !HOVER_LOCK_TERTIARY_IDS.has(item.tertiaryId)) {
      return;
    }
    clearHoverPanelCloseTimer();
    setActiveTertiary(item.tertiaryId);
  };

  return (
    <div className="fixed left-0 top-0 h-full z-[100] flex pointer-events-none w-full">
      <AnimatePresence>
        {activeTertiary &&
          !(activeTertiary === 'chat' && location.pathname.startsWith(PATHS.CHAT)) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setActiveTertiary(null);
              }}
              className="fixed inset-0 bg-transparent pointer-events-auto z-[115]"
            />
          )}
      </AnimatePresence>

      <motion.aside
        onMouseEnter={() => {
          clearHoverPanelCloseTimer();
          setIsExpanded(true);
        }}
        onMouseLeave={() => {
          if (isHoverLockTertiary) {
            scheduleHoverPanelClose();
            return;
          }
          setIsExpanded(false);
          if (!isStickyTertiary) {
            setActiveTertiary(null);
          }
        }}
        animate={{
          width: isExpanded ? 240 : 80,
          opacity:
            !isExpanded && (activeTertiary === 'notifications' || activeTertiary === 'search')
              ? 0
              : 1,
        }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="h-full bg-[#eee5df] border-r border-gray-200 pointer-events-auto flex flex-col items-center py-6 z-[130]"
      >
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex items-center justify-center overflow-hidden">
            <div
              aria-label="Logo"
              className="h-11 w-11 bg-stone-400"
              style={{
                WebkitMaskImage: "url('/logo.svg')",
                WebkitMaskRepeat: 'no-repeat',
                WebkitMaskPosition: 'center',
                WebkitMaskSize: 'contain',
                maskImage: "url('/logo.svg')",
                maskRepeat: 'no-repeat',
                maskPosition: 'center',
                maskSize: 'contain',
              }}
            />
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
                  className="w-full bg-[#e5e0dc] rounded-xl flex items-center gap-2 py-2 px-3 cursor-pointer hover:bg-[#dcd2ca] transition-colors"
                >
                  <Search className="w-4 h-4 text-white/80 shrink-0" />
                  <span className="text-gray-400 font-bold whitespace-nowrap text-sm">Search</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.id} className="relative group/item">
                <button
                  onMouseEnter={() => handleItemHover(item)}
                  onClick={() => handleItemClick(item)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 hover:bg-black/5`}
                >
                  <div className={`shrink-0 w-8 h-8 flex items-center justify-center relative`}>
                    <Icon className={`w-6.5 h-6.5 ${item.color || 'text-rose-500'}`} />
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
                        className="text-[16px] font-medium text-gray-700 whitespace-nowrap"
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
        {activeTertiary && (isExpanded || isStickyTertiary) && (
          <motion.div
            onMouseEnter={() => {
              if (!isHoverLockTertiary) return;
              clearHoverPanelCloseTimer();
              setIsExpanded(true);
            }}
            onMouseLeave={() => {
              if (!isHoverLockTertiary) return;
              scheduleHoverPanelClose();
            }}
            initial={{ opacity: 0 }}
            animate={{
              x: 0,
              opacity: 1,
              left: tertiaryLeft,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`fixed top-0 h-full w-[320px] bg-white border-r border-gray-200 pointer-events-auto overflow-hidden flex flex-col ${activeTertiary === 'notifications' || activeTertiary === 'search' ? 'z-[140]' : 'z-[120]'}`}
          >
            <div className="flex min-h-[88px] items-center justify-between px-6 pb-2 pt-6">
              <div className="flex min-h-[44px] items-center gap-3">
                  {activeTertiary === 'chat' &&
                    (selectedChatId || (chatTab === 'archive' && chatView === 'list')) && (
                      <button
                        onClick={selectedChatId ? returnToChatList : returnToChatCategories}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-[0px] text-gray-500 transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800"
                        aria-label="이전"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        이전으로
                      </button>
                    )}
                  <h2 className="text-3xl font-black leading-none text-gray-800">
                    {activeTertiary === 'friends'
                      ? '팔로우 목록'
                      : activeTertiary === 'chat'
                        ? '대화 보관함'
                        : activeTertiary === 'assistant'
                          ? 'Ai 비서'
                          : activeTertiary === 'persona'
                            ? '남이 보는 나'
                            : activeTertiary === 'search'
                              ? '검색'
                              : '알림'}
                  </h2>
              </div>
              <button
                onClick={() => {
                  setActiveTertiary(null);
                  if (selectedChatId)
                    navigate(userInfo?.id ? PATHS.USER_HOME(userInfo.id) : PATHS.HOME);
                }}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full p-2 transition-colors hover:bg-black/5"
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
                  onVisit={(id) => {
                    onVisit(id);
                    setActiveTertiary(null);
                  }}
                  onRequest={onRequest}
                  setRecentSearches={setRecentSearches}
                  onAccept={onAccept}
                />
              )}
              {activeTertiary === 'notifications' && (
                <NotificationsPanel
                  alarms={alarms}
                  onAlarmClick={handleNotificationClick}
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
                  onVisit={(id) => {
                    onVisit(id);
                    setActiveTertiary(null);
                  }}
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
                  setSelectedChatId={(id) => {
                    if (id) {
                      navigate(PATHS.CHAT_ARCHIVE(id));
                    } else {
                      returnToChatList();
                    }
                  }}
                  onSelectArchiveTab={returnToChatCategories}
                  onSelectGuestbookTab={openGuestbookRoot}
                />
              )}
              {activeTertiary === 'assistant' && (
                <AssistantPanel
                  currentMode={currentMode}
                  onModeChange={(m) => {
                    clearHoverPanelCloseTimer();
                    onModeChange(m);
                    navigate(PATHS.ASSISTANT);
                    setActiveTertiary(null);
                    setIsExpanded(false);
                  }}
                />
              )}
              {activeTertiary === 'persona' && (
                <PersonaPanel
                  onModeChange={(m) => {
                    clearHoverPanelCloseTimer();
                    onModeChange(m);
                    setActiveTertiary(null);
                    setIsExpanded(false);
                  }}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {sessionId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ left: `${detailPanelLeft}px` }}
            className="fixed top-0 bottom-0 right-0 bg-white pointer-events-auto border-l border-gray-200 overflow-hidden flex flex-col z-[110] transition-all duration-200"
          >
            {/* Top Header / Back Button */}
            <div className="h-20 shrink-0 px-8 flex items-center justify-between border-b border-gray-50 z-20">
              <button
                onClick={returnToChatList}
                className="group flex items-center gap-2 text-gray-400 hover:text-gray-900 transition-colors"
              >
                <div className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center group-hover:bg-gray-50 transition">
                  <ChevronLeft className="w-5 h-5" />
                </div>
                <span className="font-bold text-sm tracking-tight">닫기</span>
              </button>
              <SidebarAvatar
                name={userInfo?.nickname || 'User'}
                sizeClassName="w-12 h-12"
                className="border-2 border-white shadow-lg"
              />
            </div>

            <div className="flex-1 min-h-0 bg-white flex flex-col">
              <ChatArchiveView selectedChatId={sessionId} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
