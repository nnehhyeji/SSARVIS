import React from 'react';
import { ChevronRight, MoreHorizontal } from 'lucide-react';
import type { ChatSession } from '../../../apis/chatApi';

interface ChatPanelProps {
  chatTab: 'archive' | 'guestbook';
  setChatTab: (val: 'archive' | 'guestbook') => void;
  chatView: 'categories' | 'list';
  setChatView: (val: 'categories' | 'list') => void;
  chatCategory: 'assistant' | 'persona' | 'friend';
  setChatCategory: (val: 'assistant' | 'persona' | 'friend') => void;
  assistantFilters: string[];
  setAssistantFilters: React.Dispatch<React.SetStateAction<string[]>>;
  displaySessions: ChatSession[];
  isChatLoading: boolean;
  selectedChatId: string | null;
  setSelectedChatId: (val: string | null) => void;
  onSelectArchiveTab: () => void;
  onSelectGuestbookTab: () => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({
  chatTab,
  setChatTab,
  chatView,
  setChatView,
  chatCategory,
  setChatCategory,
  assistantFilters,
  setAssistantFilters,
  displaySessions,
  isChatLoading,
  selectedChatId,
  setSelectedChatId,
  onSelectArchiveTab,
  onSelectGuestbookTab,
}) => {
  return (
    <div className="flex flex-col h-full">
      {/* Tabs: 대화 vs 방명록 */}
      <div className="flex mb-2 border-b border-gray-300 w-full">
        <button
          onClick={onSelectArchiveTab}
          className={`flex-1 py-3 text-lg font-black transition-colors text-center ${chatTab === 'archive' ? 'text-rose-500 border-b-2 border-rose-500' : 'text-gray-400 hover:text-gray-500'}`}
        >
          대화
        </button>
        <button
          onClick={onSelectGuestbookTab}
          className={`flex-1 py-3 text-lg font-black transition-colors text-center ${chatTab === 'guestbook' ? 'text-rose-500 border-b-2 border-rose-500' : 'text-gray-400 hover:text-gray-500'}`}
        >
          방명록
        </button>
      </div>

      {chatTab === 'archive' ? (
        <div className="flex-1 flex flex-col pt-2 overflow-hidden">
          {chatView === 'categories' ? (
            /* Category List */
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
            /* List View */
            <div className="flex-1 flex flex-col">
              {chatCategory === 'assistant' && (
                <div className="flex flex-wrap gap-2 px-8 py-4 border-b border-gray-200">
                  {['daily', 'study', 'counsel'].map((mode) => (
                    <button
                      key={mode}
                      onClick={() =>
                        setAssistantFilters((prev) => (prev.includes(mode) ? [] : [mode]))
                      }
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

              {/* Chat List */}
              <div className="flex-1 overflow-y-auto pt-2">
                <h4 className="text-sm font-black text-gray-800 mb-4 px-10">메시지</h4>
                <div className="flex flex-col">
                  {displaySessions.length === 0 && !isChatLoading && (
                    <div className="py-10 text-center text-sm font-bold opacity-40 text-gray-500 uppercase">
                      대화 내역이 없습니다
                    </div>
                  )}
                  {isChatLoading && (
                    <div className="py-10 text-center text-sm font-bold text-rose-500 animate-pulse">
                      불러오는 중...
                    </div>
                  )}
                  {!isChatLoading &&
                    displaySessions.map((session) => {
                      const isActive = selectedChatId === session.id;
                      const isAiSection =
                        chatCategory === 'assistant' || chatCategory === 'persona';

                      return (
                        <div
                          key={session.id}
                          onClick={() => setSelectedChatId(session.id)}
                          className={`
                            flex items-center gap-4 px-10 py-5 cursor-pointer transition-all
                            ${isActive ? 'bg-black/5 shadow-inner' : 'hover:bg-black/5'}
                          `}
                        >
                          {!isAiSection && (
                            <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 bg-white border border-gray-100 shadow-sm">
                              <img
                                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${session.id}`}
                                alt="profile"
                              />
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center">
                              <p
                                className={`font-extrabold text-gray-900 truncate ${isAiSection ? 'text-[17px]' : 'text-[15px]'}`}
                              >
                                {session.title || '새로운 대화'}
                              </p>
                              {isAiSection && (
                                <span className="text-[11px] text-gray-400 font-bold shrink-0 ml-2">
                                  {new Date(session.lastMessageAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>

                            <div className="flex justify-between items-end mt-1">
                              <p
                                className={`text-gray-500 font-bold truncate ${isAiSection ? 'text-sm' : 'text-xs'}`}
                              >
                                {!isAiSection ? (
                                  <>
                                    메시지 {session.messageCount}개
                                    <span className="text-gray-400 ml-1">
                                      · {new Date(session.lastMessageAt).toLocaleDateString()}
                                    </span>
                                  </>
                                ) : (
                                  `총 ${session.messageCount}개의 메시지`
                                )}
                              </p>
                              {!isAiSection && (
                                <button className="p-1 hover:bg-gray-200 rounded-full">
                                  <MoreHorizontal className="w-4 h-4 text-gray-400" />
                                </button>
                              )}
                            </div>
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
          {displaySessions.length === 0 && !isChatLoading && (
            <div className="py-10 text-center text-sm font-bold opacity-40 text-gray-500 uppercase">
              방문자 기록이 없습니다
            </div>
          )}
          {isChatLoading && (
            <div className="py-10 text-center text-sm font-bold text-rose-500 animate-pulse">
              불러오는 중...
            </div>
          )}
          {!isChatLoading &&
            displaySessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center gap-4 p-4 bg-white/40 rounded-[24px] border border-white/50 hover:bg-white/60 transition-all cursor-pointer shadow-sm"
                onClick={() => setSelectedChatId(session.id)}
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-green-100 to-teal-100 shadow-inner overflow-hidden">
                  <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${session.userId}`}
                    alt="visitor"
                  />
                </div>
                <div className="flex-1">
                  <p className="font-black text-gray-800 text-sm">
                    {session.title || '알 수 없는 방문자'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    내 AI와 이야기를 나누었습니다.
                  </p>
                </div>
                <span className="text-[10px] text-gray-400 font-bold">
                  {new Date(session.startedAt).toLocaleDateString()}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default ChatPanel;
