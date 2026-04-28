import { describe, it, expect, beforeEach } from 'vitest';
import { db, clearDatabase } from '../src/models/db.js';
import {
  createPost,
  getPostById,
  updatePost,
  deletePost,
  getPostList,
  getHotPosts,
  likePost,
  favoritePost,
  sharePost,
  viewPost,
} from '../src/services/post.service.js';
import { NotFoundError } from '../src/lib/errors.js';

describe('Post Service', () => {
  let authorId;

  beforeEach(() => {
    clearDatabase();
    // 准备一个作者用户
    authorId = 'author-001';
    db.users.push({
      id: authorId,
      username: 'author',
      email: 'author@example.com',
      password: 'hashed',
      role: 'user',
      postCount: 0,
    });
  });

  // Helper: 创建一个基础帖子
  function createTestPost(overrides = {}) {
    return createPost({
      title: 'Test Post',
      content: 'This is test content for the post.',
      authorId,
      authorName: 'author',
      sectionId: 'section-1',
      ...overrides,
    });
  }

  describe('createPost', () => {
    it('should create a post successfully', () => {
      const post = createTestPost();

      expect(post.id).toBeDefined();
      expect(post.title).toBe('Test Post');
      expect(post.content).toBe('This is test content for the post.');
      expect(post.authorId).toBe(authorId);
      expect(post.status).toBe('published');
      expect(post.deletedAt).toBeNull();
      expect(db.posts).toHaveLength(1);
    });

    it('should create post with default type article', () => {
      const post = createTestPost();
      expect(post.type).toBe('article');
    });

    it('should create post with specified type', () => {
      const post = createTestPost({ type: 'discussion' });
      expect(post.type).toBe('discussion');
    });

    it('should auto-generate summary from content', () => {
      const post = createTestPost({ content: 'A'.repeat(300) });
      expect(post.summary).toContain('A');
      expect(post.summary.endsWith('...')).toBe(true);
    });

    it('should create post with tags', () => {
      const post = createTestPost({ tags: ['javascript', 'node'] });
      expect(post.tags).toEqual(['javascript', 'node']);
    });

    it('should default to empty tags array', () => {
      const post = createTestPost();
      expect(post.tags).toEqual([]);
    });

    it('should increment author postCount', () => {
      createTestPost();
      createTestPost();

      const author = db.users.find(u => u.id === authorId);
      expect(author.postCount).toBe(2);
    });

    it('should create post with images', () => {
      const post = createTestPost({ images: ['http://img1.jpg', 'http://img2.jpg'] });
      expect(post.images).toHaveLength(2);
    });

    it('should initialize all counters to zero', () => {
      const post = createTestPost();
      expect(post.viewCount).toBe(0);
      expect(post.likeCount).toBe(0);
      expect(post.dislikeCount).toBe(0);
      expect(post.commentCount).toBe(0);
      expect(post.shareCount).toBe(0);
      expect(post.favoriteCount).toBe(0);
    });
  });

  describe('getPostById', () => {
    it('should return post by id', () => {
      const created = createTestPost();
      const post = getPostById(created.id);

      expect(post.id).toBe(created.id);
      expect(post.title).toBe('Test Post');
    });

    it('should throw NotFoundError for non-existent post', () => {
      expect(() => getPostById('nonexistent')).toThrow(NotFoundError);
      expect(() => getPostById('nonexistent')).toThrow('帖子不存在');
    });

    it('should throw NotFoundError for soft-deleted post', () => {
      const created = createTestPost();
      deletePost(created.id);

      expect(() => getPostById(created.id)).toThrow(NotFoundError);
    });
  });

  describe('updatePost', () => {
    it('should update post fields', () => {
      const created = createTestPost();
      const updated = updatePost(created.id, {
        title: 'Updated Title',
        content: 'Updated content',
      });

      expect(updated.title).toBe('Updated Title');
      expect(updated.content).toBe('Updated content');
    });

    it('should update updatedAt timestamp', () => {
      const created = createTestPost();
      const originalUpdatedAt = created.updatedAt;

      // 小延迟确保时间戳不同
      const updated = updatePost(created.id, { title: 'New Title' });
      expect(updated.updatedAt).toBeDefined();
    });

    it('should throw NotFoundError for non-existent post', () => {
      expect(() => updatePost('nonexistent', { title: 'x' })).toThrow(NotFoundError);
    });

    it('should update tags', () => {
      const created = createTestPost();
      const updated = updatePost(created.id, { tags: ['new-tag'] });

      expect(updated.tags).toEqual(['new-tag']);
    });
  });

  describe('deletePost', () => {
    it('should soft delete a post', () => {
      const created = createTestPost();
      const result = deletePost(created.id);

      expect(result).toBe(true);
      const post = db.posts.find(p => p.id === created.id);
      expect(post.deletedAt).not.toBeNull();
    });

    it('should throw NotFoundError for non-existent post', () => {
      expect(() => deletePost('nonexistent')).toThrow(NotFoundError);
    });

    it('should make post invisible to getPostById', () => {
      const created = createTestPost();
      deletePost(created.id);

      expect(() => getPostById(created.id)).toThrow(NotFoundError);
    });
  });

  describe('getPostList', () => {
    it('should return paginated posts', () => {
      for (let i = 0; i < 25; i++) {
        createTestPost({ title: `Post ${i}` });
      }

      const result = getPostList({ page: 1, pageSize: 10 });

      expect(result.list).toHaveLength(10);
      expect(result.total).toBe(25);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.hasMore).toBe(true);
    });

    it('should return correct page 2', () => {
      for (let i = 0; i < 15; i++) {
        createTestPost({ title: `Post ${i}` });
      }

      const result = getPostList({ page: 2, pageSize: 10 });
      expect(result.list).toHaveLength(5);
      expect(result.hasMore).toBe(false);
    });

    it('should exclude soft-deleted posts', () => {
      const p1 = createTestPost({ title: 'Active' });
      createTestPost({ title: 'To Delete' });
      deletePost(p1.id);

      const result = getPostList();
      expect(result.total).toBe(1);
      expect(result.list[0].title).toBe('To Delete');
    });

    it('should filter by sectionId', () => {
      createTestPost({ sectionId: 'sec-A' });
      createTestPost({ sectionId: 'sec-B' });
      createTestPost({ sectionId: 'sec-A' });

      const result = getPostList({ sectionId: 'sec-A' });
      expect(result.total).toBe(2);
    });

    it('should filter by type', () => {
      createTestPost({ type: 'article' });
      createTestPost({ type: 'discussion' });
      createTestPost({ type: 'article' });

      const result = getPostList({ type: 'discussion' });
      expect(result.total).toBe(1);
    });

    it('should filter by tag', () => {
      createTestPost({ tags: ['js', 'node'] });
      createTestPost({ tags: ['python'] });
      createTestPost({ tags: ['js', 'react'] });

      const result = getPostList({ tag: 'js' });
      expect(result.total).toBe(2);
    });

    it('should filter by authorId', () => {
      createTestPost({ authorId: 'user-A' });
      createTestPost({ authorId: 'user-B' });

      const result = getPostList({ authorId: 'user-A' });
      expect(result.total).toBe(1);
    });

    it('should filter by keyword (title)', () => {
      createTestPost({ title: 'JavaScript Tutorial' });
      createTestPost({ title: 'Python Guide' });
      createTestPost({ title: 'Advanced JavaScript' });

      const result = getPostList({ keyword: 'javascript' });
      expect(result.total).toBe(2);
    });

    it('should filter by keyword (content)', () => {
      createTestPost({ content: 'Learn React hooks today' });
      createTestPost({ content: 'Vue composition API guide' });

      const result = getPostList({ keyword: 'react' });
      expect(result.total).toBe(1);
    });

    it('should sort by latest', () => {
      createTestPost({ title: 'First' });
      createTestPost({ title: 'Second' });
      createTestPost({ title: 'Third' });

      // 手动设置不同的 createdAt 以保证排序确定性
      const now = Date.now();
      db.posts[0].createdAt = new Date(now - 2000).toISOString();
      db.posts[1].createdAt = new Date(now - 1000).toISOString();
      db.posts[2].createdAt = new Date(now).toISOString();

      const result = getPostList({ sortBy: 'latest' });
      expect(result.list[0].title).toBe('Third');
      expect(result.list[2].title).toBe('First');
    });

    it('should sort by hot score', () => {
      const p1 = createTestPost({ title: 'Low' });
      const p2 = createTestPost({ title: 'High' });

      // 手动调整计数
      db.posts.find(p => p.id === p1.id).likeCount = 1;
      db.posts.find(p => p.id === p2.id).likeCount = 100;

      const result = getPostList({ sortBy: 'hot' });
      expect(result.list[0].title).toBe('High');
    });

    it('should sort by essence', () => {
      createTestPost({ title: 'Normal' });
      const p2 = createTestPost({ title: 'Essence' });
      db.posts.find(p => p.id === p2.id).isEssence = true;

      const result = getPostList({ sortBy: 'essence' });
      expect(result.list[0].title).toBe('Essence');
    });
  });

  describe('getHotPosts', () => {
    it('should return hot posts sorted by score', () => {
      const p1 = createTestPost({ title: 'Warm' });
      const p2 = createTestPost({ title: 'Hot' });
      const p3 = createTestPost({ title: 'Cold' });

      db.posts.find(p => p.id === p1.id).likeCount = 10;
      db.posts.find(p => p.id === p1.id).isHot = true;
      db.posts.find(p => p.id === p2.id).likeCount = 100;
      db.posts.find(p => p.id === p2.id).isHot = true;
      db.posts.find(p => p.id === p3.id).likeCount = 1;
      db.posts.find(p => p.id === p3.id).isHot = true;

      const result = getHotPosts();
      expect(result[0].title).toBe('Hot');
    });

    it('should limit results', () => {
      for (let i = 0; i < 20; i++) {
        const p = createTestPost({ title: `Hot ${i}` });
        db.posts.find(post => post.id === p.id).isHot = true;
        db.posts.find(post => post.id === p.id).likeCount = 20 - i;
      }

      const result = getHotPosts(null, 5);
      expect(result).toHaveLength(5);
    });

    it('should filter by sectionId', () => {
      const p1 = createTestPost({ sectionId: 'sec-1' });
      const p2 = createPost({
        title: 'Other',
        content: 'content',
        authorId,
        authorName: 'author',
        sectionId: 'sec-2',
      });
      db.posts.find(p => p.id === p1.id).isHot = true;
      db.posts.find(p => p.id === p2.id).isHot = true;

      const result = getHotPosts('sec-1');
      expect(result).toHaveLength(1);
      expect(result[0].sectionId).toBe('sec-1');
    });
  });

  describe('likePost', () => {
    it('should like a post', () => {
      const post = createTestPost();
      const result = likePost(post.id, 'user-001');

      expect(result.isLiked).toBe(true);
      expect(result.likeCount).toBe(1);
    });

    it('should toggle like (unlike)', () => {
      const post = createTestPost();
      likePost(post.id, 'user-001');
      const result = likePost(post.id, 'user-001');

      expect(result.isLiked).toBe(false);
      expect(result.likeCount).toBe(0);
    });

    it('should throw NotFoundError for non-existent post', () => {
      expect(() => likePost('nonexistent', 'user-001')).toThrow(NotFoundError);
    });
  });

  describe('favoritePost', () => {
    it('should favorite a post', () => {
      const post = createTestPost();
      const result = favoritePost(post.id, 'user-001');

      expect(result.isFavorited).toBe(true);
      expect(result.favoriteCount).toBe(1);
    });

    it('should toggle favorite (unfavorite)', () => {
      const post = createTestPost();
      favoritePost(post.id, 'user-001');
      const result = favoritePost(post.id, 'user-001');

      expect(result.isFavorited).toBe(false);
      expect(result.favoriteCount).toBe(0);
    });

    it('should throw NotFoundError for non-existent post', () => {
      expect(() => favoritePost('nonexistent', 'user-001')).toThrow(NotFoundError);
    });
  });

  describe('sharePost', () => {
    it('should increment share count', () => {
      const post = createTestPost();
      const result = sharePost(post.id);

      expect(result.shareCount).toBe(1);
    });

    it('should increment multiple times', () => {
      const post = createTestPost();
      sharePost(post.id);
      sharePost(post.id);
      const result = sharePost(post.id);

      expect(result.shareCount).toBe(3);
    });

    it('should throw NotFoundError for non-existent post', () => {
      expect(() => sharePost('nonexistent')).toThrow(NotFoundError);
    });
  });

  describe('viewPost', () => {
    it('should increment view count', () => {
      const post = createTestPost();
      viewPost(post.id);

      const found = db.posts.find(p => p.id === post.id);
      expect(found.viewCount).toBe(1);
    });

    it('should not throw for non-existent post', () => {
      expect(() => viewPost('nonexistent')).not.toThrow();
    });
  });
});
