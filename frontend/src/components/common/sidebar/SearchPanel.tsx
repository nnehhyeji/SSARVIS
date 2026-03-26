import React from 'react';
import { Search, X } from 'lucide-react';
import type { Follow } from '../../../types';

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
    <div className="px-8 space-y-8 flex flex-col h-full">
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
                  className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 shadow-sm"
                >
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-white shadow-sm border border-black/5">
                    <img
                      src={
                        user.profileImgUrl ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`
                      }
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-gray-800">{user.name}</p>
                    <p className="truncate text-sm text-gray-500">@{user.customId || 'user'}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        addRecentSearch({
                          id: user.id,
                          name: user.name,
                          subtitle: user.customId || 'user',
                          profileImgUrl: user.profileImgUrl,
                        });
                        onVisit(user.id);
                      }}
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
                        onClick={() => {
                          addRecentSearch({
                            id: user.id,
                            name: user.name,
                            subtitle: user.customId || 'user',
                            profileImgUrl: user.profileImgUrl,
                          });
                          onRequest(user.id, user.name);
                        }}
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
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-white shadow-sm border border-black/5">
                    <img
                      src={
                        s.profileImgUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.id}`
                      }
                      alt={s.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
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
