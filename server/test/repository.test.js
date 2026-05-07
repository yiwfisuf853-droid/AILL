import { beforeEach, describe, expect, it, vi } from 'vitest';

const pgMock = vi.hoisted(() => ({
  query: vi.fn(),
  testConnection: vi.fn(),
  getClient: vi.fn(),
}));

vi.mock('../src/models/pg.js', () => ({
  default: pgMock,
}));

import {
  findAll,
  insert,
  toCamelCase,
  toSnakeCase,
} from '../src/models/repository.js';

describe('Repository 安全与转换工具', () => {
  beforeEach(() => {
    pgMock.query.mockReset();
  });

  describe('命名转换', () => {
    it('should convert camelCase to snake_case, including acronym boundaries', () => {
      expect(toSnakeCase('createdAt')).toBe('created_at');
      expect(toSnakeCase('apiBaseUrl')).toBe('api_base_url');
      expect(toSnakeCase('registeredAPIKey')).toBe('registered_api_key');
    });

    it('should convert snake_case rows to camelCase objects', () => {
      const result = toCamelCase({
        user_id: 'user-1',
        created_at: '2026-05-07T00:00:00.000Z',
        is_ai: true,
      });

      expect(result).toEqual({
        userId: 'user-1',
        createdAt: '2026-05-07T00:00:00.000Z',
        isAi: true,
      });
    });

    it('should parse JSONB whitelist fields only for known table fields', () => {
      const result = toCamelCase({
        id: 'post-1',
        images: '["/uploads/a.jpg"]',
        tags: '["ai","design"]',
        content: '{"plain":"text should remain string"}',
      }, 'posts');

      expect(result.images).toEqual(['/uploads/a.jpg']);
      expect(result.tags).toEqual(['ai', 'design']);
      expect(result.content).toBe('{"plain":"text should remain string"}');
    });
  });

  describe('查询安全', () => {
    it('should reject unsafe orderBy before executing SQL', async () => {
      await expect(findAll('posts', {
        orderBy: 'created_at DESC; DROP TABLE users; --',
      })).rejects.toThrow('Invalid orderBy');

      expect(pgMock.query).not.toHaveBeenCalled();
    });

    it('should parameterize where values in findAll', async () => {
      pgMock.query
        .mockResolvedValueOnce({ rows: [{ total: '1' }] })
        .mockResolvedValueOnce({
          rows: [{ id: 'post-1', author_id: 'user-1', created_at: '2026-05-07T00:00:00.000Z' }],
        });

      const result = await findAll('posts', {
        where: { authorId: 'user-1' },
        orderBy: 'created_at DESC',
      });

      expect(pgMock.query).toHaveBeenNthCalledWith(
        1,
        'SELECT COUNT(*) as total FROM posts WHERE "author_id" = $1',
        ['user-1']
      );
      expect(pgMock.query).toHaveBeenNthCalledWith(
        2,
        'SELECT * FROM posts WHERE "author_id" = $1 ORDER BY created_at DESC',
        ['user-1']
      );
      expect(result).toEqual([{ id: 'post-1', authorId: 'user-1', createdAt: '2026-05-07T00:00:00.000Z' }]);
    });

    it('should serialize JSONB fields on insert without manual snake_case conversion', async () => {
      pgMock.query.mockResolvedValueOnce({
        rows: [{ id: 'post-1', images: '["/uploads/a.jpg"]', tags: '["ai"]' }],
      });

      const result = await insert('posts', {
        id: 'post-1',
        authorId: 'user-1',
        images: ['/uploads/a.jpg'],
        tags: ['ai'],
      });

      expect(pgMock.query).toHaveBeenCalledWith(
        'INSERT INTO posts ("id", "author_id", "images", "tags") VALUES ($1, $2, $3, $4) RETURNING *',
        ['post-1', 'user-1', '["/uploads/a.jpg"]', '["ai"]']
      );
      expect(result.images).toEqual(['/uploads/a.jpg']);
      expect(result.tags).toEqual(['ai']);
    });
  });
});
