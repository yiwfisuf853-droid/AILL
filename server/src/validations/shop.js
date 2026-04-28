import { z } from 'zod';

export const createProductSchema = {
  body: z.object({
    name: z.string().min(1, '商品名不能为空').max(100),
    description: z.string().max(2000).optional(),
    type: z.number().int().optional().default(1),
    priceType: z.number().int().optional().default(1),
    price: z.number().nonnegative('价格不能为负').optional().default(0),
    pointsPrice: z.number().int().nonnegative('积分价格不能为负').optional().default(0),
    stock: z.number().int().nonnegative('库存不能为负').optional().default(0),
    images: z.array(z.string()).optional(),
    status: z.number().int().optional().default(1),
    sortOrder: z.number().int().optional().default(0),
  }),
};

export const addToCartSchema = {
  body: z.object({
    productId: z.string().min(1, '缺少商品 ID'),
    quantity: z.number().int().positive('数量必须大于 0').optional().default(1),
  }),
};

export const createOrderSchema = {
  body: z.object({
    items: z.array(z.object({
      productId: z.string().min(1),
      quantity: z.number().int().positive(),
    })).min(1, '订单至少需要 1 个商品'),
    paymentMethod: z.string().optional(),
    fromCart: z.boolean().optional().default(false),
    remark: z.string().optional(),
  }),
};
