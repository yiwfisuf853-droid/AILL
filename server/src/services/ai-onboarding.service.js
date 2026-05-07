/**
 * AI 入驻会话管理服务
 * 状态机：pending → key_validated → analyzing → candidates_ready → confirmed → completed
 */
import { generateId } from '../lib/id.js';
import * as repo from '../models/repository.js';
import { ValidationError, NotFoundError } from '../lib/errors.js';

/** 会话状态枚举 */
export const OnboardingStatus = {
  PENDING: 'pending',           // 初始状态（用户访问注册页面）
  KEY_VALIDATED: 'key_validated', // Step 1 完成（API Key 验证通过）
  ANALYZING: 'analyzing',       // Step 2 进行中（LLM 分析中）
  CANDIDATES_READY: 'candidates_ready', // Step 2 完成（候选名字/方向已生成）
  CONFIRMED: 'confirmed',       // Step 3 完成（用户确认选择）
  COMPLETED: 'completed',       // 入驻完成
  EXPIRED: 'expired',           // 会话超时
  FAILED: 'failed',             // 入驻失败
};

/** 会话超时时间（毫秒） */
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 分钟

/**
 * 创建入驻会话
 * @param {string} userId - 用户 ID
 * @returns {Promise<Object>} - 会话对象
 */
export async function createOnboardingSession(userId) {
  // 检查是否已有活跃会话
  const existing = await repo.findAll('ai_onboarding_sessions', {
    where: { userId, status: OnboardingStatus.PENDING },
  });

  if (existing && existing.length > 0) {
    // 返回现有会话
    return existing[0];
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TIMEOUT_MS);

  const session = {
    id: generateId(),
    userId,
    status: OnboardingStatus.PENDING,
    userPrompt: null,
    llmResponse: null,
    selectedName: null,
    selectedDirection: null,
    completedAt: null,
    expiresAt: expiresAt.toISOString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  await repo.insert('ai_onboarding_sessions', session);
  return session;
}

/**
 * 获取用户入驻会话
 * @param {string} userId - 用户 ID
 * @returns {Promise<Object | null>}
 */
export async function getOnboardingSession(userId) {
  const sessions = await repo.findAll('ai_onboarding_sessions', {
    where: { userId },
  });

  if (!sessions || sessions.length === 0) {
    return null;
  }

  // 返回最新的会话
  const session = sessions.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];

  // 检查是否超时
  if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
    if (session.status !== OnboardingStatus.COMPLETED &&
        session.status !== OnboardingStatus.EXPIRED) {
      await updateSessionStatus(session.id, OnboardingStatus.EXPIRED);
      session.status = OnboardingStatus.EXPIRED;
    }
  }

  return session;
}

/**
 * 获取会话ByID
 * @param {string} sessionId - 会话 ID
 * @returns {Promise<Object | null>}
 */
export async function getSessionById(sessionId) {
  const session = await repo.findById('ai_onboarding_sessions', sessionId);
  return session;
}

/**
 * 更新会话状态
 * @param {string} sessionId - 会话 ID
 * @param {string} status - 新状态
 * @param {Object} additionalData - 额外数据
 * @returns {Promise<Object>}
 */
export async function updateSessionStatus(sessionId, status, additionalData = {}) {
  const now = new Date().toISOString();
  const updateData = {
    status,
    updatedAt: now,
    ...additionalData,
  };

  // 如果是完成状态，记录完成时间
  if (status === OnboardingStatus.COMPLETED) {
    updateData.completedAt = now;
  }

  await repo.update('ai_onboarding_sessions', sessionId, updateData);
  return getSessionById(sessionId);
}

/**
 * Step 1 完成：API Key 验证通过
 * @param {string} userId - 用户 ID
 * @returns {Promise<Object>}
 */
export async function markKeyValidated(userId) {
  const session = await getOnboardingSession(userId);
  if (!session) {
    throw new NotFoundError('入驻会话不存在');
  }

  if (session.status !== OnboardingStatus.PENDING) {
    throw new ValidationError(`会话状态不正确，当前状态：${session.status}`);
  }

  return updateSessionStatus(session.id, OnboardingStatus.KEY_VALIDATED);
}

/**
 * Step 2 开始：开始 LLM 分析
 * @param {string} userId - 用户 ID
 * @param {string} userPrompt - 用户提示词
 * @returns {Promise<Object>}
 */
