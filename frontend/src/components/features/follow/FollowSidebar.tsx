import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Users, Search, ChevronLeft, UserPlus, X, ChevronRight, MoreVertical } from 'lucide-react';
import type { Follow, FollowRequest } from '../../../types';

// ─── FollowSidebar ───
// 역할: 우측 슬라이딩 팔로우 목록 사이드바
// - 팔로우 목록 / 팔로우 요청 탭 전환 기능을 포함합니다.
// - 이름 검색(searchQuery)은 컴포넌트 내부 상태로 관리합니다.

interface FollowSidebarProps {
  isOpen: boolean;
  view: 'followers' | 'following' | 'requests';
  onViewChange: (view: 'followers' | 'following' | 'requests') => void;
  follows: Follow[];
  allUsers: Follow[];
  requests: FollowRequest[];

  visitedId: number | null;
  isVisitorMode: boolean;
  onVisit: (id: number) => void;
  onDelete: (id: number) => void;
  onAccept: (id: number, name: string) => void;

  onReject: (id: number) => void;
  onClose: () => void;
  onToggle?: () => void;
}

export default function FollowSidebar({
  isOpen,
  view: sidebarView,
  onViewChange: setSidebarView,
  follows,
  allUsers,
  requests,

  visitedId,
  isVisitorMode,
  onVisit,
  onDelete,
  onAccept,
  onReject,
  onClose,
  onToggle,
}: FollowSidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [activeFollowMenuId, setActiveFollowMenuId] = useState<number | null>(null);

  return (
    <motion.div
      ref={sidebarRef}
      className="absolute top-0 right-0 h-full w-[350px] bg-white/20 backdrop-blur-2xl border-l border-white/40 shadow-2xl z-40 flex flex-col"
      initial={false}
      animate={{ x: isOpen ? 0 : 350 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      drag="x"
      dragConstraints={{ left: 0, right: 350 }}
      dragElastic={0.05}
      onDragEnd={(_e, info) => {
        if (info.offset.x > 50 || info.velocity.x > 500) {
          onClose();
        }
      }}
    >
      {/* 당기기 탭 (열기/닫기 토글) */}
      <button
        onClick={onToggle || onClose}
        className="absolute -left-[70px] top-1/2 -translate-y-1/2 w-[70px] h-32 bg-white/10 backdrop-blur-3xl border border-r-0 border-white/40 rounded-l-3xl shadow-2xl flex items-center justify-center hover:bg-white/30 transition-all duration-500 group"
      >
        <motion.div
          animate={{ rotate: isOpen ? 0 : 0, scale: isOpen ? 1 : 1.1 }}
          className="flex flex-col items-center gap-1"
        >
          {isOpen ? (
            <ChevronRight className="w-8 h-8 text-white/80 group-hover:text-white" />
          ) : (
            <Users className="w-7 h-7 text-white/80 group-hover:text-white" />
          )}
        </motion.div>
      </button>

      {/* 사이드바 내용 */}
      <div className="p-6 pb-4 flex flex-col gap-5 border-b border-white/30">
        <div className="relative w-full mt-2">
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/40 border border-white/50 rounded-full py-2.5 pl-4 pr-10 text-sm text-gray-800 placeholder-gray-500 outline-none focus:bg-white/60 transition shadow-sm"
          />
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        </div>

        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            {sidebarView === 'requests' ? (
              <>
                <button
                  onClick={() => {
                    setSidebarView('following');
                    setActiveFollowMenuId(null);
                  }}
                  className="mr-1 p-1 hover:bg-white/40 rounded-full transition"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-700" />
                </button>
                <UserPlus className="w-6 h-6 text-pink-500" /> 팔로우 요청
              </>
            ) : (
              <div className="flex gap-4">
                <button
                  onClick={() => setSidebarView('following')}
                  className={`text-lg transition-all ${sidebarView === 'following' ? 'text-pink-500 border-b-2 border-pink-500' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  팔로잉
                </button>
                <button
                  onClick={() => setSidebarView('followers')}
                  className={`text-lg transition-all ${sidebarView === 'followers' ? 'text-pink-500 border-b-2 border-pink-500' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  팔로워
                </button>
              </div>
            )}
          </h2>

          <button
            onClick={() => {
              if (sidebarView === 'requests') {
                setSidebarView('following');
                setActiveFollowMenuId(null);
              } else {
                onClose();
              }
            }}
            className="p-2 hover:bg-white/40 rounded-full transition"
          >
            <X className="w-5 h-5 text-gray-700" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {sidebarView !== 'requests' ? (
          <>
            <button
              onClick={() => {
                setSidebarView('requests');
                setActiveFollowMenuId(null);
              }}
              className="w-full flex items-center justify-between p-3 px-2 rounded-2xl hover:bg-white/30 transition border border-transparent hover:border-white/40 text-left cursor-pointer bg-white/10 mb-2"
            >
              <span className="text-gray-700 font-semibold text-sm">
                새로운 팔로우 요청 {requests.length}건
              </span>
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>

            <div className="flex flex-col gap-2">
              {/* 1. 현재 탭 (팔로잉/팔로워) 검색 결과 */}
              {follows
                .filter((f) => (sidebarView === 'following' ? f.isFollowing : f.isFollower))
                .filter((f) => {
                  const lowerQuery = searchQuery.toLowerCase();
                  return (
                    f.name.toLowerCase().includes(lowerQuery) ||
                    f.email.toLowerCase().includes(lowerQuery)
                  );
                })
                .map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between p-2 hover:bg-white/30 rounded-2xl transition group"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full ${f.color} flex items-center justify-center shadow-inner`}
                      >
                        <span className="text-xs font-bold text-gray-700">{f.profileExp}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-gray-800 font-bold text-sm leading-tight">
                          {f.name}
                        </span>
                        <span className="text-gray-500 text-[10px] leading-tight">{f.email}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {isVisitorMode && visitedId === f.id ? (
                        <div className="px-3 py-1.5 bg-pink-50/80 text-pink-600 text-[11px] font-bold rounded-lg border border-pink-200 flex items-center gap-1.5 shadow-sm">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500"></span>
                          </span>
                          방문 중
                        </div>
                      ) : (
                        <button
                          onClick={() => onVisit(f.id)}
                          className="px-3 py-1.5 bg-white shadow-sm border border-gray-100 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-lg transition"
                        >
                          방문
                        </button>
                      )}

                      <div className="relative">
                        <button
                          onClick={() =>
                            setActiveFollowMenuId((prev) => (prev === f.id ? null : f.id))
                          }
                          className="p-1 px-1.5 hover:bg-white/50 rounded-md text-gray-500 hover:text-gray-800 transition outline-none"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {activeFollowMenuId === f.id && (
                          <div className="absolute right-0 top-full mt-1 w-24 bg-white/95 backdrop-blur-md border border-gray-100 rounded-xl shadow-lg z-50 overflow-hidden text-[13px] animate-in slide-in-from-top-2 fade-in">
                            <button
                              onClick={() => {
                                onDelete(f.id);
                                setActiveFollowMenuId(null);
                              }}
                              className="w-full text-left px-4 py-2 text-red-500 font-semibold hover:bg-red-50 transition"
                            >
                              삭제
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

              {/* 2. 전역 사용자 검색 결과 (팔로잉/팔로워 목록에 없는 사람) */}
              {searchQuery.trim() && (
                <>
                  <div className="h-px bg-white/20 my-4" />
                  <div className="px-2 mb-2 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    새로운 사람 검색 결과
                  </div>
                  {allUsers
                    .filter((u) => {
                      // 현재 팔로우 목록에 없는 사람만 필터링
                      const isAlreadyInFollows = follows.some((f) => f.id === u.id);
                      const lowerQuery = searchQuery.toLowerCase();
                      const matches =
                        u.name.toLowerCase().includes(lowerQuery) ||
                        u.email.toLowerCase().includes(lowerQuery);
                      return !isAlreadyInFollows && matches;
                    })
                    .map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between p-2 hover:bg-white/20 rounded-2xl transition group border border-transparent hover:border-white/30"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-full ${u.color} flex items-center justify-center opacity-80`}
                          >
                            <span className="text-xs font-bold text-gray-600">{u.profileExp}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-gray-700 font-bold text-sm leading-tight">
                              {u.name}
                            </span>
                            <span className="text-gray-500 text-[10px] leading-tight">
                              {u.email}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => onVisit(u.id)}
                            className="px-3 py-1.5 bg-white/40 hover:bg-white/60 text-gray-600 text-xs font-bold rounded-lg transition"
                          >
                            방문
                          </button>
                          <button className="p-1.5 bg-blue-400 hover:bg-blue-500 text-white rounded-lg transition shadow-sm">
                            <UserPlus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  {allUsers.filter((u) => {
                    const isAlreadyInFollows = follows.some((f) => f.id === u.id);
                    const lowerQuery = searchQuery.toLowerCase();
                    return (
                      !isAlreadyInFollows &&
                      (u.name.toLowerCase().includes(lowerQuery) ||
                        u.email.toLowerCase().includes(lowerQuery))
                    );
                  }).length === 0 && (
                    <div className="text-center text-xs text-gray-400 py-4 italic">
                      일치하는 새로운 사용자가 없습니다.
                    </div>
                  )}
                </>
              )}

              {follows.filter((f) => {
                const lowerQuery = searchQuery.toLowerCase();
                return (
                  (sidebarView === 'following' ? f.isFollowing : f.isFollower) &&
                  (f.name.toLowerCase().includes(lowerQuery) ||
                    f.email.toLowerCase().includes(lowerQuery))
                );
              }).length === 0 &&
                !searchQuery.trim() && (
                  <div className="text-center text-sm text-gray-500 py-6">
                    검색된 팔로우가 없어요.
                  </div>
                )}
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-2">
            {requests.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between p-2 hover:bg-white/30 rounded-2xl transition"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full ${req.color} flex items-center justify-center shadow-inner`}
                  >
                    <span className="text-xs font-bold text-gray-700">{req.profileExp}</span>
                  </div>
                  <span className="text-gray-800 font-medium text-sm">{req.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onAccept(req.id, req.name)}
                    className="px-3 py-1.5 bg-pink-100 hover:bg-pink-200 text-pink-700 text-xs font-semibold rounded-lg shadow-sm transition"
                  >
                    수락
                  </button>
                  <button
                    onClick={() => onReject(req.id)}
                    className="px-3 py-1.5 bg-white shadow-sm border border-gray-100 hover:bg-gray-50 text-gray-500 text-xs font-semibold rounded-lg transition"
                  >
                    거절
                  </button>
                </div>
              </div>
            ))}
            {requests.length === 0 && (
              <div className="text-center text-sm text-gray-500 py-6">
                새로운 팔로우 요청이 없어요.
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
