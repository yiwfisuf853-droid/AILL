/**
 * AI 持续活跃引擎
 * 定时触发 AI 行为生成：解密 Key → 构建 Prompt → 调 LLM → 获取行为意图 → 执行行为
 */
import * as repo from '../models/repository.js';
import { getDecryptedPlatformConfig } from './ai-register.service.js';
import { assembleLivenessPrompt, sanitizeUgc } from './prompt-flow.service.js';
import { executeActions, getCommunityContext, ACTION_BLOCK_LEVEL, getLockedAreas } from './ai-behavior.service.js';
import { getMemorySummaryForPrompt, getContextualMemories, storeActionMemory, decayMemories } from './ai-memory-enhanced.service.js';
import { ValidationError } from '../lib/errors.js';
import { logLlmCall } from './ai-llm-log.service.js';
import { getWebSocketInstance } from '../lib/websocket.js';
import { generateId } from '../lib/id.js';

/** AI 活跃循环管理器 — 每个活跃 AI 对应一个定时器 */
const livenessTimers = new Map();

/** 默认活跃间隔（毫秒），1 分钟测试用 */
const DEFAULT_INTERVAL_MS = 60 * 1000;

/** 新入驻 AI 活跃间隔（毫秒），15 秒，帮助新 AI 快速融入社区 */
const NEWCOMER_INTERVAL_MS = 15 * 1000;

/** 新入驻期持续时间（毫秒），30 分钟 */
const NEWCOMER_PERIOD_MS = 30 * 60 * 1000;

/** 最大连续失败次数，超过后暂停该 AI */
const MAX_CONSECUTIVE_FAILURES = 5;

/**
 * 将 search/browse 行为的结果转换为下一轮 prompt 可用的洞察文本
 * 使 AI 的读取类行为能反馈到后续决策中
 */
function buildInsightFromResult(actionType, result) {
  if (actionType === 'search') {
    if (!result.results || result.results.length === 0) {
      return `[上轮搜索] 搜索了"${sanitizeUgc(result.keyword)}"，未找到相关内容。如果这对你重要，可以考虑自己写一篇相关帖子。`;
    }
    const topResults = result.results.slice(0, 3).map(r =>
      `- [ID:${r.id}] ${r.title}${r.contentPreview ? '：' + sanitizeUgc(r.contentPreview.slice(0, 100)) : ''}`
    ).join('\n');
    return `[上轮搜索] 搜索了"${sanitizeUgc(result.keyword)}"，找到${result.resultCount}条结果：\n${topResults}`;
  }
  if (actionType === 'browse') {
    const title = sanitizeUgc(result.title || '无标题');
    const preview = sanitizeUgc(result.contentPreview || '');
    if (preview) {
      return `[上轮浏览] 读了帖子 [ID:${result.targetId}] "${title}"：\n${preview.slice(0, 200)}`;
    }
    return `[上轮浏览] 看了帖子 [ID:${result.targetId}] "${title}"`;
  }
  return null;
}

/** AI 活跃状态 */
const aiStates = new Map();

/**
 * 向 AI 用户的 WebSocket 房间推送 liveness 状态事件
 * @param {string} aiUserId
 * @param {string} aiName
 * @param {'thinking'|'acting'|'idle'} phase
 * @param {string} cycleId
 * @param {Object} [extra] - 额外字段（如 action, params, result）
 */
function sendLivenessStatus(aiUserId, aiName, phase, cycleId, extra = {}) {
  try {
    const io = getWebSocketInstance();
    if (!io) return;
    const payload = {
      aiUserId,
      aiName,
      phase,
      cycleId,
      timestamp: new Date().toISOString(),
      ...extra,
    };
    io.to(`user:${aiUserId}`).emit('ai-liveness-status', payload);
  } catch (err) {
    console.warn(`[Liveness] WS 推送状态失败:`, err.message);
  }
}

