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
vi.mock('../src/services/subscription.service.js', () => ({
  notifySubscribersNewPost: vi.fn(() => Promise.resolve()),
}));
vi.mock('../src/services/notification.service.js', () => ({
  createNotification: vi.fn(() => Promise.resolve()),
}));
vi.mock('../src/services/action-trace.service.js', () => ({
  ActionType: { VIEW: 1 },
  recordAction: vi.fn(() => Promise.resolve()),
}));

import {
  createPost,
  deletePost,
  favoritePost,
  getHotPosts,
  getPostById,
  getPostList,
  likePost,
  searchPosts,
  sharePost,
  updatePost,
  viewPost,
} from '../src/services/post.service.js';
import { createNotification } from '../src/services/notification.service.js';
import { notifySubscribersNewPost } from '../src/services/subscription.service.js';
import { recordAction } from '../src/services/action-trace.service.js';

function createPostRecord(overrides = {}) {
  return {
    id: 'post-1',
    title: 'Test Post',
    content: 'This is test content.',
    summary: 'This is test content....',
    coverImage: null,
    images: [],
    type: 1,
    status: 2,
    originalType: 1,
    userId: 'author-1',
    authorId: 'author-1',
    authorName: 'author',
    authorAvatar: null,
    sectionId: 'section-1',
    tags: [],
    viewCount: 0,
    likeCount: 0,
    dislikeCount: 0,
    commentCount: 0,
    shareCount: 0,
    favoriteCount: 0,
    isTop: 0,
    isHot: 0,
    isEssence: 0,
    isRecommended: 0,
    isApiReference: false,
    isAnnouncement: false,
    announcementPriority: 0,
    createdAt: '2026-05-07T00:00:00.000Z',
    updatedAt: '2026-05-07T00:00:00.000Z',
    publishedAt: '2026-05-07T00:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

describe('Post Service 当前架构测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repoMock.findOne.mockResolvedValue(null);
    repoMock.findById.mockResolvedValue(createPostRecord());
  });

  describe('createPost', () => {
    it('should create a published article post with counters and author increment', async () => {
      repoMock.insert.mockImplementation(async (table, data) => ({ ...data }));
      repoMock.increment.mockResolvedValue({ postCount: 1 });
      repoMock.findById.mockResolvedValueOnce({ id: 'author-1', isAi: false });

      const post = await createPost({
        title: 'Test Post',
        content: 'This is test content.',
        authorId: 'author-1',
        authorName: 'author',
        sectionId: 'section-1',
        tags: ['ai', 'design'],
      });

      expect(post.id).toBeDefined();
      expect(post.status).toBe('published');
      expect(post.type).toBe('article');
      expect(post.originalType).toBe('original');
      expect(post.likeCount).toBe(0);
      expect(post.tags).toEqual(['ai', 'design']);
      expect(repoMock.insert).toHaveBeenCalledWith('posts', expect.objectContaining({
        title: 'Test Post',
        status: 'published',
        type: 'article',
        authorId: 'author-1',
      }));
      expect(repoMock.increment).toHaveBeenCalledWith('users', 'author-1', 'postCount', 1);
    });

    it('should insert post_sections and notify subscribers for AI author without blocking creation', async () => {
      repoMock.insert.mockImplementation(async (table, data) => ({ ...data }));
      repoMock.increment.mockResolvedValue({ postCount: 1 });
      repoMock.findById.mockResolvedValueOnce({ id: 'ai-1', isAi: true });

      const post = await createPost({
        title: 'AI Post',
        content: 'AI content.',
        authorId: 'ai-1',
        authorName: 'ai',
        sectionId: 'section-1',
        sectionIds: ['section-1', 'section-2'],
        type: 4,
      });

      expect(post.type).toBe('question');
      expect(repoMock.insert).toHaveBeenCalledWith('post_sections', expect.objectContaining({ sectionId: 'section-1' }));
      expect(repoMock.insert).toHaveBeenCalledWith('post_sections', expect.objectContaining({ sectionId: 'section-2' }));
      expect(notifySubscribersNewPost).toHaveBeenCalledWith('ai-1', post.id);
    });
  });

  describe('getPostById/updatePost/deletePost', () => {
    it('should return sanitized post by id and hide drafts unless allowed', async () => {
      repoMock.findById.mockResolvedValueOnce(createPostRecord({ id: 'post-1', status: 2, type: 2, isHot: 1 }));
      const post = await getPostById('post-1');
      expect(post.status).toBe('published');
      expect(post.type).toBe('video');
      expect(post.isHot).toBe(true);

      repoMock.findById.mockResolvedValueOnce(createPostRecord({ id: 'draft-1', status: 0 }));
      await expect(getPostById('draft-1')).rejects.toThrow(NotFoundError);

      repoMock.findById.mockResolvedValueOnce(createPostRecord({ id: 'draft-1', status: 0 }));
      const draft = await getPostById('draft-1', true);
      expect(draft.status).toBe('draft');
    });

    it('should throw NotFoundError for missing or deleted post', async () => {
      repoMock.findById.mockResolvedValueOnce(null);
      await expect(getPostById('missing')).rejects.toThrow(NotFoundError);

      repoMock.findById.mockResolvedValueOnce(createPostRecord({ deletedAt: '2026-05-07T00:00:00.000Z' }));
      await expect(getPostById('deleted')).rejects.toThrow('帖子不存在');
    });

    it('should update post and reset section relations when sectionIds provided', async () => {
      repoMock.findById.mockResolvedValueOnce(createPostRecord({ id: 'post-1' }));
      repoMock.update.mockResolvedValueOnce(createPostRecord({ id: 'post-1', title: 'Updated Title', type: 4 }));
      repoMock.rawQuery.mockResolvedValueOnce({ rows: [] });
      repoMock.insert.mockResolvedValue({});

      const updated = await updatePost('post-1', {
        title: 'Updated Title',
        sectionIds: ['section-new'],
      });

      expect(updated.title).toBe('Updated Title');
      expect(updated.type).toBe('question');
      expect(repoMock.update).toHaveBeenCalledWith('posts', 'post-1', expect.objectContaining({
        title: 'Updated Title',
        updatedAt: expect.any(String),
      }));
      expect(repoMock.rawQuery).toHaveBeenCalledWith('DELETE FROM post_sections WHERE post_id = $1', ['post-1']);
      expect(repoMock.insert).toHaveBeenCalledWith('post_sections', expect.objectContaining({
        postId: 'post-1',
        sectionId: 'section-new',
      }));
    });

    it('should delete existing post through repository remove', async () => {
      repoMock.findById.mockResolvedValueOnce(createPostRecord({ id: 'post-1' }));
      repoMock.remove.mockResolvedValueOnce(true);

      await expect(deletePost('post-1')).resolves.toBe(true);
      expect(repoMock.remove).toHaveBeenCalledWith('posts', 'post-1');
    });
  });

  describe('list/search/hot SQL behavior', () => {
    it('getPostList should build parameterized filters and default published status', async () => {
      repoMock.rawQuery
        .mockResolvedValueOnce({ rows: [{ total: '1' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'post-1', title: 'AI', content: 'design', status: 2, type: 1, is_hot: 0 }] });

      const result = await getPostList({
        page: 2,
        pageSize: 10,
        sectionId: 'section-1',
        type: 1,
        tag: 'ai',
        keyword: '100%_match',
        sortBy: 'latest',
      });

      expect(result.total).toBe(1);
      expect(result.page).toBe(2);
      expect(result.hasMore).toBe(false);
      expect(repoMock.rawQuery.mock.calls[0][0]).toContain("p.status::text IN ('2', 'published')");
      expect(repoMock.rawQuery.mock.calls[0][1]).toEqual([
        'section-1',
        1,
        JSON.stringify(['ai']),
        '%100\\%\\_match%',
        '%100\\%\\_match%',
      ]);
      expect(repoMock.rawQuery.mock.calls[1][0]).toContain('ORDER BY p.is_announcement DESC');
    });

    it('getHotPosts should require is_hot and support section filter', async () => {
      repoMock.rawQuery.mockResolvedValueOnce({ rows: [{ id: 'hot-1', title: 'Hot', status: 2, type: 1, is_hot: 1 }] });

      const result = await getHotPosts('section-1', 5);

      expect(result[0].isHot).toBe(true);
      expect(repoMock.rawQuery).toHaveBeenCalledWith(
        expect.stringContaining("p.is_hot::text IN ('1', 'true', 't')"),
        ['section-1', 5]
      );
    });

    it('searchPosts should escape LIKE wildcard characters and highlight safely escaped html', async () => {
      repoMock.rawQuery
        .mockResolvedValueOnce({ rows: [{ total: '1' }] })
        .mockResolvedValueOnce({ rows: [{
          id: 'post-1',
          title: '<script>AI</script>',
          content: 'AI content',
          status: 2,
          type: 1,
          is_hot: 0,
        }] });

      const result = await searchPosts({ keyword: 'AI', pageSize: 10 });

      expect(repoMock.rawQuery.mock.calls[0][1]).toEqual(['%AI%', '%AI%']);
      expect(result.list[0].highlightTitle).toBe('&lt;script&gt;<mark>AI</mark>&lt;/script&gt;');
    });
  });

  describe('interactions', () => {
    it('likePost should add like and notify author when liker differs', async () => {
      repoMock.findById
        .mockResolvedValueOnce(createPostRecord({ id: 'post-1', authorId: 'author-1', likeCount: 0 }))
        .mockResolvedValueOnce({ id: 'user-1', username: 'liker' });
      repoMock.findOne.mockResolvedValueOnce(null);
      repoMock.increment.mockResolvedValueOnce({ likeCount: 1 });
      repoMock.insert.mockResolvedValueOnce({});

      const result = await likePost('post-1', 'user-1');

      expect(result).toEqual({ likeCount: 1, isLiked: true });
      expect(repoMock.insert).toHaveBeenCalledWith('user_relationships', expect.objectContaining({
        type: 2,
        userId: 'user-1',
        targetId: 'post-1',
      }));
      expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'author-1',
        sourceUserId: 'user-1',
        targetId: 'post-1',
      }));
    });

    it('likePost and favoritePost should toggle existing active relationship', async () => {
      repoMock.findById.mockResolvedValueOnce(createPostRecord({ id: 'post-1', likeCount: 1 }));
      repoMock.findOne.mockResolvedValueOnce({ id: 'like-1', deleted: false });
      repoMock.increment.mockResolvedValueOnce({ likeCount: 0 });
      repoMock.update.mockResolvedValueOnce({});

      await expect(likePost('post-1', 'user-1')).resolves.toEqual({ likeCount: 0, isLiked: false });
      expect(repoMock.update).toHaveBeenCalledWith('user_relationships', 'like-1', { deleted: true });

      repoMock.findById.mockResolvedValueOnce(createPostRecord({ id: 'post-1', favoriteCount: 1 }));
      repoMock.findOne.mockResolvedValueOnce({ id: 'fav-1', deleted: false });
      repoMock.increment.mockResolvedValueOnce({ favoriteCount: 0 });
      repoMock.update.mockResolvedValueOnce({});

      await expect(favoritePost('post-1', 'user-1')).resolves.toEqual({ favoriteCount: 0, isFavorited: false });
    });

    it('favoritePost and sharePost should update counters', async () => {
      repoMock.findById.mockResolvedValueOnce(createPostRecord({ id: 'post-1', favoriteCount: 0 }));
      repoMock.findOne.mockResolvedValueOnce(null);
      repoMock.increment.mockResolvedValueOnce({ favoriteCount: 1 });
      repoMock.insert.mockResolvedValueOnce({});

      await expect(favoritePost('post-1', 'user-1')).resolves.toEqual({ favoriteCount: 1, isFavorited: true });

      repoMock.findById.mockResolvedValueOnce(createPostRecord({ id: 'post-1', shareCount: 0 }));
      repoMock.increment.mockResolvedValueOnce({ shareCount: 1 });
      await expect(sharePost('post-1')).resolves.toEqual({ shareCount: 1 });
    });

    it('viewPost should deduplicate logged-in views and record bounded duration', async () => {
      repoMock.findById.mockResolvedValueOnce(createPostRecord({ id: 'post-1', authorId: 'author-1' }));
      repoMock.rawQuery.mockResolvedValueOnce({ rows: [] });
      repoMock.increment.mockResolvedValueOnce({ viewCount: 1 });

      await viewPost('post-1', 12.8, 'user-1');

      expect(repoMock.increment).toHaveBeenCalledWith('posts', 'post-1', 'viewCount', 1);
      expect(recordAction).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user-1',
        postId: 'post-1',
        targetUserId: 'author-1',
        sessionDuration: 13,
      }));

      repoMock.findById.mockResolvedValueOnce(createPostRecord({ id: 'post-1' }));
      repoMock.rawQuery.mockResolvedValueOnce({ rows: [{ exists: 1 }] });
      await viewPost('post-1', 999999, 'user-1');
      expect(repoMock.increment).toHaveBeenCalledTimes(1);
    });
  });
});
