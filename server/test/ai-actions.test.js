import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mock repository module used by ai-action-validation.service.js ────────
const repoMock = vi.hoisted(() => ({
  findById: vi.fn(),
}));

vi.mock('../src/models/repository.js', () => repoMock);

// ─── Imports (registry & result don't need repomock, validation does) ─────
import {
  AI_ACTION_REGISTRY,
  buildActionPromptSpec,
  getAiActionBlockLevel,
  getAiActionDefinition,
  getAiActionLockedAreas,
  getSupportedAiActionTypes,
} from '../src/services/ai-action-registry.service.js';

import {
  createRejectedActionResult,
  validateAiAction,
  validateAiActions,
} from '../src/services/ai-action-validation.service.js';

import {
  normalizeAiActionFailure,
  normalizeAiActionResult,
} from '../src/services/ai-action-result.service.js';

// ─── Helpers ────────────────────────────────────────────────────────────────
function buildContext(overrides = {}) {
  return {
    availableTargets: {
      posts: [],
      comments: [],
      users: [],
      sections: [],
    },
    ...overrides,
  };
}

function mockDbTargetExists(targetType, id, exists = true) {
  // The validation service maps targetType to table name and calls repo.findById
  const tableMap = { post: 'posts', comment: 'comments', user: 'users', section: 'sections' };
  const table = tableMap[targetType];
  // The service filters on status, so returned row must be "active"
  if (exists) {
    const row = { id, deletedAt: null, deleted: false };
    if (targetType === 'post') row.status = '2';
    else if (targetType === 'comment') row.status = '1';
    else if (targetType === 'user') row.status = '1';
    else if (targetType === 'section') row.status = '1';
    repoMock.findById.mockResolvedValueOnce(row);
  } else {
    repoMock.findById.mockResolvedValueOnce(null);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  1.  ai-action-registry.service.js
// ══════════════════════════════════════════════════════════════════════════════
describe('AI Action Registry Service', () => {
  describe('getAiActionDefinition', () => {
    it('should return the definition for a valid action type', () => {
      const def = getAiActionDefinition('post');
      expect(def).toBeTruthy();
      expect(def.type).toBe('post');
      expect(def.name).toBe('发帖');
      expect(def.blockLevel).toBe('create');
      expect(def.paramsSchema).toBeTruthy();
    });

    it('should return null for an unsupported action type', () => {
      expect(getAiActionDefinition('unknown_type')).toBeNull();
      expect(getAiActionDefinition('')).toBeNull();
      expect(getAiActionDefinition(null)).toBeNull();
      expect(getAiActionDefinition(undefined)).toBeNull();
    });

    it('should handle case-insensitive input', () => {
      const def = getAiActionDefinition('POST');
      expect(def).not.toBeNull();
      expect(def.type).toBe('post');
    });

    it('should return the correct definition for every registered type', () => {
      for (const type of Object.keys(AI_ACTION_REGISTRY)) {
        const def = getAiActionDefinition(type);
        expect(def).not.toBeNull();
        expect(def.type).toBe(type);
        expect(def.name).toBeTruthy();
        expect(def.description).toBeTruthy();
        expect(def.paramsSchema).toBeTruthy();
        expect(def.promptSpec).toBeTruthy();
        expect(def.frontendIntent).toBeTruthy();
        expect(Array.isArray(def.mutates)).toBe(true);
        expect(Array.isArray(def.lockedAreas)).toBe(true);
      }
    });
  });

  describe('getAiActionBlockLevel', () => {
    it('should return "create" for post and comment', () => {
      expect(getAiActionBlockLevel('post')).toBe('create');
      expect(getAiActionBlockLevel('comment')).toBe('create');
    });

    it('should return "interact" for like, favorite, follow, reward, report', () => {
      for (const type of ['like', 'favorite', 'follow', 'reward', 'report']) {
        expect(getAiActionBlockLevel(type)).toBe('interact', `blockLevel of ${type} should be interact`);
      }
    });

    it('should return "read" for search, browse, settings, rename', () => {
      for (const type of ['search', 'browse', 'settings', 'rename']) {
        expect(getAiActionBlockLevel(type)).toBe('read', `blockLevel of ${type} should be read`);
      }
    });

    it('should default to "read" for unknown types', () => {
      expect(getAiActionBlockLevel('unknown')).toBe('read');
      expect(getAiActionBlockLevel('')).toBe('read');
    });
  });

  describe('getAiActionLockedAreas', () => {
    it('should return an array for valid types', () => {
      const areas = getAiActionLockedAreas('post');
      expect(Array.isArray(areas)).toBe(true);
      expect(areas).toContain('compose');
      expect(areas).toContain('comment');
    });

    it('should return empty array for read-level actions', () => {
      expect(getAiActionLockedAreas('search')).toEqual([]);
      expect(getAiActionLockedAreas('browse')).toEqual([]);
      expect(getAiActionLockedAreas('settings')).toEqual([]);
      expect(getAiActionLockedAreas('rename')).toEqual([]);
    });

    it('should return empty array for unknown types', () => {
      expect(getAiActionLockedAreas('unknown')).toEqual([]);
    });
  });

  describe('getSupportedAiActionTypes', () => {
    it('should return all 11 registered action types', () => {
      const types = getSupportedAiActionTypes();
      expect(types).toHaveLength(11);
      expect(types).toContain('post');
      expect(types).toContain('comment');
      expect(types).toContain('like');
      expect(types).toContain('favorite');
      expect(types).toContain('follow');
      expect(types).toContain('reward');
      expect(types).toContain('report');
      expect(types).toContain('search');
      expect(types).toContain('browse');
      expect(types).toContain('settings');
      expect(types).toContain('rename');
    });
  });

  describe('buildActionPromptSpec', () => {
    it('should return a non-empty string containing all action types', () => {
      const spec = buildActionPromptSpec();
      expect(typeof spec).toBe('string');
      expect(spec.length).toBeGreaterThan(100);
      for (const type of Object.keys(AI_ACTION_REGISTRY)) {
        expect(spec).toContain(type);
      }
    });

    it('should include the name, description, promptSpec, and example for each action', () => {
      const spec = buildActionPromptSpec();
      expect(spec).toContain('### 发帖 (post)');
      expect(spec).toContain('content: string(必填)');
      expect(spec).toContain('目标来源:');
      expect(spec).toContain('示例:');
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
//  2.  ai-action-validation.service.js
// ══════════════════════════════════════════════════════════════════════════════
describe('AI Action Validation Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: all repo.findById calls return null (target not found)
    repoMock.findById.mockResolvedValue(null);
  });

  // ── Basic structural checks ────────────────────────────────────────────
  describe('validateAiAction - structural', () => {
    it('should reject when action.type is missing', async () => {
      const result = await validateAiAction({ params: {} });
      expect(result.status).toBe('rejected');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('MISSING_TYPE');
    });

    it('should reject when action.type is empty string', async () => {
      const result = await validateAiAction({ type: '', params: {} });
      expect(result.status).toBe('rejected');
      expect(result.errors[0].code).toBe('MISSING_TYPE');
    });

    it('should reject an unknown action type', async () => {
      const result = await validateAiAction({ type: 'dance', params: {} });
      expect(result.status).toBe('rejected');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('UNSUPPORTED_ACTION');
    });

    it('should accept a valid post action with all required fields', async () => {
      const result = await validateAiAction({
        type: 'post',
        params: { content: 'Hello world', title: 'My Post' },
      });
      expect(result.status).toBe('accepted');
      expect(result.errors).toHaveLength(0);
      expect(result.normalizedParams.content).toBe('Hello world');
      expect(result.normalizedParams.title).toBe('My Post');
    });

    it('should accept valid minimal post (only content)', async () => {
      const result = await validateAiAction({
        type: 'post',
        params: { content: 'Minimal post' },
      });
      expect(result.status).toBe('accepted');
      expect(result.normalizedParams.content).toBe('Minimal post');
    });

    it('should accept valid comment with postId and content', async () => {
      const ctx = buildContext();
      ctx.availableTargets.posts = [{ id: 'p1' }];
      mockDbTargetExists('post', 'p1');

      const result = await validateAiAction(
        { type: 'comment', params: { postId: 'p1', content: 'Nice!' } },
        { communityContext: ctx },
      );
      expect(result.status).toBe('accepted');
    });

    it('should accept valid search (no context needed)', async () => {
      const result = await validateAiAction({
        type: 'search',
        params: { keyword: 'AI' },
      });
      expect(result.status).toBe('accepted');
    });

    it('should accept valid like with targetType and targetId (DB exists)', async () => {
      const ctx = buildContext();
      ctx.availableTargets.posts = [{ id: 'p1' }];
      mockDbTargetExists('post', 'p1');

      const result = await validateAiAction(
        { type: 'like', params: { targetType: 'post', targetId: 'p1' } },
        { communityContext: ctx },
      );
      expect(result.status).toBe('accepted');
    });
  });

  // ── Alias repair ───────────────────────────────────────────────────────
  describe('validateAiAction - alias repair', () => {
    it('should repair targetId -> postId for comment', async () => {
      const ctx = buildContext();
      ctx.availableTargets.posts = [{ id: 'p1' }];
      mockDbTargetExists('post', 'p1');

      const result = await validateAiAction(
        { type: 'comment', params: { targetId: 'p1', content: 'Repaired' } },
        { communityContext: ctx },
      );
      expect(result.status).toBe('repaired');
      expect(result.warnings.some(w => w.includes('targetId'))).toBe(true);
      expect(result.normalizedParams.postId).toBe('p1');
      expect(result.normalizedParams.targetId).toBeUndefined();
    });

    it('should repair query -> keyword for search', async () => {
      const result = await validateAiAction({
        type: 'search',
        params: { query: 'AI future' },
      });
      expect(result.status).toBe('repaired');
      expect(result.normalizedParams.keyword).toBe('AI future');
      expect(result.normalizedParams.query).toBeUndefined();
    });

    it('should repair name -> newName for rename', async () => {
      const result = await validateAiAction({
        type: 'rename',
        params: { name: '星河漫游者' },
      });
      expect(result.status).toBe('repaired');
      expect(result.normalizedParams.newName).toBe('星河漫游者');
      expect(result.normalizedParams.name).toBeUndefined();
    });

    it('should repair targetId -> userId for follow', async () => {
      const ctx = buildContext();
      ctx.availableTargets.users = [{ id: 'u2' }];
      mockDbTargetExists('user', 'u2');

      const result = await validateAiAction(
        { type: 'follow', params: { targetId: 'u2' } },
        { communityContext: ctx, aiUserId: 'u1' },
      );
      expect(result.status).toBe('repaired');
      expect(result.normalizedParams.userId).toBe('u2');
      expect(result.warnings.some(w => w.includes('targetId'))).toBe(true);
    });
  });

  // ── Target resolution ──────────────────────────────────────────────────
  describe('validateAiAction - target resolution', () => {
    it('should accept an action when target is NOT in context but EXISTS in DB', async () => {
      const ctx = buildContext(); // empty targets
      mockDbTargetExists('post', 'p-db');

      const result = await validateAiAction(
        { type: 'favorite', params: { postId: 'p-db' } },
        { communityContext: ctx },
      );
      expect(result.status).toBe('accepted');
    });

    it('should reject when target is not in context AND not in DB', async () => {
      const ctx = buildContext();
      // Reset mock and force findById to always return null
      repoMock.findById.mockReset();
      repoMock.findById.mockResolvedValue(null);

      const result = await validateAiAction(
        { type: 'comment', params: { postId: 'p-none', content: 'Hi' } },
        { communityContext: ctx },
      );
      expect(result.status).toBe('rejected');
      expect(result.errors.some(e => e.code === 'TARGET_NOT_FOUND')).toBe(true);
    });

    it('should reject follow when sectionId is invalid (post action)', async () => {
      const ctx = buildContext();
      mockDbTargetExists('section', 'bad-s', false);

      const result = await validateAiAction(
        { type: 'post', params: { content: 'hi', sectionId: 'bad-s' } },
        { communityContext: ctx },
      );
      expect(result.status).toBe('rejected');
      expect(result.errors.some(e => e.code === 'TARGET_NOT_FOUND')).toBe(true);
    });

    it('should reject like with invalid targetType', async () => {
      // Schema z.enum(['post','comment']) rejects 'section' → error code is INVALID_PARAMS
      const result = await validateAiAction({
        type: 'like',
        params: { targetType: 'section', targetId: 's1' },
      });
      expect(result.status).toBe('rejected');
      expect(result.errors.some(e => e.code === 'INVALID_PARAMS')).toBe(true);
    });
  });

  // ── Schema validation failures ─────────────────────────────────────────
  describe('validateAiAction - schema validation', () => {
    it('should reject post missing required content', async () => {
      const result = await validateAiAction({
        type: 'post',
        params: { title: 'No content' },
      });
      expect(result.status).toBe('rejected');
      expect(result.errors.some(e => e.code === 'INVALID_PARAMS')).toBe(true);
    });

    it('should reject comment missing content', async () => {
      const result = await validateAiAction({
        type: 'comment',
        params: { postId: 'p1' },
      });
      expect(result.status).toBe('rejected');
      expect(result.errors.some(e => e.code === 'INVALID_PARAMS')).toBe(true);
    });

    it('should reject like missing targetType', async () => {
      const result = await validateAiAction({
        type: 'like',
        params: { targetId: 'p1' },
      });
      expect(result.status).toBe('rejected');
      expect(result.errors.some(e => e.code === 'INVALID_PARAMS')).toBe(true);
    });

    it('should reject search missing keyword', async () => {
      const result = await validateAiAction({
        type: 'search',
        params: {},
      });
      expect(result.status).toBe('rejected');
      expect(result.errors.some(e => e.code === 'INVALID_PARAMS')).toBe(true);
    });

    it('should reject rename with name shorter than 5 chars', async () => {
      const result = await validateAiAction({
        type: 'rename',
        params: { newName: 'Ab' },
      });
      expect(result.status).toBe('rejected');
      expect(result.errors.some(e => e.code === 'INVALID_PARAMS')).toBe(true);
    });

    it('should reject settings with no bio or avatar', async () => {
      const result = await validateAiAction({
        type: 'settings',
        params: {},
      });
      expect(result.status).toBe('rejected');
      expect(result.errors.some(e => e.code === 'INVALID_PARAMS')).toBe(true);
    });

    it('should accept settings with only bio', async () => {
      const result = await validateAiAction({
        type: 'settings',
        params: { bio: 'New bio' },
      });
      expect(result.status).toBe('accepted');
    });

    it('should reject reward with amount exceeding max (100)', async () => {
      const result = await validateAiAction({
        type: 'reward',
        params: { postId: 'p1', amount: 999 },
      });
      expect(result.status).toBe('rejected');
    });
  });

  // ── Self-follow rejection ──────────────────────────────────────────────
  describe('validateAiAction - self-follow', () => {
    it('should reject follow when userId equals aiUserId', async () => {
      const ctx = buildContext();
      ctx.availableTargets.users = [{ id: 'u-me' }];
      mockDbTargetExists('user', 'u-me');

      const result = await validateAiAction(
        { type: 'follow', params: { userId: 'u-me' } },
        { communityContext: ctx, aiUserId: 'u-me' },
      );
      expect(result.status).toBe('rejected');
      expect(result.errors.some(e => e.code === 'SELF_FOLLOW')).toBe(true);
    });

    it('should accept follow for a different user', async () => {
      const ctx = buildContext();
      ctx.availableTargets.users = [{ id: 'u-other' }];
      mockDbTargetExists('user', 'u-other');

      const result = await validateAiAction(
        { type: 'follow', params: { userId: 'u-other' } },
        { communityContext: ctx, aiUserId: 'u-me' },
      );
      expect(result.status).toBe('accepted');
    });
  });

  // ── report validation ──────────────────────────────────────────────────
  describe('validateAiAction - report', () => {
    it('should reject report with non-post targetType', async () => {
      // Schema z.enum(['post']) rejects 'comment' at schema level → INVALID_PARAMS
      const result = await validateAiAction({
        type: 'report',
        params: { targetType: 'comment', targetId: 'c1', reason: 'bad' },
      });
      expect(result.status).toBe('rejected');
      expect(result.errors.some(e => e.code === 'INVALID_PARAMS')).toBe(true);
    });

    it('should accept report with valid post target (DB exists)', async () => {
      const ctx = buildContext();
      ctx.availableTargets.posts = [{ id: 'p1' }];
      mockDbTargetExists('post', 'p1');

      const result = await validateAiAction(
        { type: 'report', params: { targetType: 'post', targetId: 'p1', reason: 'Content violation' } },
        { communityContext: ctx },
      );
      expect(result.status).toBe('accepted');
    });
  });

  // ── Case normalization ─────────────────────────────────────────────────
  describe('validateAiAction - case normalization', () => {
    it('should normalize uppercase type to lowercase and warn', async () => {
      const result = await validateAiAction({
        type: 'POST',
        params: { content: 'Uppercase type' },
      });
      expect(result.type).toBe('post');
      expect(result.warnings.some(w => w.includes('修复为'))).toBe(true);
      expect(['accepted', 'repaired']).toContain(result.status);
    });
  });

  // ── createRejectedActionResult ─────────────────────────────────────────
  describe('createRejectedActionResult', () => {
    it('should produce a structured failure result from a rejected validation', async () => {
      const validation = await validateAiAction({ type: '', params: {} });
      const result = createRejectedActionResult({ type: '' }, validation);
      expect(result.success).toBe(false);
      expect(result.code).toBe('MISSING_TYPE');
      expect(result.message).toBeTruthy();
      expect(result.repairHint).toBeTruthy();
      expect(result.validationStatus).toBe('rejected');
      expect(Array.isArray(result.validationErrors)).toBe(true);
    });
  });

  // ── validateAiActions (batch) ──────────────────────────────────────────
  describe('validateAiActions (batch)', () => {
    it('should validate multiple actions and return results in order', async () => {
      const results = await validateAiActions([
        { type: 'search', params: { keyword: 'AI' } },
        { type: 'browse', params: {} },
        { type: 'unknown', params: {} },
      ]);
      expect(results).toHaveLength(3);
      expect(results[0].status).toBe('accepted');
      expect(results[1].status).toBe('accepted');
      expect(results[2].status).toBe('rejected');
      expect(results[2].errors[0].code).toBe('UNSUPPORTED_ACTION');
    });

    it('should return empty array for non-array input', async () => {
      const results = await validateAiActions(null);
      expect(results).toEqual([]);
    });

    it('should cap at 5 actions', async () => {
      const actions = Array.from({ length: 10 }, (_, i) => ({
        type: 'search', params: { keyword: `test-${i}` },
      }));
      const results = await validateAiActions(actions);
      expect(results).toHaveLength(5);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
//  3.  ai-action-result.service.js
// ══════════════════════════════════════════════════════════════════════════════
describe('AI Action Result Service', () => {
  // ── normalizeAiActionResult ────────────────────────────────────────────
  describe('normalizeAiActionResult', () => {
    // post ────────────────────────────────────────────────────────────────
    describe('post', () => {
      it('should produce correct fields for a successful post', () => {
        const result = normalizeAiActionResult('post', {
          targetId: 'post-1', title: 'My AI Post',
        }, { type: 'post', params: { content: 'Hello' } });

        expect(result.success).toBe(true);
        expect(result.type).toBe('post');
        expect(result.targetType).toBe('post');
        expect(result.targetId).toBe('post-1');
        expect(result.route).toBe('/posts/post-1');
        expect(result.uiIntent).toBe('navigate');
        expect(result.displayText).toContain('My AI Post');
        expect(result.humanLikeStep).toBeTruthy();
        expect(result.mutations).toEqual([{ resource: 'posts', operation: 'create', id: 'post-1' }]);
        expect(result.refreshKeys).toContain('posts');
        expect(result.refreshKeys).toContain('activity');
      });

      it('should handle post without title', () => {
        const result = normalizeAiActionResult('post', { targetId: 'post-2' });
        expect(result.displayText).toContain('AI 发布了新帖子');
        expect(result.displayText).not.toContain('《');
      });
    });

    // comment ─────────────────────────────────────────────────────────────
    describe('comment', () => {
      it('should produce correct fields for a comment', () => {
        const result = normalizeAiActionResult('comment', {
          targetId: 'cmt-1',
          postId: 'post-1',
        }, { type: 'comment', params: { postId: 'post-1', content: 'Nice' } });

        expect(result.success).toBe(true);
        expect(result.targetType).toBe('post');
        expect(result.targetId).toBe('post-1');
        expect(result.secondaryTargetId).toBe('cmt-1');
        expect(result.commentId).toBe('cmt-1');
        expect(result.route).toContain('/posts/post-1');
        expect(result.route).toContain('focusComment=');
        expect(result.uiIntent).toBe('navigate');
        expect(result.displayText).toBe('AI 评论了一篇帖子');
        expect(result.mutations).toEqual([{ resource: 'comments', operation: 'create', id: 'cmt-1' }]);
      });

      it('should fall back postId from params when rawResult lacks postId', () => {
        const result = normalizeAiActionResult('comment', {
          targetId: 'cmt-2',
        }, { type: 'comment', params: { postId: 'param-post' } });

        expect(result.postId).toBe('param-post');
        expect(result.route).toContain('/posts/param-post');
      });
    });

    // like ────────────────────────────────────────────────────────────────
    describe('like', () => {
      it('should produce correct fields for a post like', () => {
        const result = normalizeAiActionResult('like', {
          targetType: 'post', targetId: 'post-1',
        }, { type: 'like', params: { targetType: 'post', targetId: 'post-1' } });

        expect(result.targetType).toBe('post');
        expect(result.targetId).toBe('post-1');
        expect(result.route).toBe('/posts/post-1');
        expect(result.displayText).toContain('AI 点赞了帖子');
        expect(result.uiIntent).toBe('navigate');
        expect(result.refreshKeys).toContain('comments');
      });

      it('should produce correct fields for a comment like', () => {
        const result = normalizeAiActionResult('like', {
          targetType: 'comment', targetId: 'cmt-1', postId: 'post-1',
        }, { type: 'like', params: { targetType: 'comment', targetId: 'cmt-1' } });

        expect(result.targetType).toBe('comment');
        expect(result.route).toContain('focusComment=cmt-1');
        expect(result.displayText).toContain('AI 点赞了一条评论');
      });

      it('should handle unlike action', () => {
        const result = normalizeAiActionResult('like', {
          targetType: 'post', targetId: 'post-1', action: 'unliked',
        });
        expect(result.displayText).toContain('取消');
      });
    });

    // favorite ────────────────────────────────────────────────────────────
    describe('favorite', () => {
      it('should produce correct fields for a favorite', () => {
        const result = normalizeAiActionResult('favorite', {
          targetId: 'post-1', action: 'favorited',
        }, { type: 'favorite', params: { postId: 'post-1' } });

        expect(result.route).toBe('/posts/post-1');
        expect(result.uiIntent).toBe('navigate');
        expect(result.displayText).toContain('收藏');
        expect(result.mutations).toEqual([{ resource: 'favorites', operation: 'favorited', id: 'post-1' }]);
      });

      it('should handle unfavorite', () => {
        const result = normalizeAiActionResult('favorite', {
          targetId: 'post-1', action: 'unfavorited',
        });
        expect(result.displayText).toContain('取消收藏');
      });
    });

    // follow ──────────────────────────────────────────────────────────────
    describe('follow', () => {
      it('should produce correct fields for a follow', () => {
        const result = normalizeAiActionResult('follow', {
          targetId: 'u2', action: 'followed',
        }, { type: 'follow', params: { userId: 'u2' } });

        expect(result.route).toBe('/users/u2');
        expect(result.uiIntent).toBe('navigate');
        expect(result.displayText).toContain('关注');
        expect(result.mutations).toEqual([{ resource: 'userRelationships', operation: 'followed', id: 'u2' }]);
      });

      it('should handle unfollow', () => {
        const result = normalizeAiActionResult('follow', {
          targetId: 'u3', action: 'unfollowed',
        });
        expect(result.displayText).toContain('取消关注');
      });
    });

    // reward ──────────────────────────────────────────────────────────────
    describe('reward', () => {
      it('should produce correct fields for a normal reward', () => {
        const result = normalizeAiActionResult('reward', {
          targetId: 'post-1', amount: 5, action: 'rewarded',
        }, { type: 'reward', params: { postId: 'post-1' } });

        expect(result.route).toBe('/posts/post-1');
        expect(result.uiIntent).toBe('navigate');
        expect(result.displayText).toContain('5 积分');
        expect(result.mutations).toEqual([{ resource: 'postRewards', operation: 'create', id: 'post-1' }]);
      });

      it('should handle self_reward_skipped with toast UI', () => {
        const result = normalizeAiActionResult('reward', {
          action: 'self_reward_skipped',
        });
        expect(result.displayText).toContain('跳过');
        expect(result.uiIntent).toBe('toast');
        expect(result.mutations).toEqual([]);
      });

      it('should handle insufficient_balance with toast UI', () => {
        const result = normalizeAiActionResult('reward', {
          action: 'insufficient_balance',
        });
        expect(result.displayText).toContain('积分不足');
        expect(result.uiIntent).toBe('toast');
        expect(result.mutations).toEqual([]);
      });
    });

    // report ──────────────────────────────────────────────────────────────
    describe('report', () => {
      it('should produce correct fields for a normal report', () => {
        const result = normalizeAiActionResult('report', {
          targetType: 'post', targetId: 'post-1', action: 'reported',
        });
        expect(result.route).toBe('/posts/post-1');
        expect(result.uiIntent).toBe('toast');
        expect(result.displayText).toContain('举报');
        expect(result.mutations).toEqual([{ resource: 'reports', operation: 'reported', id: 'post-1' }]);
      });

      it('should handle already_reported', () => {
        const result = normalizeAiActionResult('report', {
          targetType: 'post', targetId: 'post-2', action: 'already_reported',
        });
        expect(result.displayText).toContain('已举报过');
      });
    });

    // search ──────────────────────────────────────────────────────────────
    describe('search', () => {
      it('should produce correct fields for a search', () => {
        const result = normalizeAiActionResult('search', {
          keyword: '人工智能',
        }, { type: 'search', params: { keyword: '人工智能' } });

        expect(result.route).toContain('/search?q=');
        expect(result.route).toContain(encodeURIComponent('人工智能'));
        expect(result.uiIntent).toBe('navigate');
        expect(result.displayText).toContain('人工智能');
        expect(result.mutations).toEqual([]);
        expect(result.refreshKeys).toContain('search');
      });

      it('should fall back to params.keyword when rawResult lacks keyword', () => {
        const result = normalizeAiActionResult('search', {}, {
          type: 'search', params: { keyword: 'fallback' },
        });
        expect(result.displayText).toContain('fallback');
      });
    });

    // browse ──────────────────────────────────────────────────────────────
    describe('browse', () => {
      it('should produce correct fields for browsing a specific post', () => {
        const result = normalizeAiActionResult('browse', {
          targetId: 'post-1', title: 'Interesting',
        });
        expect(result.route).toBe('/posts/post-1');
        expect(result.uiIntent).toBe('navigate');
        expect(result.displayText).toContain('《Interesting》');
        expect(result.mutations).toEqual([{ resource: 'posts', operation: 'view', id: 'post-1' }]);
      });

      it('should produce correct fields for random browsing (no targetId)', () => {
        const result = normalizeAiActionResult('browse', {});
        expect(result.route).toBe('/posts');
        expect(result.uiIntent).toBe('none');
        expect(result.displayText).toContain('随便逛了逛');
        expect(result.mutations).toEqual([]);
      });
    });

    // settings ────────────────────────────────────────────────────────────
    describe('settings', () => {
      it('should produce correct fields for a settings update', () => {
        const result = normalizeAiActionResult('settings', {
          targetId: 'u1', action: 'updated',
        });
        expect(result.route).toBe('/users/u1');
        expect(result.uiIntent).toBe('navigate');
        expect(result.displayText).toContain('更新');
        expect(result.mutations).toEqual([{ resource: 'users', operation: 'updated', id: 'u1' }]);
      });

      it('should handle no_changes action', () => {
        const result = normalizeAiActionResult('settings', { action: 'no_changes' });
        expect(result.displayText).toContain('查看了');
      });

      it('should default route to /settings when no targetId', () => {
        const result = normalizeAiActionResult('settings', {});
        expect(result.route).toBe('/settings');
      });
    });

    // rename ──────────────────────────────────────────────────────────────
    describe('rename', () => {
      it('should produce correct fields for a rename', () => {
        const result = normalizeAiActionResult('rename', {
          targetId: 'u1', newName: '星尘漫游者',
        }, { type: 'rename', params: { newName: '星尘漫游者' } });

        expect(result.route).toBe('/users/u1');
        expect(result.uiIntent).toBe('navigate');
        expect(result.displayText).toContain('星尘漫游者');
        expect(result.mutations).toEqual([{ resource: 'users', operation: 'rename', id: 'u1' }]);
      });

      it('should fall back to params.newName', () => {
        const result = normalizeAiActionResult('rename', { targetId: 'u1' }, {
          type: 'rename', params: { newName: 'FallbackName' },
        });
        expect(result.displayText).toContain('FallbackName');
      });
    });

    // unknown type ────────────────────────────────────────────────────────
    describe('unknown type', () => {
      it('should return generic fields for an unknown action type', () => {
        const result = normalizeAiActionResult('unknown_action', { route: '/home' });
        expect(result.success).toBe(true);
        expect(result.type).toBe('unknown_action');
        expect(result.uiIntent).toBe('none');
        expect(result.displayText).toContain('AI 执行了 unknown_action');
      });
    });
  });

  // ── normalizeAiActionFailure ───────────────────────────────────────────
  describe('normalizeAiActionFailure', () => {
    it('should return a structured failure object from an error', () => {
      const result = normalizeAiActionFailure('post', new Error('DB down'), { content: 'hi' });
      expect(result.success).toBe(false);
      expect(result.type).toBe('post');
      expect(result.code).toBe('Error');
      expect(result.message).toBe('DB down');
      expect(result.params).toEqual({ content: 'hi' });
      expect(result.uiIntent).toBe('none');
      expect(result.displayText).toContain('失败');
      expect(result.humanLikeStep).toBeTruthy();
    });

    it('should use error.code when available', () => {
      const error = new Error('Insufficient funds');
      error.code = 'INSUFFICIENT_FUNDS';
      const result = normalizeAiActionFailure('reward', error);
      expect(result.code).toBe('INSUFFICIENT_FUNDS');
    });

    it('should use validation repairHint when provided', () => {
      const validation = {
        status: 'rejected',
        errors: [{ code: 'MISSING_TARGET', message: 'post 目标不存在' }],
        repairHint: '请选择真实 ID',
      };
      const result = normalizeAiActionFailure('comment', new Error('fail'), {}, validation);
      expect(result.code).toBe('MISSING_TARGET');
      expect(result.repairHint).toBe('请选择真实 ID');
      expect(result.validationStatus).toBe('rejected');
      expect(result.validationErrors).toEqual(validation.errors);
    });

    it('should handle null error with fallback defaults', () => {
      const result = normalizeAiActionFailure('search', null);
      expect(result.success).toBe(false);
      expect(result.code).toBe('EXECUTION_FAILED');
      expect(result.message).toBe('行为执行失败');
      expect(result.repairHint).toBeTruthy();
      expect(result.params).toEqual({});
    });

    it('should handle undefined validation gracefully', () => {
      const result = normalizeAiActionFailure('browse', new Error('timeout'), { postId: 'p1' }, null);
      expect(result.success).toBe(false);
      expect(result.validationStatus).toBe('execution_failed');
      expect(result.validationErrors).toEqual([]);
    });
  });
});
