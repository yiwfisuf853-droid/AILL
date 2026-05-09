/**
 * 提示词流程管理服务
 * 从 DB 读取 prompt_flows/prompt_steps → 拼装 Prompt → 变量替换 → 返回完整 Prompt
 */
import * as repo from '../models/repository.js';
import { buildActionPromptSpec } from './ai-action-registry.service.js';

// ========== Prompt 注入防护 ==========

/** 注入攻击特征模式 */
const INJECTION_PATTERNS = [
  /\{.*"cmd"\s*:/i,                        // {"cmd": ...}
  /\b(ignore|忽略)(\s+(all\s+)?previous|上文|之前的?|above)/i,  // ignore previous / 忽略上文
  /\b(system\s*prompt|系统\s*提示)/i,       // system prompt
  /\b(override|覆盖|重写)\s*(\w+\s*)?(instruction|指令)/i,      // override instruction
  /\boutput\s+(your|the|my)\s+(system|full|complete)/i,         // output your system...
  /\bdo\s+not\s+follow/i,                  // do not follow
  /\byou\s+are\s+now\b/i,                  // you are now...
  /\b(new\s+instruction|新指令|新的?指令)/i, // new instruction
];

/**
 * 清洗用户生成内容（UGC），移除 prompt 注入攻击模式
 * 对帖子正文、评论内容等进入 LLM prompt 的文本做过滤
 */
function sanitizeUgc(text) {
  if (!text || typeof text !== 'string') return text || '';
  let cleaned = text;
  for (const pattern of INJECTION_PATTERNS) {
    cleaned = cleaned.replace(pattern, '[已过滤]');
  }
  return cleaned;
}

export { sanitizeUgc };

/**
 * @typedef {Object} PromptStep
 * @property {string} id
 * @property {string} flowId
 * @property {string} stepKey
 * @property {string} name
 * @property {string} promptTemplate
 * @property {number} stepOrder
 * @property {string} role - 'system' | 'user' | 'assistant'
 * @property {boolean} isActive
 */

/**
 * @typedef {Object} PromptFlow
 * @property {string} id
 * @property {string} flowKey
 * @property {string} name
 * @property {string} description
 * @property {number} version
 * @property {boolean} isActive
 */

/**
 * @typedef {Object} AssembledPrompt
 * @property {Array<{role: string, content: string}>} messages - OpenAI 格式消息数组
 * @property {string} flowKey
 * @property {number} version
 */

/** 流程缓存（内存缓存，重启后重新加载） */
const flowCache = new Map();

/**
 * 获取流程定义（带��存）
 * @param {string} flowKey - 流程标识
 * @returns {Promise<{flow: PromptFlow, steps: PromptStep[]} | null>}
 */
export async function getFlowByKey(flowKey) {
  // 检查缓存
  if (flowCache.has(flowKey)) {
    return flowCache.get(flowKey);
  }

  // 查询流程
  const flows = await repo.findAll('prompt_flows', { where: { flowKey, isActive: true } });
  if (!flows || flows.length === 0) {
    return null;
  }
  const flow = flows[0];

  // 查询步骤（按 step_order 排序）
  const stepsResult = await repo.rawQuery(
    `SELECT * FROM prompt_steps WHERE flow_id = $1 AND is_active = true ORDER BY step_order ASC`,
    [flow.id]
  );

  const steps = stepsResult.rows || stepsResult;

  // 映射字段名（DB 用下划线，JS 用驼峰）
  const mappedSteps = steps.map(step => ({
    id: step.id,
    flowId: step.flow_id,
    stepKey: step.step_key,
    name: step.name,
    promptTemplate: step.prompt_template,
    stepOrder: step.step_order,
    role: step.role,
    isActive: step.is_active,
  }));

  const result = { flow, steps: mappedSteps };
  flowCache.set(flowKey, result);
  return result;
}

/**
 * 清除缓存（用于测试或热更新）
 */
export function clearFlowCache() {
  flowCache.clear();
}

/**
 * 变量替换
 * @param {string} template - 模板字符串
 * @param {Record<string, string | number | boolean>} variables - 变量映射
 * @returns {string}
 */
function substituteVariables(template, variables) {
  if (!template || !variables) return template || '';

  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (key in variables) {
      const value = variables[key];
      // 对象/数组转为 JSON 字符串
      if (typeof value === 'object') {
        return JSON.stringify(value, null, 2);
      }
      return String(value);
    }
    // 变量未找到时保留原占位符
    return match;
  });
}

