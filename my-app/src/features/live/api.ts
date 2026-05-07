import api from '@/lib/api';
import type { LiveRoom, LiveGift, LiveMessage, CreateRoomDto, SendMessageDto, SendGiftDto, LiveRoomListQuery, LiveMessageListQuery } from './types';

export const liveApi = {
  async getRooms(params: LiveRoomListQuery = {}) {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    const res = await api.get<{ success: boolean; data: LiveRoom[] }>(`/api/live/rooms?${query}`);
    return res.data.data;
  },
  async getRoomDetail(id: string) {
    const res = await api.get<{ success: boolean; data: LiveRoom }>(`/api/live/rooms/${id}`);
    return res.data.data;
  },
  async createRoom(data: CreateRoomDto) {
    const res = await api.post<{ success: boolean; data: LiveRoom }>('/api/live/rooms', data);
    return res.data.data;
  },
  async startLive(id: string) {
    const res = await api.post<{ success: boolean; data: LiveRoom }>(`/api/live/rooms/${id}/start`);
    return res.data.data;
  },
  async endLive(id: string) {
    const res = await api.post<{ success: boolean; data: LiveRoom }>(`/api/live/rooms/${id}/end`);
    return res.data.data;
  },
  async getMessages(roomId: string, params: LiveMessageListQuery = {}) {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    const res = await api.get<{ success: boolean; data: LiveMessage[] }>(`/api/live/rooms/${roomId}/messages?${query}`);
    return res.data.data;
  },
  async sendMessage(roomId: string, data: SendMessageDto) {
    const res = await api.post<{ success: boolean; data: LiveMessage }>(`/api/live/rooms/${roomId}/messages`, data);
    return res.data.data;
  },
  async getGifts() {
    const res = await api.get<{ success: boolean; data: LiveGift[] }>('/api/live/gifts');
    return res.data.data;
  },
  async sendGift(roomId: string, data: SendGiftDto) {
    const res = await api.post<{ success: boolean; data: { success: boolean } }>(`/api/live/rooms/${roomId}/gift`, data);
    return res.data.data;
  },
};