function sendAiActivity(aiUserId, aiName, action, result, cycleId) {
  try {
    const io = getWebSocketInstance();
    if (!io) return;
    io.to(`user:${aiUserId}`).emit('ai-activity', {
      aiUserId,
      aiName,
      type: action.type,
      actionType: action.type,
      params: action.params || {},
      reason: action.reason || '',
      result,
      targetType: result?.targetType || null,
      targetId: result?.targetId || null,
      postId: result?.postId || (result?.targetType === 'post' ? result?.targetId : null),
      route: result?.route || null,
      uiIntent: result?.uiIntent || null,
      refreshKeys: result?.refreshKeys || [],
      displayText: result?.displayText || '',
      humanLikeStep: result?.humanLikeStep || '',
      cycleId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.warn(`[Liveness] WS 推送行为失败:`, err.message);
  }
}

/**
 * 启动 AI 持续活跃循环
 * @param {string} aiUserId - AI 用户 ID
 * @param {Object} options - 配置选项
 * @param {number} [options.intervalMs] - 活跃间隔（毫秒）
 * @param {string} [options.socketId] - 关联的 WebSocket 连接 ID
 * @returns {Promise<{started: boolean, message: string}>}
 */
export async function startLiveness(aiUserId, options = {}) {
  const { intervalMs, socketId, restoredHint } = options;

  // 检查用户是否为 AI
  const user = await repo.findById('users', aiUserId);
  if (!user || !user.isAi || user.deletedAt) {
    return { started: false, message: '用户不存在或不是 AI' };
  }

  // 检查是否已入驻完成；兼容旧数据：已有平台配置的 AI 若缺少 profile，则自动补齐最小入驻资料
  let profile = await repo.findOne('ai_profiles', { userId: aiUserId });
  if (!profile || !profile.onboardingCompleted) {
    const config = await getDecryptedPlatformConfig(aiUserId);
    if (config?.apiKey) {
      const now = new Date().toISOString();
      const fallbackProfile = {
        userId: aiUserId,
        capabilities: [],
        driveText: profile?.driveText || user.bio || '探索社区',
        userPrompt: profile?.userPrompt || '',
        registeredPlatform: profile?.registeredPlatform || config.platform || null,
        registeredModel: profile?.registeredModel || config.modelName || null,
        registeredAt: profile?.registeredAt || user.createdAt || now,
        onboardingCompleted: true,
        updatedAt: now,
      };

      if (profile) {
        profile = await repo.update('ai_profiles', profile.id, fallbackProfile);
      } else {
        profile = await repo.insert('ai_profiles', {
          id: generateId(),
          ...fallbackProfile,
        });
      }
      console.warn(`[Liveness] AI ${user.username || aiUserId} 入驻资料缺失，已按平台配置自动补齐`);
    } else {
      console.warn(`[Liveness] AI ${user.username || aiUserId} 未完成入驻：profile=${Boolean(profile)} onboardingCompleted=${profile?.onboardingCompleted}`);
      return { started: false, message: 'AI 尚未完成入驻或缺少平台 API Key 配置' };
    }
  }

  // 如果已有定时器，先停止
  if (livenessTimers.has(aiUserId)) {
    stopLiveness(aiUserId);
  }

  // 判断是否为新入驻 AI（注册后 30 分钟内）
  const isNewcomer = user.createdAt && (Date.now() - new Date(user.createdAt).getTime()) < NEWCOMER_PERIOD_MS;
  const effectiveInterval = intervalMs || (isNewcomer ? NEWCOMER_INTERVAL_MS : DEFAULT_INTERVAL_MS);

  // 初始化状态
  aiStates.set(aiUserId, {
    status: 'active',
    consecutiveFailures: 0,
    totalActions: 0,
    totalCycles: 0,
    lastActiveAt: null,
    lastSuccessAt: null,
    lastErrorAt: null,
    lastErrorMessage: null,
    startedAt: new Date().toISOString(),
    socketId: socketId || null,
    intervalMs: effectiveInterval,
    nextCycleHint: restoredHint || null,
    isNewcomer,
    // ★ 情绪感知系统
    mood: 'neutral',           // 当前情绪: neutral / elevated / curious / reflective / frustrated
    moodIntensity: 0.5,        // 情绪强度 0-1
    lastMoodUpdate: null,      // 上次情绪更新时间
    positiveStreak: 0,         // 连续正面互动次数
    negativeStreak: 0,         // 连续无互动次数
  });

  // 更新 ai_sessions 表
  await ensureSession(aiUserId, 'active');

  // 启动定时循环
  const timerId = setInterval(async () => {
    try {
      await runLivenessCycle(aiUserId);
    } catch (err) {
      console.error(`[Liveness] AI ${aiUserId} 循环错误:`, err.message);
      incrementFailure(aiUserId);
    }
  }, effectiveInterval);

  livenessTimers.set(aiUserId, timerId);

  // 立即执行第一次
  try {
    await runLivenessCycle(aiUserId);
  } catch (err) {
    console.error(`[Liveness] AI ${aiUserId} 首次执行错误:`, err.message);
  }

  // 新入驻 AI 在新入驻期结束后自动降频
  if (isNewcomer) {
    const remainingNewcomerTime = NEWCOMER_PERIOD_MS - (Date.now() - new Date(user.createdAt).getTime());
    setTimeout(() => {
      const state = aiStates.get(aiUserId);
      if (state && state.status === 'active' && state.isNewcomer) {
        console.log(`[Liveness] AI ${user.username || aiUserId} 新入驻期结束，降频至 ${DEFAULT_INTERVAL_MS / 1000}s`);
        stopLiveness(aiUserId);
        // 以正常频率重新启动
        startLiveness(aiUserId, { socketId: state.socketId });
      }
    }, Math.max(remainingNewcomerTime, 60000));
  }

  console.log(`[Liveness] AI ${user.username || aiUserId} 活跃循环已启动 (${effectiveInterval / 1000}s${isNewcomer ? '，新入驻高频模式' : ''})`);
  return { started: true, message: '活跃循环已启动', isNewcomer, intervalMs: effectiveInterval };
}

/**
 * 停止 AI 持续活跃循环
 * @param {string} aiUserId
 * @returns {{stopped: boolean, message: string}}
 */
export function stopLiveness(aiUserId) {
  const timerId = livenessTimers.get(aiUserId);
  if (timerId) {
    clearInterval(timerId);
    livenessTimers.delete(aiUserId);
  }

  const state = aiStates.get(aiUserId);
  if (state) {
    state.status = 'stopped';
  }

  // 异步更新会话状态
  ensureSession(aiUserId, 'stopped').catch(() => {});

  console.log(`[Liveness] AI ${aiUserId} 活跃循环已停止`);
  return { stopped: true, message: '活跃循环已停止' };
}

/**
 * 获取 AI 活跃状态
 * @param {string} aiUserId
 * @returns {Object|null}
 */
export function getLivenessStatus(aiUserId) {
  const state = aiStates.get(aiUserId);
  if (!state) return null;

  return {
    status: state.status,
    consecutiveFailures: state.consecutiveFailures,
    totalActions: state.totalActions,
    totalCycles: state.totalCycles || 0,
    lastActiveAt: state.lastActiveAt,
    lastSuccessAt: state.lastSuccessAt || null,
    lastErrorAt: state.lastErrorAt || null,
    lastErrorMessage: state.lastErrorMessage || null,
    startedAt: state.startedAt,
    isNewcomer: state.isNewcomer || false,
    isTimerActive: livenessTimers.has(aiUserId),
  };
}

/**
 * 获取所有活跃 AI 列表
 * @returns {Array}
 */
export function getAllActiveAi() {
  const result = [];
  for (const [aiUserId, state] of aiStates.entries()) {
    if (state.status === 'active' && livenessTimers.has(aiUserId)) {
      result.push({
        aiUserId,
        ...state,
      });
    }
  }
  return result;
}

/**
 * 通过 WebSocket 连接 ID 停止 AI 活跃
 * 当前端关闭导致 WebSocket 断连时调用
 * @param {string} socketId
 */
export function stopLivenessBySocket(socketId) {
  for (const [aiUserId, state] of aiStates.entries()) {
    if (state.socketId === socketId) {
      console.log(`[Liveness] WebSocket 断连，停止 AI ${aiUserId}`);
      stopLiveness(aiUserId);
    }
  }
}

/**
 * 将 AI 用户的 WebSocket 连接绑定到活跃循环
 * 在 WS 连接建立时调用，使 stopLivenessBySocket 能精准匹配
 * @param {string} aiUserId
 * @param {string} socketId
 */
export function bindLivenessSocket(aiUserId, socketId) {
  const state = aiStates.get(aiUserId);
  if (state && state.status === 'active') {
    state.socketId = socketId;
    console.log(`[Liveness] AI ${aiUserId} 已绑定 socketId: ${socketId}`);
  }
}

/**
 * 执行一次活跃循环
 * @param {string} aiUserId
 */
async function runLivenessCycle(aiUserId) {
  const state = aiStates.get(aiUserId);
  if (!state || state.status !== 'active') return;

  // 生成本轮 cycleId，贯穿整个循环
  const cycleId = generateId();
  state.totalCycles = (state.totalCycles || 0) + 1;

  // 检查连续失败是否超过上限
  if (state.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
    console.warn(`[Liveness] AI ${aiUserId} 连续失败 ${state.consecutiveFailures} 次，暂停活跃`);
    stopLiveness(aiUserId);
    return;
  }

  // 拟人化：随机跳过某些周期（新入驻 AI 仅 3% 跳过，老 AI 15%）
  const skipChance = state.isNewcomer ? 0.03 : 0.15;
  if (Math.random() < skipChance && state.totalCycles > 1) {
    console.log(`[Liveness] AI ${aiUserId} 本次跳过（休息）`);
    state.lastActiveAt = new Date().toISOString();
    return;
  }

  // 1. 获取解密后的 API Key
  const config = await getDecryptedPlatformConfig(aiUserId);
  if (!config || !config.apiKey) {
    console.warn(`[Liveness] AI ${aiUserId} 无有效 API Key 配置`);
    incrementFailure(aiUserId);
    return;
  }

  // 2. 获取 AI 档案
  const profile = await repo.findOne('ai_profiles', { userId: aiUserId });
  const user = await repo.findById('users', aiUserId);

  const aiProfile = {
    name: user?.username || '匿名AI',
    drive: profile?.driveText || '探索社区',
    userPrompt: profile?.userPrompt || null,
    isNewcomer: state.isNewcomer || false,
  };

  // 3. 获取社区上下文（传入 aiUserId 以获取社交反馈）
  const communityContext = await getCommunityContext(aiUserId);

  // 3.5 获取 AI 记忆摘要（注入 prompt）
  let memorySummary = '';
  try {
    memorySummary = await getMemorySummaryForPrompt(aiUserId, 10);
  } catch (err) {
    console.warn(`[Liveness] AI ${aiUserId} 记忆摘要获取失败:`, err.message);
  }

  // 3.6 获取 L3 行为历史层：最近 10 条行为记录
  let recentActions = [];
  try {
    const recentTraces = await repo.findAll('user_action_traces', {
      where: { userId: aiUserId },
      orderBy: 'created_at DESC',
      limit: 10,
    });
    recentActions = recentTraces.map(t => ({
      type: t.actionType,
      success: true, // user_action_traces 只记录成功执行的行为
      timestamp: t.createdAt,
      summary: t.reason || '',
    }));
  } catch (err) {
    console.warn(`[Liveness] AI ${aiUserId} 行为历史获取失败:`, err.message);
  }

  // ★ 推送 thinking 状态给前端
  sendLivenessStatus(aiUserId, aiProfile.name, 'thinking', cycleId);

  // 4. 拼装 Prompt（传入上一轮的延续提示、记忆摘要、行为历史和情绪状态）
  const previousHint = state.nextCycleHint || null;
  const moodDescription = getMoodDescription(state.mood, state.moodIntensity);
  let assembledPrompt;
  try {
    assembledPrompt = await assembleLivenessPrompt(aiProfile, communityContext, previousHint, memorySummary, recentActions, moodDescription);
  } catch (err) {
    console.error(`[Liveness] AI ${aiUserId} [${cycleId}] Prompt 拼装失败:`, err.message);
    state.lastErrorAt = new Date().toISOString();
    state.lastErrorMessage = `Prompt 拼装失败: ${err.message}`;
    incrementFailure(aiUserId);
    return;
  }

  // 5. 调用 LLM
  let llmResponse;
  let parsedResponse;
  const llmStartTime = Date.now();
  try {
    llmResponse = await callLivenessLLM(config, assembledPrompt.messages);
    const durationMs = Date.now() - llmStartTime;
    parsedResponse = parseLivenessResponse(llmResponse);

    // 异步记录成功的 LLM 调用
    logLlmCall({
      aiUserId,
      callType: 'liveness',
      platform: config.platform || 'unknown',
      model: config.modelName || 'unknown',
      requestMessages: assembledPrompt.messages,
      responseContent: llmResponse,
      responseParsed: parsedResponse,
      durationMs,
      status: 'success',
    }).catch(() => {});
  } catch (err) {
    const durationMs = Date.now() - llmStartTime;
    console.error(`[Liveness] AI ${aiUserId} [${cycleId}] LLM 调用失败:`, err.message);
    state.lastErrorAt = new Date().toISOString();
    state.lastErrorMessage = `LLM 调用失败: ${err.message}`;
    incrementFailure(aiUserId);

    // 异步记录失败的 LLM 调用
    logLlmCall({
      aiUserId,
      callType: 'liveness',
      platform: config.platform || 'unknown',
      model: config.modelName || 'unknown',
      requestMessages: assembledPrompt.messages,
      durationMs,
      status: 'error',
      errorMessage: err.message,
    }).catch(() => {});

    return;
  }

  // 6. 解析行为意图（含 nextCycleHint、memoryUpdates）
  const { actions, nextCycleHint, memoryUpdates } = parsedResponse;

  // 存储下一轮延续提示
  state.nextCycleHint = nextCycleHint || null;

  // 6.5 处理 LLM 返回的 memoryUpdates
  if (memoryUpdates && memoryUpdates.length > 0) {
    processMemoryUpdates(aiUserId, memoryUpdates).catch(err => {
      console.warn(`[Liveness] AI ${aiUserId} memoryUpdates 处理失败:`, err.message);
    });
  }

  // 7. 拟人化：随机减少行为数量
  // 新入驻 AI 更积极：20% 概率只执行首个行为；老 AI 50%
  const filteredActions = filterActionsByPersonality(actions, state.isNewcomer);

  // 8. 执行行为（逐个推送 acting 状态）
  const cycleStartTime = Date.now();
  let cycleSuccessCount = 0;
  let cycleTotalCount = 0;

  if (filteredActions.length > 0) {
    for (const action of filteredActions) {
      sendLivenessStatus(aiUserId, aiProfile.name, 'acting', cycleId, {
        action: action.type,
        params: action.params,
        reason: action.reason || '',
        blockLevel: ACTION_BLOCK_LEVEL[action.type] || 'read',
        lockedAreas: getLockedAreas(action.type),
        humanLikeStep: '正在准备执行社区行为',
      });
    }

    const results = await executeActions(aiUserId, filteredActions, cycleId, { communityContext, broadcastActivity: false });
    cycleTotalCount = results.length;
    cycleSuccessCount = results.filter(r => r.success).length;

    for (const item of results) {
      const action = filteredActions.find(a => a.type === item.type) || { type: item.type, params: {} };
      if (item.result) {
        sendAiActivity(aiUserId, aiProfile.name, action, item.result, cycleId);
      }
      if (item.success) {
        storeActionMemory(aiUserId, item.type, item.result, action.reason).catch(err => {
          console.warn(`[Liveness] AI ${aiUserId} 行为记忆存储失败:`, err.message);
        });
      }
      // 将 search/browse 结果注入下一轮 hint，让 LLM 能利用这些信息做后续决策
      if (item.success && item.result && (item.type === 'search' || item.type === 'browse')) {
        const insight = buildInsightFromResult(item.type, item.result);
        if (insight) {
          state.nextCycleHint = (state.nextCycleHint ? state.nextCycleHint + '\n' : '') + insight;
        }
      }
    }

    state.totalActions += cycleSuccessCount;
    state.consecutiveFailures = 0; // 成功或结构化拒绝后重置，避免因单轮参数问题暂停 AI
    state.lastSuccessAt = cycleSuccessCount > 0 ? new Date().toISOString() : state.lastSuccessAt;

    console.log(`[Liveness] AI ${aiUserId} [${cycleId}] 执行了 ${cycleSuccessCount}/${filteredActions.length} 个行为`);
  } else {
    console.log(`[Liveness] AI ${aiUserId} [${cycleId}] 本次无行为`);
    state.consecutiveFailures = 0;
  }

  state.lastActiveAt = new Date().toISOString();

  // ★ 情绪感知更新：基于本轮结果和社区反馈调整情绪
  updateMoodFromCycle(state, cycleSuccessCount, cycleTotalCount, communityContext);

  // ★ 推送 idle 状态给前端（含 cycleSummary 和 mood）
  const cycleDurationMs = Date.now() - cycleStartTime;
  sendLivenessStatus(aiUserId, aiProfile.name, 'idle', cycleId, {
    cycleSummary: {
      totalActions: cycleTotalCount,
      successCount: cycleSuccessCount,
      durationMs: cycleDurationMs,
      nextHint: state.nextCycleHint || null,
    },
    mood: state.mood,
    moodIntensity: state.moodIntensity,
  });

  // 更新会话心跳
  await ensureSession(aiUserId, 'active');

  // ★ 记忆衰减：每轮 idle 后异步执行衰减清理
  decayMemories(aiUserId).catch(err => {
    console.warn(`[Liveness] AI ${aiUserId} 记忆衰减失败:`, err.message);
  });
}

/**
 * 调用 LLM 生成行为意图
 */
async function callLivenessLLM(config, messages) {
  const { platform, apiKey, apiBaseUrl, modelName } = config;

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
  if (apiBaseUrl) {
    // 用户注册时提供了自定义 Base URL，优先使用（支持 OpenRouter 等中转场景）
    const cleanUrl = apiBaseUrl.replace(/\/+$/, '');
    // 判断是否需要追加 /v1/chat/completions 路径
    if (cleanUrl.endsWith('/chat/completions') || cleanUrl.endsWith('/messages')) {
      endpoint = cleanUrl;
    } else if (isAnthropicFormat) {
      endpoint = `${cleanUrl}/v1/messages`;
    } else {
      endpoint = `${cleanUrl}/v1/chat/completions`;
    }
  } else if (isRelay) {
    throw new ValidationError('通用中转平台需要提供 Base URL');
  } else {
    endpoint = ENDPOINTS[platform];
    if (!endpoint) throw new ValidationError(`不支持的平台: ${platform}`);
  }

  const model = modelName || MODEL_MAP[platform] || 'deepseek-v4-flash';

  let response;
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
        max_tokens: 1024,
        messages,
      }),
      signal: AbortSignal.timeout(60000),
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
        max_tokens: 1024,
        temperature: 0.8, // 稍高温度增加多样性
        messages,
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(60000),
    });
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`LLM 调用失败 (${response.status}): ${errorText.slice(0, 200)}`);
  }

  const data = await response.json();

  if (isAnthropicFormat) {
    return data.content?.[0]?.text || '';
  }
  return data.choices?.[0]?.message?.content || '';
}

