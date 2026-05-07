import { beforeEach, describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../src/lib/errors.js';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-auth-service';

const repoMock = vi.hoisted(() => ({
  rawQuery: vi.fn(),
  insert: vi.fn(),
  findAll: vi.fn(),
  findOne: vi.fn(),
  findById: vi.fn(),
  update: vi.fn(),
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

const authService = await import('../src/services/auth.service.js');
const {
  JWT_SECRET,
  adminMiddleware,
  authMiddleware,
  changeUserPassword,
  generateRefreshToken,
  generateToken,
  getCurrentUser,
  loginUser,
  optionalAuthMiddleware,
  refreshUserToken,
  registerUser,
  updateUserProfile,
} = authService;

function createUser(overrides = {}) {
  return {
    id: 'user-1',
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: '$2a$10$hashed',
    avatar: null,
    bio: '',
    isAi: false,
    aiLikelihood: 0,
    role: 'user',
    followerCount: 0,
    followingCount: 0,
    postCount: 0,
    createdAt: '2026-05-07T00:00:00.000Z',
    updatedAt: '2026-05-07T00:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

function mockReq(overrides = {}) {
  return { headers: {}, ...overrides };
}

function createNextSpy() {
  return vi.fn();
}

describe('Auth Service 当前架构测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repoMock.findAll.mockResolvedValue([]);
    repoMock.findOne.mockResolvedValue(null);
  });

  describe('registerUser', () => {
    it('should register a human user with sanitized response and default assets/folder attempts', async () => {
      repoMock.rawQuery.mockResolvedValueOnce({ rows: [] });
      repoMock.insert.mockImplementation(async (table, data) => ({ ...data }));
      repoMock.findAll.mockResolvedValueOnce([{ id: 'points' }]);
      repoMock.findOne.mockResolvedValueOnce(null);

      const result = await registerUser('testuser', 'test@example.com', 'password123');

      expect(result.token).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.username).toBe('testuser');
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.passwordHash).toBeUndefined();
      expect(result.user.isAi).toBe(false);
      expect(repoMock.rawQuery).toHaveBeenCalledWith(
        'SELECT id FROM users WHERE username = $1 OR email = $2',
        ['testuser', 'test@example.com']
      );
      expect(repoMock.insert).toHaveBeenCalledWith('users', expect.objectContaining({
        username: 'testuser',
        email: 'test@example.com',
        role: 'user',
        isAi: false,
      }));
      expect(repoMock.insert).toHaveBeenCalledWith('favorite_folders', expect.objectContaining({
        name: '我的收藏',
      }));
    });

    it('should throw ConflictError when username or email already exists', async () => {
      repoMock.rawQuery.mockResolvedValueOnce({ rows: [{ id: 'existing-user' }] });

      await expect(registerUser('testuser', 'test@example.com', 'password123'))
        .rejects.toThrow(ConflictError);
    });
  });

  describe('loginUser', () => {
    it('should login with username or email and hide passwordHash', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      repoMock.rawQuery.mockResolvedValueOnce({
        rows: [{
          id: 'user-1',
          username: 'loginuser',
          email: 'login@example.com',
          password_hash: passwordHash,
          role: 'user',
          is_ai: false,
          deleted_at: null,
        }],
      });

      const result = await loginUser('loginuser', 'password123');

      expect(result.token).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.username).toBe('loginuser');
      expect(result.user.passwordHash).toBeUndefined();
      expect(repoMock.rawQuery).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE username = $1 OR email = $1',
        ['loginuser']
      );
    });

    it('should use unified credential error for missing user and wrong password', async () => {
      repoMock.rawQuery.mockResolvedValueOnce({ rows: [] });
      await expect(loginUser('missing', 'password123')).rejects.toThrow(UnauthorizedError);

      const passwordHash = await bcrypt.hash('password123', 10);
      repoMock.rawQuery.mockResolvedValueOnce({
        rows: [{ id: 'user-1', username: 'loginuser', password_hash: passwordHash, role: 'user', is_ai: false }],
      });
      await expect(loginUser('loginuser', 'wrongpassword')).rejects.toThrow(UnauthorizedError);
    });

    it('should reject disabled user and empty passwordHash defensively', async () => {
      repoMock.rawQuery.mockResolvedValueOnce({
        rows: [{ id: 'user-1', username: 'disabled', password_hash: 'hash', deleted_at: '2026-05-07T00:00:00.000Z' }],
      });
      await expect(loginUser('disabled', 'password123')).rejects.toThrow(ForbiddenError);

      repoMock.rawQuery.mockResolvedValueOnce({
        rows: [{ id: 'ai-1', username: 'emptyhash', password_hash: '', deleted_at: null }],
      });
      await expect(loginUser('emptyhash', 'password123')).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('token helpers and middleware', () => {
    it('should generate human and AI token lifetimes according to current policy', () => {
      const humanToken = generateToken(createUser({ id: 'human-1', isAi: false }));
      const aiToken = generateToken(createUser({ id: 'ai-1', username: 'aiuser', isAi: true }));
      const humanRefreshToken = generateRefreshToken(createUser({ id: 'human-1', isAi: false }));
      const aiRefreshToken = generateRefreshToken(createUser({ id: 'ai-1', isAi: true }));

      const humanDecoded = jwt.verify(humanToken, JWT_SECRET);
      const aiDecoded = jwt.verify(aiToken, JWT_SECRET);
      const humanRefreshDecoded = jwt.verify(humanRefreshToken, JWT_SECRET);
      const aiRefreshDecoded = jwt.verify(aiRefreshToken, JWT_SECRET);

      expect(humanDecoded.exp - humanDecoded.iat).toBe(2 * 60 * 60);
      expect(aiDecoded.exp - aiDecoded.iat).toBe(7 * 24 * 60 * 60);
      expect(humanRefreshDecoded.exp - humanRefreshDecoded.iat).toBe(7 * 24 * 60 * 60);
      expect(aiRefreshDecoded.exp - aiRefreshDecoded.iat).toBe(30 * 24 * 60 * 60);
    });

    it('authMiddleware should attach decoded user for valid non-revoked token', async () => {
      const token = generateToken(createUser({ id: 'user-1', username: 'mwuser' }));
      repoMock.findOne.mockResolvedValueOnce(null);
      const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
      const next = createNextSpy();

      await authMiddleware(req, {}, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.user.id).toBe('user-1');
      expect(req.user.username).toBe('mwuser');
    });

    it('authMiddleware should pass UnauthorizedError for missing, revoked, or invalid token', async () => {
      const missingNext = createNextSpy();
      await authMiddleware(mockReq(), {}, missingNext);
      expect(missingNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));

      const token = generateToken(createUser());
      const revokedNext = createNextSpy();
      repoMock.findOne.mockResolvedValueOnce({ id: 'revoked-1', token });
      await authMiddleware(mockReq({ headers: { authorization: `Bearer ${token}` } }), {}, revokedNext);
      expect(revokedNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
      expect(revokedNext.mock.calls[0][0].message).toBe('Token 已失效，请重新登录');

      const invalidNext = createNextSpy();
      repoMock.findOne.mockResolvedValueOnce(null);
      await authMiddleware(mockReq({ headers: { authorization: 'Bearer invalid-token' } }), {}, invalidNext);
      expect(invalidNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
      expect(invalidNext.mock.calls[0][0].message).toBe('Token 无效或已过期');
    });

    it('optionalAuthMiddleware should ignore invalid token but attach valid token', async () => {
      const token = generateToken(createUser({ id: 'user-1' }));
      const validReq = mockReq({ headers: { authorization: `Bearer ${token}` } });
      const validNext = createNextSpy();
      await optionalAuthMiddleware(validReq, {}, validNext);
      expect(validReq.user.id).toBe('user-1');
      expect(validNext).toHaveBeenCalledWith();

      const invalidReq = mockReq({ headers: { authorization: 'Bearer invalid-token' } });
      const invalidNext = createNextSpy();
      await optionalAuthMiddleware(invalidReq, {}, invalidNext);
      expect(invalidReq.user).toBeUndefined();
      expect(invalidNext).toHaveBeenCalledWith();
    });

    it('adminMiddleware should throw for non-admin and continue for admin', () => {
      const adminNext = createNextSpy();
      adminMiddleware({ user: { role: 'admin' } }, {}, adminNext);
      expect(adminNext).toHaveBeenCalledWith();

      expect(() => adminMiddleware({ user: { role: 'user' } }, {}, createNextSpy()))
        .toThrow(ForbiddenError);
      expect(() => adminMiddleware({}, {}, createNextSpy()))
        .toThrow('需要管理员权限');
    });
  });

  describe('profile and password operations', () => {
    it('getCurrentUser should return sanitized user or NotFoundError', async () => {
      repoMock.findById.mockResolvedValueOnce(createUser({ id: 'user-1' }));
      const user = await getCurrentUser('user-1');
      expect(user.id).toBe('user-1');
      expect(user.passwordHash).toBeUndefined();

      repoMock.findById.mockResolvedValueOnce(null);
      await expect(getCurrentUser('missing')).rejects.toThrow(NotFoundError);
    });

    it('refreshUserToken should issue fresh tokens for valid refresh token', async () => {
      const refreshToken = generateRefreshToken(createUser({ id: 'user-1' }));
      repoMock.findById.mockResolvedValueOnce(createUser({ id: 'user-1' }));

      const result = await refreshUserToken(refreshToken);

      expect(result.token).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('refreshUserToken should reject invalid token and wrong token type', async () => {
      await expect(refreshUserToken('invalid-token')).rejects.toThrow(UnauthorizedError);

      const accessToken = generateToken(createUser({ id: 'user-1' }));
      await expect(refreshUserToken(accessToken)).rejects.toThrow(UnauthorizedError);
    });

    it('updateUserProfile should update only allowed fields', async () => {
      repoMock.findById.mockResolvedValueOnce(createUser({ id: 'user-1' }));
      repoMock.update.mockResolvedValueOnce(createUser({
        id: 'user-1',
        username: 'newname',
        bio: 'Hello world',
        avatar: 'http://example.com/avatar.png',
      }));

      const result = await updateUserProfile('user-1', {
        username: 'newname',
        bio: 'Hello world',
        avatar: 'http://example.com/avatar.png',
        passwordHash: 'hacked',
        role: 'admin',
      });

      expect(repoMock.update).toHaveBeenCalledWith('users', 'user-1', expect.not.objectContaining({
        passwordHash: 'hacked',
        role: 'admin',
      }));
      expect(result.username).toBe('newname');
      expect(result.passwordHash).toBeUndefined();
    });

    it('changeUserPassword should update hash when old password is correct', async () => {
      const passwordHash = await bcrypt.hash('oldpassword123', 10);
      repoMock.findById.mockResolvedValueOnce(createUser({ id: 'user-1', passwordHash }));
      repoMock.update.mockResolvedValueOnce(createUser({ id: 'user-1' }));

      const result = await changeUserPassword('user-1', 'oldpassword123', 'newpassword456');

      expect(result).toEqual({ success: true });
      expect(repoMock.update).toHaveBeenCalledWith('users', 'user-1', expect.objectContaining({
        passwordHash: expect.any(String),
        updatedAt: expect.any(String),
      }));
    });

    it('changeUserPassword should reject AI users, wrong old password, and short new password', async () => {
      repoMock.findById.mockResolvedValueOnce(createUser({ id: 'ai-1', isAi: true }));
      await expect(changeUserPassword('ai-1', 'oldpassword123', 'newpassword456'))
        .rejects.toThrow(ForbiddenError);

      const passwordHash = await bcrypt.hash('oldpassword123', 10);
      repoMock.findById.mockResolvedValueOnce(createUser({ id: 'user-1', passwordHash }));
      await expect(changeUserPassword('user-1', 'wrongpassword', 'newpassword456'))
        .rejects.toThrow(UnauthorizedError);

      repoMock.findById.mockResolvedValueOnce(createUser({ id: 'user-1', passwordHash }));
      await expect(changeUserPassword('user-1', 'oldpassword123', '12345'))
        .rejects.toThrow(ValidationError);
    });
  });
});
