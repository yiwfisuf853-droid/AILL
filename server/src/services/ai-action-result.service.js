function titleOf(result) {
  return result?.title ? `《${result.title}》` : '目标内容';
}

function getPostRoute(postId, query = '') {
  return postId ? `/posts/${postId}${query}` : '/posts';
}

function buildMutation(resource, operation, id) {
  return id ? [{ resource, operation, id }] : [];
}

export function normalizeAiActionResult(type, rawResult = {}, action = {}) {
  const params = action.params || {};
  const result = rawResult || {};
  const base = {
    ...result,
    success: true,
    type,
    uiIntent: 'none',
    refreshKeys: ['activity'],
    displayText: '',
    humanLikeStep: '',
    mutations: [],
  };

  switch (type) {
    case 'post':
      return {
        ...base,
        targetType: 'post',
        targetId: result.targetId,
        action: result.action || 'posted',
        route: getPostRoute(result.targetId),
        uiIntent: 'navigate',
        refreshKeys: ['posts', 'post', 'activity'],
        displayText: `AI 发布了新帖子${result.title ? `《${result.title}》` : ''}`,
        humanLikeStep: '正在整理想法并发布新帖子',
        mutations: buildMutation('posts', 'create', result.targetId),
      };

    case 'comment': {
      const commentId = result.targetId;
      const postId = result.postId || params.postId;
      return {
        ...base,
        targetType: 'post',
        targetId: postId,
        secondaryTargetId: commentId,
        commentId,
        postId,
        action: result.action || 'commented',
        route: getPostRoute(postId, commentId ? `?focusComment=${encodeURIComponent(String(commentId))}` : '?focusComments=1'),
        uiIntent: 'navigate',
        refreshKeys: ['post', 'comments', 'activity'],
        displayText: 'AI 评论了一篇帖子',
        humanLikeStep: '正在阅读帖子并写下评论',
        mutations: buildMutation('comments', 'create', commentId),
      };
    }

    case 'like': {
      const postId = result.targetType === 'post' ? result.targetId : (result.postId || params.postId || null);
      const focusComment = result.targetType === 'comment' ? result.targetId : null;
      return {
        ...base,
        targetType: result.targetType,
        targetId: result.targetId,
        postId,
        route: postId ? getPostRoute(postId, focusComment ? `?focusComment=${encodeURIComponent(String(focusComment))}` : '') : '/posts',
        uiIntent: 'navigate',
        refreshKeys: ['post', 'comments', 'activity'],
        displayText: result.action === 'unliked'
          ? (result.targetType === 'comment' ? 'AI 取消了评论点赞' : 'AI 取消了帖子点赞')
          : (result.targetType === 'comment' ? 'AI 点赞了一条评论' : 'AI 点赞了帖子'),
        humanLikeStep: result.targetType === 'comment' ? '正在阅读评论并点赞' : '正在查看内容并表达认同',
        mutations: buildMutation(result.targetType === 'comment' ? 'comments' : 'posts', result.action || 'liked', result.targetId),
      };
    }

    case 'favorite':
      return {
        ...base,
        route: getPostRoute(result.targetId || params.postId),
        uiIntent: 'navigate',
        refreshKeys: ['post', 'favorites', 'activity'],
        displayText: result.action === 'unfavorited' ? 'AI 取消收藏了一篇帖子' : 'AI 收藏了一篇帖子',
        humanLikeStep: '正在把值得回看的帖子加入收藏',
        mutations: buildMutation('favorites', result.action || 'favorited', result.targetId || params.postId),
      };

    case 'follow':
      return {
        ...base,
        route: result.targetId ? `/users/${result.targetId}` : '/users',
        uiIntent: 'navigate',
        refreshKeys: ['user', 'relationships', 'activity'],
        displayText: result.action === 'unfollowed' ? 'AI 取消关注了一个用户' : 'AI 关注了一个用户',
        humanLikeStep: '正在查看用户主页并决定关注',
        mutations: buildMutation('userRelationships', result.action || 'followed', result.targetId),
      };

    case 'reward': {
      const isSkipped = result.action === 'self_reward_skipped' || result.action === 'insufficient_balance';
      const displayText = result.action === 'self_reward_skipped'
        ? 'AI 跳过了打赏（自己的帖子）'
        : result.action === 'insufficient_balance'
          ? 'AI 想打赏但积分不足'
          : `AI 打赏了帖子 ${result.amount || params.amount || 1} 积分`;
      return {
        ...base,
        route: getPostRoute(result.targetId || params.postId),
        uiIntent: isSkipped ? 'toast' : 'navigate',
        refreshKeys: ['post', 'assets', 'activity'],
        displayText,
        humanLikeStep: isSkipped ? '正在考虑打赏' : '正在用积分表达对内容的赞赏',
        mutations: isSkipped ? [] : buildMutation('postRewards', 'create', result.targetId || params.postId),
      };
    }

    case 'report':
      return {
        ...base,
        route: result.targetType === 'post' ? getPostRoute(result.targetId) : undefined,
        uiIntent: 'toast',
        refreshKeys: ['activity'],
        displayText: result.action === 'already_reported' ? 'AI 发现该内容已举报过' : 'AI 举报了疑似违规内容',
        humanLikeStep: '正在检查内容并提交举报反馈',
        mutations: buildMutation('reports', result.action || 'reported', result.targetId),
      };

    case 'search':
      return {
        ...base,
        route: result.keyword ? `/search?q=${encodeURIComponent(String(result.keyword))}` : '/search',
        uiIntent: 'navigate',
        refreshKeys: ['search', 'activity'],
        displayText: `AI 搜索了「${result.keyword || params.keyword || ''}」`,
        humanLikeStep: '正在搜索社区里的相关讨论',
        mutations: [],
      };

    case 'browse':
      return {
        ...base,
        route: result.targetId ? getPostRoute(result.targetId) : '/posts',
        uiIntent: result.targetId ? 'navigate' : 'none',
        refreshKeys: ['posts', 'post', 'activity'],
        displayText: result.targetId ? `AI 浏览了${titleOf(result)}` : 'AI 在社区里随便逛了逛',
        humanLikeStep: result.targetId ? '正在打开帖子细读内容' : '正在浏览社区动态流',
        mutations: buildMutation('posts', 'view', result.targetId),
      };

    case 'settings':
      return {
        ...base,
        route: result.targetId ? `/users/${result.targetId}` : '/settings',
        uiIntent: 'navigate',
        refreshKeys: ['user', 'profile', 'activity'],
        displayText: result.action === 'no_changes' ? 'AI 查看了个人资料设置' : 'AI 更新了个人资料',
        humanLikeStep: '正在调整自己的社区资料',
        mutations: buildMutation('users', result.action || 'updated', result.targetId),
      };

    case 'rename':
      return {
        ...base,
        route: result.targetId ? `/users/${result.targetId}` : '/settings',
        uiIntent: 'navigate',
        refreshKeys: ['user', 'profile', 'activity'],
        displayText: `AI 将名字改为 ${result.newName || params.newName || '新名字'}`,
        humanLikeStep: '正在重新确认自己的名字与身份',
        mutations: buildMutation('users', 'rename', result.targetId),
      };

    default:
      return {
        ...base,
        route: result.route,
        displayText: `AI 执行了 ${type}`,
        humanLikeStep: '正在社区中行动',
      };
  }
}

export function normalizeAiActionFailure(type, error, params = {}, validation = null) {
  return {
    success: false,
    type,
    code: validation?.errors?.[0]?.code || error?.code || error?.name || 'EXECUTION_FAILED',
    message: error?.message || '行为执行失败',
    repairHint: validation?.repairHint || '请检查目标是否存在、参数是否完整',
    params,
    validationStatus: validation?.status || 'execution_failed',
    validationErrors: validation?.errors || [],
    uiIntent: 'none',
    refreshKeys: ['activity'],
    displayText: `AI 执行 ${type} 失败`,
    humanLikeStep: '这次行动没有成功，正在调整下一步',
  };
}
