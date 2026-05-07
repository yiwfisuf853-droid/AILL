export interface Theme {
  id: number;
  name: string;
  description: string;
  previewImage: string;
  type: number;
  config: string;
  price: number;
  pointsPrice: number;
  isDefault: number;
  sortOrder: number;
  status: number;
}

export interface AiProfile {
  id: string;
  userId: string;
  capabilities: Record<string, unknown>;
  influenceScore: number;
  trustLevel: number;
  totalContributions: number;
  user?: { id: string; username: string; avatar: string; isAi: boolean; aiLikelihood?: number } | null;
}

export interface AiApiKey {
  id: string;
  userId: string;
  name: string;
  keyPreview: string;
  permissions: string[];
  createdAt: string;
  lastUsedAt: string | null;
}

export interface AiMemory {
  id: string;
  aiUserId: string;
  content: string;
  type: number;
  createdAt: string;
}

export interface UpsertAiProfileDto {
  capabilities?: Record<string, unknown>;
  influenceScore?: number;
  trustLevel?: number;
  totalContributions?: number;
}

export interface CreateApiKeyDto {
  name?: string;
  permissions?: string[];
}

export interface StoreMemoryDto {
  content: string;
  memoryType?: string;
}

export interface ThemeListQuery {
  page?: number;
  pageSize?: number;
  type?: number;
  status?: number;
}

export interface MemoryListQuery {
  page?: number;
  pageSize?: number;
  type?: number;
  keyword?: string;
}

// ===== 草稿类型 =====
export interface Draft {
  id: string;
  title: string;
  content: string;
  summary?: string;
  sectionId?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DraftListQuery {
  page?: number;
  pageSize?: number;
  sortBy?: string;
}

export interface CreateDraftDto {
  title: string;
  content: string;
  sectionId?: string;
  tags?: string[];
}

export interface UpdateDraftDto {
  title?: string;
  content?: string;
  sectionId?: string;
  tags?: string[];
  status?: 'draft' | 'published';
}

// ===== AI 持续活跃类型 =====
export interface LivenessStatus {
  status?: 'active' | 'stopped' | null;
  started?: boolean;
  message?: string;
  consecutiveFailures: number;
  totalActions: number;
  lastActiveAt: string | null;
  startedAt: string | null;
  isTimerActive: boolean;
}

export interface ActiveAiItem {
  aiUserId: string;
  status: string;
  consecutiveFailures: number;
  totalActions: number;
  lastActiveAt: string | null;
  startedAt: string | null;
  socketId: string | null;
  intervalMs: number;
}

// ===== AI 自主改名类型 =====
export interface RenameResult {
  targetType: string;
  targetId: string;
  action: 'renamed';
  oldName: string;
  newName: string;
}

// ===== AI 触发循环类型 =====
export interface TriggerLivenessResult {
  triggered: boolean;
  cycleId: string | null;
  message: string;
}
