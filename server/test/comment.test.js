import { describe, it, expect, beforeEach } from 'vitest';
import { db, clearDatabase } from '../src/models/db.js';
import {
  createComment,
  getCommentById,
  getCommentList,
  deleteComment,
  likeComment,
} from '../src/services/comment.service.js';
import { NotFoundError } from '../src/lib/errors.js';

describe('Comment Service', () => {
  let postId, authorId;

  beforeEach(() => {
    clearDatabase();
    authorId = 'commenter-001';
    postId = 'post-001';

    // 准备一篇帖子供评论关联
    db.posts.push({
      id: postId,
      title: 'Test Post',
      content: 'Content',
      authorId: 'post-author',
      authorName: 'PostAuthor',
      commentCount: 0,
      deletedAt: null,
    });
  });

  describe('createComment', () => {
    it('should create a comment successfully', () => {
      const comment = createComment({
        postId,
        authorId,
        authorName: 'Commenter',
        content: 'Great post!',
      });

      expect(comment.id).toBeDefined();
      expect(comment.postId).toBe(postId);
      expect(comment.authorId).toBe(authorId);
      expect(comment.content).toBe('Great post!');
      expect(comment.likeCount).toBe(0);
      expect(comment.deletedAt).toBeNull();
      expect(db.comments).toHaveLength(1);
    });

    it('should set isAuthor to true when commenter is post author', () => {
      const comment = createComment({
        postId,
        authorId: 'post-author', // same as post.authorId
        authorName: 'PostAuthor',
        content: 'Author reply',
      });

      expect(comment.isAuthor).toBe(true);
    });

    it('should set isAuthor to false when commenter is not post author', () => {
      const comment = createComment({
        postId,
        authorId,
        authorName: 'Commenter',
        content: 'Non-author comment',
      });

      expect(comment.isAuthor).toBe(false);
    });

    it('should increment post commentCount', () => {
      createComment({ postId, authorId, authorName: 'User1', content: 'Comment 1' });
      createComment({ postId, authorId, authorName: 'User2', content: 'Comment 2' });

      const post = db.posts.find(p => p.id === postId);
      expect(post.commentCount).toBe(2);
    });

    it('should create comment with parentId (reply)', () => {
      const parent = createComment({
        postId,
        authorId,
        authorName: 'User1',
        content: 'Parent comment',
      });

      const reply = createComment({
        postId,
        authorId: 'user-002',
        authorName: 'User2',
        content: 'Reply comment',
        parentId: parent.id,
      });

      expect(reply.parentId).toBe(parent.id);

      // Parent replyCount should be incremented
      const updatedParent = db.comments.find(c => c.id === parent.id);
      expect(updatedParent.replyCount).toBe(1);
    });

    it('should create comment with images', () => {
      const comment = createComment({
        postId,
        authorId,
        authorName: 'User',
        content: 'Comment with images',
        images: ['http://img1.jpg'],
      });

      expect(comment.images).toEqual(['http://img1.jpg']);
    });

    it('should default images to empty array', () => {
      const comment = createComment({
        postId,
        authorId,
        authorName: 'User',
        content: 'No images',
      });

      expect(comment.images).toEqual([]);
    });

    it('should set replyToUserId when provided', () => {
      const comment = createComment({
        postId,
        authorId,
        authorName: 'User',
        content: 'Reply to someone',
        replyToUserId: 'other-user',
        replyToUsername: 'OtherUser',
      });

      expect(comment.replyToUserId).toBe('other-user');
      expect(comment.replyToUsername).toBe('OtherUser');
    });
  });

  describe('getCommentById', () => {
    it('should return comment by id', () => {
      const created = createComment({
        postId,
        authorId,
        authorName: 'User',
        content: 'Find me',
      });

      const found = getCommentById(created.id);
      expect(found.content).toBe('Find me');
    });

    it('should throw NotFoundError for non-existent comment', () => {
      expect(() => getCommentById('nonexistent')).toThrow(NotFoundError);
    });

    it('should throw NotFoundError for deleted comment', () => {
      const created = createComment({
        postId,
        authorId,
        authorName: 'User',
        content: 'To be deleted',
      });
      deleteComment(created.id);

      expect(() => getCommentById(created.id)).toThrow(NotFoundError);
    });
  });

  describe('getCommentList', () => {
    it('should return comments for a post', () => {
      createComment({ postId, authorId, authorName: 'User1', content: 'C1' });
      createComment({ postId, authorId, authorName: 'User2', content: 'C2' });

      const result = getCommentList({ postId });
      expect(result.list).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should return paginated comments', () => {
      for (let i = 0; i < 15; i++) {
        createComment({ postId, authorId, authorName: `User${i}`, content: `Comment ${i}` });
      }

      const result = getCommentList({ postId, page: 1, pageSize: 10 });
      expect(result.list).toHaveLength(10);
      expect(result.total).toBe(15);
      expect(result.hasMore).toBe(true);
    });

    it('should return page 2 correctly', () => {
      for (let i = 0; i < 12; i++) {
        createComment({ postId, authorId, authorName: `User${i}`, content: `Comment ${i}` });
      }

      const result = getCommentList({ postId, page: 2, pageSize: 10 });
      expect(result.list).toHaveLength(2);
      expect(result.hasMore).toBe(false);
    });

    it('should exclude deleted comments', () => {
      const c1 = createComment({ postId, authorId, authorName: 'User', content: 'Active' });
      createComment({ postId, authorId, authorName: 'User', content: 'ToDelete' });
      deleteComment(c1.id);

      const result = getCommentList({ postId });
      expect(result.total).toBe(1);
      expect(result.list[0].content).toBe('ToDelete');
    });

    it('should only return root comments (no parentId)', () => {
      const parent = createComment({ postId, authorId, authorName: 'User', content: 'Parent' });
      createComment({
        postId,
        authorId: 'user-002',
        authorName: 'User2',
        content: 'Reply',
        parentId: parent.id,
      });

      const result = getCommentList({ postId });
      // Only root comments (no parentId)
      expect(result.total).toBe(1);
      expect(result.list[0].content).toBe('Parent');
    });

    it('should not return comments from other posts', () => {
      createComment({ postId, authorId, authorName: 'User', content: 'For post 1' });

      // 另一个帖子
      db.posts.push({ id: 'post-002', title: 'Other', commentCount: 0, deletedAt: null });
      createComment({ postId: 'post-002', authorId, authorName: 'User', content: 'For post 2' });

      const result = getCommentList({ postId });
      expect(result.total).toBe(1);
    });

    it('should sort by latest', () => {
      createComment({ postId, authorId, authorName: 'User', content: 'First' });
      createComment({ postId, authorId, authorName: 'User', content: 'Second' });

      // 手动设置不同的 createdAt 以保证排序确定性
      const now = Date.now();
      db.comments[0].createdAt = new Date(now - 1000).toISOString();
      db.comments[1].createdAt = new Date(now).toISOString();

      const result = getCommentList({ postId, sortBy: 'latest' });
      expect(result.list[0].content).toBe('Second');
      expect(result.list[1].content).toBe('First');
    });

    it('should sort by hot (likeCount)', () => {
      const c1 = createComment({ postId, authorId, authorName: 'User', content: 'Low' });
      const c2 = createComment({ postId, authorId, authorName: 'User', content: 'High' });

      db.comments.find(c => c.id === c1.id).likeCount = 5;
      db.comments.find(c => c.id === c2.id).likeCount = 100;

      const result = getCommentList({ postId, sortBy: 'hot' });
      expect(result.list[0].content).toBe('High');
    });

    it('should return empty list for post with no comments', () => {
      const result = getCommentList({ postId: 'nonexistent' });
      expect(result.list).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('deleteComment', () => {
    it('should soft delete a comment', () => {
      const comment = createComment({
        postId,
        authorId,
        authorName: 'User',
        content: 'Delete me',
      });

      const result = deleteComment(comment.id);
      expect(result).toBe(true);

      const found = db.comments.find(c => c.id === comment.id);
      expect(found.deletedAt).not.toBeNull();
    });

    it('should throw NotFoundError for non-existent comment', () => {
      expect(() => deleteComment('nonexistent')).toThrow(NotFoundError);
    });
  });

  describe('likeComment', () => {
    it('should like a comment', () => {
      const comment = createComment({
        postId,
        authorId,
        authorName: 'User',
        content: 'Like me',
      });

      const result = likeComment(comment.id, 'liker-001');
      expect(result.isLiked).toBe(true);
      expect(result.likeCount).toBe(1);
    });

    it('should toggle like (unlike)', () => {
      const comment = createComment({
        postId,
        authorId,
        authorName: 'User',
        content: 'Toggle like',
      });

      likeComment(comment.id, 'liker-001');
      const result = likeComment(comment.id, 'liker-001');

      expect(result.isLiked).toBe(false);
      expect(result.likeCount).toBe(0);
    });

    it('should allow different users to like independently', () => {
      const comment = createComment({
        postId,
        authorId,
        authorName: 'User',
        content: 'Multi like',
      });

      likeComment(comment.id, 'liker-001');
      const result = likeComment(comment.id, 'liker-002');

      expect(result.likeCount).toBe(2);
    });

    it('should throw NotFoundError for non-existent comment', () => {
      expect(() => likeComment('nonexistent', 'user-001')).toThrow(NotFoundError);
    });
  });
});
