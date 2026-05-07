// 热门话题类型定义

export interface HotTopic {
  id: string;
  title: string;
  description?: string;
  heatScore: number;
  status: number;
  createdAt: string;
  updatedAt: string;
}
