import { useEffect, useState, useRef } from 'react';
import { usePostsStore } from '../store';
import type { PostListQuery } from '../types';

export function usePosts(query?: PostListQuery) {
  const {
    postList,
    postListLoading,
    postListTotal,
    fetchPostList,
    refreshPostList,
    resetPostList,
  } = usePostsStore();

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [debouncedKeyword, setDebouncedKeyword] = useState(query?.keyword);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // keyword 防抖 300ms
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedKeyword(query?.keyword);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query?.keyword]);

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    resetPostList();
    fetchPostList({ ...query, keyword: debouncedKeyword, page: 1 });
  }, [query?.sectionId, query?.sortBy, query?.type, debouncedKeyword]);

  const loadMore = async () => {
    if (postListLoading) return;
    const nextPage = page + 1;
    await fetchPostList({ ...query, page: nextPage });
    const total = usePostsStore.getState().postListTotal;
    const list = usePostsStore.getState().postList;
    setPage(nextPage);
    setHasMore(list.length < total);
  };

  return {
    posts: postList,
    loading: postListLoading,
    total: postListTotal,
    hasMore,
    loadMore,
    refresh: refreshPostList,
  };
}

export function usePostDetail(id?: string) {
  const { currentPost, currentPostLoading, fetchPostDetail, clearCurrentPost } = usePostsStore();

  useEffect(() => {
    if (id) {
      fetchPostDetail(id);
    }
    return () => {
      clearCurrentPost();
    };
  }, [id]);

  return {
    post: currentPost,
    loading: currentPostLoading,
  };
}

export function useHotPosts(sectionId?: string) {
  const { hotPosts, hotPostsLoading, fetchHotPosts } = usePostsStore();

  useEffect(() => {
    fetchHotPosts(sectionId);
  }, [sectionId]);

  return {
    posts: hotPosts,
    loading: hotPostsLoading,
  };
}