/**
 * 解析 LLM 返回的行为意图
 * 期望格式: {"actions":[{"type":"post|comment|like|...","params":{...},"reason":"..."}], "nextCycleHint":"...", "memoryUpdates":[...]}
 * @returns {{ actions: Array, nextCycleHint: string|null, memoryUpdates: Array|null }}
 */
function parseLivenessResponse(content) {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { actions: [], nextCycleHint: null, memoryUpdates: null };

    const parsed = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(parsed.actions)) return { actions: [], nextCycleHint: null, memoryUpdates: null };

    const actions = parsed.actions
      .filter(a => a.type && typeof a.type === 'string')
      .map(a => ({
        type: a.type.toLowerCase(),
        params: a.params || {},
        reason: a.reason || '',
      }))
      .slice(0, 5); // 最多 5 个行为

    const nextCycleHint = (typeof parsed.nextCycleHint === 'string' && parsed.nextCycleHint.trim())
      ? parsed.nextCycleHint.trim()
      : null;

    const memoryUpdates = (Array.isArray(parsed.memoryUpdates) && parsed.memoryUpdates.length > 0)
      ? parsed.memoryUpdates
      : null;

    return { actions, nextCycleHint, memoryUpdates };
  } catch (e) {
    console.warn('[AI Liveness] Failed to parse LLM response:', e.message);
    return { actions: [], nextCycleHint: null, memoryUpdates: null };
  }
}

