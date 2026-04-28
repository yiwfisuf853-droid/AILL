import { create } from "zustand";
import { liveApi } from "./api";
import type { LiveRoom, LiveGift } from "./types";

interface LiveState {
  rooms: LiveRoom[];
  gifts: LiveGift[];
  loading: boolean;
  filter: number | null;

  setFilter: (status: number | null) => void;
  fetchData: (status?: number | null) => Promise<void>;
}

export const useLiveStore = create<LiveState>((set, get) => ({
  rooms: [],
  gifts: [],
  loading: false,
  filter: null,

  setFilter: (status) => {
    set({ filter: status });
    get().fetchData(status);
  },

  fetchData: async (status) => {
    set({ loading: true });
    try {
      const [roomRes, giftRes] = await Promise.all([
        liveApi.getRooms(status ? { status } : {}),
        liveApi.getGifts(),
      ]);
      set({ rooms: roomRes.list || [], gifts: giftRes.list || [], loading: false });
    } catch {
      set({ loading: false });
    }
  },
}));
