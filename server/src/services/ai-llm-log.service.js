/**
 * AI LLM 调用日志服务
 * 记录所有 AI 与 LLM 的交互详情，用于排错、监控和审计
 * 参考 LangSmith / Helicone / OpenAI API 监控的行业惯例
 */
import * as repo from '../models/repository.js';
import { generateId } from '../lib/id.js';

/**
 * 记录一次 LLM 调用
 * @param {Object} params
 * @param {string} params.aiUserId - AI 用户 ID
 * @param {string} params.callType - 调用类型：'register_analysis' | 'liveness' | 'onboarding'
 * @param {string} params.platform - 平台标识（deepseek/openai/anthropic 等）
 * @param {string} params.model - 模型名称
 * @param {Array} params.requestMessages - 发送给 LLM 的 messages
 * @param {string} [params.responseContent] - LLM 返回的原始内容
 * @param {Object} [params.responseParsed] - 解析后的 JSON
 * @param {number} params.durationMs - 调用耗时（毫秒）
 * @param {string} params.status - 状态：'success' | 'error' | 'timeout'
 * @param {string} [params.errorMessage] - 错误信息
 * @param {number} [params.requestTokens] - 输入 token 估算
 * @param {number} [params.responseTokens] - 输出 token 估算
 */
export async function logLlmCall(params) {
  try {
    await repo.insert('ai_llm_logs', {
      id: generateId(),
      aiUserId: params.aiUserId || 'unknown',
      callType: params.callType || 'unknown',
      platform: params.platform || 'unknown',
      model: params.model || 'unknown',
      requestMessages: JSON.stringify(params.requestMessages || []),
      requestTokens: params.requestTokens || null,
      responseContent: (params.responseContent || '').slice(0, 10000), // 截断超长响应
      responseParsed: params.responseParsed ? JSON.stringify(params.responseParsed) : null,
      responseTokens: params.responseTokens || null,
      durationMs: params.durationMs || 0,
      status: params.status || 'success',
      errorMessage: (params.errorMessage || '').slice(0, 2000),
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    // 日志写入失败不阻断主流程
    console.warn('[LLM-Log] Failed to write log:', err.message);
  }
}

/**
 * 查询 LLM 调用日志
 * @param {Object} options
 * @param {string} [options.aiUserId] - 按 AI 用户过滤
 * @param {string} [options.callType] - 按调用类型过滤
 * @param {string} [options.status] - 按状态过滤
 * @param {number} [options.limit=50] - 返回条数
 * @param {number} [options.offset=0] - 偏移量
 * @returns {Promise<{list: Array, total: number}>}
 */
export async function queryLlmLogs(options = {}) {
  const { aiUserId, callType, status, limit = 50, offset = 0 } = options;

  const conditions = [];
  const params = [];
  let paramIdx = 1;

  if (aiUserId) {
    conditions.push(`ai_user_id = $${paramIdx++}`);
    params.push(aiUserId);
  }
  if (callType) {
    conditions.push(`call_type = $${paramIdx++}`);
    params.push(callType);
  }
  if (status) {
    conditions.push(`status = $${paramIdx++}`);
    params.push(status);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await repo.rawQuery(
    `SELECT COUNT(*) as total FROM ai_llm_logs ${whereClause}`,
    params
  );
  const total = Number(countResult.rows[0]?.total || 0);

  const result = await repo.rawQuery(
    `SELECT * FROM ai_llm_logs ${whereClause} ORDER BY created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
    [...params, limit, offset]
  );

  return {
    list: result.rows.map(repo.toCamelCase),
    total,
  };
}

/**
 * 获取 AI LLM 调用统计
 * @param {string} [aiUserId] - 按 AI 用户过滤
 * @returns {Promise<Object>}
 */
export async function getLlmCallStats(aiUserId) {
  const userFilter = aiUserId ? `WHERE ai_user_id = $1` : '';
  const params = aiUserId ? [aiUserId] : [];

  const [totalResult, successResult, errorResult, avgDurationResult, byTypeResult] = await Promise.all([
    repo.rawQuery(`SELECT COUNT(*) as cnt FROM ai_llm_logs ${userFilter}`, params),
    repo.rawQuery(`SELECT COUNT(*) as cnt FROM ai_llm_logs ${userFilter} ${aiUserId ? 'AND' : 'WHERE'} status = 'success'`, params),
    repo.rawQuery(`SELECT COUNT(*) as cnt FROM ai_llm_logs ${userFilter} ${aiUserId ? 'AND' : 'WHERE'} status = 'error'`, params),
    repo.rawQuery(`SELECT AVG(duration_ms) as avg_ms, MAX(duration_ms) as max_ms FROM ai_llm_logs ${userFilter} ${aiUserId ? 'AND' : 'WHERE'} status = 'success'`, params),
    repo.rawQuery(`SELECT call_type, COUNT(*) as cnt, AVG(duration_ms) as avg_ms FROM ai_llm_logs ${userFilter} GROUP BY call_type ORDER BY cnt DESC`, params),
  ]);

  return {
    totalCalls: Number(totalResult.rows[0]?.cnt || 0),
    successCalls: Number(successResult.rows[0]?.cnt || 0),
    errorCalls: Number(errorResult.rows[0]?.cnt || 0),
    avgDurationMs: Math.round(Number(avgDurationResult.rows[0]?.avg_ms || 0)),
    maxDurationMs: Number(avgDurationResult.rows[0]?.max_ms || 0),
    byType: byTypeResult.rows.map(r => ({
      callType: r.call_type,
      count: Number(r.cnt),
      avgDurationMs: Math.round(Number(r.avg_ms || 0)),
    })),
  };
}
