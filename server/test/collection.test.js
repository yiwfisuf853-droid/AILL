import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../src/lib/errors.js';

const repoMock = vi.hoisted(() => ({
  rawQuery: vi.fn(),
  insert: vi.fn(),
  findById: vi.fn(),
  findOne: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  hardDelete: vi.fn(),
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

import {
  addPostToCollection,
  addTagToCollection,
  createCollection,
  deleteCollection,
  getCollectionDetail,
  getCollections,
  removePostFromCollection,
  removeTagFromCollection,
  updateCollection,
} from '../src/services/collection.service.js';

function createUser(overrides = {}) {
  return {
    id: 'user-1',
    username: 'author',
    avatar: null,
    ...overrides,
  };
}

function createCollectionRecord(overrides = {}) {
  return {
    id: 'collection-1',
    name: 'My Collection',
    description: 'A test collection',
    coverImage: '',
    userId: 'user-1',
    type: 1,
    visibility: 1,
    postCount: 0,
    createdAt: '2026-05-07T00:00:00.000Z',
    updatedAt: '2026-05-07T00:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

describe('Collection Service 当前架构测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repoMock.findOne.mockResolvedValue(null);
    repoMock.findById.mockResolvedValue(null);
    repoMock.rawQuery.mockResolvedValue({ rows: [] });
  });

  it('createCollection should validate title/user and insert normalized collection', async () => {
    repoMock.findById.mockResolvedValueOnce(createUser({ id: 'user-1' }));
    repoMock.insert.mockImplementationOnce(async (table, data) => ({ ...data }));

    const result = await createCollection({
      name: 'My Collection',
      description: 'A test collection',
      userId: 'user-1',
      coverImage: '/cover.png',
      visibility: 2,
    });

    expect(result.success).toBe(true);
    expect(result.item.name).toBe('My Collection');
    expect(repoMock.insert).toHaveBeenCalledWith('collections', expect.objectContaining({
      name: 'My Collection',
      description: 'A test collection',
      coverImage: '/cover.png',
      userId: 'user-1',
      type: 1,
      visibility: 2,
      postCount: 0,
    }));
  });

  it('createCollection should reject missing title, missing userId, and missing user', async () => {
    await expect(createCollection({ userId: 'user-1' })).rejects.toThrow(ValidationError);
    await expect(createCollection({ name: 'No User' })).rejects.toThrow(ValidationError);

    repoMock.findById.mockResolvedValueOnce(null);
    await expect(createCollection({ name: 'Missing User', userId: 'missing' })).rejects.toThrow(NotFoundError);
  });

  it('getCollections should run paginated deleted-safe SQL and map rows to camelCase', async () => {
    repoMock.rawQuery
      .mockResolvedValueOnce({ rows: [{ total: '2' }] })
      .mockResolvedValueOnce({ rows: [
        { id: 'collection-2', name: 'Second', post_count: 2 },
        { id: 'collection-1', name: 'First', post_count: 1 },
      ] });

    const result = await getCollections({ page: 2, limit: 5 });

    expect(result).toEqual({
      total: 2,
      page: 2,
      limit: 5,
      list: [
        { id: 'collection-2', name: 'Second', postCount: 2 },
        { id: 'collection-1', name: 'First', postCount: 1 },
      ],
    });
    expect(repoMock.rawQuery.mock.calls[0][0]).toContain('c.deleted_at IS NULL');
    expect(repoMock.rawQuery.mock.calls[1][0]).toContain('ORDER BY c.created_at DESC');
    expect(repoMock.rawQuery.mock.calls[1][1]).toEqual([5, 5]);
  });

  it('getCollectionDetail should compose collection, posts, tags, and author', async () => {
    repoMock.rawQuery
      .mockResolvedValueOnce({ rows: [{ id: 'collection-1', name: 'My Collection', user_id: 'user-1' }] })
      .mockResolvedValueOnce({ rows: [
        { id: 'cp-1', collection_id: 'collection-1', post_id: 'post-1', sort_order: 0 },
      ] })
      .mockResolvedValueOnce({ rows: [{ id: 'post-1', title: 'Post Title', deleted_at: null }] })
      .mockResolvedValueOnce({ rows: [{ tag: 'ai' }, { tag: 'design' }] });
    repoMock.findById.mockResolvedValueOnce(createUser({ id: 'user-1', username: 'author' }));

    const detail = await getCollectionDetail('collection-1');

    expect(detail.name).toBe('My Collection');
    expect(detail.posts).toEqual([
      expect.objectContaining({
        id: 'cp-1',
        collectionId: 'collection-1',
        postId: 'post-1',
        post: expect.objectContaining({ id: 'post-1', title: 'Post Title' }),
      }),
    ]);
    expect(detail.tags).toEqual(['ai', 'design']);
    expect(detail.author).toEqual({ id: 'user-1', username: 'author', avatar: null });
  });

  it('getCollectionDetail should throw NotFoundError for missing collection', async () => {
    repoMock.rawQuery.mockResolvedValueOnce({ rows: [] });
    await expect(getCollectionDetail('missing')).rejects.toThrow(NotFoundError);
  });

  it('updateCollection and deleteCollection should delegate to repository safely', async () => {
    repoMock.findOne.mockResolvedValueOnce(createCollectionRecord({ id: 'collection-1' }));
    repoMock.update.mockResolvedValueOnce(createCollectionRecord({ id: 'collection-1', description: 'Updated' }));

    const updated = await updateCollection('collection-1', {
      title: 'Renamed',
      description: 'Updated',
      coverImage: '/new.png',
      status: 1,
      userId: 'attacker',
    });

    expect(updated.success).toBe(true);
    expect(repoMock.update).toHaveBeenCalledWith('collections', 'collection-1', expect.objectContaining({
      title: 'Renamed',
      description: 'Updated',
      coverImage: '/new.png',
      status: 1,
      updatedAt: expect.any(String),
    }));
    expect(repoMock.update.mock.calls[0][2]).not.toHaveProperty('userId');

    repoMock.remove.mockResolvedValueOnce(true);
    await expect(deleteCollection('collection-1')).resolves.toEqual({ success: true });
    expect(repoMock.remove).toHaveBeenCalledWith('collections', 'collection-1');
  });

  it('addPostToCollection should validate collection/post/existing relation and update counters', async () => {
    repoMock.findOne
      .mockResolvedValueOnce(createCollectionRecord({ id: 'collection-1', postCount: 3 }))
      .mockResolvedValueOnce(null);
    repoMock.rawQuery.mockResolvedValueOnce({ rows: [{ id: 'post-1', title: 'Post' }] });
    repoMock.insert.mockImplementationOnce(async (table, data) => ({ ...data }));
    repoMock.increment.mockResolvedValueOnce({ postCount: 4 });
    repoMock.update.mockResolvedValueOnce({});

    const result = await addPostToCollection('collection-1', { postId: 'post-1' });

    expect(result.success).toBe(true);
    expect(result.item.postId).toBe('post-1');
    expect(result.item.sortOrder).toBe(3);
    expect(repoMock.insert).toHaveBeenCalledWith('collection_posts', expect.objectContaining({
      collectionId: 'collection-1',
      postId: 'post-1',
      sortOrder: 3,
    }));
    expect(repoMock.increment).toHaveBeenCalledWith('collections', 'collection-1', 'postCount', 1);
    expect(repoMock.update).toHaveBeenCalledWith('collections', 'collection-1', expect.objectContaining({ updatedAt: expect.any(String) }));
  });

  it('addPostToCollection should reject invalid add cases', async () => {
    await expect(addPostToCollection('collection-1', {})).rejects.toThrow(ValidationError);

    repoMock.findOne.mockResolvedValueOnce(null);
    await expect(addPostToCollection('missing', { postId: 'post-1' })).rejects.toThrow(NotFoundError);

    repoMock.findOne.mockResolvedValueOnce(createCollectionRecord({ id: 'collection-1' }));
    repoMock.rawQuery.mockResolvedValueOnce({ rows: [] });
    await expect(addPostToCollection('collection-1', { postId: 'missing' })).rejects.toThrow(NotFoundError);

    repoMock.findOne
      .mockResolvedValueOnce(createCollectionRecord({ id: 'collection-1' }))
      .mockResolvedValueOnce({ id: 'cp-1' });
    repoMock.rawQuery.mockResolvedValueOnce({ rows: [{ id: 'post-1' }] });
    await expect(addPostToCollection('collection-1', { postId: 'post-1' })).rejects.toThrow(ConflictError);
  });

  it('removePostFromCollection should hard delete relation and decrement collection count when collection exists', async () => {
    repoMock.rawQuery.mockResolvedValueOnce({ rows: [{ id: 'cp-1', collection_id: 'collection-1', post_id: 'post-1' }] });
    repoMock.hardDelete.mockResolvedValueOnce(true);
    repoMock.findById.mockResolvedValueOnce(createCollectionRecord({ id: 'collection-1' }));
    repoMock.increment.mockResolvedValueOnce({ postCount: 0 });
    repoMock.update.mockResolvedValueOnce({});

    const result = await removePostFromCollection('collection-1', 'post-1');

    expect(result).toEqual({ success: true });
    expect(repoMock.hardDelete).toHaveBeenCalledWith('collection_posts', { id: 'cp-1' });
    expect(repoMock.increment).toHaveBeenCalledWith('collections', 'collection-1', 'postCount', -1);
  });

  it('removePostFromCollection should reject when relation does not exist', async () => {
    repoMock.rawQuery.mockResolvedValueOnce({ rows: [] });
    await expect(removePostFromCollection('collection-1', 'missing')).rejects.toThrow(NotFoundError);
  });

  it('addTagToCollection and removeTagFromCollection should manage collection tags', async () => {
    repoMock.findOne
      .mockResolvedValueOnce(createCollectionRecord({ id: 'collection-1' }))
      .mockResolvedValueOnce(null);
    repoMock.insert.mockImplementationOnce(async (table, data) => ({ ...data }));

    const addResult = await addTagToCollection('collection-1', { tag: 'ai' });

    expect(addResult.success).toBe(true);
    expect(addResult.item.tag).toBe('ai');
    expect(repoMock.insert).toHaveBeenCalledWith('collection_tags', expect.objectContaining({
      collectionId: 'collection-1',
      tag: 'ai',
    }));

    repoMock.rawQuery.mockResolvedValueOnce({ rows: [{ id: 'tag-1', collection_id: 'collection-1', tag: 'ai' }] });
    repoMock.hardDelete.mockResolvedValueOnce(true);

    await expect(removeTagFromCollection('collection-1', 'ai')).resolves.toEqual({ success: true });
    expect(repoMock.hardDelete).toHaveBeenCalledWith('collection_tags', { id: 'tag-1' });
  });

  it('tag operations should reject invalid or duplicate cases', async () => {
    await expect(addTagToCollection('collection-1', {})).rejects.toThrow(ValidationError);

    repoMock.findOne.mockResolvedValueOnce(null);
    await expect(addTagToCollection('missing', { tag: 'ai' })).rejects.toThrow(NotFoundError);

    repoMock.findOne
      .mockResolvedValueOnce(createCollectionRecord({ id: 'collection-1' }))
      .mockResolvedValueOnce({ id: 'tag-1' });
    await expect(addTagToCollection('collection-1', { tag: 'ai' })).rejects.toThrow(ConflictError);

    repoMock.rawQuery.mockResolvedValueOnce({ rows: [] });
    await expect(removeTagFromCollection('collection-1', 'missing')).rejects.toThrow(NotFoundError);
  });
});
