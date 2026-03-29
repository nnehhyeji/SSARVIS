import React from 'react';
import { Search, UserCheck, UserPlus, X } from 'lucide-react';
import type { Follow } from '../../../types';
import SidebarAvatar from './SidebarAvatar';

export type RecentSearchItem = {
  id: number;
  name: string;
  subtitle: string;
  profileImgUrl?: string;
};

interface SearchPanelProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  onSearch: (val: string) => void;
  isSearchLoading: boolean;
  searchResults: Follow[];
  recentSearches: RecentSearchItem[];
  addRecentSearch: (user: RecentSearchItem) => void;
  removeRecentSearch: (id: number) => void;
  persistRecentSearches: (items: RecentSearchItem[]) => void;
  handleRecentSearchClick: (item: RecentSearchItem) => void;
  onVisit: (id: number) => void;
  onAccept: (id: number, name: string) => void;
  onRequest: (id: number, name: string) => void;
  setRecentSearches: React.Dispatch<React.SetStateAction<RecentSearchItem[]>>;
}

const SearchPanel: React.FC<SearchPanelProps> = ({
  searchQuery,
  setSearchQuery,
  onSearch,
  isSearchLoading,
  searchResults,
  recentSearches,
  addRecentSearch,
  removeRecentSearch,
  persistRecentSearches,
  handleRecentSearchClick,
  onVisit,
  onRequest,
  setRecentSearches,
}) => {
  return (
    <div className="px-6 space-y-8 flex flex-col h-full">
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
          <Search className="w-5 h-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            onSearch(e.target.value);
          }}
          className="w-full bg-gray-100 rounded-xl py-3 pl-12 pr-10 text-lg font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition-all shadow-inner"
        />
        <button
          className="absolute right-3 top-1/2 -translate-y-1/2 bg-gray-300 rounded-full p-0.5 hover:bg-gray-400 transition-colors"
          onClick={() => {
            setSearchQuery('');
            onSearch('');
          }}
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
                  onClick={() => {
                    addRecentSearch({
                      id: user.id,
                      name: user.name,
                      subtitle: user.customId || 'user',
                      profileImgUrl: user.profileImgUrl,
                    });
                    onVisit(user.id);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-5 py-4 shadow-sm transition hover:border-gray-200 hover:bg-white cursor-pointer"
                >
                  <SidebarAvatar
                    name={user.name}
                    imageUrl={user.profileImgUrl}
                    sizeClassName="w-12 h-12"
                  />
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="truncate text-[15px] font-black text-gray-800">{user.name}</p>
                    <p className="truncate text-sm font-bold text-gray-500">
                      @{user.customId || 'user'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {user.followStatus === 'REQUESTED' ? (
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-200 text-slate-600">
                        <UserPlus className="h-4 w-4 opacity-60" />
                      </span>
                    ) : user.followStatus === 'FOLLOWING' || user.isFollowing ? (
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                        <UserCheck className="h-4 w-4" />
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          addRecentSearch({
                            id: user.id,
                            name: user.name,
                            subtitle: user.customId || 'user',
                            profileImgUrl: user.profileImgUrl,
                          });
                          onRequest(user.id, user.name);
                        }}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500 text-white transition hover:bg-rose-600"
                        aria-label={`${user.name} 친구 추가`}
                      >
                        <UserPlus className="h-4 w-4" />
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
              onClick={() => {
                setRecentSearches([]);
                persistRecentSearches([]);
              }}
              className="text-sm font-black text-rose-500 hover:text-rose-600"
            >
              모두 지우기
            </button>
          </div>
          <div className="space-y-4">
            {recentSearches.length > 0 ? (
              recentSearches.map((s) => (
                <div key={s.id} className="flex items-center gap-4 group/searchItem">
                  <SidebarAvatar
                    name={s.name}
                    imageUrl={s.profileImgUrl}
                    sizeClassName="w-14 h-14"
                  />
                  <button
                    type="button"
                    onClick={() => handleRecentSearchClick(s)}
                    className="flex-1 text-left"
                  >
                    <p className="font-bold text-gray-800">{s.name}</p>
                    <p className="text-sm text-gray-500">@{s.subtitle}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeRecentSearch(s.id)}
                    className="p-1 hover:bg-gray-100 rounded-full transition-all"
                  >
                    <X className="w-5 h-5 text-gray-300" />
                  </button>
                </div>
              ))
            ) : (
              <div className="flex-1 flex items-center justify-center py-20">
                <p className="text-gray-400 font-bold text-sm">
                  닉네임 또는 커스텀아이디로 검색해보세요.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchPanel;