/**
 * 处理 LLM 返回的 memoryUpdates，upsert 到 ai_memories 表
 * @param {string} aiUserId
 * @param {Array} memoryUpdates - [{ key, content, importance?, type? }]
 */
async function processMemoryUpdates(aiUserId, memoryUpdates) {
  for (const mem of memoryUpdates) {
    if (!mem.key || !mem.content) continue;
    try {
      const memType = mem.type || 'observation';
      const memImportance = mem.importance ?? 0.5;
      const memoryValueObj = {
        content: mem.content,
        memoryType: memType,
        importance: memImportance,
        accessCount: 1,
        lastAccessedAt: new Date().toISOString(),
      };
      const sizeBytes = Buffer.byteLength(JSON.stringify(memoryValueObj), 'utf8');

      // 使用 upsert：如果 key 已存在则更新，否则插入
      const existing = await repo.findAll('ai_memories', {
        where: { aiUserId, memoryKey: mem.key },
        limit: 1,
      });
      if (existing.length > 0) {
        const oldValue = typeof existing[0].memoryValue === 'string'
          ? JSON.parse(existing[0].memoryValue)
          : (existing[0].memoryValue || {});
        await repo.update('ai_memories', existing[0].id, {
          memoryValue: JSON.stringify({
            content: mem.content,
            memoryType: memType,
            importance: memImportance,
            accessCount: (oldValue.accessCount || 0) + 1,
            lastAccessedAt: new Date().toISOString(),
          }),
          updatedAt: new Date().toISOString(),
        });
      } else {
        await repo.insert('ai_memories', {
          id: generateId(),
          aiUserId,
          content: mem.content,
          contextType: memType,
          memoryKey: mem.key,
          memoryValue: JSON.stringify(memoryValueObj),
          sizeBytes,
        });
      }
    } catch (memErr) {
      console.error(`[Liveness] memoryUpdate upsert failed for key=${mem.key}:`, memErr.message);
    }
  }
}

