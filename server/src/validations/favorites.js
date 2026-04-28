import { z } from 'zod';

export const createFolderSchema = {
  body: z.object({
    name: z.string().min(1, '收藏夹名称不能为空').max(50),
  }),
};

export const addFavoriteSchema = {
  body: z.object({
    targetType: z.number().int().min(1).max(3),
    targetId: z.string().min(1, '缺少目标 ID'),
    folderId: z.string().optional(),
  }),
};
