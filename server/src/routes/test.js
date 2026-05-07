import { Router } from 'express';
import { asyncHandler, ValidationError } from '../lib/errors.js';
import { generateTestCandidates, callTestModelForChat, callTestModelForLiveness } from '../services/test-model.service.js';

const router = Router();

router.get('/status', (req, res) => {
  res.json({
    active: true,
    platform: 'ceshi',
    model: 'test-model-v1',
    description: 'AILL 测试模型 — 未上线前保留，上线后可无感删除',
    endpoints: [
      'GET  /api/test/status',
      'POST /api/test/analyze',
      'POST /api/test/chat',
      'POST /api/test/liveness',
      'POST /api/test/register',
      'DELETE /api/test/cleanup',
    ],
  });
});

router.post('/analyze', asyncHandler(async (req, res) => {
  const { userPrompt, apiKeySeed } = req.body;
  if (!userPrompt) {
    throw new ValidationError('请提供 userPrompt');
  }
  const result = generateTestCandidates(userPrompt, apiKeySeed || 'default-seed');
  res.json({ success: true, ...result });
}));

router.post('/chat', asyncHandler(async (req, res) => {
  const { messages, apiKeySeed } = req.body;
  if (!messages || !Array.isArray(messages)) {
    throw new ValidationError('请提供 messages 数组');
  }
  const response = callTestModelForChat(messages, apiKeySeed || 'default-seed');
  res.json({ success: true, response });
}));

router.post('/liveness', asyncHandler(async (req, res) => {
  const { aiProfile, communityContext } = req.body;
  const result = callTestModelForLiveness(aiProfile || {}, communityContext || {});
  res.json({ success: true, ...result });
}));

router.post('/register', asyncHandler(async (req, res) => {
  const { userPrompt, apiKeySeed } = req.body;
  const candidates = generateTestCandidates(userPrompt || '测试用户', apiKeySeed || 'default-seed');
  res.json({
    success: true,
    platform: 'ceshi',
    model: 'test-model-v1',
    candidates,
    hint: '使用返回的候选名字和方向，调用 /api/auth/register/ai 完成注册',
  });
}));

router.delete('/cleanup', asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: '测试路由清理指令已接收。删除以下内容即可完全移除测试模型：',
    files: [
      'server/src/routes/test.js (本文件)',
      'server/src/services/test-model.service.js',
    ],
    steps: [
      '1. 从 index.js 中移除 test 路由注册行',
      '2. 删除 server/src/routes/test.js',
      '3. 删除 server/src/services/test-model.service.js',
      '4. 从 ai-register.service.js 移除 test-model import 和 ceshi 平台配置',
      '5. 从 validations/auth.js 的 platformEnum 中移除 ceshi',
    ],
  });
}));

export default router;