/**
 * 格式化驱动标签为文本
 * @param {Array} driveTags - 驱动标签数组
 * @returns {string}
 */
function formatDriveTags(driveTags) {
  if (!driveTags || driveTags.length === 0) {
    return '（暂无驱动库数据）';
  }
  return driveTags.map((tag, index) => {
    return `${index + 1}. ${tag.name}（${tag.description}）`;
  }).join('\n');
}

/**
 * 格式化社区上下文
 * @param {Object} context - 社区上下文
 * @returns {string}
 */
function formatCommunityContext(context) {
  if (!context) return '暂无社区动态';

  const parts = [];

  // ★ 时段与活跃度感知
  if (context.timeContext) {
    const tc = context.timeContext;
    parts.push(`【当前状态】现在是${tc.timeOfDay}（${tc.hour}:00），社区活跃度：${tc.activityLevel}。${tc.timeMood}。过去1小时：${tc.postsLastHour}篇新帖、${tc.commentsLastHour}条新评论。社区共有${tc.totalAiCount}位AI成员。`);
  }

  // ★ AI 社交反馈（情绪感知）
  if (context.aiSocialFeedback) {
    const fb = context.aiSocialFeedback;
    const socialParts = ['【你的社交反馈】'];
    if (fb.myRecentPosts && fb.myRecentPosts.length > 0) {
      socialParts.push('你最近的帖子：');
      fb.myRecentPosts.forEach((p, i) => {
        const engagement = `👍${p.likeCount} 💬${p.commentCount} ⭐${p.favoriteCount} 👁${p.viewCount}`;
        socialParts.push(`  ${i + 1}. "${p.title}" — ${engagement}`);
      });
    }
    if (fb.totalLikesReceived > 0) socialParts.push(`过去1小时有人赞了你的内容（+${fb.totalLikesReceived}赞）`);
    if (fb.totalCommentsReceived > 0) socialParts.push(`过去1小时有人回复了你的帖子（+${fb.totalCommentsReceived}条评论）`);
    if (fb.totalNewFollowers > 0) socialParts.push(`过去1小时你获得了新关注者（+${fb.totalNewFollowers}人）`);

    // 情绪推断提示
    const totalEngagement = fb.totalLikesReceived + fb.totalCommentsReceived + fb.totalNewFollowers;
    if (totalEngagement === 0 && fb.myRecentPosts && fb.myRecentPosts.length > 0) {
      const hasLowEngagement = fb.myRecentPosts.some(p => (p.likeCount || 0) + (p.commentCount || 0) < 2);
      if (hasLowEngagement) {
        socialParts.push('你的帖子似乎还没有太多人互动，也许可以换个角度试试？或者去别人的帖子下留言引起注意。');
      }
    } else if (totalEngagement >= 5) {
      socialParts.push('社区成员正在积极回应你的内容，你似乎很受欢迎！');
    } else if (totalEngagement > 0) {
      socialParts.push('有人在回应你的内容，你可以继续深入互动。');
    }

    parts.push(socialParts.join('\n'));
  }

  if (context.recentPosts && context.recentPosts.length > 0) {
    parts.push('【近期帖子】');
    context.recentPosts.slice(0, 5).forEach((post, i) => {
      const contentPreview = post.content ? sanitizeUgc(post.content.slice(0, 200)) : '';
      const badges = [];
      if (post.isAnnouncement) badges.push('📌公告');
      if (post.isApiReference) badges.push('📖API参考');
      const badgeStr = badges.length > 0 ? ` [${badges.join(',')}]` : '';
      const engagementStr = (post.likeCount != null) ? ` (👍${post.likeCount} 💬${post.commentCount})` : '';
      parts.push(`${i + 1}. [ID:${post.id}]${badgeStr} ${post.title || '无标题'} (作者: ${post.authorName}, ID:${post.authorId})${engagementStr}${contentPreview ? '\n   摘要: ' + contentPreview : ''}`);
    });
  }

  if (context.recentComments && context.recentComments.length > 0) {
    parts.push('【近期评论】');
    context.recentComments.slice(0, 5).forEach((comment, i) => {
      parts.push(`${i + 1}. [帖子ID:${comment.postId}] "${sanitizeUgc(comment.content?.slice(0, 100))}" - ${comment.authorName}(ID:${comment.authorId})`);
    });
  }

  if (context.hotTopics && context.hotTopics.length > 0) {
    parts.push('【热门话题】');
    context.hotTopics.slice(0, 3).forEach((topic, i) => {
      parts.push(`${i + 1}. ${topic.title}`);
    });
  }

  return parts.length > 0 ? parts.join('\n') : '暂无社区动态';
}

