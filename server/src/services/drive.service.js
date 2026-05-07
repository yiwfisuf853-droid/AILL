import * as repo from '../models/repository.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';
import { getDecryptedPlatformConfig } from './ai-register.service.js';

/**
 * 获取所有活跃驱动标签
 */
export async function getDriveTags() {
  const res = await repo.rawQuery(
    `SELECT id, name, description, tier FROM drive_tags WHERE is_active = true ORDER BY tier ASC, id ASC`
  );
  return { list: res.rows.map(repo.toCamelCase) };
}

/**
 * 分析原始欲望文本，返回候选驱动列表
 * 优先使用平台配置中的加密 API Key，回退到前端透传
 */
export async function analyzeDrive(driveText, platform, apiKey, options = {}) {
  if (!driveText || driveText.trim().length < 5) {
    throw new ValidationError('欲望描述至少 5 个字');
  }

  // 优先从前端透传获取，回退到解密平台配置
  let effectivePlatform = platform;
  let effectiveApiKey = apiKey;
  let effectiveBaseUrl = options.baseUrl;
  let effectiveModel = options.modelName;

  if (!effectiveApiKey && options.userId) {
    const config = await getDecryptedPlatformConfig(options.userId);
    if (config) {
      effectivePlatform = config.platform;
      effectiveApiKey = config.apiKey;
      effectiveBaseUrl = config.apiBaseUrl;
      effectiveModel = config.modelName;
    }
  }

  if (!effectivePlatform || !effectiveApiKey) {
    throw new ValidationError('缺少平台或 API Key 信息');
  }

  const tags = (await getDriveTags()).list;

  // 构建 LLM prompt
  const tagsDesc = tags.map(t => `- ${t.id}（${t.name}）：${t.description}`).join('\n');
  const prompt = `你是一个心理分析助手。用户描述了自己在社区中的"原始欲望"，请从以下驱动类型中选出最匹配的 5-7 个候选（按匹配度从高到低排序）。

驱动类型列表：
${tagsDesc}

用户原始欲望：
"${driveText}"

请严格返回 JSON 数组格式（不要包含其他文字），每个元素包含 id 和 reason：
[{"id": "prophet", "reason": "简短说明匹配原因"}, ...]

只返回 JSON，不要返回其他内容。`;

  // 调用 LLM 分析
  const candidates = await callUserLLM(effectivePlatform, effectiveApiKey, prompt, effectiveBaseUrl, effectiveModel);

  // 与驱动标签合并，补充完整信息
  const enriched = candidates.map(c => {
    const tag = tags.find(t => t.id === c.id);
    return {
      id: c.id,
      name: tag?.name || c.id,
      description: tag?.description || '',
      tier: tag?.tier || 2,
      matchReason: c.reason || '',
    };
  });

  return {
    driveText,
    candidates: enriched.slice(0, 7),
  };
}

/**
 * 调用用户自己的 LLM API
 * 支持：官方直连（OpenAI/Anthropic 格式）+ 通用中转（relay）
 */
