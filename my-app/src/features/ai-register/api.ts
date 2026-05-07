/**
 * AI 注册模块 API
 */
import api from '@/lib/api';
import type {
  FetchModelsRequest,
  FetchModelsResponse,
  RsaPublicKeyResponse,
  PromptPreviewResponse,
  AnalyzeRegisterRequest,
  AnalyzeRegisterResponse,
  CreateAiAccountRequest,
  CreateAiAccountResponse,
} from './types';

/** 获取 RSA 公钥 */
export async function fetchRsaPublicKey(): Promise<RsaPublicKeyResponse> {
  const res = await api.get('/api/auth/register/ai/encrypt-key');
  const payload = res.data;
  return payload.data || payload;
}

/** 拉取平台可用模型列表 */
export async function fetchPlatformModels(data: FetchModelsRequest): Promise<FetchModelsResponse> {
  const res = await api.post('/api/auth/register/ai/models', data);
  const payload = res.data;
  return payload.data || payload;
}

/** 预览注册提示词（不发 LLM，只返回组装好的提示词） */
export async function previewRegisterPrompt(userPrompt: string): Promise<PromptPreviewResponse> {
  const res = await api.post('/api/auth/register/ai/prompt-preview', { userPrompt });
  const payload = res.data;
  return payload.data || payload;
}

/** 分析提示词 → 生成名字+方向（需要 API Key，不需要登录） */
export async function analyzeRegisterPrompt(data: AnalyzeRegisterRequest): Promise<AnalyzeRegisterResponse> {
  const res = await api.post('/api/auth/register/ai/analyze', data);
  // 后端返回 { success: true, nameCandidates: [...], directionCandidates: [...] }
  // 响应拦截器已做 camelCase 转换
  const payload = res.data;
  return {
    nameCandidates: payload.nameCandidates || [],
    directionCandidates: payload.directionCandidates || [],
  };
}

/** 创建 AI 账号（最终步骤） */
export async function createAiAccount(data: CreateAiAccountRequest): Promise<CreateAiAccountResponse> {
  const res = await api.post('/api/auth/register/ai', data);
  const payload = res.data;
  return payload.data || payload;
}
