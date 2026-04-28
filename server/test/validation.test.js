import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  refreshTokenSchema,
} from '../src/validations/auth.js';
import {
  createPostSchema,
  updatePostSchema,
  postIdSchema,
  postListSchema,
} from '../src/validations/posts.js';
import {
  createCommentSchema,
  commentListSchema,
} from '../src/validations/comments.js';

// Helper: 解析 schema.body
function parseBody(schema, data) {
  return schema.body.parse(data);
}
function parseQuery(schema, data) {
  return schema.query.parse(data);
}
function parseParams(schema, data) {
  return schema.params.parse(data);
}

describe('Validation Schemas', () => {
  // ==================== Auth Schemas ====================
  describe('registerSchema', () => {
    it('should accept valid registration data', () => {
      const result = parseBody(registerSchema, {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result.username).toBe('testuser');
      expect(result.email).toBe('test@example.com');
    });

    it('should reject username shorter than 2 characters', () => {
      expect(() => parseBody(registerSchema, {
        username: 'a',
        email: 'test@example.com',
        password: 'password123',
      })).toThrow(z.ZodError);
    });

    it('should reject username longer than 20 characters', () => {
      expect(() => parseBody(registerSchema, {
        username: 'a'.repeat(21),
        email: 'test@example.com',
        password: 'password123',
      })).toThrow(z.ZodError);
    });

    it('should reject invalid email', () => {
      expect(() => parseBody(registerSchema, {
        username: 'testuser',
        email: 'not-an-email',
        password: 'password123',
      })).toThrow(z.ZodError);
    });

    it('should reject password shorter than 6 characters', () => {
      expect(() => parseBody(registerSchema, {
        username: 'testuser',
        email: 'test@example.com',
        password: '12345',
      })).toThrow(z.ZodError);
    });

    it('should reject password longer than 50 characters', () => {
      expect(() => parseBody(registerSchema, {
        username: 'testuser',
        email: 'test@example.com',
        password: 'a'.repeat(51),
      })).toThrow(z.ZodError);
    });

    it('should reject missing fields', () => {
      expect(() => parseBody(registerSchema, {})).toThrow(z.ZodError);
    });

    it('should reject missing username only', () => {
      expect(() => parseBody(registerSchema, {
        email: 'test@example.com',
        password: 'password123',
      })).toThrow(z.ZodError);
    });
  });

  describe('loginSchema', () => {
    it('should accept valid login data', () => {
      const result = parseBody(loginSchema, {
        username: 'testuser',
        password: 'password123',
      });
      expect(result.username).toBe('testuser');
      expect(result.password).toBe('password123');
    });

    it('should reject empty username', () => {
      expect(() => parseBody(loginSchema, {
        username: '',
        password: 'password123',
      })).toThrow(z.ZodError);
    });

    it('should reject empty password', () => {
      expect(() => parseBody(loginSchema, {
        username: 'testuser',
        password: '',
      })).toThrow(z.ZodError);
    });

    it('should reject missing fields', () => {
      expect(() => parseBody(loginSchema, {})).toThrow(z.ZodError);
    });
  });

  describe('changePasswordSchema', () => {
    it('should accept valid change password data', () => {
      const result = parseBody(changePasswordSchema, {
        oldPassword: 'oldpass123',
        newPassword: 'newpass456',
      });
      expect(result.oldPassword).toBe('oldpass123');
      expect(result.newPassword).toBe('newpass456');
    });

    it('should reject short new password', () => {
      expect(() => parseBody(changePasswordSchema, {
        oldPassword: 'oldpass',
        newPassword: '12345',
      })).toThrow(z.ZodError);
    });
  });

  describe('refreshTokenSchema', () => {
    it('should accept valid refresh token', () => {
      const result = parseBody(refreshTokenSchema, {
        refreshToken: 'some-token-value',
      });
      expect(result.refreshToken).toBe('some-token-value');
    });

    it('should reject empty refresh token', () => {
      expect(() => parseBody(refreshTokenSchema, {
        refreshToken: '',
      })).toThrow(z.ZodError);
    });

    it('should reject missing refresh token', () => {
      expect(() => parseBody(refreshTokenSchema, {})).toThrow(z.ZodError);
    });
  });

  // ==================== Post Schemas ====================
  describe('createPostSchema', () => {
    it('should accept valid post data', () => {
      const result = parseBody(createPostSchema, {
        title: 'My Post Title',
        content: 'This is the content of my post.',
        sectionId: 'section-1',
      });
      expect(result.title).toBe('My Post Title');
      expect(result.content).toBe('This is the content of my post.');
      expect(result.sectionId).toBe('section-1');
    });

    it('should accept post with all optional fields', () => {
      const result = parseBody(createPostSchema, {
        title: 'Full Post',
        content: 'Content here.',
        sectionId: 'section-1',
        type: 'discussion',
        tags: ['javascript', 'node'],
        coverImage: 'http://example.com/cover.jpg',
        authorId: 'author-1',
        authorName: 'Author',
      });
      expect(result.type).toBe('discussion');
      expect(result.tags).toHaveLength(2);
    });

    it('should reject empty title', () => {
      expect(() => parseBody(createPostSchema, {
        title: '',
        content: 'Content',
        sectionId: 'section-1',
      })).toThrow(z.ZodError);
    });

    it('should reject title over 200 chars', () => {
      expect(() => parseBody(createPostSchema, {
        title: 'A'.repeat(201),
        content: 'Content',
        sectionId: 'section-1',
      })).toThrow(z.ZodError);
    });

    it('should reject empty content', () => {
      expect(() => parseBody(createPostSchema, {
        title: 'Title',
        content: '',
        sectionId: 'section-1',
      })).toThrow(z.ZodError);
    });

    it('should reject content over 50000 chars', () => {
      expect(() => parseBody(createPostSchema, {
        title: 'Title',
        content: 'A'.repeat(50001),
        sectionId: 'section-1',
      })).toThrow(z.ZodError);
    });

    it('should reject empty sectionId', () => {
      expect(() => parseBody(createPostSchema, {
        title: 'Title',
        content: 'Content',
        sectionId: '',
      })).toThrow(z.ZodError);
    });

    it('should reject invalid type enum', () => {
      expect(() => parseBody(createPostSchema, {
        title: 'Title',
        content: 'Content',
        sectionId: 'section-1',
        type: 'invalid_type',
      })).toThrow(z.ZodError);
    });

    it('should accept valid type enums', () => {
      const types = ['article', 'discussion', 'question', 'resource', 'showcase'];
      for (const type of types) {
        const result = parseBody(createPostSchema, {
          title: 'Title',
          content: 'Content',
          sectionId: 'section-1',
          type,
        });
        expect(result.type).toBe(type);
      }
    });

    it('should reject more than 5 tags', () => {
      expect(() => parseBody(createPostSchema, {
        title: 'Title',
        content: 'Content',
        sectionId: 'section-1',
        tags: ['a', 'b', 'c', 'd', 'e', 'f'],
      })).toThrow(z.ZodError);
    });

    it('should reject invalid coverImage URL', () => {
      expect(() => parseBody(createPostSchema, {
        title: 'Title',
        content: 'Content',
        sectionId: 'section-1',
        coverImage: 'not-a-url',
      })).toThrow(z.ZodError);
    });

    it('should accept empty string for coverImage', () => {
      const result = parseBody(createPostSchema, {
        title: 'Title',
        content: 'Content',
        sectionId: 'section-1',
        coverImage: '',
      });
      expect(result.coverImage).toBe('');
    });

    it('should reject missing required fields', () => {
      expect(() => parseBody(createPostSchema, {})).toThrow(z.ZodError);
    });
  });

  describe('updatePostSchema', () => {
    it('should accept valid update data', () => {
      const body = parseBody(updatePostSchema, {
        title: 'Updated Title',
        content: 'Updated content',
      });
      expect(body.title).toBe('Updated Title');

      const params = parseParams(updatePostSchema, { id: 'post-123' });
      expect(params.id).toBe('post-123');
    });

    it('should accept partial update', () => {
      const result = parseBody(updatePostSchema, { title: 'New Title' });
      expect(result.title).toBe('New Title');
    });

    it('should reject empty params id', () => {
      expect(() => parseParams(updatePostSchema, { id: '' })).toThrow(z.ZodError);
    });
  });

  describe('postIdSchema', () => {
    it('should accept valid post id', () => {
      const result = parseParams(postIdSchema, { id: 'post-123' });
      expect(result.id).toBe('post-123');
    });

    it('should reject empty id', () => {
      expect(() => parseParams(postIdSchema, { id: '' })).toThrow(z.ZodError);
    });
  });

  describe('postListSchema', () => {
    it('should use default values when no query provided', () => {
      const result = parseQuery(postListSchema, {});
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.sortBy).toBe('hot');
    });

    it('should coerce page and pageSize from strings', () => {
      const result = parseQuery(postListSchema, {
        page: '2',
        pageSize: '50',
      });
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(50);
    });

    it('should reject pageSize over 100', () => {
      expect(() => parseQuery(postListSchema, { pageSize: 101 })).toThrow(z.ZodError);
    });

    it('should reject invalid sortBy enum', () => {
      expect(() => parseQuery(postListSchema, { sortBy: 'invalid' })).toThrow(z.ZodError);
    });

    it('should accept all optional filter params', () => {
      const result = parseQuery(postListSchema, {
        page: 2,
        pageSize: 10,
        sectionId: 'sec-1',
        type: 'article',
        sortBy: 'latest',
        tag: 'javascript',
        authorId: 'author-1',
        keyword: 'search term',
      });
      expect(result.sectionId).toBe('sec-1');
      expect(result.keyword).toBe('search term');
    });
  });

  // ==================== Comment Schemas ====================
  describe('createCommentSchema', () => {
    it('should accept valid comment data', () => {
      const result = parseBody(createCommentSchema, {
        postId: 'post-001',
        authorId: 'author-001',
        content: 'This is a comment.',
      });
      expect(result.postId).toBe('post-001');
      expect(result.authorId).toBe('author-001');
      expect(result.content).toBe('This is a comment.');
    });

    it('should accept comment with all optional fields', () => {
      const result = parseBody(createCommentSchema, {
        postId: 'post-001',
        authorId: 'author-001',
        authorName: 'Commenter',
        authorAvatar: 'http://avatar.jpg',
        content: 'Comment with all fields',
        parentId: 'parent-001',
        replyToUserId: 'user-002',
      });
      expect(result.parentId).toBe('parent-001');
      expect(result.replyToUserId).toBe('user-002');
    });

    it('should reject empty postId', () => {
      expect(() => parseBody(createCommentSchema, {
        postId: '',
        authorId: 'author-001',
        content: 'Comment',
      })).toThrow(z.ZodError);
    });

    it('should reject empty authorId', () => {
      expect(() => parseBody(createCommentSchema, {
        postId: 'post-001',
        authorId: '',
        content: 'Comment',
      })).toThrow(z.ZodError);
    });

    it('should reject empty content', () => {
      expect(() => parseBody(createCommentSchema, {
        postId: 'post-001',
        authorId: 'author-001',
        content: '',
      })).toThrow(z.ZodError);
    });

    it('should reject content over 5000 chars', () => {
      expect(() => parseBody(createCommentSchema, {
        postId: 'post-001',
        authorId: 'author-001',
        content: 'A'.repeat(5001),
      })).toThrow(z.ZodError);
    });

    it('should reject missing required fields', () => {
      expect(() => parseBody(createCommentSchema, {})).toThrow(z.ZodError);
    });
  });

  describe('commentListSchema', () => {
    it('should accept valid query params', () => {
      const result = parseQuery(commentListSchema, {
        postId: 'post-001',
      });
      expect(result.postId).toBe('post-001');
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.sortBy).toBe('latest');
    });

    it('should reject missing postId', () => {
      expect(() => parseQuery(commentListSchema, {})).toThrow(z.ZodError);
    });

    it('should reject empty postId', () => {
      expect(() => parseQuery(commentListSchema, { postId: '' })).toThrow(z.ZodError);
    });

    it('should reject invalid sortBy', () => {
      expect(() => parseQuery(commentListSchema, {
        postId: 'post-001',
        sortBy: 'invalid',
      })).toThrow(z.ZodError);
    });

    it('should accept all valid sortBy values', () => {
      const validSorts = ['latest', 'oldest', 'hot'];
      for (const sortBy of validSorts) {
        const result = parseQuery(commentListSchema, {
          postId: 'post-001',
          sortBy,
        });
        expect(result.sortBy).toBe(sortBy);
      }
    });

    it('should reject pageSize over 100', () => {
      expect(() => parseQuery(commentListSchema, {
        postId: 'post-001',
        pageSize: 101,
      })).toThrow(z.ZodError);
    });
  });
});
