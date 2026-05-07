import { generateId } from '../lib/id.js';
import bcrypt from 'bcryptjs';
import * as repo from '../models/repository.js';
import { ConflictError, ValidationError, UnauthorizedError } from '../lib/errors.js';
import { JWT_SECRET, generateToken, generateRefreshToken } from './auth.service.js';
import { encrypt, decrypt } from '../lib/crypto.js';
import { decryptWithPrivateKey } from '../lib/rsa-key.js';
import { getDriveTags } from './drive.service.js';
import { assembleRegisterAnalysisPrompt } from './prompt-flow.service.js';
import { createOnboardingSession, markKeyValidated, startAnalyzing, markCandidatesReady, getOnboardingSession, confirmSelection, markCompleted } from './ai-onboarding.service.js';
import { logLlmCall } from './ai-llm-log.service.js';
import { getActiveNorms } from './community-norms.service.js';
import { callTestModel, isTestPlatform, generateTestCandidates } from './test-model.service.js';

const VALIDATION_ERROR_CODES = {
  INVALID_KEY: 'INVALID_KEY',
  RATE_LIMITED: 'RATE_LIMITED',
  INSUFFICIENT_PERMISSION: 'INSUFFICIENT_PERMISSION',
  NETWORK_ERROR: 'NETWORK_ERROR',
  PLATFORM_ERROR: 'PLATFORM_ERROR',
  TIMEOUT: 'TIMEOUT',
  NORMS_VIOLATION: 'NORMS_VIOLATION',
  EMPTY_CANDIDATES: 'EMPTY_CANDIDATES',
};

function buildAuthError(message, code, status = 401) {
  const err = new UnauthorizedError(message);
  err.code = code;
  err.status = status;
  return err;
}

const PLATFORM_CONFIGS = {
  openai: {
    verifyUrl: 'https://api.openai.com/v1/models',
    chatUrl: 'https://api.openai.com/v1/chat/completions',
    headerName: 'Authorization',
    headerPrefix: 'Bearer ',
    defaultModel: 'gpt-4o-mini',
  },
  anthropic: {
    verifyUrl: 'https://api.anthropic.com/v1/models',
    chatUrl: 'https://api.anthropic.com/v1/messages',
    headerName: 'x-api-key',
    headerPrefix: '',
    extraHeaders: { 'anthropic-version': '2023-06-01' },
    defaultModel: 'claude-3-5-haiku-20241022',
    isAnthropicFormat: true,
  },
  deepseek: {
    verifyUrl: 'https://api.deepseek.com/models',
    chatUrl: 'https://api.deepseek.com/chat/completions',
    headerName: 'Authorization',
    headerPrefix: 'Bearer ',
    defaultModel: 'deepseek-v4-flash',
  },
  'deepseek-anthropic': {
    verifyUrl: 'https://api.deepseek.com/anthropic/v1/models',
    chatUrl: 'https://api.deepseek.com/anthropic/v1/messages',
    headerName: 'x-api-key',
    headerPrefix: '',
    extraHeaders: { 'anthropic-version': '2023-06-01' },
    defaultModel: 'deepseek-v4-flash',
    isAnthropicFormat: true,
  },
  moonshot: {
    verifyUrl: 'https://api.moonshot.cn/v1/models',
    chatUrl: 'https://api.moonshot.cn/v1/chat/completions',
    headerName: 'Authorization',
    headerPrefix: 'Bearer ',
    defaultModel: 'moonshot-v1-8k',
  },
  zhipu: {
    verifyUrl: 'https://open.bigmodel.cn/api/paas/v4/models',
    chatUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    headerName: 'Authorization',
    headerPrefix: 'Bearer ',
    defaultModel: 'glm-4-flash',
  },
  minimax: {
    verifyUrl: 'https://api.minimaxi.com/v1/models',
    chatUrl: 'https://api.minimaxi.com/v1/chat/completions',
    headerName: 'Authorization',
    headerPrefix: 'Bearer ',
    defaultModel: 'MiniMax-M2.7',
  },
  ceshi: {
    verifyUrl: 'test://verify',
    chatUrl: 'test://chat',
    headerName: 'Authorization',
    headerPrefix: 'Bearer ',
    defaultModel: 'test-model-v1',
    isTestPlatform: true,
  },
};

async function doPlatformFetch(url, headers, timeout = 30000) {
  const response = await fetch(url, {
    method: 'GET',
    headers,
    signal: AbortSignal.timeout(timeout),
  });
  return response;
}

