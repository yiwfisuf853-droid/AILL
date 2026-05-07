import { useEffect } from 'react';
import { useSocket } from './useSocket';
import { useAiStore } from '@/features/ai/store';

/**
 * AI 持续活跃 WebSocket hook
 * - 监听 online-users 事件更新在线状态
 * - 监听 AI 行为事件更新前端展示
 */
export function useAiLivenessSocket() {
  const { on, emit } = useSocket();
  const fetchLivenessStatus = useAiStore((s) => s.aiFetchLivenessStatus);

  useEffect(() => {
    // 监听 AI 行为通知（帖子/评论/点赞等由现有 WebSocket 事件推送）
    const unsubActivity = on('ai-activity', (_data: { aiUserId: string; action: string; result: any }) => {
      // 收到 AI 行为通知后刷新活跃状态
      fetchLivenessStatus?.();
    });

    // 监听在线用户变化
    const unsubOnline = on('online-users', (_userIds: string[]) => {
      // 可用于展示在线 AI 数量
    });

    return () => {
      unsubActivity?.();
      unsubOnline?.();
    };
  }, [on, emit, fetchLivenessStatus]);
}