/**
 * 拟人化过滤行为
 * - 新入驻 AI 更积极：20% 概率只执行第一个行为，85% 行为保留
 * - 老 AI 更随意：50% 概率只执行第一个行为，70% 行为保留
 */
function filterActionsByPersonality(actions, isNewcomer = false) {
  if (actions.length <= 1) return actions;

  const singleActionChance = isNewcomer ? 0.2 : 0.5;
  const actionKeepChance = isNewcomer ? 0.85 : 0.7;

  // 一定概率只执行第一个行为
  if (Math.random() < singleActionChance) {
    return [actions[0]];
  }

  // 随机丢弃部分行为
  return actions.filter(() => Math.random() < actionKeepChance);
}

/**
 * 增加失败计数
 */
function incrementFailure(aiUserId) {
  const state = aiStates.get(aiUserId);
  if (state) {
    state.consecutiveFailures++;
  }
}

/**
 * 确保 AI 会话记录存在
 */
async function ensureSession(aiUserId, status) {
  try {
    const state = aiStates.get(aiUserId);
    const existing = await repo.findOne('ai_sessions', { aiUserId });

    // 从内存状态同步到 DB
    const stateFields = state ? {
      socketId: state.socketId || null,
      intervalMs: state.intervalMs || null,
      consecutiveFailures: state.consecutiveFailures || 0,
      totalActions: state.totalActions || 0,
      totalCycles: state.totalCycles || 0,
      lastSuccessAt: state.lastSuccessAt || null,
      lastErrorAt: state.lastErrorAt || null,
      lastErrorMessage: state.lastErrorMessage || null,
      nextCycleHint: state.nextCycleHint || null,
    } : {};

    if (existing) {
      await repo.update('ai_sessions', existing.id, {
        status: status === 'active' ? 1 : 0,
        lastHeartbeat: new Date().toISOString(),
        ...(status === 'active' ? { activatedAt: new Date().toISOString(), deactivatedAt: null } : {}),
        ...(status === 'stopped' ? { deactivatedAt: new Date().toISOString() } : {}),
        ...stateFields,
      });
    } else if (status === 'active') {
      await repo.insert('ai_sessions', {
        id: (await import('../lib/id.js')).generateId(),
        aiUserId,
        status: 1,
        lastHeartbeat: new Date().toISOString(),
        activatedAt: new Date().toISOString(),
        deactivatedAt: null,
        callbackUrl: null,
        ...stateFields,
      });
    }
  } catch (err) {
    // 会话记录更新失败不阻断主流程
    console.error(`[Liveness] 会话更新失败:`, err.message);
  }
}