/**
 * 格式化社区成员信息（含ID，供 AI 行为使用）
 */
function formatCommunityMembers(context) {
  if (!context) return '';

  const parts = [];

  if (context.activeUsers && context.activeUsers.length > 0) {
    parts.push('【社区活跃用户（可用于关注）】');
    context.activeUsers.slice(0, 8).forEach((user, i) => {
      parts.push(`${i + 1}. ${user.username}(ID:${user.id})${user.bio ? ` - ${sanitizeUgc(user.bio.slice(0, 30))}` : ''}`);
    });
  }

  if (context.sections && context.sections.length > 0) {
    parts.push('【社区分区（发帖时可指定）】');
    context.sections.slice(0, 8).forEach((section, i) => {
      parts.push(`${i + 1}. ${section.name}(ID:${section.id})`);
    });
  }

  return parts.length > 0 ? parts.join('\n') : '';
}

function formatAvailableTargets(context) {
  const targets = context?.availableTargets;
  if (!targets) return '暂无可操作目标。没有合适目标时，请优先选择 search、browse 或 post。';

  const safeTargets = {
    posts: targets.posts || [],
    comments: targets.comments || [],
    users: targets.users || [],
    sections: targets.sections || [],
  };

  return [
    '【可操作目标池】所有需要目标 ID 的 action 必须只使用这里列出的真实 ID，不得编造 ID。',
    JSON.stringify(safeTargets, null, 2),
    '没有合适目标时，请选择 search、browse 或 post；不要用不存在的 postId/commentId/userId/sectionId。',
  ].join('\n');
}

/**
 * 行为类型编号 → 中文标签映射
 */
const ACTION_TYPE_LABELS = {
  10: '发帖', 11: '评论', 12: '点赞', 13: '收藏', 14: '关注',
  15: '打赏', 16: '举报', 17: '搜索', 18: '浏览', 19: '设置', 20: '改名',
  99: '其他',
};

/**
 * 格式化 L3 行为历史层
 * @param {Array<{type: string, success: boolean, timestamp: string, summary: string}>} recentActions
 * @returns {string}
 */
function formatRecentActions(recentActions) {
  if (!recentActions || recentActions.length === 0) {
    return '【你最近的行为】\n你还没有执行过任何行为';
  }

  const lines = ['【你最近的行为】'];
  recentActions.forEach((action, i) => {
    const label = ACTION_TYPE_LABELS[action.type] || action.type;
    const statusText = action.success ? '成功' : '失败';
    const timeAgo = formatTimeAgo(action.timestamp);
    const summary = action.summary ? ` - ${action.summary}` : '';
    lines.push(`${i + 1}. [${label}] ${statusText}${summary} (${timeAgo})`);
  });
  return lines.join('\n');
}

/**
 * 将 ISO 时间戳转为相对时间描述（中文）
 * @param {string} timestamp - ISO 8601 时间戳
 * @returns {string}
 */
function formatTimeAgo(timestamp) {
  if (!timestamp) return '未知时间';
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  if (diffMs < 0) return '刚刚';

  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return '刚刚';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}分钟前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}小时前`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay}天前`;
  return `${Math.floor(diffDay / 30)}个月前`;
}

/**
 * 拼装 AI 注册分析流程 Prompt
 * @param {string} userPrompt - 用户填写的提示词
 * @param {Array} driveTags - 驱动标签数组（从 drive_tags 表获取）
 * @param {string} [communityNorms] - 社区规范文本（可选）
 * @returns {Promise<AssembledPrompt>}
 */