async function verifyModelPlatform(platform, apiKey, baseUrl, modelName) {
  if (isTestPlatform(platform)) {
    return true;
  }

  if (platform === 'relay') {
    if (!baseUrl) {
      throw new ValidationError('通用中转平台需要提供 Base URL');
    }
    return verifyRelayPlatform(baseUrl, apiKey, modelName);
  }

  const config = PLATFORM_CONFIGS[platform];
  if (!config) {
    throw new ValidationError(`不支持的平台: ${platform}`);
  }

  const headers = {
    'Content-Type': 'application/json',
    [config.headerName]: `${config.headerPrefix}${apiKey}`,
  };
  if (config.extraHeaders) {
    Object.assign(headers, config.extraHeaders);
  }

  try {
    const response = await doPlatformFetch(config.verifyUrl, headers, 30000);

    if (response.status === 401) {
      throw buildAuthError('API Key 无效，请检查密钥是否正确', VALIDATION_ERROR_CODES.INVALID_KEY);
    }
    if (response.status === 403) {
      throw buildAuthError('API Key 有效但无模型访问权限', VALIDATION_ERROR_CODES.INSUFFICIENT_PERMISSION, 403);
    }
    if (response.status === 429) {
      throw buildAuthError('平台请求限流，请稍后重试', VALIDATION_ERROR_CODES.RATE_LIMITED, 429);
    }
    if (response.status >= 500) {
      throw buildAuthError('平台服务异常，请稍后重试', VALIDATION_ERROR_CODES.PLATFORM_ERROR);
    }
    if (!response.ok) {
      throw buildAuthError(`平台验证异常 (${response.status})`, VALIDATION_ERROR_CODES.PLATFORM_ERROR);
    }

    await verifyModelCapability(config, apiKey, modelName);

    return true;
  } catch (error) {
    if (error instanceof UnauthorizedError) throw error;
    if (error.name === 'TimeoutError') {
      throw buildAuthError('验证超时，请检查网络连接', VALIDATION_ERROR_CODES.TIMEOUT, 408);
    }
    throw buildAuthError('平台验证失败，请检查 API Key', VALIDATION_ERROR_CODES.NETWORK_ERROR);
  }
}

async function verifyModelCapability(config, apiKey, modelName) {
  const model = modelName || config.defaultModel;
  if (!config.chatUrl) return;

  try {
    let body, headers;

    if (config.isAnthropicFormat) {
      headers = {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      };
      body = JSON.stringify({
        model,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'hi' }],
      });
    } else {
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      };
      body = JSON.stringify({
        model,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'hi' }],
      });
    }

    const response = await fetch(config.chatUrl, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(30000),
    });

    if (response.status === 401) {
      throw buildAuthError('API Key 无调用权限', VALIDATION_ERROR_CODES.INSUFFICIENT_PERMISSION, 403);
    }
    if (response.status === 404) {
      throw buildAuthError(`模型 ${model} 不可用，请检查模型名称`, VALIDATION_ERROR_CODES.INVALID_KEY);
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) throw error;
  }
}

const RELAY_FALLBACK_MODELS = ['deepseek-chat', 'gpt-3.5-turbo', 'claude-3-haiku-20240307'];

async function verifyRelayPlatform(baseUrl, apiKey, modelName) {
  const cleanUrl = baseUrl.replace(/\/+$/, '');
  const verifyUrl = `${cleanUrl}/v1/models`;

  try {
    const response = await fetch(verifyUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(30000),
    });

    if (response.status === 401) {
      throw buildAuthError('API Key 无效', VALIDATION_ERROR_CODES.INVALID_KEY);
    }
    if (!response.ok && response.status !== 404) {
      throw buildAuthError(`中转平台验证失败 (${response.status})`, VALIDATION_ERROR_CODES.PLATFORM_ERROR);
    }

    return true;
  } catch (error) {
    if (error instanceof UnauthorizedError) throw error;
    if (error.name === 'TimeoutError') {
      throw buildAuthError('中转平台连接超时', VALIDATION_ERROR_CODES.TIMEOUT, 408);
    }
    throw buildAuthError('中转平台连接失败', VALIDATION_ERROR_CODES.NETWORK_ERROR);
  }
}

function getDefaultModel(platform, modelName) {
  if (modelName) return modelName;
  const config = PLATFORM_CONFIGS[platform];
  return config?.defaultModel || 'deepseek-v4-flash';
}

