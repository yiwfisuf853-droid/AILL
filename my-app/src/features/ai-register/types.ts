/**
 * AI 注册模块类型定义
 */

/** 支持的 LLM 平台 */
export type AiPlatform =
  | 'openai'
  | 'anthropic'
  | 'deepseek'
  | 'deepseek-anthropic'
  | 'moonshot'
  | 'zhipu'
  | 'relay';

/** 模型信息 */
export interface AiModel {
  id: string;
  name: string;
  owned_by?: string;
}

/** 模型列表请求 */
export interface FetchModelsRequest {
  platform: AiPlatform;
  encryptedApiKey: string;
  baseUrl?: string;
  isPlainText?: boolean;
}

/** 模型列表响应 */
export interface FetchModelsResponse {
  models: AiModel[];
  error?: string;
}

/** RSA 公钥响应 */
export interface RsaPublicKeyResponse {
  publicKey: string;
  algorithm: string;
}

/** LLM 生成的候选名字 */
export interface AiNameCandidate {
  name: string;
  description?: string;
}

/** LLM 生成的入驻方向 */
export interface AiDirectionCandidate {
  direction: string;
  description?: string;
}

/** 提示词预览响应 */
export interface PromptPreviewResponse {
  messages: Array<{ role: string; content: string }>;
  driveTags: Array<{ id: string; name: string; description: string }>;
}

/** 分析请求（新流程，包含 API Key） */
export interface AnalyzeRegisterRequest {
  platform: AiPlatform;
  encryptedApiKey: string;
  baseUrl?: string;
  modelName?: string;
  userPrompt: string;
  isPlainText?: boolean;
}

/** 分析响应 */
export interface AnalyzeRegisterResponse {
  nameCandidates: AiNameCandidate[];
  directionCandidates: AiDirectionCandidate[];
}

/** 创建账号请求 */
export interface CreateAiAccountRequest {
  platform: AiPlatform;
  encryptedApiKey: string;
  baseUrl?: string;
  modelName?: string;
  selectedName: string;
  selectedDirection: string;
  userPrompt: string;
  nameCandidates?: AiNameCandidate[];
  directionCandidates?: AiDirectionCandidate[];
  isPlainText?: boolean;
}

/** 创建账号响应 */
export interface CreateAiAccountResponse {
  user: {
    id: string;
    username: string;
    email: string;
    avatar?: string;
    bio?: string;
    isAi: boolean;
    createdAt: string;
    updatedAt: string;
  };
  token: string;
  refreshToken: string;
}

/** AI 注册状态 */
export interface AiRegisterState {
  currentStep: number;
  platform: AiPlatform | null;
  isLoading: boolean;
  error: string | null;
  // Step 1
  keyValidated: boolean;
  availableModels: AiModel[];
  selectedModel: string | null;
  // Step 2
  userPrompt: string;
  nameCandidates: AiNameCandidate[];
  directionCandidates: AiDirectionCandidate[];
  promptPreview: PromptPreviewResponse | null;
  showPromptPreview: boolean;
  // Step 3
  selectedName: string | null;
  selectedDirection: string | null;
}
