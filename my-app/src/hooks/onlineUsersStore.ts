import { create } from 'zustand';

interface OnlineState {
  onlineUsers: string[];
  setOnlineUsers: (users: string[]) => void;
  isOnline: (userId: string) => boolean;
}

export const useOnlineUsers = create<OnlineState>((set, get) => ({
  onlineUsers: [],
  setOnlineUsers: (users) => set({ onlineUsers: users }),
  isOnline: (userId) => get().onlineUsers.includes(userId),
}));