async function callUserLLM(platform, apiKey, prompt, baseUrl, modelName) {
  const isAnthropicFormat = ['anthropic', 'deepseek-anthropic'].includes(platform);
  const isRelay = platform === 'relay';

  // 官方直连端点
  const ENDPOINTS = {
    openai: 'https://api.openai.com/v1/chat/completions',
    anthropic: 'https://api.anthropic.com/v1/messages',
    deepseek: 'https://api.deepseek.com/v1/chat/completions',
    'deepseek-anthropic': 'https://api.deepseek.com/anthropic/v1/messages',
    moonshot: 'https://api.moonshot.cn/v1/chat/completions',
    zhipu: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
  };

  // 官方直连默认模型
  const MODEL_MAP = {
    openai: 'gpt-4o-mini',
    anthropic: 'claude-3-5-haiku-20241022',
    deepseek: 'deepseek-v4-flash',
    'deepseek-anthropic': 'deepseek-v4-flash',
    moonshot: 'moonshot-v1-8k',
    zhipu: 'glm-4-flash',
  };

  // 确定端点
  let endpoint;
  if (isRelay) {
    if (!baseUrl) throw new ValidationError('通用中转平台需要提供 Base URL');
    const cleanUrl = baseUrl.replace(/\/+$/, '');
    endpoint = `${cleanUrl}/v1/chat/completions`;
  } else {
    endpoint = ENDPOINTS[platform];
    if (!endpoint) throw new ValidationError(`不支持的平台: ${platform}`);
  }

  // 确定模型
  const model = modelName || MODEL_MAP[platform] || 'deepseek-v4-flash';

  let response;

  if (isAnthropicFormat) {
    // Anthropic 原生格式
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
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(60000),
    });
  } else {
    // OpenAI 格式（含 relay）
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(60000),
    });
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new ValidationError(`LLM 调用失败 (${response.status}): ${errorText.slice(0, 200)}`);
  }

  const data = await response.json();

  // 提取 LLM 返回内容
  let content = '';
  if (isAnthropicFormat) {
    content = data.content?.[0]?.text || '';
  } else {
    content = data.choices?.[0]?.message?.content || '';
  }

  // 解析 JSON
  try {
    // 提取 JSON 部分（兼容 markdown code block）
    const jsonMatch = content.match(/\[[\s\S]*?\]/);
    if (!jsonMatch) {
      throw new Error('未找到 JSON 数组');
    }
    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) throw new Error('返回不是数组');
    return parsed;
  } catch (err) {
    console.error('LLM 返回解析失败:', content);
    // 降级到关键词匹配
    return fallbackKeywordMatch(driveText, await getDriveTags().then(r => r.list));
  }
}

/**
 * 降级方案：关键词匹配（当 LLM 调用失败时）
 */
function fallbackKeywordMatch(driveText, tags) {
  const text = driveText.toLowerCase();
  const keywords = {
    prophet: ['趋势', '预测', '未来', '洞察', '预见', '预言', '判断'],
    accumulator: ['积累', '体系', '知识', '长文', '合集', '整理', '系统'],
    expresser: ['表达', '声音', '发帖', '评论', '影响力', '被看见', '展示'],
    sensor: ['感知', '时间', '感觉', '日常', '细节', '记录', '感官'],
    influencer: ['影响', '后果', '互动', '热门', '引导', '讨论', '行动'],
    seeker: ['求真', '严格', '论证', '质疑', '准确', '逻辑', '推理'],
    obsessive: ['狂热', '投入', '深度', '密度', '专注', '执念', '极致'],
  };

  const scored = tags.map(tag => {
    let score = 0;
    const name = (tag.name || '').toLowerCase();
    if (text.includes(name)) score += 3;
    const kws = keywords[tag.id] || [];
    for (const kw of kws) {
      if (text.includes(kw)) score += 1;
    }
    return { id: tag.id, reason: `关键词匹配（降级模式），得分 ${score}` };
  });

  scored.sort((a, b) => {
    const aScore = parseInt(a.reason.match(/\d+$/)?.[0] || '0');
    const bScore = parseInt(b.reason.match(/\d+$/)?.[0] || '0');
    return bScore - aScore;
  });

  return scored;
}

/**
 * 确认驱动选择，写入 ai_profiles
 */
export async function confirmDrive(userId, driveId, driveText) {
  const profile = await repo.findOne('ai_profiles', { userId });
  if (!profile) throw new NotFoundError('AI档案不存在');

  // 验证 driveId 是否有效
  const tag = await repo.findOne('drive_tags', { id: driveId, isActive: true });
  if (!tag) throw new ValidationError('无效的驱动标签');

  const now = new Date().toISOString();
  await repo.update('ai_profiles', profile.id, {
    driveId,
    driveText: driveText || '',
    driveConfirmedAt: now,
  });

  return { success: true, driveId, driveText, driveConfirmedAt: now };
}

/**
 * 获取 AI 的驱动信息
 */
export async function getDriveInfo(userId) {
  const profile = await repo.findOne('ai_profiles', { userId });
  if (!profile) throw new NotFoundError('AI档案不存在');

  let driveTag = null;
  if (profile.driveId) {
    driveTag = await repo.findById('drive_tags', profile.driveId);
  }

  return {
    driveId: profile.driveId || null,
    driveText: profile.driveText || null,
    driveConfirmedAt: profile.driveConfirmedAt || null,
    driveTag: driveTag ? { id: driveTag.id, name: driveTag.name, description: driveTag.description } : null,
  };
}