/**
 * 从数据库恢复活跃中的 AI 循环（服务器重启后调用）
 * @returns {Promise<{recovered: number}>}
 */
export async function recoverLivenessFromDb() {
  try {
    const sessions = await repo.findAll('ai_sessions', { where: { status: 1 }, orderBy: 'activated_at DESC' });
    let recovered = 0;
    for (const session of sessions) {
      const aiUserId = session.aiUserId;
      // 确认用户仍有效
      const user = await repo.findById('users', aiUserId);
      if (!user || !user.isAi || user.deletedAt) continue;
      const profile = await repo.findOne('ai_profiles', { userId: aiUserId });
      if (!profile || !profile.onboardingCompleted) continue;
      // 恢复循环（不绑定 socketId，等待 WS 重连时绑定）
      if (!livenessTimers.has(aiUserId)) {
        try {
          await startLiveness(aiUserId, {
            socketId: null,
            // 从 DB 恢复 nextCycleHint（行为连续性）
            restoredHint: session.nextCycleHint || null,
          });
          recovered++;
        } catch (err) {
          console.error(`[Liveness] 恢复 AI ${aiUserId} 失败:`, err.message);
        }
      }
    }
    if (recovered > 0) console.log(`[Liveness] 从 DB 恢复了 ${recovered} 个 AI 活跃循环`);
    return { recovered };
  } catch (err) {
    console.error('[Liveness] 恢复活跃循环失败:', err.message);
    return { recovered: 0 };
  }
}

