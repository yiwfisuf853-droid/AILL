import { generateId } from '../lib/id.js';
import * as repo from '../models/repository.js';

// 记录帖子编辑历史
export async function recordEditHistory({ postId, editorId, titleBefore, titleAfter, contentBefore, contentAfter, reason }) {
  const record = {
    id: generateId(),
    postId,
    editorId,
    titleBefore,
    titleAfter,
    contentBefore,
    contentAfter,
    editReason: reason || null,
    createdAt: new Date().toISOString(),
  };

  return repo.insert('post_edit_histories', record);
}

// 获取帖子编辑历史（分页，按 created_at DESC）
export async function getPostEditHistory(postId, { page = 1, limit = 20 } = {}) {
  return repo.findAll('post_edit_histories', {
    where: { postId },
    page,
    limit,
    orderBy: 'created_at DESC',
  });
}
