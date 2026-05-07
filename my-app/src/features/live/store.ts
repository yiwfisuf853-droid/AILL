import { create } from "zustand";
import { liveApi } from "./api";
import type { LiveRoom, LiveGift, LiveRoomStatus } from "./types";

interface LiveState {
  rooms: LiveRoom[];
  gifts: LiveGift[];
  loading: boolean;
  filter: LiveRoomStatus | null;

  setFilter: (status: LiveRoomStatus | null) => void;
  fetchData: (status?: LiveRoomStatus | null) => Promise<void>;
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
      const roomData: any = roomRes;
      const giftData: any = giftRes;
      const roomsList = Array.isArray(roomData?.list) ? roomData.list
        : Array.isArray(roomData?.data?.list) ? roomData.data.list
        : Array.isArray(roomData) ? roomData
        : [];
      const giftsList = Array.isArray(giftData?.list) ? giftData.list
        : Array.isArray(giftData?.data?.list) ? giftData.data.list
        : Array.isArray(giftData) ? giftData
        : [];
      set({ rooms: roomsList, gifts: giftsList, loading: false });
    } catch {
      set({ loading: false });
    }
  },
}));
