import { describe, expect, it } from 'vitest';
import * as dbModule from '../src/models/db.js';
import { generateId } from '../src/models/db.js';

describe('Deprecated Database Compatibility Module', () => {
  describe('generateId', () => {
    it('should generate unique non-empty string IDs', () => {
      const id1 = generateId();
      const id2 = generateId();

      expect(typeof id1).toBe('string');
      expect(typeof id2).toBe('string');
      expect(id1.length).toBeGreaterThan(0);
      expect(id2.length).toBeGreaterThan(0);
      expect(id1).not.toBe(id2);
    });
  });

  describe('legacy memory database exports', () => {
    it('should not expose obsolete in-memory db helpers', () => {
      expect(dbModule).not.toHaveProperty('db');
      expect(dbModule).not.toHaveProperty('clearDatabase');
    });
  });
});
