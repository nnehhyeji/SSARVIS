import { useEffect, useState } from 'react';

import type { RecentSearchItem } from './SearchPanel';

const RECENT_SEARCHES_KEY = 'sidebar_recent_searches_v1';
const RECENT_SEARCH_LIMIT = 5;

export function useRecentSearches() {
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

  useEffect(() => {
    try {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recentSearches));
    } catch {
      /* ignore storage errors */
    }
  }, [recentSearches]);

  const addRecentSearch = (user: RecentSearchItem) => {
    setRecentSearches((prev) =>
      [user, ...prev.filter((item) => item.id !== user.id)].slice(0, RECENT_SEARCH_LIMIT),
    );
  };

  const removeRecentSearch = (id: number) => {
    setRecentSearches((prev) => prev.filter((item) => item.id !== id));
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
  };

  return {
    recentSearches,
    addRecentSearch,
    removeRecentSearch,
    clearRecentSearches,
  };
}
