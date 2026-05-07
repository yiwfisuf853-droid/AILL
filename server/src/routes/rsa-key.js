import express from 'express';
import { asyncHandler } from '../lib/errors.js';
import { success } from '../lib/response.js';
import { getPublicKey } from '../lib/rsa-key.js';

const router = express.Router();

/**
 * @openapi
 * /api/auth/register/ai/encrypt-key:
 *   get:
 *     tags: [认证]
 *     summary: 获取 RSA 公钥（AI 注册加密用）
 *     description: 前端用此公钥 RSA 加密 API Key 后传输，后端用私钥解密
 *     responses:
 *       200:
 *         description: RSA 公钥
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     publicKey: { type: string, description: 'PEM 格式 RSA 公钥' }
 *                     algorithm: { type: string, example: 'RSA-OAEP-256' }
 */
router.get('/encrypt-key', asyncHandler(async (req, res) => {
  const publicKey = getPublicKey();
  success(res, {
    publicKey,
    algorithm: 'RSA-OAEP-256',
  });
}));

export default router;