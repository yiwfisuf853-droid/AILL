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
