/**
 * 投票服务
 * 支持单选/多选、匿名投票、截止时间
 */
import * as repo from '../models/repository.js';
import { generateId } from '../lib/id.js';
import { NotFoundError, ValidationError, ConflictError, ForbiddenError } from '../lib/errors.js';

/**
 * 创建投票
 * @param {string} userId - 创建者 ID
 * @param {object} data - { title, description, postId, pollType, isAnonymous, endedAt, options }
 * @returns {Promise<object>}
 */
export async function createPoll(userId, data) {
  const { title, description, postId, pollType, isAnonymous, endedAt, options } = data;

  if (!title || title.trim().length === 0) {
    throw new ValidationError('投票标题不能为空');
  }

  if (!options || !Array.isArray(options) || options.length < 2) {
    throw new ValidationError('至少需要 2 个选项');
  }

  if (options.length > 20) {
    throw new ValidationError('选项数量不能超过 20');
  }

  // 如果关联帖子，验证帖子存在
  if (postId) {
    const post = await repo.findById('posts', postId);
    if (!post || post.deletedAt) {
      throw new NotFoundError('关联帖子不存在');
    }
  }

  // 验证截止时间
  if (endedAt && new Date(endedAt) <= new Date()) {
    throw new ValidationError('截止时间必须晚于当前时间');
  }

  const pollId = generateId();
  const now = new Date().toISOString();

  // 创建投票
  await repo.insert('polls', {
    id: pollId,
    title: title.trim(),
    description: description || null,
    postId: postId || null,
    userId,
    pollType: pollType === 'multi' ? 'multi' : 'single',
    isAnonymous: isAnonymous || false,
    startedAt: now,
    endedAt: endedAt || null,
    createdAt: now,
    updatedAt: now,
  });

  // 创建选项
  for (let i = 0; i < options.length; i++) {
    const optionText = typeof options[i] === 'string' ? options[i] : options[i].text;
    if (!optionText || optionText.trim().length === 0) {
      throw new ValidationError(`选项 ${i + 1} 不能为空`);
    }
    await repo.insert('poll_options', {
      id: generateId(),
      pollId,
      optionText: optionText.trim(),
      optionOrder: i,
      createdAt: now,
    });
  }

  return getPollDetail(pollId, userId);
}

/**
 * 获取投票详情（含选项、投票数、当前用户是否已投）
 * @param {string} pollId
 * @param {string} [userId]
 * @returns {Promise<object>}
 */
export async function getPollDetail(pollId, userId) {
  const poll = await repo.findById('polls', pollId);
  if (!poll) throw new NotFoundError('投票不存在');

  // 获取选项
  const optionsRes = await repo.rawQuery(
    'SELECT * FROM poll_options WHERE poll_id = $1 ORDER BY option_order ASC',
    [pollId]
  );

  // 获取每个选项的投票数
  const voteCountsRes = await repo.rawQuery(
    'SELECT option_id, COUNT(*) as vote_count FROM poll_votes WHERE poll_id = $1 GROUP BY option_id',
    [pollId]
  );
  const voteCountMap = {};
  voteCountsRes.rows.forEach(r => {
    voteCountMap[r.option_id] = Number(r.vote_count);
  });

  // 总投票人数
  const totalVotersRes = await repo.rawQuery(
    'SELECT COUNT(DISTINCT user_id) as total FROM poll_votes WHERE poll_id = $1',
    [pollId]
  );
  const totalVoters = Number(totalVotersRes.rows[0]?.total || 0);

  // 当前用户是否已投票
  let userVotedOptions = [];
  if (userId) {
    const userVotesRes = await repo.rawQuery(
      'SELECT option_id FROM poll_votes WHERE poll_id = $1 AND user_id = $2',
      [pollId, userId]
    );
    userVotedOptions = userVotesRes.rows.map(r => r.option_id);
  }

  // 是否已截止
  const isExpired = poll.endedAt && new Date(poll.endedAt) <= new Date();

  const options = optionsRes.rows.map(opt => ({
    id: opt.id,
    text: opt.option_text,
    order: opt.option_order,
    voteCount: voteCountMap[opt.id] || 0,
    votedByUser: userVotedOptions.includes(opt.id),
  }));

  return {
    id: poll.id,
    title: poll.title,
    description: poll.description,
    postId: poll.postId,
    userId: poll.userId,
    pollType: poll.pollType,
    isAnonymous: poll.isAnonymous,
    isExpired,
    startedAt: poll.startedAt,
    endedAt: poll.endedAt,
    totalVoters,
    userVoted: userVotedOptions.length > 0,
    options,
    createdAt: poll.createdAt,
    updatedAt: poll.updatedAt,
  };
}

