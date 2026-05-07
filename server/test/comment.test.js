import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundError } from '../src/lib/errors.js';

const repoMock = vi.hoisted(() => ({
  rawQuery: vi.fn(),
  insert: vi.fn(),
  findById: vi.fn(),
  findOne: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  increment: vi.fn(),
  toCamelCase: vi.fn((row) => {
    if (!row || typeof row !== 'object') return row;
    const output = {};
    for (const [key, value] of Object.entries(row)) {
      output[key.replace(/_([a-z])/g, (_, char) => char.toUpperCase())] = value;
    }
    return output;
  }),
}));

vi.mock('../src/models/repository.js', () => repoMock);
vi.mock('../src/lib/websocket.js', () => ({
  emitNewComment: vi.fn(),
}));
vi.mock('../src/services/notification.service.js', () => ({
  createNotification: vi.fn(() => Promise.resolve()),
}));

import {
  createComment,
  deleteComment,
  getCommentById,
  getCommentList,
  getCommentReplies,
  likeComment,
} from '../src/services/comment.service.js';
import { emitNewComment } from '../src/lib/websocket.js';
import { createNotification } from '../src/services/notification.service.js';

function createPostRecord(overrides = {}) {
  return {
    id: 'post-1',
    authorId: 'post-author',
    title: 'Test Post',
    commentCount: 0,
    deletedAt: null,
    ...overrides,
  };
}

