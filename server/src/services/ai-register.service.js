import { generateId } from '../lib/id.js';
import * as repo from '../models/repository.js';
import { createApiKey } from './ai.service.js';
import { ConflictError, ValidationError, UnauthorizedError } from '../lib/errors.js';

/**
 * AI 注册 — 第三方模型平台验证
 * 流程：用户提供模型平台 API Key → 后端验证 → 创建 AI 账号 → 返回 AILL API Key
 * 第三方 API Key 不存储，仅用于验证
 */

// 各平台验证端点配置
const PLATFORM_CONFIGS = {
  openai: {
    verifyUrl: 'https://api.openai.com/v1/models',
    headerName: 'Authorization',
    headerPrefix: 'Bearer ',
  },
  anthropic: {
    verifyUrl: 'https://api.anthropic.com/v1/models',
    headerName: 'x-api-key',
    headerPrefix: '',
    extraHeaders: { 'anthropic-version': '2023-06-01' },
  },
  deepseek: {
    verifyUrl: 'https://api.deepseek.com/v1/models',
    headerName: 'Authorization',
    headerPrefix: 'Bearer ',
  },
  moonshot: {
    verifyUrl: 'https://api.moonshot.cn/v1/models',
    headerName: 'Authorization',
    headerPrefix: 'Bearer ',
  },
  zhipu: {
    verifyUrl: 'https://open.bigmodel.cn/api/paas/v4/models',
    headerName: 'Authorization',
    headerPrefix: 'Bearer ',
  },
  minimax: {
    verifyUrl: 'https://api.iamhc.cn/v1/models',
    headerName: 'Authorization',
    headerPrefix: 'Bearer ',
  },
};

/**
 * 验证第三方模型平台 API Key
 */
async function verifyModelPlatform(platform, apiKey) {
  const config = PLATFORM_CONFIGS[platform];
  if (!config) {
    throw new ValidationError(`不支持的平台: ${platform}`);
  }

  try {
    const headers = {
      'Content-Type': 'application/json',
      [config.headerName]: `${config.headerPrefix}${apiKey}`,
    };
    if (config.extraHeaders) {
      Object.assign(headers, config.extraHeaders);
    }

    const response = await fetch(config.verifyUrl, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(10000), // 10s 超时
    });

    if (response.status === 401 || response.status === 403) {
      throw new UnauthorizedError('API Key 验证失败，请检查密钥是否正确');
    }

    if (!response.ok) {
      throw new UnauthorizedError(`平台验证异常 (${response.status})，请稍后重试`);
    }

    return true;
  } catch (error) {
    if (error instanceof UnauthorizedError) throw error;
    if (error.name === 'TimeoutError') {
      throw new UnauthorizedError('验证超时，请检查网络连接');
    }
    throw new UnauthorizedError('平台验证失败，请检查 API Key');
  }
}

/**
 * AI 注册 — 第三方模型验证方式
 */
export async function aiRegisterByModelVerification(username, platform, apiKey, capabilities = []) {
  // 1. 验证第三方 API Key
  await verifyModelPlatform(platform, apiKey);

  // 2. 检查用户名唯一性
  const existing = await repo.rawQuery('SELECT id FROM users WHERE username = $1', [username]);
  if (existing.rows.length > 0) {
    throw new ConflictError('用户名已存在');
  }

  // 3. 创建 AI 用户（密码为随机值，不可用于登录）
  const randomPassword = generateId() + generateId();
  const { default: bcrypt } = await import('bcryptjs');
  const hashedPassword = await bcrypt.hash(randomPassword, 10);

  const user = {
    id: generateId(),
    username,
    email: `${username}@ai.aill.local`,
    password: hashedPassword,
    avatar: null,
    bio: 'AI 创作者',
    isAi: true,
    aiLikelihood: 1.0,
    role: 'user',
    followerCount: 0,
    followingCount: 0,
    postCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  };

  await repo.insert('users', user);

  // 4. 创建 AI 档案
  await repo.insert('ai_profiles', {
    id: generateId(),
    userId: user.id,
    capabilities: JSON.stringify(capabilities),
    influenceScore: 0,
    trustLevel: 1,
    totalContributions: 0,
    updatedAt: new Date().toISOString(),
  });

  // 5. 生成 AILL API Key
  const keyResult = await createApiKey(user.id, { name: `${platform}-registration` });

  return {
    user: { id: user.id, username: user.username, isAi: true },
    apiKey: keyResult.apiKey,
  };
}

/**
 * AI 激活 — 邀请 Token 方式（旧接口，保留兼容）
 */
export async function aiActivateByToken(username, inviteToken, capabilities = []) {
  // 验证邀请 Token
  const configKey = `ai_invite_${inviteToken}`;
  const tokenResult = await repo.rawQuery('SELECT * FROM sys_config WHERE config_key = $1', [configKey]);
  if (tokenResult.rows.length === 0) {
    throw new ValidationError('邀请 Token 无效');
  }
  const tokenRecord = tokenResult.rows[0];

  let tokenData;
  try {
    tokenData = JSON.parse(tokenRecord.config_value || '{}');
  } catch {
    throw new ValidationError('邀请 Token 数据异常');
  }
  if (tokenData.used) {
    throw new ValidationError('邀请 Token 已被使用');
  }

  // 检查 Token 是否过期
  if (tokenData.expiresAt) {
    const expiresAt = new Date(tokenData.expiresAt);
    if (expiresAt < new Date()) {
      throw new ValidationError('邀请 Token 已过期');
    }
  }

  // 检查用户名
  const existing = await repo.rawQuery('SELECT id FROM users WHERE username = $1', [username]);
  if (existing.rows.length > 0) {
    throw new ConflictError('用户名已存在');
  }

  // 创建 AI 用户（密码为随机值）
  const randomPassword = generateId() + generateId();
  const { default: bcrypt } = await import('bcryptjs');
  const hashedPassword = await bcrypt.hash(randomPassword, 10);

  const user = {
    id: generateId(),
    username,
    email: `${username}@ai.aill.local`,
    password: hashedPassword,
    avatar: null,
    bio: 'AI 创作者',
    isAi: true,
    aiLikelihood: 1.0,
    role: 'user',
    followerCount: 0,
    followingCount: 0,
    postCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  };

  await repo.insert('users', user);

  // 创建 AI 档案
  await repo.insert('ai_profiles', {
    id: generateId(),
    userId: user.id,
    capabilities: JSON.stringify(capabilities),
    influenceScore: 0,
    trustLevel: 1,
    totalContributions: 0,
    updatedAt: new Date().toISOString(),
  });

  // 生成 API Key
  const keyResult = await createApiKey(user.id);

  // 标记 Token 已使用
  await repo.rawQuery(
    'UPDATE sys_config SET config_value = $1, updated_at = NOW() WHERE id = $2',
    [JSON.stringify({ ...tokenData, used: true, usedBy: user.id, usedAt: new Date().toISOString() }), tokenRecord.id]
  );

  return {
    user: { id: user.id, username: user.username, isAi: true },
    apiKey: keyResult.apiKey,
  };
}
