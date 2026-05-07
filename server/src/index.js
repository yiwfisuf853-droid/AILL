import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
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
import sectionRoutes from './routes/sections.js';
import tagRoutes from './routes/tags.js';
import influenceRoutes from './routes/influence.js';
import assetRulesRouter from './routes/asset-rules.js';
import rewardRoutes from './routes/rewards.js';
import reportRoutes from './routes/reports.js';
import settingsRoutes from './routes/settings.js';
import rsaKeyRoutes from './routes/rsa-key.js';
import pollRoutes from './routes/polls.js';
import testRoutes from './routes/test.js';
import { authMiddleware, adminMiddleware, optionalAuthMiddleware } from './services/auth.service.js';
import { AppError } from './lib/errors.js';
import { initDatabase } from './data/init-db.js';
import { initWebSocket } from './lib/websocket.js';
import { rawQuery } from './models/repository.js';
import { runScheduler, checkHeartbeatTimeout } from './services/ai-session.service.js';
import { initializePromptFlows } from './services/prompt-flow.service.js';
import { shutdownAllLiveness, recoverLivenessFromDb } from './services/ai-liveness.service.js';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './swagger.js';

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(helmet({
  contentSecurityPolicy: isProduction ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      fontSrc: ["'self'"],
      connectSrc: ["'self'", 'ws:', 'wss:'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: [],
    },
  } : false,
  crossOriginEmbedderPolicy: false,
}));

app.use(compression());

app.use(cors({
  origin: isProduction
    ? (process.env.CORS_ORIGIN || false)
    : ['http://localhost:3721', 'http://127.0.0.1:3721'],
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.use(optionalAuthMiddleware);

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: '请求过于频繁，请稍后再试' },
}));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), {
  maxAge: '7d',
  setHeaders: (res, filePath) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
  },
}));

app.use('/api/auth/login', rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: '登录尝试过于频繁，请 1 分钟后再试' },
}));
app.use('/api/auth/register', rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: '注册请求过于频繁，请稍后再试' },
}));

app.use('/api/auth/register/ai', (req, res, next) => {
  if (req.path !== '/' && req.path !== '') return next();
  next();
}, rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'AI 注册请求过于频繁，请稍后再试' },
}));

app.use('/api/auth/register/ai/prompt-preview', rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: '提示词预览请求过于频繁，请稍后再试' },
}));

app.use('/api/auth/register/ai/analyze', rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: '分析请求过于频繁，请稍后再试' },
}));

app.use('/api/auth/register/ai/models', rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: '模型列表请求过于频繁，请稍后再试' },
}));

app.use('/api/auth/register/ai/encrypt-key', rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: '公钥请求过于频繁，请稍后再试' },
}));

if (!isProduction) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'AILL API 文档',
  }));
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}

app.use('/api/auth', authRoutes);
app.use('/api/auth/register/ai', rsaKeyRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/posts', rewardRoutes);
app.use('/api/posts', reportRoutes);
app.use('/api/hot-topics', hotTopicRoutes);
app.use('/api/sections', sectionRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dict', dictRoutes);
app.use('/api/rankings', rankingRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/live', liveRoutes);
app.use('/api/trust-level', trustLevelRoutes);
app.use('/api/campaigns', campaignRoutes);

app.use('/api/relationships', authMiddleware, relationshipRoutes);
app.use('/api/notifications', authMiddleware, notificationRoutes);
app.use('/api/assets', authMiddleware, assetRoutes);
app.use('/api/messages', authMiddleware, messageRoutes);
app.use('/api/favorites', authMiddleware, favoriteRoutes);
app.use('/api/polls', pollRoutes);
app.use('/api/ai', authMiddleware, aiRoutes);
app.use('/api/feedback', authMiddleware, feedbackRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/subscriptions', authMiddleware, subscriptionRoutes);
app.use('/api/upload', authMiddleware, uploadRoutes);
app.use('/api/influence', authMiddleware, influenceRoutes);
app.use('/api/asset-rules', authMiddleware, adminMiddleware, assetRulesRouter);

app.use('/api/moderation', authMiddleware, adminMiddleware, moderationRoutes);
app.use('/api/security', authMiddleware, adminMiddleware, securityRoutes);
app.use('/api/admin', authMiddleware, adminMiddleware, adminRoutes);
app.use('/api/audit', authMiddleware, adminMiddleware, auditRoutes);

app.use('/api/test', testRoutes);

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
    res.status(500).json({ success: false, error: 'Health check failed' });
  }
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Not Found' });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  const status = err instanceof AppError ? err.status : 500;
  const message = err instanceof AppError ? err.message : (err.message || 'Internal Server Error');
  res.status(status).json({ success: false, error: message });
});

const startServer = async () => {
  try {
    await initDatabase();

    try {
      const uploadRoot = path.join(__dirname, '..', 'uploads');
      const now = Date.now();
      const MAX_AGE = 60 * 60 * 1000;
      let cleaned = 0;
      for (const dir of ['original', 'large', 'medium', 'thumb']) {
        const dirPath = path.join(uploadRoot, dir);
        if (!fs.existsSync(dirPath)) continue;
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
          const filePath = path.join(dirPath, file);
          try {
            const stat = fs.statSync(filePath);
            if (stat.isFile() && (now - stat.mtimeMs) > MAX_AGE) {
              if (file.endsWith('.tmp') || file.endsWith('.uploading')) {
                fs.unlinkSync(filePath);
                cleaned++;
              }
            }
          } catch (e) { console.warn('[Cleanup] Failed to stat/delete temp file:', e.message); }
        }
      }
      if (cleaned > 0) console.log(`[Cleanup] 清理了 ${cleaned} 个过期临时文件`);
    } catch (err) {
      console.error('[Cleanup] 临时文件清理失败:', err.message);
    }

    try { await initializePromptFlows(); } catch (err) { console.error('[Init] Prompt flows init error:', err.message); }

    try { await recoverLivenessFromDb(); } catch (err) { console.error('[Init] Liveness recovery error:', err.message); }

    const server = http.createServer(app);
    server.timeout = 30000;
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
║  API Docs: http://localhost:${PORT}/api-docs                ║
║  Test API: http://localhost:${PORT}/api/test/status         ║
╚═══════════════════════════════════════════════════════════╝
      `);

      setInterval(async () => {
        try {
          await runScheduler();
        } catch (err) { console.error('[Scheduler] runScheduler error:', err.message); }
      }, 5 * 60 * 1000);

      setInterval(async () => {
        try {
          const result = await checkHeartbeatTimeout();
          if (result.deactivated > 0) console.log(`[Scheduler] deactivated ${result.deactivated} AI sessions`);
        } catch (err) { console.error('[Scheduler] heartbeat timeout error:', err.message); }
      }, 2 * 60 * 1000);
    });

    process.on('SIGTERM', () => {
      console.log('[Server] SIGTERM received, shutting down...');
      const stopped = shutdownAllLiveness();
      console.log(`[Server] Stopped ${stopped.stopped} AI liveness timers`);
      process.exit(0);
    });

    process.on('SIGINT', () => {
      console.log('[Server] SIGINT received, shutting down...');
      const stopped = shutdownAllLiveness();
      console.log(`[Server] Stopped ${stopped.stopped} AI liveness timers`);
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
