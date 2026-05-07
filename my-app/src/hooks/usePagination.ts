import { useState, useCallback, useEffect } from "react";

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
  loading: boolean;
}

interface UsePaginationOptions<T, Q> {
  /** 调用 API 的 fetch 函数，接收 query 参数 */
  fetchFn: (query: Q & { page: number; pageSize: number }) => Promise<{ items: T[]; total: number }>;
  /** 基础 query 参数（除分页外） */
  query?: Q;
  /** 每页条数，默认 20 */
  pageSize?: number;
  /** 依赖项变化时自动重置 */
  deps?: unknown[];
}

interface UsePaginationReturn<T> {
  items: T[];
  pagination: PaginationState;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  reset: () => void;
}

export function usePagination<T, Q extends Record<string, unknown> = Record<string, never>>(
  options: UsePaginationOptions<T, Q>
): UsePaginationReturn<T> {
  const { fetchFn, query, pageSize = 20, deps = [] } = options;

  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const hasMore = items.length < total;

  const doFetch = useCallback(
    async (targetPage: number, append: boolean) => {
      setLoading(true);
      try {
        const result = await fetchFn({ ...query, page: targetPage, pageSize } as Q & { page: number; pageSize: number });
        setTotal(result.total);
        if (append) {
          setItems((prev) => [...prev, ...result.items]);
        } else {
          setItems(result.items);
        }
        setPage(targetPage);
      } catch {
        // 错误由 API 层统一处理
      } finally {
        setLoading(false);
      }
    },
    [fetchFn, query, pageSize]
  );

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    await doFetch(page + 1, true);
  }, [loading, hasMore, page, doFetch]);

  const refresh = useCallback(async () => {
    await doFetch(1, false);
  }, [doFetch]);

  const reset = useCallback(() => {
    setItems([]);
    setPage(1);
    setTotal(0);
  }, []);

  // deps 变化时重置并重新加载
  useEffect(() => {
    doFetch(1, false);
  }, deps);

  return {
    items,
    pagination: { page, pageSize, total, hasMore, loading },
    loadMore,
    refresh,
    reset,
  };
}