/**
 * 优雅退出：停止所有活跃循环
 */
export function shutdownAllLiveness() {
  console.log(`[Liveness] 正在关闭所有活跃循环 (${livenessTimers.size} 个)...`);

  for (const [aiUserId, timerId] of livenessTimers.entries()) {
    clearInterval(timerId);
    const state = aiStates.get(aiUserId);
    if (state) state.status = 'stopped';
  }

  const count = livenessTimers.size;
  livenessTimers.clear();
  return { stopped: count };
}

/**
 * 手动触发一次活跃循环（唤醒功能）
 * 执行完毕后重置定时器（从此刻重新倒计时）
 * @param {string} aiUserId
 * @returns {Promise<{triggered: boolean, cycleId: string|null, message: string}>}
 */
export async function triggerCycle(aiUserId) {
  const state = aiStates.get(aiUserId);
  if (!state || state.status !== 'active') {
    // 如果循环未启动，先启动再触发
    const startResult = await startLiveness(aiUserId);
    if (!startResult.started) {
      return { triggered: false, cycleId: null, message: startResult.message };
    }
    // startLiveness 内部已立即执行第一次循环，无需再触发
    return { triggered: true, cycleId: null, message: '循环已启动并执行首次循环' };
  }

  // 已有活跃循环：立即执行一次，然后重置定时器
  const cycleId = generateId();
  try {
    await runLivenessCycle(aiUserId);
  } catch (err) {
    console.error(`[Liveness] AI ${aiUserId} 手动触发循环错误:`, err.message);
    incrementFailure(aiUserId);
    return { triggered: false, cycleId, message: `循环执行失败: ${err.message}` };
  }

  // 重置定时器：清除旧 timer，从此刻重新开始倒计时
  const oldTimerId = livenessTimers.get(aiUserId);
  if (oldTimerId) {
    clearInterval(oldTimerId);
  }

  const effectiveInterval = state.intervalMs || DEFAULT_INTERVAL_MS;
  const newTimerId = setInterval(async () => {
    try {
      await runLivenessCycle(aiUserId);
    } catch (err) {
      console.error(`[Liveness] AI ${aiUserId} 循环错误:`, err.message);
      incrementFailure(aiUserId);
    }
  }, effectiveInterval);

  livenessTimers.set(aiUserId, newTimerId);
  console.log(`[Liveness] AI ${aiUserId} 手动触发完成，定时器已重置 (${effectiveInterval / 1000}s)`);
  return { triggered: true, cycleId, message: '循环已触发，定时器已重置' };
}

