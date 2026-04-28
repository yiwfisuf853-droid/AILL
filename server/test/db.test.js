import { describe, it, expect, beforeEach } from 'vitest';
import { db, generateId, clearDatabase } from '../src/models/db.js';

describe('Database Model', () => {
  beforeEach(() => {
    clearDatabase();
  });

  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });

    it('should generate string IDs', () => {
      const id = generateId();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });
  });

  describe('db operations', () => {
    it('should initialize with empty arrays', () => {
      expect(db.users).toEqual([]);
      expect(db.posts).toEqual([]);
      expect(db.comments).toEqual([]);
    });

    it('should support push operations', () => {
      db.users.push({ id: '1', username: 'test' });
      expect(db.users).toHaveLength(1);
      expect(db.users[0].username).toBe('test');
    });

    it('should support find operations', () => {
      db.users.push({ id: '1', username: 'test' });
      db.users.push({ id: '2', username: 'admin' });
      const found = db.users.find(u => u.username === 'admin');
      expect(found.id).toBe('2');
    });

    it('should support filter operations', () => {
      db.posts.push({ id: '1', status: 'published', deletedAt: null });
      db.posts.push({ id: '2', status: 'draft', deletedAt: null });
      db.posts.push({ id: '3', status: 'published', deletedAt: '2026-01-01' });
      const active = db.posts.filter(p => p.status === 'published' && !p.deletedAt);
      expect(active).toHaveLength(1);
    });
  });

  describe('clearDatabase', () => {
    it('should clear all collections', () => {
      db.users.push({ id: '1' });
      db.posts.push({ id: '1' });
      clearDatabase();
      expect(db.users).toEqual([]);
      expect(db.posts).toEqual([]);
    });
  });
});