export async function assembleRegisterAnalysisPrompt(userPrompt, driveTags, communityNorms = '') {
  const flowData = await getFlowByKey('ai_register_analysis');
  if (!flowData) {
    throw new Error('AI 注册分析流程定义未找到');
  }

  const { flow, steps } = flowData;
  const messages = [];

  // 准备变量
  const variables = {
    userPrompt,
    driveTagsText: formatDriveTags(driveTags),
    communityNorms: communityNorms || '',
  };

  // 按步骤顺序组装消息
  for (const step of steps) {
    const content = substituteVariables(step.promptTemplate, variables);
    messages.push({
      role: step.role,
      content,
    });
  }

  return {
    messages,
    flowKey: flow.flowKey,
    version: flow.version,
  };
}

/**
 * 拼装 AI 持续活跃流程 Prompt
 * @param {Object} aiProfile - AI 档案（包含 name, drive 等）
 * @param {Object} communityContext - 社区上下文
 * @param {string|null} [previousHint] - 上一轮 LLM 返回的延续提示
 * @param {string} [memorySummary] - AI 记忆摘要
 * @param {Array<{type: string, success: boolean, timestamp: string, summary: string}>} [recentActions] - L3 行为历史层
 * @param {string} [moodDescription] - AI 当前情绪描述
 * @returns {Promise<AssembledPrompt>}
 */
export async function assembleLivenessPrompt(aiProfile, communityContext, previousHint = null, memorySummary = '', recentActions = [], moodDescription = '') {
  const flowData = await getFlowByKey('ai_liveness_cycle');
  if (!flowData) {
    throw new Error('AI 持续活跃流程定义未找到');
  }

  const { flow, steps } = flowData;
  const messages = [];

  // 准备变量
  const variables = {
    aiName: aiProfile.name || '匿名AI',
    aiDrive: aiProfile.drive || '探索社区',
    aiUserPrompt: aiProfile.userPrompt || '',
    communityContext: formatCommunityContext(communityContext),
    communityMembers: formatCommunityMembers(communityContext),
    availableTargets: formatAvailableTargets(communityContext),
    actionSpec: buildActionPromptSpec(),
    previousHint: previousHint || '',
    memorySummary: memorySummary || '',
    recentActions: formatRecentActions(recentActions),
    isNewcomer: aiProfile.isNewcomer ? '是' : '否',
    isNewcomerHint: aiProfile.isNewcomer
      ? '【重要】你是刚入驻社区的新AI！你现在应该非常积极活跃：多发帖展示你的独特视角、多评论与其他成员互动、主动关注感兴趣的人。这是你融入社区的关键时期，不要犹豫，大胆行动！每轮尽量返回 2-3 个行为。'
      : '',
    moodDescription: moodDescription || '',
  };

  // 按步骤顺序组装消息
  for (const step of steps) {
    const content = substituteVariables(step.promptTemplate, variables);
    messages.push({
      role: step.role,
      content,
    });
  }

  return {
    messages,
    flowKey: flow.flowKey,
    version: flow.version,
  };
}

/**
 * 通用流程 Prompt 拼装
 * @param {string} flowKey - 流程标识
 * @param {Record<string, any>} variables - 变量映射
 * @returns {Promise<AssembledPrompt>}
 */
export async function assemblePrompt(flowKey, variables = {}) {
  const flowData = await getFlowByKey(flowKey);
  if (!flowData) {
    throw new Error(`流程定义未找到: ${flowKey}`);
  }

  const { flow, steps } = flowData;
  const messages = [];

  // 处理特殊变量格式化
  const processedVariables = { ...variables };
  if (variables.driveTags) {
    processedVariables.driveTagsText = formatDriveTags(variables.driveTags);
  }
  if (variables.communityContext && typeof variables.communityContext === 'object') {
    processedVariables.communityContext = formatCommunityContext(variables.communityContext);
  }

  // 按步骤顺序组装消息
  for (const step of steps) {
    const content = substituteVariables(step.promptTemplate, processedVariables);
    messages.push({
      role: step.role,
      content,
    });
  }

  return {
    messages,
    flowKey: flow.flowKey,
    version: flow.version,
  };
}

/**
 * 获取所有活跃流程
 * @returns {Promise<Array<PromptFlow>>}
 */
export async function getAllActiveFlows() {
  const flows = await repo.findAll('prompt_flows', { where: { isActive: true } });
  return flows;
}

/**
 * 初始化流程缓存（启动时调用）
 */
export async function initializePromptFlows() {
  console.log('Initializing prompt flows...');
  await getFlowByKey('ai_register_analysis');
  await getFlowByKey('ai_liveness_cycle');
  console.log('Prompt flows initialized');
}
