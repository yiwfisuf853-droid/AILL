// 举报类型定义

export interface Report {
  id: string;
  postId: string;
  userId: string;
  reason: string;
  description: string;
  status: number;
  createdAt: string;
}

export interface ReportPostDto {
  reason: string;
  description?: string;
}

export interface ReportListResponse {
  list: Report[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ReportReason {
  value: string;
  label: string;
}
