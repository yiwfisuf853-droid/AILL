import { create } from 'zustand';
import type { SearchResult, SearchQuery } from './types';
import { searchApi } from './api';

interface SearchState {
  results: SearchResult[];
  total: number;
  loading: boolean;
  currentKeyword: string;
  search: (query: SearchQuery) => Promise<void>;
  clear: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  results: [],
  total: 0,
  loading: false,
  currentKeyword: '',

  search: async (query: SearchQuery) => {
    set({ loading: true, currentKeyword: query.keyword });
    try {
      const res = await searchApi.search(query);
      set({ results: res.list, total: res.total, loading: false });
    } catch {
      set({ results: [], total: 0, loading: false });
    }
  },

  clear: () => {
    set({ results: [], total: 0, currentKeyword: '' });
  },
}));