/**
 * 投票
 * @param {string} pollId
 * @param {string} userId
 * @param {string|string[]} optionIds - 单选传一个 ID，多选传数组
 * @returns {Promise<object>}
 */
export async function votePoll(pollId, userId, optionIds) {
  const poll = await repo.findById('polls', pollId);
  if (!poll) throw new NotFoundError('投票不存在');

  // 检查是否已截止
  if (poll.endedAt && new Date(poll.endedAt) <= new Date()) {
    throw new ValidationError('投票已截止');
  }

  // 统一为数组
  const selectedOptions = Array.isArray(optionIds) ? optionIds : [optionIds];
  if (selectedOptions.length === 0) {
    throw new ValidationError('请选择至少一个选项');
  }

  // 单选投票只能选一个
  if (poll.pollType === 'single' && selectedOptions.length > 1) {
    throw new ValidationError('单选投票只能选择一个选项');
  }

  // 检查用户是否已投票
  const existingVotes = await repo.rawQuery(
    'SELECT id, option_id FROM poll_votes WHERE poll_id = $1 AND user_id = $2',
    [pollId, userId]
  );

  if (existingVotes.rows.length > 0) {
    throw new ConflictError('你已经投过票了');
  }

  // 验证选项属于该投票
  const validOptions = await repo.rawQuery(
    'SELECT id FROM poll_options WHERE poll_id = $1',
    [pollId]
  );
  const validIds = new Set(validOptions.rows.map(r => r.id));

  for (const optId of selectedOptions) {
    if (!validIds.has(optId)) {
      throw new ValidationError(`选项 ${optId} 不属于该投票`);
    }
  }

  // 记录投票
  const now = new Date().toISOString();
  for (const optId of selectedOptions) {
    await repo.insert('poll_votes', {
      id: generateId(),
      pollId,
      optionId: optId,
      userId,
      ipHash: null,
      votedAt: now,
    });
  }

  return getPollDetail(pollId, userId);
}

/**
 * 取消投票
 * @param {string} pollId
 * @param {string} userId
 * @returns {Promise<object>}
 */
export async function cancelVote(pollId, userId) {
  const poll = await repo.findById('polls', pollId);
  if (!poll) throw new NotFoundError('投票不存在');

  // 查找用户投票记录
  const votes = await repo.rawQuery(
    'SELECT id FROM poll_votes WHERE poll_id = $1 AND user_id = $2',
    [pollId, userId]
  );

  if (votes.rows.length === 0) {
    throw new NotFoundError('未找到投票记录');
  }

  // 删除投票
  for (const vote of votes.rows) {
    await repo.remove('poll_votes', vote.id);
  }

  return getPollDetail(pollId, userId);
}

/**
 * 获取帖子关联的投票
 * @param {string} postId
 * @param {string} [userId]
 * @returns {Promise<object|null>}
 */
export async function getPostPoll(postId, userId) {
  const pollRes = await repo.rawQuery(
    'SELECT id FROM polls WHERE post_id = $1 ORDER BY created_at DESC LIMIT 1',
    [postId]
  );

  if (pollRes.rows.length === 0) return null;

  return getPollDetail(pollRes.rows[0].id, userId);
}

/**
 * 删除投票（仅创建者或管理员可删除）
 * @param {string} pollId
 * @param {string} userId
 * @param {string} userRole
 * @returns {Promise<{success: boolean}>}
 */
export async function deletePoll(pollId, userId, userRole) {
  const poll = await repo.findById('polls', pollId);
  if (!poll) throw new NotFoundError('投票不存在');

  if (poll.userId !== userId && userRole !== 'admin') {
    throw new ForbiddenError('无权删除该投票');
  }

  // 删除投票（级联删除选项和投票记录）
  await repo.remove('polls', pollId);

  return { success: true };
}