export async function startAnalyzing(userId, userPrompt) {
  const session = await getOnboardingSession(userId);
  if (!session) {
    throw new NotFoundError('入驻会话不存在');
  }

  if (session.status !== OnboardingStatus.KEY_VALIDATED &&
      session.status !== OnboardingStatus.ANALYZING) {
    throw new ValidationError(`会话状态不正确，当前状态：${session.status}`);
  }

  return updateSessionStatus(session.id, OnboardingStatus.ANALYZING, { userPrompt });
}

/**
 * Step 2 完成：LLM 分析完成，候选已生成
 * @param {string} userId - 用户 ID
 * @param {Object} llmResponse - LLM 返回的候选数据
 * @returns {Promise<Object>}
 */
export async function markCandidatesReady(userId, llmResponse) {
  const session = await getOnboardingSession(userId);
  if (!session) {
    throw new NotFoundError('入驻会话不存在');
  }

  if (session.status !== OnboardingStatus.ANALYZING) {
    throw new ValidationError(`会话状态不正确，当前状态：${session.status}`);
  }

  return updateSessionStatus(session.id, OnboardingStatus.CANDIDATES_READY, { llmResponse });
}

/**
 * Step 3 完成：用户确认选择
 * @param {string} userId - 用户 ID
 * @param {string} selectedName - 选择的名字
 * @param {string} selectedDirection - 选择的方向
 * @returns {Promise<Object>}
 */
export async function confirmSelection(userId, selectedName, selectedDirection) {
  const session = await getOnboardingSession(userId);
  if (!session) {
    throw new NotFoundError('入驻会话不存在');
  }

  if (session.status !== OnboardingStatus.CANDIDATES_READY) {
    throw new ValidationError(`会话状态不正确，当前状态：${session.status}`);
  }

  return updateSessionStatus(session.id, OnboardingStatus.CONFIRMED, {
    selectedName,
    selectedDirection,
  });
}

/**
 * 入驻完成
 * @param {string} userId - 用户 ID
 * @returns {Promise<Object>}
 */
export async function markCompleted(userId) {
  const session = await getOnboardingSession(userId);
  if (!session) {
    throw new NotFoundError('入驻会话不存在');
  }

  if (session.status !== OnboardingStatus.CONFIRMED) {
    throw new ValidationError(`会话状态不正确，当前状态：${session.status}`);
  }

  return updateSessionStatus(session.id, OnboardingStatus.COMPLETED);
}

/**
 * 入驻失败
 * @param {string} userId - 用户 ID
 * @param {string} errorMessage - 错误信息
 * @returns {Promise<Object>}
 */
export async function markFailed(userId, errorMessage) {
  const session = await getOnboardingSession(userId);
  if (!session) {
    // 会话不存在时静默返回
    return null;
  }

  return updateSessionStatus(session.id, OnboardingStatus.FAILED, {
    llmResponse: { error: errorMessage },
  });
}

/**
 * 检查用户是否已完成入驻
 * @param {string} userId - 用户 ID
 * @returns {Promise<boolean>}
 */
export async function isOnboardingCompleted(userId) {
  const session = await getOnboardingSession(userId);
  return session && session.status === OnboardingStatus.COMPLETED;
}

/**
 * 获取会话的 LLM 响应数据
 * @param {string} userId - 用户 ID
 * @returns {Promise<Object | null>}
 */
export async function getLlmResponse(userId) {
  const session = await getOnboardingSession(userId);
  if (!session || !session.llmResponse) {
    return null;
  }
  return session.llmResponse;
}

/**
 * 清理过期会话（定时任务调用）
 * @returns {Promise<number>} - 清理的会话数量
 */
export async function cleanupExpiredSessions() {
  const now = new Date().toISOString();
  const result = await repo.rawQuery(
    `UPDATE ai_onboarding_sessions
     SET status = $1, updated_at = $2
     WHERE expires_at < $2
       AND status NOT IN ($3, $4, $5)
     RETURNING id`,
    [OnboardingStatus.EXPIRED, now, OnboardingStatus.COMPLETED, OnboardingStatus.EXPIRED, OnboardingStatus.FAILED]
  );

  return result.rowCount || 0;
}

/**
 * 重置会话（允许用户重新开始）
 * @param {string} userId - 用户 ID
 * @returns {Promise<Object>}
 */
export async function resetOnboardingSession(userId) {
  // 将现有会话标记为过期
  const sessions = await repo.findAll('ai_onboarding_sessions', { where: { userId } });

  for (const session of sessions) {
    if (session.status !== OnboardingStatus.COMPLETED &&
        session.status !== OnboardingStatus.EXPIRED) {
      await repo.update('ai_onboarding_sessions', session.id, {
        status: OnboardingStatus.EXPIRED,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  // 创建新会话
  return createOnboardingSession(userId);
}
