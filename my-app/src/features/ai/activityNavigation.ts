import type { AiAction, AiActivity, LegacyAiActivity } from '@/features/ai/store';

type AiActivityLike = AiActivity | LegacyAiActivity;

function getStringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function getPostRoute(postId: unknown, query = ''): string | null {
  const normalizedPostId = getStringValue(postId);
  return normalizedPostId ? `/posts/${normalizedPostId}${query}` : null;
}

export function normalizeAiActivityActions(activity: AiActivityLike | null | undefined): AiAction[] {
  if (!activity) return [];
  if (Array.isArray(activity.actions) && activity.actions.length > 0) return activity.actions;

  const legacyActivity = activity as LegacyAiActivity;
  const type = String(legacyActivity.type || legacyActivity.actionType || '').toLowerCase();
  if (!type) return [];

  const result = legacyActivity.result ?? {
    targetType: legacyActivity.targetType || legacyActivity.target?.type,
    targetId: legacyActivity.targetId || legacyActivity.postId || legacyActivity.target?.id,
    postId: legacyActivity.postId,
    keyword: legacyActivity.keyword,
  };

  return [{
    type,
    success: legacyActivity.success ?? true,
    result,
  }];
}

export function getAiActivityNavigationTarget(activity: AiActivityLike | null | undefined): string | null {
  const actions = normalizeAiActivityActions(activity);

  for (const action of actions) {
    const type = String(action.type || '').toLowerCase();
    const success = action.success !== false;
    const result = action.result;
    if (!result) continue;

    const explicitRoute = getStringValue(result.route);
    if (explicitRoute && result.uiIntent !== 'none') return explicitRoute;

    const targetId = getStringValue(result.targetId);
    const postId = getStringValue(result.postId);
    const commentId = getStringValue(result.commentId || result.secondaryTargetId);
    const keyword = getStringValue(result.keyword);

    if (type === 'browse') return getPostRoute(targetId) || getPostRoute(postId);
    if (type === 'search' && keyword) return `/search?q=${encodeURIComponent(keyword)}`;
    if (type === 'post' && success) return getPostRoute(targetId);
    if (type === 'comment' && success) {
      const route = getPostRoute(postId || targetId, commentId ? `?focusComment=${encodeURIComponent(commentId)}` : '?focusComments=1');
      if (route) return route;
    }
    if (type === 'like' && success) {
      if (result.targetType === 'comment') return getPostRoute(postId, targetId ? `?focusComment=${encodeURIComponent(targetId)}` : '');
      return getPostRoute(targetId || postId);
    }
    if (type === 'favorite' && success) return getPostRoute(targetId || postId);
    if (type === 'follow' && success && targetId) return `/users/${targetId}`;
    if (type === 'reward' && success) return getPostRoute(targetId || postId);
    if (type === 'report' && success && result.targetType === 'post') return getPostRoute(targetId || postId);
    if ((type === 'settings' || type === 'rename') && success) return targetId ? `/users/${targetId}` : '/settings';
  }

  return null;
}