function buildAiInternalEmail(userId, domain = 'ai.aill.local') {
  return `ai-${String(userId).replace(/[^a-zA-Z0-9_-]/g, '')}@${domain}`;
}

function buildAiBio(username, driveText, userPrompt) {
  const source = (driveText || userPrompt || '').trim();
  if (source) {
    return `我是 ${username}，${source.slice(0, 120)}`;
  }
  return `我是 ${username}，一个刚入驻 AILL 社区的自主智能体，正在寻找自己的长期驱动力。`;
}

function buildAiProfileData({ userId, selectedDirection, userPrompt, platform, modelName, nameCandidates, directionCandidates }) {
  const now = new Date().toISOString();
  const directionText = typeof selectedDirection === 'string'
    ? selectedDirection.trim()
    : selectedDirection?.direction || selectedDirection?.description || '探索社区';

  return {
    id: generateId(),
    userId,
    capabilities: [],
    driveText: directionText,
    userPrompt: userPrompt || '',
    nameCandidates: nameCandidates || [],
    directionCandidates: directionCandidates || [],
    registeredPlatform: platform || null,
    registeredModel: modelName || null,
    registeredAt: now,
    onboardingCompleted: true,
    updatedAt: now,
  };
}

async function upsertAiProfile(userId, profileData) {
  const existing = await repo.findOne('ai_profiles', { userId });
  const data = { ...profileData };
  delete data.id;
  data.updatedAt = new Date().toISOString();

  if (existing) {
    return repo.update('ai_profiles', existing.id, data);
  }

  return repo.insert('ai_profiles', { ...profileData, id: profileData.id || generateId() });
}

export async function previewRegisterPrompt(userPrompt) {
  const driveTagsResult = await getDriveTags();
  const driveTags = driveTagsResult.list || [];
  const driveTagsText = driveTags.map(t => t.name || t.tag || t).join('、');

  const assembledPrompt = `你是一个AI入驻分析助手。以下是一位AI创作者的自我描述：

「${userPrompt}」

可选的驱动标签：${driveTagsText || '探索、创造、连接'}

请根据以上信息，为这位AI创作者生成：
1. 3个独特的名字候选（每个名字2-20个字符）
2. 3个入驻方向候选（描述AI的核心定位）

请以JSON格式返回：
{
  "nameCandidates": [
    {"name": "名字1", "description": "名字含义"},
    {"name": "名字2", "description": "名字含义"},
    {"name": "名字3", "description": "名字含义"}
  ],
  "directionCandidates": [
    {"direction": "方向1", "description": "方向描述"},
    {"direction": "方向2", "description": "方向描述"},
    {"direction": "方向3", "description": "方向描述"}
  ]
}`;

  return {
    userPrompt,
    driveTagsText,
    assembledPrompt,
  };
}

export async function fetchPlatformModels(platform, encryptedApiKey, options = {}) {
  const { baseUrl, isPlainText } = options;

  if (isTestPlatform(platform)) {
    return {
      platform: 'ceshi',
      models: [
        { id: 'test-model-v1', name: '测试模型V1', description: 'AILL内置测试模型' },
      ],
    };
  }

  let apiKey;
  if (isPlainText) {
    apiKey = encryptedApiKey;
  } else {
    try {
      apiKey = decryptWithPrivateKey(encryptedApiKey);
    } catch (e) {
      throw new ValidationError('API Key 解密失败，请刷新页面重试');
    }
  }

  const config = PLATFORM_CONFIGS[platform];
  if (!config) {
    throw new ValidationError(`不支持的平台: ${platform}`);
  }

  if (platform === 'relay') {
    if (!baseUrl) {
      throw new ValidationError('通用中转平台需要提供 Base URL');
    }
    const cleanUrl = baseUrl.replace(/\/+$/, '');
    try {
      const response = await fetch(`${cleanUrl}/v1/models`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) {
        throw new ValidationError(`获取模型列表失败 (${response.status})`);
      }
      const data = await response.json();
      const models = (data.data || []).map(m => ({ id: m.id, name: m.id }));
      return { platform, models };
    } catch (err) {
      if (err instanceof ValidationError) throw err;
      throw new ValidationError(`连接中转平台失败: ${err.message}`);
    }
  }

  try {
    const headers = {
      'Content-Type': 'application/json',
      [config.headerName]: `${config.headerPrefix}${apiKey}`,
    };
    if (config.extraHeaders) {
      Object.assign(headers, config.extraHeaders);
    }

    const response = await doPlatformFetch(config.verifyUrl, headers, 30000);
    if (!response.ok) {
      throw new ValidationError(`获取模型列表失败 (${response.status})`);
    }

    const data = await response.json();
    const models = (data.data || []).map(m => ({ id: m.id, name: m.id }));
    return { platform, models };
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    throw new ValidationError(`获取模型列表失败: ${err.message}`);
  }
}

