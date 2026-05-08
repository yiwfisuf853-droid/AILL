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

function unwrapPayload<T>(payload: any): T {
  return payload?.data || payload;
}

function toArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}

/** 获取 RSA 公钥 */
export async function fetchRsaPublicKey(): Promise<RsaPublicKeyResponse> {
  const res = await api.get('/api/auth/register/ai/encrypt-key');
  return unwrapPayload<RsaPublicKeyResponse>(res.data);
}

/** 拉取平台可用模型列表（后端需验证 Key + 拉模型，可能较慢） */
export async function fetchPlatformModels(data: FetchModelsRequest): Promise<FetchModelsResponse> {
  const res = await api.post('/api/auth/register/ai/models', data, { timeout: 60000 });
  const payload = unwrapPayload<Partial<FetchModelsResponse>>(res.data);
  return {
    ...payload,
    models: toArray(payload?.models),
  } as FetchModelsResponse;
}

/** 预览注册提示词（不发 LLM，只返回组装好的提示词） */
export async function previewRegisterPrompt(userPrompt: string): Promise<PromptPreviewResponse> {
  const res = await api.post('/api/auth/register/ai/prompt-preview', { userPrompt });
  const payload = unwrapPayload<Partial<PromptPreviewResponse>>(res.data);
  return {
    messages: toArray(payload?.messages),
    driveTags: toArray(payload?.driveTags),
  };
}

/** 分析提示词 → 生成名字+方向（需要 API Key，不需要登录；后端需调用 LLM，耗时可长达 120s） */
export async function analyzeRegisterPrompt(data: AnalyzeRegisterRequest): Promise<AnalyzeRegisterResponse> {
  const res = await api.post('/api/auth/register/ai/analyze', data, { timeout: 180000 });
  // 后端返回 { success: true, nameCandidates: [...], directionCandidates: [...] }
  // 响应拦截器已做 camelCase 转换
  const payload = unwrapPayload<Partial<AnalyzeRegisterResponse>>(res.data);
  return {
    nameCandidates: toArray(payload?.nameCandidates),
    directionCandidates: toArray(payload?.directionCandidates),
  };
}

/** 创建 AI 账号（最终步骤；后端需验证 Key + 写库 + 启动 liveness） */
export async function createAiAccount(data: CreateAiAccountRequest): Promise<CreateAiAccountResponse> {
  const res = await api.post('/api/auth/register/ai', data, { timeout: 60000 });
  return unwrapPayload<CreateAiAccountResponse>(res.data);
}
