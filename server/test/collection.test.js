import { describe, it, expect, beforeEach } from 'vitest';
import { db, generateId, clearDatabase } from '../src/models/db.js';
import { getCollections, createCollection, addPostToCollection, removePostFromCollection } from '../src/services/collection.service.js';

describe('Collection Service', () => {
  beforeEach(() => {
    clearDatabase();
  });

  it('should create a collection', async () => {
    const result = await createCollection({
      name: 'My Collection',
      description: 'A test collection',
      userId: 'user1',
    });

    expect(result.success).toBe(true);
    expect(result.item.name).toBe('My Collection');
  });

  it('should get collections list', async () => {
    await createCollection({ name: 'Col 1', userId: 'user1' });
    await createCollection({ name: 'Col 2', userId: 'user1' });

    const result = await getCollections();
    expect(result.list).toHaveLength(2);
  });

  it('should add and remove posts from collection', async () => {
    const { item: collection } = await createCollection({ name: 'Test', userId: 'user1' });

    // Add post
    db.posts = [{ id: 'post1', title: 'Test Post', deletedAt: null }];
    const addResult = await addPostToCollection(collection.id, { postId: 'post1' });
    expect(addResult.success).toBe(true);

    // Remove post
    const removeResult = await removePostFromCollection(collection.id, 'post1');
    expect(removeResult.success).toBe(true);
  });

  it('should not create collection without name', async () => {
    await expect(createCollection({ userId: 'user1' }))
      .rejects.toThrow('缺少合集名称');
  });
});