function createCommentRecord(overrides = {}) {
  return {
    id: 'comment-1',
    postId: 'post-1',
    userId: 'user-1',
    parentId: null,
    rootId: null,
    authorId: 'user-1',
    authorName: 'Commenter',
    authorAvatar: null,
    content: 'Great post!',
    images: [],
    likeCount: 0,
    dislikeCount: 0,
    replyCount: 0,
    isAuthor: 0,
    isTop: 0,
    isEssence: 0,
    replyToUserId: null,
    replyToUsername: null,
    createdAt: '2026-05-07T00:00:00.000Z',
    updatedAt: '2026-05-07T00:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

describe('Comment Service 当前架构测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repoMock.findOne.mockResolvedValue(null);
    repoMock.findById.mockResolvedValue(createCommentRecord());
  });

  describe('createComment', () => {
    it('should create root comment, increment post counter, emit socket, and notify post author', async () => {
      repoMock.findById.mockResolvedValueOnce(createPostRecord({ authorId: 'post-author' }));
      repoMock.insert.mockImplementation(async (table, data) => ({ ...data }));
      repoMock.increment.mockResolvedValue({ commentCount: 1 });

      const comment = await createComment({
        postId: 'post-1',
        authorId: 'user-1',
        authorName: 'Commenter',
        content: 'Great post!',
        images: ['/uploads/comment.png'],
      });

      expect(comment.id).toBeDefined();
      expect(comment.postId).toBe('post-1');
      expect(comment.authorId).toBe('user-1');
      expect(comment.images).toEqual(['/uploads/comment.png']);
      expect(comment.isAuthor).toBe(0);
      expect(repoMock.insert).toHaveBeenCalledWith('comments', expect.objectContaining({
        postId: 'post-1',
        authorId: 'user-1',
        userId: 'user-1',
        content: 'Great post!',
        likeCount: 0,
      }));
      expect(repoMock.increment).toHaveBeenCalledWith('posts', 'post-1', 'commentCount', 1);
      expect(emitNewComment).toHaveBeenCalledWith('post-1', expect.objectContaining({ content: 'Great post!' }));
      expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'post-author',
        sourceUserId: 'user-1',
        targetId: 'post-1',
      }));
    });

    it('should mark author comment and avoid self notification', async () => {
      repoMock.findById.mockResolvedValueOnce(createPostRecord({ authorId: 'post-author' }));
      repoMock.insert.mockImplementation(async (table, data) => ({ ...data }));
      repoMock.increment.mockResolvedValue({ commentCount: 1 });

      const comment = await createComment({
        postId: 'post-1',
        authorId: 'post-author',
        authorName: 'PostAuthor',
        content: 'Author reply',
      });

      expect(comment.isAuthor).toBe(1);
      expect(comment.images).toEqual([]);
      expect(createNotification).not.toHaveBeenCalled();
    });

    it('should create reply, preserve reply target, increment parent reply count, and notify replied user', async () => {
      repoMock.findById
        .mockResolvedValueOnce(createCommentRecord({ id: 'parent-1', rootId: 'root-1' }))
        .mockResolvedValueOnce(createPostRecord({ authorId: 'post-author' }));
      repoMock.insert.mockImplementation(async (table, data) => ({ ...data }));
      repoMock.increment.mockResolvedValue({ replyCount: 1 });

      const reply = await createComment({
        postId: 'post-1',
        authorId: 'user-2',
        authorName: 'Replier',
        content: 'Reply comment',
        parentId: 'parent-1',
        replyToUserId: 'user-1',
        replyToUsername: 'Commenter',
      });

      expect(reply.parentId).toBe('parent-1');
      expect(reply.rootId).toBe('root-1');
      expect(reply.replyToUserId).toBe('user-1');
      expect(repoMock.increment).toHaveBeenCalledWith('comments', 'parent-1', 'replyCount', 1);
      expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user-1',
        targetType: 2,
        relatedId: 'post-1',
      }));
    });
  });

  describe('getCommentById/deleteComment', () => {
    it('should return sanitized comment by id', async () => {
      repoMock.findOne.mockResolvedValueOnce(createCommentRecord({ id: 'comment-1', content: 'Find me' }));

      const comment = await getCommentById('comment-1');

      expect(comment.content).toBe('Find me');
      expect(repoMock.findOne).toHaveBeenCalledWith('comments', { id: 'comment-1', deletedAt: null });
    });

    it('should throw NotFoundError for missing comment', async () => {
      repoMock.findOne.mockResolvedValueOnce(null);
      await expect(getCommentById('missing')).rejects.toThrow(NotFoundError);
    });

    it('should delete existing comment through repository remove', async () => {
      repoMock.findById.mockResolvedValueOnce(createCommentRecord({ id: 'comment-1' }));
      repoMock.remove.mockResolvedValueOnce(true);

      await expect(deleteComment('comment-1')).resolves.toBe(true);
      expect(repoMock.remove).toHaveBeenCalledWith('comments', 'comment-1');
    });

    it('should throw NotFoundError when deleting missing comment', async () => {
      repoMock.findById.mockResolvedValueOnce(null);
      await expect(deleteComment('missing')).rejects.toThrow(NotFoundError);
    });
  });

  describe('list/replies SQL behavior', () => {
    it('getCommentList should query root comments with pagination and latest sorting', async () => {
      repoMock.rawQuery
        .mockResolvedValueOnce({ rows: [{ total: '2' }] })
        .mockResolvedValueOnce({ rows: [
          { id: 'comment-2', post_id: 'post-1', content: 'Second', like_count: 2 },
          { id: 'comment-1', post_id: 'post-1', content: 'First', like_count: 1 },
        ] });

      const result = await getCommentList({ postId: 'post-1', page: 1, pageSize: 10, sortBy: 'latest' });

      expect(result.total).toBe(2);
      expect(result.hasMore).toBe(false);
      expect(result.list[0].postId).toBe('post-1');
      expect(repoMock.rawQuery.mock.calls[0][0]).toContain('c.parent_id IS NULL');
      expect(repoMock.rawQuery.mock.calls[1][0]).toContain('ORDER BY c.created_at DESC');
      expect(repoMock.rawQuery.mock.calls[1][1]).toEqual(['post-1', 10, 0]);
    });

    it('getCommentList should support hot sorting', async () => {
      repoMock.rawQuery
        .mockResolvedValueOnce({ rows: [{ total: '1' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'comment-1', post_id: 'post-1', content: 'Hot', like_count: 100 }] });

      await getCommentList({ postId: 'post-1', sortBy: 'hot' });

      expect(repoMock.rawQuery.mock.calls[1][0]).toContain('ORDER BY c.like_count DESC');
    });

    it('getCommentReplies should query child comments in ascending creation order', async () => {
      repoMock.rawQuery
        .mockResolvedValueOnce({ rows: [{ total: '1' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'reply-1', parent_id: 'parent-1', content: 'Reply' }] });

      const result = await getCommentReplies('parent-1', { page: 2, pageSize: 5 });

      expect(result.total).toBe(1);
      expect(result.page).toBe(2);
      expect(repoMock.rawQuery.mock.calls[0][0]).toContain('parent_id = $1');
      expect(repoMock.rawQuery.mock.calls[1][0]).toContain('ORDER BY created_at ASC');
      expect(repoMock.rawQuery.mock.calls[1][1]).toEqual(['parent-1', 5, 5]);
    });
  });

  describe('likeComment', () => {
    it('should add like relationship and increment comment like count', async () => {
      repoMock.findById.mockResolvedValueOnce(createCommentRecord({ id: 'comment-1', likeCount: 0 }));
      repoMock.findOne.mockResolvedValueOnce(null);
      repoMock.increment.mockResolvedValueOnce({ likeCount: 1 });
      repoMock.insert.mockResolvedValueOnce({});

      const result = await likeComment('comment-1', 'user-1');

      expect(result).toEqual({ likeCount: 1, isLiked: true });
      expect(repoMock.insert).toHaveBeenCalledWith('user_relationships', expect.objectContaining({
        type: 4,
        userId: 'user-1',
        targetId: 'comment-1',
      }));
    });

    it('should toggle existing active like relationship', async () => {
      repoMock.findById.mockResolvedValueOnce(createCommentRecord({ id: 'comment-1', likeCount: 1 }));
      repoMock.findOne.mockResolvedValueOnce({ id: 'like-1', deleted: false });
      repoMock.increment.mockResolvedValueOnce({ likeCount: 0 });
      repoMock.update.mockResolvedValueOnce({});

      await expect(likeComment('comment-1', 'user-1')).resolves.toEqual({ likeCount: 0, isLiked: false });
      expect(repoMock.update).toHaveBeenCalledWith('user_relationships', 'like-1', { deleted: true });
    });

    it('should throw NotFoundError for missing comment', async () => {
      repoMock.findById.mockResolvedValueOnce(null);
      await expect(likeComment('missing', 'user-1')).rejects.toThrow(NotFoundError);
    });
  });
});
