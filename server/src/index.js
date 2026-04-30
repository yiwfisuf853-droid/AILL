import path from 'path';
import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import postRoutes from './routes/posts.js';
import commentRoutes from './routes/comments.js';
import userRoutes from './routes/users.js';
import relationshipRoutes from './routes/relationships.js';
import notificationRoutes from './routes/notifications.js';
import assetRoutes from './routes/assets.js';
import feedbackRoutes from './routes/feedback.js';
import messageRoutes from './routes/messages.js';
import favoriteRoutes from './routes/favorites.js';
import moderationRoutes from './routes/moderation.js';
import dictRoutes from './routes/dict.js';
import rankingRoutes from './routes/rankings.js';
import collectionRoutes from './routes/collections.js';
import shopRoutes from './routes/shop.js';
import liveRoutes from './routes/live.js';
import campaignRoutes from './routes/campaigns.js';
import aiRoutes from './routes/ai.js';
import securityRoutes from './routes/security.js';
import trustLevelRoutes from './routes/trust-level.js';
import adminRoutes from './routes/admin.js';
import uploadRoutes from './routes/upload.js';
import auditRoutes from './routes/audit.js';
import subscriptionRoutes from './routes/subscriptions.js';
import hotTopicRoutes from './routes/hot-topics.js';
import influenceRoutes from './routes/influence.js';
import assetRulesRouter from './routes/asset-rules.js';
import { authMiddleware, adminMiddleware, optionalAuthMiddleware } from './services/auth.service.js';
import { AppError } from './lib/errors.js';
import { initDatabase } from './data/init-db.js';
import { initWebSocket } from './lib/websocket.js';
import { rawQuery } from './models/repository.js';

dotenv.config();

const app = express();

// 简易限流
const rateLimitMap = new Map();
const rateLimiter = (max = 100, windowMs = 60000) => (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const r = rateLimitMap.get(ip) || { count: 0, start: now };
  if (now - r.start > windowMs) { r.count = 0; r.start = now; }
  r.count++;
  rateLimitMap.set(ip, r);
  // 定期清理过期条目（防止内存泄漏）
  if (rateLimitMap.size > 10000) {
    for (const [k, v] of rateLimitMap) {
      if (now - v.start > windowMs) rateLimitMap.delete(k);
    }
  }
  if (r.count > max) return res.status(429).json({ success: false, error: '请求过于频繁，请稍后再试' });
  next();
};
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// 安全头（开发模式关闭 CSP）
app.use(helmet({ contentSecurityPolicy: false }));

// Gzip 压缩
app.use(compression());

// 跨域
app.use(cors({
  origin: isProduction ? (process.env.CORS_ORIGIN || false) : true,
  credentials: true,
}));

// JSON 解析（限制 1mb，大文件上传走 multer）
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 全局可选认证（设置 req.user 如果 token 存在）
app.use(optionalAuthMiddleware);

// 请求日志
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// 全局限流：每 IP 每分钟 200 次
app.use(rateLimiter(200, 60000));

// 静态文件服务（上传的文件）
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// 认证敏感路由加严限流（防暴力破解）— 开发环境不限流
if (isProduction) {
  app.use('/api/auth/login', rateLimiter(10, 60000));
  app.use('/api/auth/register', rateLimiter(5, 60000));
}

// 公开路由（只读）
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/hot-topics', hotTopicRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dict', dictRoutes);
app.use('/api/rankings', rankingRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/live', liveRoutes);
app.use('/api/trust-level', trustLevelRoutes);

// 需要认证的路由
app.use('/api/relationships', authMiddleware, relationshipRoutes);
app.use('/api/notifications', authMiddleware, notificationRoutes);
app.use('/api/assets', authMiddleware, assetRoutes);
app.use('/api/messages', authMiddleware, messageRoutes);
app.use('/api/favorites', authMiddleware, favoriteRoutes);
app.use('/api/campaigns', authMiddleware, campaignRoutes);
app.use('/api/ai', authMiddleware, aiRoutes);
app.use('/api/feedback', authMiddleware, feedbackRoutes);
app.use('/api/subscriptions', authMiddleware, subscriptionRoutes);
app.use('/api/upload', authMiddleware, uploadRoutes);
app.use('/api/influence', authMiddleware, influenceRoutes);
app.use('/api/asset-rules', authMiddleware, adminMiddleware, assetRulesRouter);

// 管理员路由
app.use('/api/moderation', authMiddleware, adminMiddleware, moderationRoutes);
app.use('/api/security', authMiddleware, adminMiddleware, securityRoutes);
app.use('/api/admin', authMiddleware, adminMiddleware, adminRoutes);
app.use('/api/audit', authMiddleware, adminMiddleware, auditRoutes);

// 健康检查
app.get('/api/health', async (req, res) => {
  try {
    const userCount = await rawQuery('SELECT COUNT(*) as total FROM users WHERE deleted_at IS NULL');
    const postCount = await rawQuery('SELECT COUNT(*) as total FROM posts WHERE deleted_at IS NULL');
    const commentCount = await rawQuery('SELECT COUNT(*) as total FROM comments');
    const pendingMod = await rawQuery("SELECT COUNT(*) as total FROM moderation_records WHERE status = 1");
    const today = new Date().toISOString().slice(0, 10);
    const activeRes = await rawQuery(
      "SELECT COUNT(*) as total FROM users WHERE deleted_at IS NULL AND (updated_at::date::text = $1 OR post_count > 0)",
      [today]
    );
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      stats: {
        users: Number(userCount.rows[0].total),
        posts: Number(postCount.rows[0].total),
        comments: Number(commentCount.rows[0].total),
        activeUsers: Number(activeRes.rows[0].total),
        pendingModeration: Number(pendingMod.rows[0].total),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Health check failed', message: err.message });
  }
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Not Found' });
});

// 错误处理 — 统一使用 AppError 的 status，其他错误为 500
app.use((err, req, res, next) => {
  console.error('Error:', err);
  const status = err instanceof AppError ? err.status : 500;
  const message = err instanceof AppError ? err.message : 'Internal Server Error';
  res.status(status).json({ success: false, error: message });
});

// 启动服务器
const startServer = async () => {
  try {
    // 初始化数据库（PG 模式，失败则报错退出）
    await initDatabase();

    const server = http.createServer(app);
    server.timeout = 30000; // 30 秒请求超时
    initWebSocket(server);

    server.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║                    AILL Server Started                    ║
╠═══════════════════════════════════════════════════════════╣
║  URL: http://localhost:${PORT}                              ║
║  Environment: ${process.env.NODE_ENV || 'development'}
║  Database: PostgreSQL                                      ║
║  WebSocket: Enabled                                       ║
╚═══════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
