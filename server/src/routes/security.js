import express from 'express';
import {
  recordLoginAttempt,
  checkLoginRestriction,
  getIpBlacklist,
  addIpToBlacklist,
  removeIpFromBlacklist,
  getBlockedDevices,
  addDeviceToBlacklist,
  removeDeviceFromBlacklist,
  getRiskAssessments,
  upsertRiskAssessment,
  getFileMetadata,
  createFileMetadata,
  deleteFileMetadata,
  getSysConfigs,
  getSysConfig,
  setSysConfig,
} from '../services/security.service.js';
import { validate } from '../middleware/validate.js';
import { loginAttemptSchema, ipBlacklistSchema, deviceBlacklistSchema, riskAssessmentSchema, fileMetaSchema, setConfigSchema } from '../validations/security.js';
import { asyncHandler, ValidationError } from '../lib/errors.js';
import { success, created, deleted } from '../lib/response.js';

const router = express.Router();

// ========== 登录安全 ==========

// 检查登录限制
router.get('/login-check', asyncHandler(async (req, res) => {
  const { identifier, ip } = req.query;
  if (!identifier) throw new ValidationError('缺少标识符');
  const result = await checkLoginRestriction(identifier, ip);
  success(res, result);
}));

// 记录登录尝试
router.post('/login-attempt', validate(loginAttemptSchema), asyncHandler(async (req, res) => {
  const result = await recordLoginAttempt(req.body);
  created(res, result);
}));

// ========== IP黑名单 ==========

// 获取IP黑名单
router.get('/ip-blacklist', asyncHandler(async (req, res) => {
  const result = await getIpBlacklist(req.query);
  success(res, result);
}));

// 添加IP黑名单
router.post('/ip-blacklist', validate(ipBlacklistSchema), asyncHandler(async (req, res) => {
  const result = await addIpToBlacklist(req.body);
  created(res, result);
}));

// 移除IP黑名单
router.delete('/ip-blacklist/:id', asyncHandler(async (req, res) => {
  await removeIpFromBlacklist(req.params.id);
  deleted(res);
}));

// ========== 设备黑名单 ==========

// 获取设备黑名单
router.get('/blocked-devices', asyncHandler(async (req, res) => {
  const result = await getBlockedDevices(req.query);
  success(res, result);
}));

// 添加设备黑名单
router.post('/blocked-devices', validate(deviceBlacklistSchema), asyncHandler(async (req, res) => {
  const result = await addDeviceToBlacklist(req.body);
  created(res, result);
}));

// 移除设备黑名单
router.delete('/blocked-devices/:id', asyncHandler(async (req, res) => {
  await removeDeviceFromBlacklist(req.params.id);
  deleted(res);
}));

// ========== 风险评估 ==========

// 获取风险评估列表
router.get('/risk-assessments', asyncHandler(async (req, res) => {
  const result = await getRiskAssessments(req.query);
  success(res, result);
}));

// 创建/更新风险评估
router.post('/risk-assessments', validate(riskAssessmentSchema), asyncHandler(async (req, res) => {
  const result = await upsertRiskAssessment(req.body);
  created(res, result);
}));

// ========== 文件元数据 ==========

// 获取文件列表
router.get('/files', asyncHandler(async (req, res) => {
  const result = await getFileMetadata(req.query);
  success(res, result);
}));

// 创建文件元数据
router.post('/files', validate(fileMetaSchema), asyncHandler(async (req, res) => {
  const result = await createFileMetadata(req.body);
  created(res, result);
}));

// 删除文件元数据
router.delete('/files/:id', asyncHandler(async (req, res) => {
  await deleteFileMetadata(req.params.id);
  deleted(res);
}));

// ========== 系统配置 ==========

// 获取全部配置
router.get('/config', asyncHandler(async (req, res) => {
  const result = await getSysConfigs();
  success(res, result);
}));

// 获取单个配置
router.get('/config/:key', asyncHandler(async (req, res) => {
  const result = await getSysConfig(req.params.key);
  success(res, result || { configKey: req.params.key, configValue: null });
}));

// 设置配置
router.post('/config', validate(setConfigSchema), asyncHandler(async (req, res) => {
  const result = await setSysConfig(req.body);
  created(res, result);
}));

export default router;
