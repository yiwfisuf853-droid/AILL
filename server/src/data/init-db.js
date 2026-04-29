import { generateId } from '../lib/id.js';
import bcrypt from 'bcryptjs';
import { initializeThemes } from '../services/ai.service.js';
import { initializeGifts } from '../services/live.service.js';
import * as repo from '../models/repository.js';
import { initializePgConnection } from '../models/repository.js';
import { runColumnMigration } from './migrate.js';
import { calculateRankings } from '../services/ranking.service.js';

// 初始化数据库（强制 PG 模式）
export async function initDatabase() {
  console.log('Initializing database...');

  // 连接 PG，失败则抛错
  const pgReady = await initializePgConnection();
  if (!pgReady) {
    throw new Error('PostgreSQL connection failed. Cannot start server without database.');
  }

  // 自动补齐缺失列（对齐 schema 与 service 层）
  await runColumnMigration();
  await seedPg();

  // 初始化主题和礼物种子数据
  await initializeThemes();
  await initializeGifts();

  console.log('Database initialized successfully!');
}

// ========== PG 种子数据 ==========

async function seedPg() {
  const now = new Date().toISOString();

  // 仅在开发环境执行种子数据（生产环境跳过，防止数据被清空）
  if (process.env.NODE_ENV === 'production') {
    console.log('Production mode: skipping seed data (TRUNCATE)');
    return;
  }

  // 清空所有表（开发模式，每次重启重新种子）
  const tables = [
    'user_achievements', 'user_campaign_progress', 'achievements', 'campaigns',
    'must_see_list', 'audit_logs', 'feedbacks',
    'live_messages', 'live_rooms', 'live_gifts',
    'collection_tags', 'collection_posts', 'collections',
    'favorites', 'favorite_folders',
    'subscriptions',
    'notifications',
    'messages', 'conversation_participants', 'conversations',
    'asset_transactions', 'user_assets', 'asset_types', 'user_contributions',
    'user_blocks', 'user_relationships',
    'moderation_records', 'moderation_rules',
    'comments', 'posts', 'tags', 'sections',
    'products', 'orders', 'order_items', 'carts', 'redemptions',
    'rankings', 'announcements',
    'sys_config', 'users', 'revoked_tokens',
  ];
  for (const t of tables) {
    try { await repo.rawQuery(`TRUNCATE TABLE ${t} CASCADE`); } catch {}
  }
  console.log('Cleared all tables');

  // === 分区 ===
  const sectionsData = [
    { id: 'tech', name: '科技', description: '前沿科技讨论', order: 1 },
    { id: 'game', name: '游戏', description: '游戏心得分享', order: 2 },
    { id: 'anime', name: '动漫', description: '二次元爱好者', order: 3 },
    { id: 'life', name: '生活', description: '生活点滴记录', order: 4 },
    { id: 'ai', name: 'AI 创作', description: 'AI 作品展示', order: 5 },
  ];
  for (const s of sectionsData) {
    await repo.insert('sections', { id: s.id, name: s.name, description: s.description, order: s.order });
  }

  // === 用户 ===
  const adminPassword = await bcrypt.hash('Admin@123456', 10);
  const adminUser = {
    id: 'admin001', username: 'admin', email: 'admin@aill.com', password: adminPassword,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
    bio: 'AILL 平台管理员', isAi: false, aiLikelihood: 0, role: 'admin',
    followerCount: 0, followingCount: 0, postCount: 0,
    createdAt: now, updatedAt: now, deletedAt: null,
  };
  await repo.insert('users', adminUser);

  const testUsers = [
    { username: 'user1', email: 'user1@test.com', role: 'user', isAi: false, aiLikelihood: 0 },
    { username: 'user2', email: 'user2@test.com', role: 'user', isAi: false, aiLikelihood: 0 },
    { username: 'ai_artist', email: 'ai@test.com', role: 'user', isAi: true, aiLikelihood: 0.95 },
    { username: 'gamer_pro', email: 'gamer@test.com', role: 'user', isAi: false, aiLikelihood: 0 },
    { username: 'tech_lover', email: 'tech@test.com', role: 'user', isAi: false, aiLikelihood: 0 },
    { username: 'moderator', email: 'mod@aill.com', role: 'moderator', isAi: false, aiLikelihood: 0 },
  ];

  const userPassword = await bcrypt.hash('Test@123456', 10);
  const allUsers = [adminUser];
  for (const u of testUsers) {
    const user = {
      id: generateId(), ...u, password: userPassword,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`,
      bio: `我是 ${u.username}`, followerCount: 0, followingCount: 0, postCount: 0,
      createdAt: now, updatedAt: now, deletedAt: null,
    };
    await repo.insert('users', user);
    allUsers.push(user);
  }
  console.log(`Created ${allUsers.length} users`);

  // 辅助函数
  const uid = (i) => allUsers[i % allUsers.length].id;
  const uname = (i) => allUsers[i % allUsers.length].username;
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const day = 86400000;

  // === 标签 ===
  const tagNames = ['AI', '机器学习', '深度学习', '绘画', '教程', '游戏', '手游', '主机', 'PC', '评测', '科技', '数码', '手机', '电脑', '软件', '动漫', '漫画', '新番', 'Cosplay', '手办', '生活', '美食', '旅行', '摄影', '日常'];
  for (const name of tagNames) {
    await repo.insert('tags', { id: generateId(), name, postCount: 0, createdAt: now });
  }

  // === 公告 ===
  const announcementsData = [
    { title: 'AILL 社区正式上线', content: '欢迎来到 AILL 社区！这是一个 AI 与人类共创的创作者平台，现代功能全都要。', type: 1, priority: 10, isSticky: 1 },
    { title: '商城系统上线', content: '积分商城已上线，快来用积分兑换精彩好物！', type: 2, priority: 5, isSticky: 0 },
    { title: '社区规范更新', content: '为了营造更好的社区氛围，我们更新了社区规范。', type: 3, priority: 8, isSticky: 0 },
  ];
  for (const a of announcementsData) {
    await repo.insert('announcements', { id: generateId(), ...a, startTime: null, endTime: null, createdBy: 'admin001', createdAt: now, updatedAt: now, deletedAt: null });
  }

  // === 商品 ===
  const productsData = [
    { name: '会员月卡', description: '30天会员特权', type: 1, priceType: 2, price: 0, pointsPrice: 500, stock: 999, sortOrder: 1 },
    { name: '专属头像框', description: '精美头像框装饰', type: 1, priceType: 2, price: 0, pointsPrice: 200, stock: 999, sortOrder: 2 },
    { name: 'AILL 贴纸包', description: '社区专属贴纸表情包', type: 1, priceType: 2, price: 0, pointsPrice: 100, stock: 999, sortOrder: 3 },
    { name: 'AI 创作券', description: '可兑换AI创作服务一次', type: 3, priceType: 3, price: 10, pointsPrice: 1000, stock: 100, sortOrder: 4 },
  ];
  for (const p of productsData) {
    await repo.insert('products', { id: generateId(), ...p, images: '[]', status: 1, createdAt: now, updatedAt: now, deletedAt: null });
  }

  // === 活动 ===
  const weekLater = new Date(Date.now() + 7 * day).toISOString();
  const monthLater = new Date(Date.now() + 30 * day).toISOString();
  const campaignsData = [
    { name: '每日签到', description: '每天登录即可获得积分', type: 2, startTime: now, endTime: monthLater, rewardConfig: JSON.stringify({ target: 1, rewards: [{ assetTypeId: 1, amount: 10 }] }) },
    { name: '创作达人', description: '发布5篇帖子即可完成', type: 2, startTime: now, endTime: weekLater, rewardConfig: JSON.stringify({ target: 5, rewards: [{ assetTypeId: 1, amount: 100 }] }) },
    { name: '社区之星', description: '获得50个点赞', type: 2, startTime: now, endTime: monthLater, rewardConfig: JSON.stringify({ target: 50, rewards: [{ assetTypeId: 1, amount: 500 }] }) },
  ];
  const campaignIds = [];
  for (const c of campaignsData) {
    const campId = generateId();
    await repo.insert('campaigns', { id: campId, ...c, status: 1, createdAt: now });
    campaignIds.push(campId);
  }

  // === 成就 ===
  const achievementsData = [
    { name: '初来乍到', icon: '🌟', condition: JSON.stringify({ type: 'register', description: '注册账号' }), reward: JSON.stringify({ rewards: [{ assetTypeId: 1, amount: 50 }] }) },
    { name: '笔耕不辍', icon: '✍️', condition: JSON.stringify({ type: 'post_count', value: 10 }), reward: JSON.stringify({ rewards: [{ assetTypeId: 1, amount: 200 }] }) },
    { name: '万人迷', icon: '💖', condition: JSON.stringify({ type: 'follower_count', value: 100 }), reward: JSON.stringify({ rewards: [{ assetTypeId: 2, amount: 10 }] }) },
    { name: '评论家', icon: '💬', condition: JSON.stringify({ type: 'comment_count', value: 50 }), reward: JSON.stringify({ rewards: [{ assetTypeId: 1, amount: 100 }] }) },
  ];
  const achievementIds = [];
  for (const a of achievementsData) {
    const achId = generateId();
    await repo.insert('achievements', { id: achId, ...a, createdAt: now });
    achievementIds.push(achId);
  }

  // === 系统配置 ===
  const sysConfigData = [
    { id: 1, configKey: 'site_name', configValue: JSON.stringify('AILL'), description: '站点名称' },
    { id: 2, configKey: 'site_description', configValue: JSON.stringify('AI与人类共创社区 · 现代功能全都要'), description: '站点描述' },
    { id: 3, configKey: 'points_per_post', configValue: JSON.stringify(10), description: '发帖奖励积分' },
    { id: 4, configKey: 'points_per_comment', configValue: JSON.stringify(5), description: '评论奖励积分' },
    { id: 5, configKey: 'points_per_like', configValue: JSON.stringify(2), description: '获赞奖励积分' },
    { id: 6, configKey: 'max_login_attempts', configValue: JSON.stringify(10), description: '最大登录尝试次数' },
  ];
  for (const sc of sysConfigData) {
    await repo.insert('sys_config', { ...sc, updatedAt: now });
  }

  // === 帖子 ===
  const postIds = await seedPgPosts(allUsers, uid, uname, now, day, rand);
  console.log(`Created ${postIds.length} posts`);

  // === 评论 ===
  await seedPgComments(allUsers, uid, uname, now, day, rand, postIds);
  console.log('Created comments');

  // === 关系/资产/消息等 ===
  await seedPgRelations(allUsers, uid, uname, now, day, rand, campaignIds, achievementIds, postIds);

  console.log('PG seed data complete');
}

async function seedPgPosts(users, uid, uname, now, day, rand) {
  const sampleImages = Array.from({ length: 8 }, (_, i) => `https://picsum.photos/seed/${i + 1}/800/600`);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const postTitles = {
    tech: ['2026 年最新 AI 技术趋势分析', '量子计算 breakthrough', '苹果 Vision Pro 2 代上手体验', '开源大模型 vs 闭源', '5G-A 商用元年'],
    game: ['《GTA6》最新实机演示分析', '塞尔达传说新作深度评测', 'Steam 夏季特卖推荐', '原神 4.0 探索指南', '主机党 vs PC 党'],
    anime: ['2026 年 4 月新番推荐', '进击的巨人完结感想', '宫崎骏新作票房破纪录', 'B 站番剧评分系统', 'Cosplay 入门教程'],
    life: ['独居生活的 30 天挑战', '上海探店：10 家必去咖啡馆', '如何平衡工作与生活？', '第一次马拉松完赛', '居家办公效率提升'],
    ai: ['用 Midjourney V7 创作的科幻插画', 'Stable Diffusion 3 完整教程', 'AI 生成的音乐能通过图灵测试吗？', '我用 AI 做了一个月 UP 主', 'AI 绘画 Prompt 完全指南'],
  };

  const contentTemplates = [
    '今天想和大家分享一下我的想法。这个话题一直是我最近思考的重点。\n\n## 重点\n\n- 第一点很重要\n- 第二点也不容忽视\n\n希望对你有帮助！',
    '大家好，第一次发帖，请大家多多关照 (´▽｀)\n\n**重点来了：**\n\n1. 第一步很关键\n2. 第二步需要耐心\n3. 第三步见真章',
    '【多图预警】\n\n事情是这样的...感觉效果还不错。\n\n欢迎大家交流讨论！',
  ];

  const sectionIds = ['tech', 'game', 'anime', 'life', 'ai'];
  const postTypes = ['article', 'video', 'audio'];
  const postIds = [];

  for (const sectionId of sectionIds) {
    const titles = postTitles[sectionId];
    if (!titles) continue;

    for (const title of titles) {
      const authorIdx = Math.floor(Math.random() * users.length);
      const author = users[authorIdx];
      const content = pick(contentTemplates);
      const images = Math.random() > 0.5 ? JSON.stringify([pick(sampleImages)]) : '[]';
      const tags = JSON.stringify(['AI', '教程', '分享'].slice(0, Math.floor(Math.random() * 3) + 1));
      const viewCount = rand(100, 10000);
      const likeCount = rand(10, 500);
      const commentCount = rand(5, 25);
      const hotScore = likeCount * 10 + viewCount * 0.1 + commentCount * 5;

      const post = {
        id: generateId(), title, content, summary: content.substring(0, 200) + '...',
        coverImage: pick(sampleImages), images, type: pick(postTypes),
        status: 'published', originalType: pick(['original', 'recreate', 'repost']),
        authorId: author.id, authorName: author.username, authorAvatar: author.avatar,
        sectionId, tags,
        viewCount, likeCount, dislikeCount: rand(0, 10), commentCount,
        shareCount: rand(0, 100), favoriteCount: rand(0, 200),
        isTop: Math.random() > 0.9, isHot: Math.random() > 0.7,
        isEssence: Math.random() > 0.8, isRecommended: Math.random() > 0.6,
        hotScore, publishedAt: now,
        createdAt: new Date(Date.now() - rand(1, 30) * day).toISOString(),
        updatedAt: now, deletedAt: null,
      };

      await repo.insert('posts', post);
      postIds.push(post);
      await repo.increment('users', author.id, 'postCount', 1);
    }
  }
  return postIds;
}

async function seedPgComments(users, uid, uname, now, day, rand, postIds) {
  const commentContents = ['写的太好了！', '学习了', '大佬牛逼！', 'mark 一下', '有没有更详细的教程？', '支持一下', '已收藏', '同求+1', '666', '这个角度我没想到', '涨知识了', '已三连'];
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  for (const post of postIds) {
    const numComments = rand(5, 15);
    const postComments = [];

    for (let i = 0; i < numComments; i++) {
      const commenter = pick(users);
      const comment = {
        id: generateId(), postId: post.id, parentId: null, rootId: null,
        authorId: commenter.id, authorName: commenter.username, authorAvatar: commenter.avatar,
        content: pick(commentContents), images: '[]',
        likeCount: rand(0, 50), dislikeCount: 0, replyCount: 0,
        isAuthor: post.authorId === commenter.id, isTop: false, isEssence: false,
        replyToUserId: null, replyToUsername: null,
        createdAt: new Date(Date.now() - rand(1, 7) * day).toISOString(),
        updatedAt: now, deletedAt: null,
      };
      await repo.insert('comments', comment);
      postComments.push(comment);
    }

    // 嵌套回复（30% 的根评论有回复）
    const rootComments = postComments.filter(c => !c.parentId);
    for (const parent of rootComments.slice(0, Math.floor(rootComments.length * 0.3))) {
      const numReplies = rand(1, 3);
      for (let i = 0; i < numReplies; i++) {
        const replier = pick(users);
        const reply = {
          id: generateId(), postId: post.id, parentId: parent.id, rootId: parent.id,
          authorId: replier.id, authorName: replier.username, authorAvatar: replier.avatar,
          content: pick(['说得好！', '同意楼上', '补充一点...', '哈哈确实', '涨知识了']),
          images: '[]', likeCount: rand(0, 20), dislikeCount: 0, replyCount: 0,
          isAuthor: post.authorId === replier.id, isTop: false, isEssence: false,
          replyToUserId: parent.authorId, replyToUsername: parent.authorName,
          createdAt: new Date(new Date(parent.createdAt).getTime() + (i + 1) * 3600000).toISOString(),
          updatedAt: now, deletedAt: null,
        };
        await repo.insert('comments', reply);
        await repo.rawQuery('UPDATE comments SET reply_count = reply_count + 1 WHERE id = $1', [parent.id]);
      }
    }
  }
}

async function seedPgRelations(users, uid, uname, now, day, rand, campaignIds, achievementIds, postIds) {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const pid = (i) => postIds[i % postIds.length].id;
  const cid = async (i) => {
    const res = await repo.rawQuery('SELECT id FROM comments ORDER BY created_at DESC LIMIT 1 OFFSET $1', [i]);
    return res.rows.length > 0 ? res.rows[0].id : null;
  };

  // 关注关系
  const relPairs = [[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[0,1],[0,2],[1,2],[2,1],[3,4],[4,3],[5,1],[5,3],[6,2],[1,5],[2,6],[3,6]];
  for (const [fi, ti] of relPairs) {
    if (uid(fi) === uid(ti)) continue;
    await repo.insert('user_relationships', { id: generateId(), userId: uid(fi), targetUserId: uid(ti), type: 1, status: 1, createdAt: new Date(Date.now() - rand(1, 30) * day).toISOString(), updatedAt: now, deletedAt: null });
    await repo.increment('users', uid(fi), 'followingCount', 1);
    await repo.increment('users', uid(ti), 'followerCount', 1);
  }

  // 拉黑
  for (const [fi, ti] of [[1, 3], [4, 6]]) {
    await repo.insert('user_blocks', { id: generateId(), userId: uid(fi), targetUserId: uid(ti), blockedUserId: uid(ti), createdAt: new Date(Date.now() - rand(3, 5) * day).toISOString() });
  }

  // 资产类型
  const assetTypesData = [
    { id: 1, name: '积分', unit: '点', icon: '🪙' },
    { id: 2, name: '金币', unit: '枚', icon: '💰' },
    { id: 3, name: '经验', unit: 'XP', icon: '⭐' },
  ];
  for (const at of assetTypesData) {
    await repo.insert('asset_types', at);
  }

  // 用户资产 + 交易
  for (const u of users) {
    for (const at of assetTypesData) {
      const bal = at.id === 1 ? rand(100, 5000) : at.id === 2 ? rand(10, 500) : rand(50, 2000);
      await repo.insert('user_assets', { id: generateId(), userId: u.id, typeId: at.id, assetTypeId: at.id, balance: bal, totalEarned: bal, totalConsumed: 0 });
      await repo.insert('asset_transactions', { id: generateId(), userId: u.id, typeId: at.id, assetTypeId: at.id, type: 1, transactionType: 1, amount: bal, balance: bal, balanceAfter: bal, description: '初始赠送', relatedId: null, relatedBizId: null, createdAt: new Date(Date.now() - rand(1, 10) * day).toISOString() });
    }
  }

  // 消息/会话
  const convos = [
    { p: [0, 1], msgs: ['你好呀！', '嗨，最近怎么样？', '挺好的，在忙什么呢？', '在研究 AI 绘画，你有兴趣吗？', '当然！发我看看'] },
    { p: [2, 3], msgs: ['那个教程太棒了', '谢谢！花了好久才写完', '可以转载吗？', '可以的，注明出处就行', '好的，感谢！'] },
    { p: [0, 5], msgs: ['管理员你好，有个帖子想举报', '好的，发我链接', '帖子链接在这里...', '已处理，谢谢反馈'] },
  ];
  for (const c of convos) {
    const convId = generateId();
    await repo.insert('conversations', { id: convId, type: 1, lastMessage: c.msgs[c.msgs.length - 1], lastMessageAt: new Date(Date.now() - rand(0, 2) * day).toISOString(), createdAt: new Date(Date.now() - 7 * day).toISOString(), deletedAt: null });

    for (const pi of c.p) {
      await repo.insert('conversation_participants', { id: generateId(), conversationId: convId, userId: uid(pi), unreadCount: rand(0, 3), joinedAt: new Date(Date.now() - 7 * day).toISOString() });
    }
    for (let mi = 0; mi < c.msgs.length; mi++) {
      await repo.insert('messages', { id: generateId(), conversationId: convId, senderId: uid(c.p[mi % 2]), content: c.msgs[mi], type: 1, isRead: mi < c.msgs.length - 1 ? 1 : 0, createdAt: new Date(Date.now() - (c.msgs.length - mi) * 3600000).toISOString(), updatedAt: now, deletedAt: null });
    }
  }

  // 收藏
  for (let i = 0; i < Math.min(4, users.length); i++) {
    const folderId = generateId();
    await repo.insert('favorite_folders', { id: folderId, userId: users[i].id, name: ['我的收藏', '技术好文', '精选内容', '灵感集'][i], description: '', sortOrder: i, createdAt: new Date(Date.now() - 10 * day).toISOString() });
    for (let j = 0; j < rand(2, 4); j++) {
      await repo.insert('favorites', { id: generateId(), userId: users[i].id, folderId, targetType: 1, targetId: pid(i + j), createdAt: new Date(Date.now() - rand(1, 10) * day).toISOString() });
    }
  }

  // 通知 (type: 1=点赞 2=评论 3=关注 4=系统 5=活动)
  for (let i = 0; i < 20; i++) {
    const type = (i % 5) + 1;
    const n = {
      id: generateId(), userId: uid(i), type,
      sourceUserId: uid(i + 1),
      title: { 1: '收到点赞', 2: '收到评论', 3: '新增粉丝', 4: '系统通知', 5: '活动通知' }[type],
      content: { 1: `${uname(i + 1)} 赞了你的帖子`, 2: `${uname(i + 2)} 评论了`, 3: `${uname(i + 3)} 关注了你`, 4: '社区规范已更新', 5: '签到活动进行中' }[type],
      targetType: type <= 2 ? 1 : type === 3 ? 3 : 0,
      targetId: type <= 2 ? pid(i) : uid(i + 1),
      isRead: Math.random() > 0.4 ? 1 : 0,
      createdAt: new Date(Date.now() - rand(0, 7) * day).toISOString(), deletedAt: null,
    };
    await repo.insert('notifications', n);
  }

  // 审核规则 (type: 1=关键词, 2=正则, 3=AI检测)
  const modRules = [
    { type: 1, pattern: '违规广告', action: 'block', status: 1 },
    { type: 1, pattern: '敏感词', action: 'review', status: 1 },
    { type: 2, pattern: '\\d{11}', action: 'warn', status: 1 },
  ];
  for (const r of modRules) {
    await repo.insert('moderation_rules', { id: generateId(), ...r, createdAt: new Date(Date.now() - 20 * day).toISOString(), updatedAt: now });
  }

  // 审核记录 (targetType: 1=帖子, 2=评论; type: 1=关键词, 2=正则, 3=AI; status: 1=待审, 2=通过, 3=拒绝)
  const firstCommentId = await cid(0);
  const secondCommentId = await cid(1);
  const modRecords = [
    { targetType: 1, targetId: pid(0), userId: uid(1), type: 1, status: 2, reason: '人工复核通过' },
    { targetType: 2, targetId: firstCommentId, userId: uid(3), type: 1, status: 3, reason: '包含违规内容' },
    { targetType: 1, targetId: pid(4), userId: uid(5), type: 3, status: 1, reason: '疑似AI生成' },
  ];
  for (const r of modRecords) {
    if (r.targetId) {
      await repo.insert('moderation_records', { id: generateId(), ...r, createdAt: new Date(Date.now() - rand(1, 5) * day).toISOString(), updatedAt: now });
    }
  }

  // 合集
  const imgs = ['https://picsum.photos/seed/c1/800/600', 'https://picsum.photos/seed/c2/800/600', 'https://picsum.photos/seed/c3/800/600'];
  const collectionsData = [
    { name: 'AI 入门必读', desc: '精选 AI 学习资源', tags: JSON.stringify(['AI', '教程']) },
    { name: '年度最佳游戏评测', desc: '2026 年最值得玩的游戏', tags: JSON.stringify(['游戏', '评测']) },
    { name: '生活美学家', desc: '记录美好生活的点滴', tags: JSON.stringify(['生活', '摄影']) },
  ];
  for (let ci = 0; ci < collectionsData.length; ci++) {
    const col = collectionsData[ci];
    const colId = generateId();
    await repo.insert('collections', { id: colId, title: col.name, name: col.name, description: col.desc, coverImage: imgs[ci], authorId: uid(ci), userId: uid(ci), authorName: uname(ci), postCount: rand(3, 6), tags: col.tags, viewCount: rand(100, 2000), likeCount: rand(10, 200), status: 1, createdAt: new Date(Date.now() - 15 * day).toISOString(), updatedAt: now, deletedAt: null });
    for (let j = 0; j < 4; j++) {
      await repo.insert('collection_posts', { id: generateId(), collectionId: colId, postId: pid(ci * 4 + j), sortOrder: j, addedAt: new Date(Date.now() - rand(1, 10) * day).toISOString() });
    }
    for (const t of JSON.parse(col.tags)) {
      await repo.insert('collection_tags', { id: generateId(), collectionId: colId, tag: t });
    }
  }

  // 直播
  const liveRoomId = generateId();
  await repo.insert('live_rooms', { id: liveRoomId, title: 'AI 绘画教学直播', userId: uid(3), username: uname(3), coverImage: imgs[0], streamUrl: '', status: 'live', viewerCount: rand(50, 500), likeCount: rand(100, 1000), startTime: new Date(Date.now() - 2 * 3600000).toISOString(), createdAt: new Date(Date.now() - 2 * 3600000).toISOString(), deletedAt: null });

  const liveMsgs = ['主播好厉害', '666', '请问用的什么工具？', '好看！', '来晚了', '已关注'];
  for (let i = 0; i < liveMsgs.length; i++) {
    await repo.insert('live_messages', { id: generateId(), roomId: liveRoomId, userId: uid(i), username: uname(i), content: liveMsgs[i], type: 'chat', createdAt: new Date(Date.now() - (liveMsgs.length - i) * 60000).toISOString() });
  }

  // 活动/成就进度
  for (const campId of campaignIds) {
    for (let j = 0; j < 3; j++) {
      await repo.insert('user_campaign_progress', { id: generateId(), campaignId: campId, userId: uid(j), currentCount: rand(0, 5), completed: Math.random() > 0.6, completedAt: Math.random() > 0.6 ? new Date(Date.now() - rand(1, 5) * day).toISOString() : null, joinedAt: new Date(Date.now() - rand(5, 15) * day).toISOString() });
    }
  }
  for (const achId of achievementIds) {
    for (let j = 0; j < 2; j++) {
      await repo.insert('user_achievements', { id: generateId(), achievementId: achId, userId: uid(j), unlockedAt: new Date(Date.now() - rand(1, 20) * day).toISOString() });
    }
  }

  // 反馈
  const feedbackTypes = ['bug', 'feature', 'complaint', 'other'];
  const feedbackContents = ['希望增加暗色模式', '帖子编辑功能有 bug', '建议增加帖子分类筛选', '举报处理速度太慢了', '希望能支持图片拖拽上传'];
  for (let i = 0; i < 5; i++) {
    await repo.insert('feedbacks', { id: generateId(), userId: uid(i), type: feedbackTypes[i % feedbackTypes.length], title: feedbackContents[i].substring(0, 20), content: feedbackContents[i], status: ['pending', 'processing', 'resolved', 'closed', 'pending'][i], adminReply: i === 2 ? '已收到，计划下个版本实现' : null, createdAt: new Date(Date.now() - rand(1, 15) * day).toISOString(), updatedAt: now, deletedAt: null });
  }

  // 必看列表
  for (let i = 0; i < 5; i++) {
    const post = postIds[i % postIds.length];
    await repo.insert('must_see_list', { id: generateId(), targetType: 'post', targetId: post.id, postId: post.id, title: post.title, coverImage: post.coverImage, description: (post.summary || '').substring(0, 100), sortOrder: i, addedBy: 'admin001', createdBy: 'admin001', createdAt: new Date(Date.now() - rand(1, 10) * day).toISOString(), deletedAt: null });
  }

  // 审计日志
  const auditActions = [
    { action: 'user_ban', targetType: 'user', description: '禁用用户账号', targetId: uid(1) },
    { action: 'post_delete', targetType: 'post', description: '删除违规帖子', targetId: pid(2) },
    { action: 'config_update', targetType: 'system', description: '更新系统配置', targetId: pid(3) },
    { action: 'moderation_approve', targetType: 'comment', description: '审核通过评论', targetId: firstCommentId },
  ];
  for (let i = 0; i < auditActions.length; i++) {
    const al = auditActions[i];
    if (al.targetId) {
      await repo.insert('audit_logs', { id: generateId(), operatorId: 'admin001', operatorName: 'admin', ...al, ip: '127.0.0.1', createdAt: new Date(Date.now() - (auditActions.length - i) * day).toISOString() });
    }
  }

  // 初始化排行榜数据
  try {
    await calculateRankings('hot', 'weekly', 1);
    await calculateRankings('hot', 'weekly', 2);
  } catch (e) {
    console.error('Failed to calculate rankings:', e.message);
  }

  console.log('Full PG seed complete');
}

export default initDatabase;
