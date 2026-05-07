/**
 * OptimisticAction — 乐观更新回滚类型
 * 用于前端乐观更新操作的状态追踪与回滚
 */

/** 乐观操作状态 */
export type OptimisticStatus = 'pending' | 'confirmed' | 'rollback';

/** 乐观操作记录 */
export interface OptimisticAction<T = unknown> {
  /** 唯一标识 */
  id: string;
  /** 操作类型（如 'like', 'follow', 'post'） */
  type: string;
  /** 目标 ID */
  targetId: string;
  /** 操作前的快照数据（用于回滚） */
  previousState: T;
  /** 操作后的预期数据（用于乐观更新） */
  optimisticState: T;
  /** 当前状态 */
  status: OptimisticStatus;
  /** 创建时间 */
  createdAt: number;
}

/** 乐观操作管理器接口 */
export interface OptimisticActionManager<T = unknown> {
  /** 创建乐观操作 */
  create: (type: string, targetId: string, previousState: T, optimisticState: T) => OptimisticAction<T>;
  /** 确认操作成功 */
  confirm: (id: string) => void;
  /** 回滚操作 */
  rollback: (id: string) => T;
  /** 获取待确认的操作 */
  getPending: () => OptimisticAction<T>[];
  /** 清理已确认/已回滚的操作 */
  cleanup: (maxAge?: number) => void;
}

/**
 * 创建乐观操作管理器
 * @param onRollback 回滚回调
 */
export function createOptimisticManager<T = unknown>(
  onRollback?: (action: OptimisticAction<T>) => void
): OptimisticActionManager<T> {
  const actions = new Map<string, OptimisticAction<T>>();

  return {
    create(type, targetId, previousState, optimisticState) {
      const id = `opt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const action: OptimisticAction<T> = {
        id,
        type,
        targetId,
        previousState,
        optimisticState,
        status: 'pending',
        createdAt: Date.now(),
      };
      actions.set(id, action);
      return action;
    },

    confirm(id) {
      const action = actions.get(id);
      if (action) {
        action.status = 'confirmed';
      }
    },

    rollback(id) {
      const action = actions.get(id);
      if (action) {
        action.status = 'rollback';
        onRollback?.(action);
        return action.previousState;
      }
      throw new Error(`OptimisticAction ${id} not found`);
    },

    getPending() {
      return Array.from(actions.values()).filter((a) => a.status === 'pending');
    },

    cleanup(maxAge = 60_000) {
      const now = Date.now();
      for (const [id, action] of actions) {
        if (action.status !== 'pending' && now - action.createdAt > maxAge) {
          actions.delete(id);
        }
      }
    },
  };
}
