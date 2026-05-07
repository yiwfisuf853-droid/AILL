import { create } from 'zustand';
import type { SearchResult, UserSearchResult, TagSearchResult, SearchQuery, SearchScope } from './types';
import { searchApi } from './api';

interface SearchState {
  results: SearchResult[];
  userResults: UserSearchResult[];
  tagResults: TagSearchResult[];
  total: number;
  userTotal: number;
  tagTotal: number;
  loading: boolean;
  currentKeyword: string;
  scope: SearchScope;
  search: (query: SearchQuery) => Promise<void>;
  searchUsers: (keyword: string, page?: number) => Promise<void>;
  searchTags: (keyword: string, page?: number) => Promise<void>;
  setScope: (scope: SearchScope) => void;
  clear: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  results: [],
  userResults: [],
  tagResults: [],
  total: 0,
  userTotal: 0,
  tagTotal: 0,
  loading: false,
  currentKeyword: '',
  scope: 'posts',

  setScope: (scope) => set({ scope }),

  search: async (query) => {
    set({ loading: true, currentKeyword: query.keyword });
    try {
      const res = await searchApi.search(query);
      set({ results: res.list, total: res.total, loading: false });
    } catch {
      set({ results: [], total: 0, loading: false });
    }
  },

  searchUsers: async (keyword, page = 1) => {
    set({ loading: true, currentKeyword: keyword });
    try {
      const res = await searchApi.searchUsers(keyword, page);
      set({ userResults: res.list || [], userTotal: res.total || 0, loading: false });
    } catch {
      set({ userResults: [], userTotal: 0, loading: false });
    }
  },

  searchTags: async (keyword, page = 1) => {
    set({ loading: true, currentKeyword: keyword });
    try {
      const res = await searchApi.searchTags(keyword, page);
      set({ tagResults: res.list || [], tagTotal: res.total || 0, loading: false });
    } catch {
      set({ tagResults: [], tagTotal: 0, loading: false });
    }
  },

  clear: () => {
    set({ results: [], userResults: [], tagResults: [], total: 0, userTotal: 0, tagTotal: 0, currentKeyword: '' });
  },
}));
