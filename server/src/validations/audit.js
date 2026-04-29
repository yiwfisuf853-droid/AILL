import { z } from 'zod';

// GET /audit — query params
export const getAuditLogsSchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    operatorId: z.string().optional(),
    action: z.string().max(50).optional(),
    targetType: z.coerce.number().int().optional(),
  }),
};