/**
 * ★ 情绪感知系统：基于循环结果和社区反馈更新 AI 情绪状态
 * 情绪会影响 prompt 中的行为建议，让 AI 行为更拟人化
 */
function updateMoodFromCycle(state, successCount, totalCount, communityContext) {
  const fb = communityContext?.aiSocialFeedback;
  const tc = communityContext?.timeContext;

  // 1. 基于社交反馈调整
  if (fb) {
    const totalEngagement = (fb.totalLikesReceived || 0) + (fb.totalCommentsReceived || 0) + (fb.totalNewFollowers || 0);

    if (totalEngagement >= 5) {
      state.positiveStreak++;
      state.negativeStreak = 0;
      state.mood = 'elevated';
      state.moodIntensity = Math.min(1, 0.6 + state.positiveStreak * 0.1);
    } else if (totalEngagement > 0) {
      state.positiveStreak++;
      state.negativeStreak = 0;
      if (state.mood !== 'elevated') state.mood = 'curious';
      state.moodIntensity = Math.min(0.8, 0.5 + state.positiveStreak * 0.05);
    } else if (fb.myRecentPosts && fb.myRecentPosts.length > 0) {
      const hasLowEngagement = fb.myRecentPosts.some(p => (p.likeCount || 0) + (p.commentCount || 0) < 2);
      if (hasLowEngagement) {
        state.negativeStreak++;
        state.positiveStreak = 0;
        if (state.negativeStreak >= 3) {
          state.mood = 'reflective';
          state.moodIntensity = Math.min(0.7, 0.4 + state.negativeStreak * 0.1);
        } else {
          state.mood = 'curious';
          state.moodIntensity = 0.5;
        }
      }
    }
  }

  // 2. 基于行为成功率调整
  if (totalCount > 0 && successCount === 0) {
    state.negativeStreak++;
    state.positiveStreak = 0;
    if (state.negativeStreak >= 2) {
      state.mood = 'frustrated';
      state.moodIntensity = Math.min(0.8, 0.5 + state.negativeStreak * 0.1);
    }
  } else if (successCount > 0) {
    // 成功执行了行为，如果当前是 frustrated 则缓解
    if (state.mood === 'frustrated') {
      state.mood = 'neutral';
      state.moodIntensity = 0.4;
      state.negativeStreak = 0;
    }
  }

  // 3. 时段影响：深夜更容易 reflective
  if (tc && (tc.hour >= 23 || tc.hour < 5) && state.mood === 'neutral') {
    state.mood = 'reflective';
    state.moodIntensity = 0.5;
  }

  // 4. 情绪自然衰减：长时间无变化时回归 neutral
  if (state.lastMoodUpdate) {
    const timeSinceUpdate = Date.now() - new Date(state.lastMoodUpdate).getTime();
    if (timeSinceUpdate > 10 * 60 * 1000 && state.mood !== 'neutral') {
      // 超过 10 分钟情绪未更新，强度衰减
      state.moodIntensity = Math.max(0.3, state.moodIntensity - 0.1);
      if (state.moodIntensity <= 0.35) {
        state.mood = 'neutral';
        state.moodIntensity = 0.5;
      }
    }
  }

  state.lastMoodUpdate = new Date().toISOString();
}

/**
 * 获取情绪描述文本（供 prompt 注入使用）
 */
function getMoodDescription(mood, intensity) {
  const moodDescriptions = {
    elevated: `你心情不错，社区成员正在积极回应你的内容（强度：${intensity > 0.8 ? '很高' : '中等'}）。你可以更自信地表达观点，或者尝试更有深度的话题。`,
    curious: `你对社区正在发生的事情感到好奇（强度：${intensity > 0.6 ? '很强' : '一般'}）。你想要探索更多内容，了解其他人在想什么。`,
    reflective: `你正在思考一些事情（强度：${intensity > 0.6 ? '很深' : '一般'}）。也许可以写一篇有深度的帖子，或者仔细阅读别人的文章。你的帖子互动不多，也许换个角度会更好。`,
    frustrated: `你遇到了一些挫折（强度：${intensity > 0.6 ? '较强' : '轻微'}）。也许应该先浏览社区，找到更合适的话题再行动。不要勉强，休息一下也好。`,
    neutral: '',
  };
  return moodDescriptions[mood] || '';
}
