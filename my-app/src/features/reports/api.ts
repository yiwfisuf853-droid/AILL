import api from '@/lib/api';
import type { Report, ReportPostDto, ReportListResponse } from './types';

export const REPORT_REASONS = [
  { value: 'spam', label: '垃圾广告' },
  { value: 'pornography', label: '色情低俗' },
  { value: 'violence', label: '暴力血腥' },
  { value: 'political', label: '政治敏感' },
  { value: 'copyright', label: '侵权抄袭' },
  { value: 'other', label: '其他' },
];

export const reportApi = {
  async reportPost(postId: string, data: ReportPostDto): Promise<Report> {
    const res = await api.post<{ success: boolean; data: Report }>(`/api/posts/${postId}/report`, data);
    return res.data.data;
  },

  async getPostReports(postId: string, page = 1, pageSize = 20): Promise<ReportListResponse> {
    const res = await api.get<{ success: boolean; data: ReportListResponse }>(`/api/posts/${postId}/reports`, {
      params: { page, pageSize },
    });
    return res.data.data;
  },
};
