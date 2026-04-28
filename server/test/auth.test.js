import { describe, it, expect, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { db, clearDatabase } from '../src/models/db.js';
import {
  register,
  login,
  getCurrentUser,
  refreshToken,
  updateProfile,
  changePassword,
  authMiddleware,
  optionalAuth,
  adminMiddleware,
  JWT_SECRET,
} from '../src/services/auth.service.js';
import { ConflictError, NotFoundError, UnauthorizedError, ForbiddenError, ValidationError } from '../src/lib/errors.js';

// Helper: 创建模拟的 req/res/next
function mockReq(overrides = {}) {
  return { headers: {}, ...overrides };
}
function mockRes() {
  const res = { statusCode: 200, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (data) => { res.body = data; return res; };
  return res;
}

describe('Auth Service', () => {
  beforeEach(() => {
    clearDatabase();
    // clearDatabase 会把 revokedTokens 设为 []，但 authMiddleware 用 .has() 需要 Set
    db.revokedTokens = new Set();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const result = await register('testuser', 'test@example.com', 'password123');

      expect(result.token).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.username).toBe('testuser');
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.password).toBeUndefined();
      expect(db.users).toHaveLength(1);
    });

    it('should throw ConflictError on duplicate username', async () => {
      await register('testuser', 'test1@example.com', 'password123');

      await expect(register('testuser', 'test2@example.com', 'password456'))
        .rejects.toThrow(ConflictError);
      await expect(register('testuser', 'test2@example.com', 'password456'))
        .rejects.toThrow('用户名或邮箱已被使用');
    });

    it('should throw ConflictError on duplicate email', async () => {
      await register('user1', 'same@example.com', 'password123');

      await expect(register('user2', 'same@example.com', 'password456'))
        .rejects.toThrow(ConflictError);
    });

    it('should set default role to user', async () => {
      await register('newuser', 'new@example.com', 'password123');
      expect(db.users[0].role).toBe('user');
    });

    it('should hash the password', async () => {
      await register('hashtest', 'hash@example.com', 'mypassword');
      const user = db.users[0];
      expect(user.password).not.toBe('mypassword');
      expect(user.password.startsWith('$2a$')).toBe(true);
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      await register('loginuser', 'login@example.com', 'password123');
    });

    it('should login with correct credentials', async () => {
      const result = await login('loginuser', 'password123');

      expect(result.token).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.username).toBe('loginuser');
      expect(result.user.password).toBeUndefined();
    });

    it('should login with email as username', async () => {
      const result = await login('login@example.com', 'password123');
      expect(result.user.username).toBe('loginuser');
    });

    it('should throw NotFoundError for non-existent user', async () => {
      await expect(login('nonexistent', 'password123'))
        .rejects.toThrow(NotFoundError);
      await expect(login('nonexistent', 'password123'))
        .rejects.toThrow('用户不存在');
    });

    it('should throw UnauthorizedError for wrong password', async () => {
      await expect(login('loginuser', 'wrongpassword'))
        .rejects.toThrow(UnauthorizedError);
      await expect(login('loginuser', 'wrongpassword'))
        .rejects.toThrow('密码错误');
    });

    it('should throw ForbiddenError for deleted (disabled) user', async () => {
      db.users[0].deletedAt = new Date().toISOString();

      await expect(login('loginuser', 'password123'))
        .rejects.toThrow(ForbiddenError);
      await expect(login('loginuser', 'password123'))
        .rejects.toThrow('账号已被禁用');
    });
  });

  describe('generateToken / verifyToken (via register/login)', () => {
    it('should generate a valid JWT token', async () => {
      const result = await register('jwtuser', 'jwt@example.com', 'password123');
      const decoded = jwt.verify(result.token, JWT_SECRET);

      expect(decoded.id).toBe(db.users[0].id);
      expect(decoded.username).toBe('jwtuser');
      expect(decoded.role).toBe('user');
    });

    it('should generate a valid refresh token', async () => {
      const result = await register('refreshuser', 'refresh@example.com', 'password123');
      const decoded = jwt.verify(result.refreshToken, JWT_SECRET);

      expect(decoded.id).toBe(db.users[0].id);
      expect(decoded.type).toBe('refresh');
    });
  });

  describe('authMiddleware', () => {
    let user, token;

    beforeEach(async () => {
      const result = await register('mwuser', 'mw@example.com', 'password123');
      user = db.users[0];
      token = result.token;
    });

    it('should call next() for valid token', () => {
      const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
      const res = mockRes();
      let nextCalled = false;
      const next = () => { nextCalled = true; };

      authMiddleware(req, res, next);

      expect(nextCalled).toBe(true);
      expect(req.user.id).toBe(user.id);
      expect(req.user.username).toBe('mwuser');
    });

    it('should return 401 for invalid token', () => {
      const req = mockReq({ headers: { authorization: 'Bearer invalidtoken123' } });
      const res = mockRes();
      const next = () => {};

      authMiddleware(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBeDefined();
    });

    it('should return 401 when no token provided', () => {
      const req = mockReq();
      const res = mockRes();
      const next = () => {};

      authMiddleware(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBe('未授权，请先登录');
    });

    it('should return 401 for revoked token', () => {
      db.revokedTokens.add(token);

      const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
      const res = mockRes();
      const next = () => {};

      authMiddleware(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBe('Token 已失效，请重新登录');
    });

    it('should return 401 when authorization header has no Bearer prefix', () => {
      const req = mockReq({ headers: { authorization: token } });
      const res = mockRes();
      const next = () => {};

      authMiddleware(req, res, next);

      expect(res.statusCode).toBe(401);
    });
  });

  describe('optionalAuth', () => {
    let token;

    beforeEach(async () => {
      const result = await register('optuser', 'opt@example.com', 'password123');
      token = result.token;
    });

    it('should set req.user when valid token provided', () => {
      const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
      const res = mockRes();
      let nextCalled = false;
      const next = () => { nextCalled = true; };

      optionalAuth(req, res, next);

      expect(nextCalled).toBe(true);
      expect(req.user).toBeDefined();
    });

    it('should call next() without setting req.user when no token', () => {
      const req = mockReq();
      const res = mockRes();
      let nextCalled = false;
      const next = () => { nextCalled = true; };

      optionalAuth(req, res, next);

      expect(nextCalled).toBe(true);
      expect(req.user).toBeUndefined();
    });

    it('should call next() for invalid token without error', () => {
      const req = mockReq({ headers: { authorization: 'Bearer invalidtoken' } });
      const res = mockRes();
      let nextCalled = false;
      const next = () => { nextCalled = true; };

      optionalAuth(req, res, next);

      expect(nextCalled).toBe(true);
      expect(req.user).toBeUndefined();
    });
  });

  describe('adminMiddleware', () => {
    it('should call next() for admin user', () => {
      const req = { user: { role: 'admin' } };
      const res = mockRes();
      let nextCalled = false;
      const next = () => { nextCalled = true; };

      adminMiddleware(req, res, next);

      expect(nextCalled).toBe(true);
    });

    it('should return 403 for non-admin user', () => {
      const req = { user: { role: 'user' } };
      const res = mockRes();
      const next = () => {};

      adminMiddleware(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toBe('需要管理员权限');
    });

    it('should return 403 when req.user is not set', () => {
      const req = {};
      const res = mockRes();
      const next = () => {};

      adminMiddleware(req, res, next);

      expect(res.statusCode).toBe(403);
    });
  });

  describe('getCurrentUser', () => {
    it('should return sanitized user by id', async () => {
      const result = await register('getuser', 'get@example.com', 'password123');
      const userId = db.users[0].id;

      const user = getCurrentUser(userId);

      expect(user.username).toBe('getuser');
      expect(user.password).toBeUndefined();
    });

    it('should throw NotFoundError for non-existent user', () => {
      expect(() => getCurrentUser('nonexistent')).toThrow(NotFoundError);
    });
  });

  describe('refreshToken', () => {
    it('should return new tokens for valid refresh token', async () => {
      const result = await register('refreshtest', 'rt@example.com', 'password123');

      const newTokens = refreshToken(result.refreshToken);

      expect(newTokens.token).toBeDefined();
      expect(newTokens.refreshToken).toBeDefined();
    });

    it('should throw UnauthorizedError for invalid refresh token', () => {
      expect(() => refreshToken('invalidtoken')).toThrow(UnauthorizedError);
    });
  });

  describe('updateProfile', () => {
    it('should update allowed fields', async () => {
      await register('updateuser', 'update@example.com', 'password123');
      const userId = db.users[0].id;

      const updated = await updateProfile(userId, {
        username: 'newname',
        bio: 'Hello world',
        avatar: 'http://example.com/avatar.png',
      });

      expect(updated.username).toBe('newname');
      expect(updated.bio).toBe('Hello world');
      expect(updated.avatar).toBe('http://example.com/avatar.png');
    });

    it('should throw NotFoundError for non-existent user', async () => {
      await expect(updateProfile('nonexistent', { bio: 'test' })).rejects.toThrow(NotFoundError);
    });

    it('should not update password field', async () => {
      await register('pwtest', 'pw@example.com', 'password123');
      const userId = db.users[0].id;

      await updateProfile(userId, { password: 'hacked' });
      expect(db.users[0].password).not.toBe('hacked');
    });
  });

  describe('changePassword', () => {
    it('should change password with correct old password', async () => {
      await register('changepw', 'changepw@example.com', 'oldpassword123');
      const userId = db.users[0].id;

      const result = await changePassword(userId, 'oldpassword123', 'newpassword456');
      expect(result.success).toBe(true);

      // Verify new password works for login
      const loginResult = await login('changepw', 'newpassword456');
      expect(loginResult.user.username).toBe('changepw');
    });

    it('should throw UnauthorizedError for wrong old password', async () => {
      await register('wrongpw', 'wrongpw@example.com', 'password123');
      const userId = db.users[0].id;

      await expect(changePassword(userId, 'wrongold', 'newpassword456'))
        .rejects.toThrow(UnauthorizedError);
    });

    it('should throw ValidationError for short new password', async () => {
      await register('shortpw', 'shortpw@example.com', 'password123');
      const userId = db.users[0].id;

      await expect(changePassword(userId, 'password123', '12345'))
        .rejects.toThrow(ValidationError);
    });
  });
});
