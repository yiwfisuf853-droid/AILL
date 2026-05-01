import express from 'express';
import { asyncHandler, ValidationError } from '../lib/errors.js';
import { success, created, deleted } from '../lib/response.js';
import {
  getProducts,
  getProductDetail,
  createProduct,
  updateProduct,
  deleteProduct,
  getCart,
  addToCart,
  updateCartItem,
  clearCart,
  createOrder,
  getOrders,
  payOrder,
  cancelOrder,
  getRedemptions,
} from '../services/shop.service.js';
import { validateRequest } from '../middleware/validate.js';
import { createProductSchema, addToCartSchema, createOrderSchema, updateProductSchema, updateCartSchema } from '../validations/shop.js';
import { ownershipMiddleware } from '../middleware/ownership.js';

const router = express.Router();

// ========== 商品 ==========

// 商品列表
router.get('/products', asyncHandler(async (req, res) => {
  const result = await getProducts(req.query);
  success(res, result);
}));

// 商品详情
router.get('/products/:id', asyncHandler(async (req, res) => {
  const result = await getProductDetail(req.params.id);
  success(res, result);
}));

// 创建商品
router.post('/products', validateRequest(createProductSchema), asyncHandler(async (req, res) => {
  const result = await createProduct(req.body);
  created(res, result);
}));

// 更新商品
router.patch('/products/:id', validateRequest(updateProductSchema), asyncHandler(async (req, res) => {
  const result = await updateProduct(req.params.id, req.body);
  success(res, result);
}));

// 删除商品
router.delete('/products/:id', asyncHandler(async (req, res) => {
  await deleteProduct(req.params.id);
  deleted(res);
}));

// ========== 购物车 ==========

// 获取购物车（仅限本人）
router.get('/cart/:userId', ownershipMiddleware(), asyncHandler(async (req, res) => {
  const result = await getCart(req.params.userId);
  success(res, result);
}));

// 添加到购物车（仅限本人）
router.post('/cart/:userId', ownershipMiddleware(), validateRequest(addToCartSchema), asyncHandler(async (req, res) => {
  const result = await addToCart(req.params.userId, req.body);
  created(res, result);
}));

// 更新购物车项（仅限本人）
router.patch('/cart/:userId/:cartItemId', ownershipMiddleware(), validateRequest(updateCartSchema), asyncHandler(async (req, res) => {
  const result = await updateCartItem(req.params.userId, req.params.cartItemId, req.body);
  success(res, result);
}));

// 清空购物车（仅限本人）
router.delete('/cart/:userId', ownershipMiddleware(), asyncHandler(async (req, res) => {
  await clearCart(req.params.userId);
  deleted(res);
}));

// ========== 订单 ==========

// 创建订单
router.post('/orders', validateRequest(createOrderSchema), asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { ...data } = req.body;
  const result = await createOrder(userId, data);
  created(res, result);
}));

// 订单列表（仅限本人）
router.get('/orders/:userId', ownershipMiddleware(), asyncHandler(async (req, res) => {
  const result = await getOrders(req.params.userId, req.query);
  success(res, result);
}));

// 支付订单
router.post('/orders/:orderId/pay', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const result = await payOrder(userId, req.params.orderId, req.body);
  success(res, result);
}));

// 取消订单
router.post('/orders/:orderId/cancel', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const result = await cancelOrder(userId, req.params.orderId);
  success(res, result);
}));

// ========== 兑换记录 ==========

// 兑换记录列表（仅限本人）
router.get('/redemptions/:userId', ownershipMiddleware(), asyncHandler(async (req, res) => {
  const result = await getRedemptions(req.params.userId, req.query);
  success(res, result);
}));

export default router;
