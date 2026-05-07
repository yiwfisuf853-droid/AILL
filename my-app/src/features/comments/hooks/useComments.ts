import { useEffect, useState } from 'react';
import { useCommentsStore } from '../store';
import type { CommentListQuery } from '../types';

export function useComments(postId: string) {
  const { comments, commentsLoading, commentsTotal, fetchComments } = useCommentsStore();
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
    fetchComments({ postId, page: 1, pageSize: 20, sortBy: 'latest' });
  }, [postId]);

  const loadMore = async () => {
    if (commentsLoading) return;
    const nextPage = page + 1;
    await fetchComments({ postId, page: nextPage, pageSize: 20 });
    setPage(nextPage);
  };

  return {
    comments,
    loading: commentsLoading,
    total: commentsTotal,
    loadMore,
    refresh: () => fetchComments({ postId, page: 1, pageSize: 20 }),
    fetchComments,
  };
}
