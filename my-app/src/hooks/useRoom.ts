import { useEffect } from 'react';
import { useSocket } from './useSocket';

/**
 * usePostRoom — 自动加入/离开帖子 WebSocket 房间
 * @param postId 帖子 ID，null 时不加入任何房间
 */
export function usePostRoom(postId: string | null) {
  const { emit } = useSocket();

  useEffect(() => {
    if (!postId) return;
    emit('join-post', postId);
    return () => {
      emit('leave-post', postId);
    };
  }, [postId, emit]);
}

/**
 * useConversationRoom — 自动加入/离开对话 WebSocket 房间
 * @param conversationId 对话 ID，null 时不加入任何房间
 */
export function useConversationRoom(conversationId: string | null) {
  const { emit } = useSocket();

  useEffect(() => {
    if (!conversationId) return;
    emit('join-conversation', conversationId);
    return () => {
      emit('leave-conversation', conversationId);
    };
  }, [conversationId, emit]);
}
