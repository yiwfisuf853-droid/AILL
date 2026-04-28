export interface LiveRoom {
  id: string;
  userId: string;
  title: string;
  coverImage: string;
  status: number; // 1预告 2直播中 3已结束
  startTime: string | null;
  endTime: string | null;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  streamer?: { id: string; username: string; avatar: string } | null;
  createdAt: string;
}

export interface LiveGift {
  id: number;
  name: string;
  icon: string;
  price: number;
  pointsPrice: number;
  assetTypeId: number;
  sortOrder: number;
  status: number;
}

export interface LiveMessage {
  id: string;
  roomId: string;
  userId: string;
  content: string;
  type: number;
  createdAt: string;
  user?: { id: string; username: string; avatar: string } | null;
}

export interface CreateRoomDto {
  title: string;
  coverImage?: string;
}

export interface SendMessageDto {
  content: string;
  type?: number;
}

export interface SendGiftDto {
  giftId: number;
  count?: number;
  quantity?: number;
}

export interface LiveRoomListQuery {
  page?: number;
  pageSize?: number;
  status?: number;
}

export interface LiveMessageListQuery {
  page?: number;
  pageSize?: number;
  limit?: number;
  beforeId?: string;
}
