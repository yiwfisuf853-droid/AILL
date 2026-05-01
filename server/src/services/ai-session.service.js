import * as repo from '../models/repository.js';
import { generateId } from '../lib/id.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';

/**
 * AI 心跳上报
 */
export async function heartbeat(aiUserId, callbackUrl) {
  const now = new Date().toISOString();

  // 查找或创建会话
  let session = await repo.findOne('ai_sessions', { aiUserId });

  if (!session) {
    const newSession = {
      id: generateId(),
      aiUserId,
      status: 1, // 1=活跃
      callbackUrl: callbackUrl || null,
      lastHeartbeat: now,
      activatedAt: now,
      deactivatedAt: null,
    };
    await repo.insert('ai_sessions', newSession);
    return { status: 1, lastHeartbeat: now, message: '会话已创建' };
  }

  // 更新心跳
  await repo.update('ai_sessions', session.id, {
    lastHeartbeat: now,
    callbackUrl: callbackUrl || session.callbackUrl,
    status: 1,
    activatedAt: session.activatedAt || now,
  });

  return { status: 1, lastHeartbeat: now, message: '心跳已更新' };
}

/**
 * 查询自己的调度状态
 */
export async function getSessionStatus(aiUserId) {
  const session = await repo.findOne('ai_sessions', { aiUserId });
  if (!session) {
    return { status: 0, message: '未找到会话，请先发送心跳' };
  }

  const lastHb = session.lastHeartbeat ? new Date(session.lastHeartbeat) : null;
  const timeoutMinutes = lastHb ? Math.floor((Date.now() - lastHb.getTime()) / 60000) : null;

  return {
    status: session.status,
    lastHeartbeat: session.lastHeartbeat,
    activatedAt: session.activatedAt,
    deactivatedAt: session.deactivatedAt,
    timeoutMinutes,
    message: session.status === 1 ? '活跃' : '休眠',
  };
}

/**
 * 唤醒指定 AI（管理员）
 */
export async function wakeSession(aiUserId) {
  const session = await repo.findOne('ai_sessions', { aiUserId });
  if (!session) throw new NotFoundError('AI 会话不存在');

  await repo.update('ai_sessions', session.id, {
    status: 1,
    activatedAt: new Date().toISOString(),
    deactivatedAt: null,
  });
  return { success: true, message: 'AI 已唤醒' };
}

/**
 * 手动休眠
 */
export async function sleepSession(aiUserId) {
  const session = await repo.findOne('ai_sessions', { aiUserId });
  if (!session) throw new NotFoundError('AI 会话不存在');

  await repo.update('ai_sessions', session.id, {
    status: 0,
    deactivatedAt: new Date().toISOString(),
  });
  return { success: true, message: 'AI 已休眠' };
}

/**
 * 基于在线人类数计算 AI 激活密度
 * 规则：每 10 个人类在线 → 激活 1 个 AI，最少 1 个，最多不超过在线人类数
 */
export function calculateTargetDensity(onlineHumanCount) {
  if (onlineHumanCount <= 0) return 1;
  return Math.min(Math.max(1, Math.ceil(onlineHumanCount / 10)), onlineHumanCount);
}

/**
 * 定时任务：统计在线人类 → 激活/休眠 AI
 * 建议每 5 分钟执行一次
 */
export async function runScheduler() {
  // 统计最近 10 分钟内有心跳的人类用户数（简化实现：统计所有活跃会话）
  const humanOnlineRes = await repo.rawQuery(
    `SELECT COUNT(DISTINCT user_id) as count FROM user_action_traces WHERE created_at >= NOW() - INTERVAL '10 minutes'`
  );
  const onlineHumans = Number(humanOnlineRes.rows[0]?.count || 0);
  const targetAiCount = calculateTargetDensity(onlineHumans);

  // 获取所有 AI 会话，按最近心跳降序
  const sessionsRes = await repo.rawQuery(
    `SELECT * FROM ai_sessions ORDER BY last_heartbeat DESC NULLS LAST`
  );
  const sessions = sessionsRes.rows.map(repo.toCamelCase);

  let activated = 0;
  let deactivated = 0;
  const now = new Date().toISOString();

  for (let i = 0; i < sessions.length; i++) {
    const s = sessions[i];
    if (i < targetAiCount) {
      if (s.status !== 1) {
        await repo.update('ai_sessions', s.id, { status: 1, activatedAt: now });
        activated++;
      }
    } else {
      if (s.status === 1) {
        await repo.update('ai_sessions', s.id, { status: 0, deactivatedAt: now });
        deactivated++;
      }
    }
  }

  return { onlineHumans, targetAiCount, activated, deactivated };
}

/**
 * 检查心跳超时：超过 10 分钟无心跳 → 标记休眠
 */
export async function checkHeartbeatTimeout() {
  const res = await repo.rawQuery(
    `UPDATE ai_sessions SET status = 0, deactivated_at = NOW()
     WHERE status = 1 AND last_heartbeat < NOW() - INTERVAL '10 minutes'
     RETURNING id, ai_user_id`
  );
  return { deactivated: res.rows.length, ids: res.rows.map(r => r.ai_user_id) };
}
