import React from 'react';
import { ChevronRight, X, Users, Search } from 'lucide-react';
import type { Follow, FollowRequest } from '../../../types';
import SidebarAvatar from './SidebarAvatar';

interface FriendsPanelProps {
  friendView: 'main' | 'requests';
  setFriendView: (val: 'main' | 'requests') => void;
  followRequests: FollowRequest[];
  friendTab: 'following' | 'followers';
  setFriendTab: (val: 'following' | 'followers') => void;
  follows: Follow[];
  onVisit: (id: number) => void;
  onDelete: (follow: Follow) => void;
  onAccept: (id: number, name: string) => void;
  onReject: (id: number) => void;
  onSearchOpen: () => void;
}

const FriendsPanel: React.FC<FriendsPanelProps> = ({
  friendView,
  setFriendView,
  followRequests,
  friendTab,
  setFriendTab,
  follows,
  onVisit,
  onDelete,
  onAccept,
  onReject,
  onSearchOpen,
}) => {
  return (
    <div className="flex flex-col h-full bg-white">
      {friendView === 'main' ? (
        <>
          <div
            onClick={onSearchOpen}
            className="mx-4 mb-6 bg-gray-100 rounded-xl flex items-center gap-3 py-3 px-4 cursor-pointer hover:bg-gray-200 transition-colors"
          >
            <Search className="w-5 h-5 text-gray-400 shrink-0" />
            <span className="text-gray-400 font-bold whitespace-nowrap">Search</span>
          </div>

          <div
            className="group flex mx-4 mb-4 items-center justify-between p-4 bg-gray-50 rounded-[28px] border border-gray-100 shadow-sm cursor-pointer hover:bg-gray-100 transition-all"
            onClick={() => setFriendView('requests')}
          >
            <span className="text-lg font-black text-gray-600">
              새로운 팔로우 요청 {followRequests.length}건
            </span>
            <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-rose-500 group-hover:translate-x-1 transition-all" />
          </div>

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

          <div className="flex-1 overflow-y-auto w-full px-4 pt-4 space-y-1">
            {follows.filter((f) => (friendTab === 'following' ? f.isFollowing : f.isFollower)).length > 0 ? (
              follows.filter((f) => (friendTab === 'following' ? f.isFollowing : f.isFollower)).map((f) => (
                <div
                  key={f.id}
                  className="flex items-center gap-4 p-4 hover:bg-white/40 rounded-[20px] transition-all cursor-pointer group/friend"
                  onClick={() => onVisit(f.id)}
                >
                  <SidebarAvatar name={f.name} imageUrl={f.profileImgUrl} />
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-[17px] text-gray-800 leading-tight truncate">
                      {f.name}
                    </p>
                    <p className="text-[11px] text-gray-400 font-bold tracking-tight mt-0.5 truncate">
                      {f.description || '상태 메시지가 없습니다.'}
                    </p>
                  </div>
                  {f.followId ? (
                    <X
                      className="w-5 h-5 text-gray-300 opacity-0 group-hover/friend:opacity-100 hover:text-rose-500 transition-all shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(f);
                      }}
                    />
                  ) : null}
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
                  className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 shadow-sm"
                >
                  <SidebarAvatar name={req.name} />
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-gray-800 text-[15px] truncate">{req.name}</p>
                    <p className="text-[11px] text-gray-400 font-bold mt-0.5">팔로우 요청</p>
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
  );
};

export default FriendsPanel;