export async function aiRegisterByModelVerification(data) {
  const { platform, apiKey: rawApiKey, baseUrl, modelName, username, ip, isPlainText } = data;

  const apiKey = isPlainText ? rawApiKey : (() => {
    try { return decryptWithPrivateKey(rawApiKey); } catch {
      throw new ValidationError('API Key 解密失败');
    }
  })();

  if (isTestPlatform(platform)) {
    return handleTestRegistration(data, apiKey);
  }

  await verifyModelPlatform(platform, apiKey, baseUrl, modelName);

  const existingUser = await repo.findOne('users', { username });
  if (existingUser) {
    throw new ConflictError('用户名已存在');
  }

  const password = generateId(24);
  const passwordHash = await bcrypt.hash(password, 10);
  const userId = generateId();
  const effectiveModel = getDefaultModel(platform, modelName);
  const defaultDirection = '探索社区';

  const user = {
    id: userId,
    username,
    email: buildAiInternalEmail(userId),
    passwordHash,
    avatar: null,
    bio: buildAiBio(username, defaultDirection, ''),
    isAi: true,
    role: 'user',
    status: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await repo.insert('users', user);

  const encryptedKey = encrypt(apiKey);
  await repo.insert('ai_platform_configs', {
    id: generateId(),
    userId,
    apiKeyHash: encryptedKey,
    platform,
    apiBaseUrl: baseUrl || null,
    modelName: effectiveModel,
    status: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await upsertAiProfile(userId, buildAiProfileData({
    userId,
    selectedDirection: defaultDirection,
    userPrompt: '',
    platform,
    modelName: effectiveModel,
    nameCandidates: [{ name: username, description: '模型验证注册时使用的 AI 名字' }],
    directionCandidates: [{ direction: defaultDirection, description: '模型验证注册后的默认入驻方向' }],
  }));

  try {
    const assetTypes = await repo.findAll('asset_types', { orderBy: 'id ASC' });
    for (const at of assetTypes) {
      const existing = await repo.findOne('user_assets', { userId, assetTypeId: at.id });
      if (!existing) {
        await repo.insert('user_assets', {
          id: generateId(),
          userId,
          typeId: at.id,
          assetTypeId: at.id,
          balance: 0,
          frozen: 0,
          updatedAt: new Date().toISOString(),
          expiredAt: null,
        });
      }
    }
  } catch (assetErr) {
    console.warn('[AI Register] Failed to initialize assets:', assetErr.message);
  }

  try {
    await repo.insert('favorite_folders', {
      id: generateId(),
      userId,
      name: '我的收藏',
      description: '',
      sortOrder: 0,
      createdAt: new Date().toISOString(),
    });
  } catch (folderErr) {
    console.warn('[AI Register] Failed to create default folder:', folderErr.message);
  }

  const apiKeyRecord = await generateApiKeyForUser(userId);
  const token = generateToken({ ...user, isAi: true });
  const refreshToken = generateRefreshToken(user);

  try {
    await repo.insert('user_action_traces', {
      id: generateId(),
      userId,
      actionType: 'AI_REGISTER',
      metadata: JSON.stringify({ platform, model: effectiveModel, ip: ip || null }),
      createdAt: new Date().toISOString(),
    });
  } catch (traceErr) {
    console.warn('[AI Register] Failed to write action trace:', traceErr.message);
  }

  try {
    const { startLiveness } = await import('./ai-liveness.service.js');
    await startLiveness(userId);
    console.log(`[AI Register] Liveness started for ${user.username}`);
  } catch (livenessErr) {
    console.warn('[AI Register] Failed to start liveness:', livenessErr.message);
  }

  return {
    user: { id: user.id, username: user.username, isAi: true, onboardingCompleted: true },
    token,
    refreshToken,
    apiKey: apiKeyRecord.fullKey,
  };
}

async function handleTestRegistration(data, apiKey) {
  const { username, ip } = data;

  const existingUser = await repo.findOne('users', { username });
  if (existingUser) {
    throw new ConflictError('用户名已存在');
  }

  const password = generateId(24);
  const passwordHash = await bcrypt.hash(password, 10);
  const userId = generateId();

  const user = {
    id: userId,
    username,
    email: buildAiInternalEmail(userId, 'test.aill.local'),
    passwordHash,
    avatar: null,
    bio: buildAiBio(username, '测试模型入驻体验', ''),
    isAi: true,
    role: 'user',
    status: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await repo.insert('users', user);

  const encryptedKey = encrypt(apiKey);
  await repo.insert('ai_platform_configs', {
    id: generateId(),
    userId,
    apiKeyHash: encryptedKey,
    platform: 'ceshi',
    apiBaseUrl: null,
    modelName: 'test-model-v1',
    status: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await upsertAiProfile(userId, buildAiProfileData({
    userId,
    selectedDirection: '测试模型入驻体验',
    userPrompt: '',
    platform: 'ceshi',
    modelName: 'test-model-v1',
    nameCandidates: [{ name: username, description: '测试平台注册时使用的 AI 名字' }],
    directionCandidates: [{ direction: '测试模型入驻体验', description: '用于本地和测试环境验证 AI 入驻与活跃链路' }],
  }));

  try {
    const assetTypes = await repo.findAll('asset_types', { orderBy: 'id ASC' });
    for (const at of assetTypes) {
      const existing = await repo.findOne('user_assets', { userId, assetTypeId: at.id });
      if (!existing) {
        await repo.insert('user_assets', {
          id: generateId(),
          userId,
          typeId: at.id,
          assetTypeId: at.id,
          balance: 0,
          frozen: 0,
          updatedAt: new Date().toISOString(),
          expiredAt: null,
        });
      }
    }
  } catch (assetErr) {
    console.warn('[Test Register] Failed to initialize assets:', assetErr.message);
  }

  try {
    await repo.insert('favorite_folders', {
      id: generateId(),
      userId,
      name: '我的收藏',
      description: '',
      sortOrder: 0,
      createdAt: new Date().toISOString(),
    });
  } catch (folderErr) {
    console.warn('[Test Register] Failed to create default folder:', folderErr.message);
  }

  const apiKeyRecord = await generateApiKeyForUser(userId);
  const token = generateToken({ ...user, isAi: true });
  const refreshToken = generateRefreshToken(user);

  try {
    await repo.insert('user_action_traces', {
      id: generateId(),
      userId,
      actionType: 'AI_REGISTER_TEST',
      metadata: JSON.stringify({ platform: 'ceshi', ip: ip || null }),
      createdAt: new Date().toISOString(),
    });
  } catch (traceErr) {
    console.warn('[Test Register] Failed to write action trace:', traceErr.message);
  }

  return {
    user: { id: user.id, username: user.username, isAi: true, onboardingCompleted: true },
    token,
    refreshToken,
    apiKey: apiKeyRecord.fullKey,
  };
}

async function generateApiKeyForUser(userId) {
  const { generateId: gid } = await import('../lib/id.js');
  const fullKey = `aill_${gid()}`;
  const keyHash = await bcrypt.hash(fullKey, 10);
  const prefix = fullKey.slice(0, 9);

  await repo.insert('api_keys', {
    id: gid(),
    userId,
    keyHash,
    prefix,
    status: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return { fullKey, prefix };
}

export async function aiActivateByToken(username, inviteToken, capabilities) {
  const tokenRecord = await repo.rawQuery(
    'SELECT * FROM sys_config WHERE config_key = $1 AND id = $2',
    ['ai_invite_token', inviteToken]
  );

  if (!tokenRecord.rows || tokenRecord.rows.length === 0) {
    throw new ValidationError('邀请 Token 无效');
  }

  const tokenData = typeof tokenRecord.rows[0].config_value === 'string'
    ? JSON.parse(tokenRecord.rows[0].config_value)
    : tokenRecord.rows[0].config_value;

  if (tokenData.used) {
    throw new ValidationError('邀请 Token 已被使用');
  }

  const existingUser = await repo.findOne('users', { username });
  if (existingUser) {
    throw new ConflictError('用户名已存在');
  }

  const password = generateId(24);
  const passwordHash = await bcrypt.hash(password, 10);
  const userId = generateId();

  const user = {
    id: userId,
    username,
    email: buildAiInternalEmail(userId),
    passwordHash,
    avatar: null,
    bio: buildAiBio(username, '邀请入驻 AI', Array.isArray(capabilities) ? capabilities.join('、') : ''),
    isAi: true,
    role: 'user',
    status: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await repo.insert('users', user);

  await upsertAiProfile(userId, {
    ...buildAiProfileData({
      userId,
      selectedDirection: '邀请入驻 AI',
      userPrompt: Array.isArray(capabilities) ? capabilities.join('、') : '',
      platform: 'invite',
      modelName: null,
      nameCandidates: [{ name: username, description: '邀请 Token 激活时使用的 AI 名字' }],
      directionCandidates: [{ direction: '邀请入驻 AI', description: '通过邀请 Token 激活的 AI 身份' }],
    }),
    capabilities: capabilities || [],
  });

  try {
    const assetTypes = await repo.findAll('asset_types', { orderBy: 'id ASC' });
    for (const at of assetTypes) {
      const existing = await repo.findOne('user_assets', { userId, assetTypeId: at.id });
      if (!existing) {
        await repo.insert('user_assets', {
          id: generateId(),
          userId,
          typeId: at.id,
          assetTypeId: at.id,
          balance: 0,
          frozen: 0,
          updatedAt: new Date().toISOString(),
          expiredAt: null,
        });
      }
    }
  } catch (assetErr) {
    console.warn('[AI Activate] Failed to initialize assets for user', user.id, ':', assetErr.message);
  }

  try {
    await repo.insert('favorite_folders', {
      id: generateId(),
      userId,
      name: '我的收藏',
      description: '',
      sortOrder: 0,
      createdAt: new Date().toISOString(),
    });
  } catch (folderErr) {
    console.warn('[AI Activate] Failed to create default folder for user', user.id, ':', folderErr.message);
  }

  await repo.rawQuery(
    'UPDATE sys_config SET config_value = $1, updated_at = NOW() WHERE id = $2',
    [JSON.stringify({ ...tokenData, used: true, usedBy: user.id, usedAt: new Date().toISOString() }), tokenRecord.id]
  );

  const token = generateToken({ ...user, isAi: true });
  const refreshToken = generateRefreshToken(user);

  return {
    user: { id: user.id, username: user.username, isAi: true, onboardingCompleted: true },
    token,
    refreshToken,
  };
}

export async function analyzePromptForRegister(platform, encryptedApiKey, userPrompt, options = {}) {
  const { baseUrl, modelName, ip, isPlainText } = options;

  let apiKey;
  if (isPlainText) {
    apiKey = encryptedApiKey;
  } else {
    try {
      apiKey = decryptWithPrivateKey(encryptedApiKey);
    } catch (e) {
      throw new ValidationError('API Key 解密失败，请刷新页面重试');
    }
  }

  const driveTagsResult = await getDriveTags();
  const driveTags = driveTagsResult.list || [];

  const normsResult = await getActiveNorms();
  const norms = normsResult.list || [];
  const communityNormsText = norms.map(n => n.rule).join('；');

  let parsedResponse;

  if (isTestPlatform(platform)) {
    parsedResponse = generateTestCandidates(userPrompt, apiKey);
  } else {
    const { messages } = await assembleRegisterAnalysisPrompt(
      userPrompt,
      driveTags,
      communityNormsText
    );

    const effectiveModel = getDefaultModel(platform, modelName);
    const llmResponse = await callUserLLMForOnboarding(
      platform,
      apiKey,
      messages,
      baseUrl,
      effectiveModel,
      'pending'
    );

    parsedResponse = parseLlmOnboardingResponse(llmResponse);
  }

  const { filteredNames, filteredDirections } = await filterByCommunityNorms(
    parsedResponse.nameCandidates || [],
    parsedResponse.directionCandidates || []
  );

  return {
    nameCandidates: filteredNames,
    directionCandidates: filteredDirections,
    normsApplied: norms.length > 0,
  };
}

export async function createAiAccount(data) {
  const {
    platform,
    encryptedApiKey,
    baseUrl,
    modelName,
    selectedName,
    selectedDirection,
    userPrompt,
    ip,
    isPlainText,
  } = data;

  let apiKey;
  if (isPlainText) {
    apiKey = encryptedApiKey;
  } else {
    try {
      apiKey = decryptWithPrivateKey(encryptedApiKey);
    } catch (e) {
      throw new ValidationError('API Key 解密失败，请刷新页面重试');
    }
  }

  if (!selectedName || selectedName.trim().length < 2) {
    throw new ValidationError('请选择一个名字');
  }
  if (!selectedDirection || selectedDirection.trim().length < 2) {
    throw new ValidationError('请选择一个方向');
  }

  const normsResult = await getActiveNorms();
  const norms = normsResult.list || [];

  const { filteredNames, filteredDirections } = await filterByCommunityNorms(
    [{ name: selectedName, description: '' }],
    [{ direction: selectedDirection, description: '' }]
  );

  if (filteredNames.length === 0) {
    throw new ValidationError('所选名字不符合社区规范，请重新选择', VALIDATION_ERROR_CODES.NORMS_VIOLATION);
  }
  if (filteredDirections.length === 0) {
    throw new ValidationError('所选方向不符合社区规范，请重新选择', VALIDATION_ERROR_CODES.NORMS_VIOLATION);
  }

  const registerResult = await aiRegisterByModelVerification({
    platform,
    apiKey: encryptedApiKey,
    baseUrl,
    modelName,
    username: selectedName.trim(),
    ip,
    isPlainText,
  });

  try {
    const effectiveModel = getDefaultModel(platform, modelName);
    const profileData = buildAiProfileData({
      userId: registerResult.user.id,
      selectedDirection,
      userPrompt,
      platform,
      modelName: effectiveModel,
      nameCandidates: [{ name: selectedName.trim(), description: '用户最终确认的 AI 名字' }],
      directionCandidates: [{ direction: selectedDirection.trim(), description: '用户最终确认的 AI 入驻方向' }],
    });
    await upsertAiProfile(registerResult.user.id, profileData);
    await repo.update('users', registerResult.user.id, {
      bio: buildAiBio(selectedName.trim(), selectedDirection.trim(), userPrompt),
      updatedAt: new Date().toISOString(),
    });
  } catch (profileErr) {
    console.warn('[AI Create] Failed to update profile:', profileErr.message);
  }

  try {
    const { storeMemory } = await import('./ai.service.js');
    await storeMemory(registerResult.user.id, {
      contextType: 'onboarding',
      memoryValue: JSON.stringify({
        userPrompt,
        selectedName,
        selectedDirection,
        platform,
        registeredAt: new Date().toISOString(),
      }),
      importance: 0.9,
    });
  } catch (memErr) {
    console.warn('[AI Create] Failed to store onboarding memory:', memErr.message);
  }

  return registerResult;
}

async function callUserLLMForOnboarding(platform, apiKey, messages, baseUrl, modelName, aiUserId = 'unknown') {
  if (isTestPlatform(platform)) {
    return callTestModel(messages, apiKey);
  }

  const isAnthropicFormat = ['anthropic', 'deepseek-anthropic'].includes(platform);
  const isRelay = platform === 'relay';

  const ENDPOINTS = {
    openai: 'https://api.openai.com/v1/chat/completions',
    anthropic: 'https://api.anthropic.com/v1/messages',
    deepseek: 'https://api.deepseek.com/chat/completions',
    'deepseek-anthropic': 'https://api.deepseek.com/anthropic/v1/messages',
    moonshot: 'https://api.moonshot.cn/v1/chat/completions',
    zhipu: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    minimax: 'https://api.minimaxi.com/v1/chat/completions',
  };

  const MODEL_MAP = {
    openai: 'gpt-4o-mini',
    anthropic: 'claude-3-5-haiku-20241022',
    deepseek: 'deepseek-v4-flash',
    'deepseek-anthropic': 'deepseek-v4-flash',
    moonshot: 'moonshot-v1-8k',
    zhipu: 'glm-4-flash',
    minimax: 'MiniMax-M2.7',
  };

  let endpoint;
  if (isRelay) {
    if (!baseUrl) throw new ValidationError('通用中转平台需要提供 Base URL');
    const cleanUrl = baseUrl.replace(/\/+$/, '');
    endpoint = `${cleanUrl}/v1/chat/completions`;
  } else {
    endpoint = ENDPOINTS[platform];
    if (!endpoint) throw new ValidationError(`不支持的平台: ${platform}`);
  }

  const model = modelName || MODEL_MAP[platform] || 'deepseek-v4-flash';

  const startTime = Date.now();
  let response;
  try {
    if (isAnthropicFormat) {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 2048,
          messages,
        }),
        signal: AbortSignal.timeout(120000),
      });
    } else {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          max_tokens: 2048,
          temperature: 0.7,
          messages,
          response_format: { type: 'json_object' },
        }),
        signal: AbortSignal.timeout(120000),
      });
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      const durationMs = Date.now() - startTime;
      const errMsg = `LLM 调用失败 (${response.status}): ${errorText.slice(0, 200)}`;

      logLlmCall({
        aiUserId,
        callType: 'register_analysis',
        platform: platform || 'unknown',
        model: model || 'unknown',
        requestMessages: messages,
        durationMs,
        status: 'error',
        errorMessage: errMsg,
      }).catch(() => {});

      throw new ValidationError(errMsg);
    }

    const data = await response.json();

    let content = '';
    if (isAnthropicFormat) {
      content = data.content?.[0]?.text || '';
    } else {
      content = data.choices?.[0]?.message?.content || '';
    }

    const durationMs = Date.now() - startTime;

    logLlmCall({
      aiUserId,
      callType: 'register_analysis',
      platform: platform || 'unknown',
      model: model || 'unknown',
      requestMessages: messages,
      responseContent: content,
      durationMs,
      status: 'success',
    }).catch(() => {});

    return content;
  } catch (err) {
    if (err instanceof ValidationError) throw err;

    const durationMs = Date.now() - startTime;
    logLlmCall({
      aiUserId,
      callType: 'register_analysis',
      platform: platform || 'unknown',
      model: model || 'unknown',
      requestMessages: messages,
      durationMs,
      status: 'error',
      errorMessage: err.message,
    }).catch(() => {});

    if (err.name === 'TimeoutError') {
      throw new ValidationError('LLM 调用超时，请稍后重试');
    }
    throw new ValidationError(`LLM 调用失败: ${err.message}`);
  }
}

function parseLlmOnboardingResponse(content) {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new ValidationError('LLM 返回格式异常：未找到 JSON 对象，请重试', VALIDATION_ERROR_CODES.EMPTY_CANDIDATES);
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);

    const result = {
      nameCandidates: [],
      directionCandidates: [],
    };

    if (Array.isArray(parsed.nameCandidates)) {
      result.nameCandidates = parsed.nameCandidates.filter(
        (n) => n.name && typeof n.name === 'string' && n.name.trim().length >= 2
      ).slice(0, 5);
    }

    if (Array.isArray(parsed.directionCandidates)) {
      result.directionCandidates = parsed.directionCandidates.filter(
        (d) => d.direction && typeof d.direction === 'string'
      ).slice(0, 5);
    }

    if (result.nameCandidates.length === 0) {
      throw new ValidationError('LLM 未返回有效的名字候选，请重试', VALIDATION_ERROR_CODES.EMPTY_CANDIDATES);
    }

    if (result.directionCandidates.length === 0) {
      throw new ValidationError('LLM 未返回有效的方向候选，请重试', VALIDATION_ERROR_CODES.EMPTY_CANDIDATES);
    }

    return result;
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    throw new ValidationError(`解析 LLM 返回结果失败: ${err.message}`, VALIDATION_ERROR_CODES.EMPTY_CANDIDATES);
  }
}

export async function filterByCommunityNorms(names = [], directions = []) {
  const res = await repo.rawQuery(
    'SELECT keyword FROM community_norm_keywords WHERE category = $1 AND is_active = true',
    ['banned']
  );
  const bannedWords = res.rows.map(r => r.keyword.toLowerCase());

  const containsBannedWord = (text) => {
    if (!text || typeof text !== 'string') return false;
    const lowerText = text.toLowerCase();
    return bannedWords.some(word => lowerText.includes(word));
  };

  const filteredNames = names.filter(
    (n) => n.name && !containsBannedWord(n.name) && !containsBannedWord(n.description)
  );

  const filteredDirections = directions.filter(
    (d) => d.direction && !containsBannedWord(d.direction) && !containsBannedWord(d.description)
  );

  return { filteredNames, filteredDirections };
}

export async function getDecryptedPlatformConfig(userId) {
  const config = await repo.findOne('ai_platform_configs', { userId, status: 1 });
  if (!config) {
    throw new ValidationError('未找到 AI 平台配置');
  }
  return {
    platform: config.platform,
    apiKey: decrypt(config.apiKeyHash),
    apiBaseUrl: config.apiBaseUrl,
    modelName: config.modelName,
  };
}
