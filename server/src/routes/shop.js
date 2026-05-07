import express from 'express';
import { asyncHandler, ValidationError, ForbiddenError } from '../lib/errors.js';
import { success, created, deleted } from '../lib/response.js';
import { authMiddleware, adminMiddleware } from '../services/auth.service.js';
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

/**
 * @openapi
 * /api/shop/products:
 *   get:
 *     tags: [商城]
 *     summary: 商品列表
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/products', asyncHandler(async (req, res) => {
  const result = await getProducts(req.query);
  success(res, result);
}));

/**
 * @openapi
 * /api/shop/products/{id}:
 *   get:
 *     tags: [商城]
 *     summary: 商品详情
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/products/:id', asyncHandler(async (req, res) => {
  const result = await getProductDetail(req.params.id);
  success(res, result);
}));

/**
 * @openapi
 * /api/shop/products:
 *   post:
 *     tags: [商城]
 *     summary: 创建商品
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               price: { type: number }
 *               image: { type: string }
 *     responses:
 *       201:
 *         description: 创建成功
 */
router.post('/products', authMiddleware, adminMiddleware, validateRequest(createProductSchema), asyncHandler(async (req, res) => {
  const result = await createProduct(req.body);
  created(res, result);
}));

/**
 * @openapi
 * /api/shop/products/{id}:
 *   patch:
 *     tags: [商城]
 *     summary: 更新商品
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               price: { type: number }
 *               image: { type: string }
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.patch('/products/:id', authMiddleware, adminMiddleware, validateRequest(updateProductSchema), asyncHandler(async (req, res) => {
  const result = await updateProduct(req.params.id, req.body);
  success(res, result);
}));

/**
 * @openapi
 * /api/shop/products/{id}:
 *   delete:
 *     tags: [商城]
 *     summary: 删除商品
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: 删除成功
 */
router.delete('/products/:id', authMiddleware, adminMiddleware, asyncHandler(async (req, res) => {
  await deleteProduct(req.params.id);
  deleted(res);
}));

// ========== 购物车 ==========

/**
 * @openapi
 * /api/shop/cart/{userId}:
 *   get:
 *     tags: [商城]
 *     summary: 获取购物车（仅限本人）
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/cart/:userId', ownershipMiddleware(), asyncHandler(async (req, res) => {
  const result = await getCart(req.params.userId);
  success(res, result);
}));

/**
 * @openapi
 * /api/shop/cart/{userId}:
 *   post:
 *     tags: [商城]
 *     summary: 添加到购物车（仅限本人）
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               productId: { type: string }
 *               quantity: { type: integer }
 *     responses:
 *       201:
 *         description: 添加成功
 */
router.post('/cart/:userId', ownershipMiddleware(), validateRequest(addToCartSchema), asyncHandler(async (req, res) => {
  const result = await addToCart(req.params.userId, req.body);
  created(res, result);
}));

/**
 * @openapi
 * /api/shop/cart/{userId}/{cartItemId}:
 *   patch:
 *     tags: [商城]
 *     summary: 更新购物车项（仅限本人）
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *       - name: cartItemId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quantity: { type: integer }
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.patch('/cart/:userId/:cartItemId', ownershipMiddleware(), validateRequest(updateCartSchema), asyncHandler(async (req, res) => {
  const result = await updateCartItem(req.params.userId, req.params.cartItemId, req.body);
  success(res, result);
}));

/**
 * @openapi
 * /api/shop/cart/{userId}:
 *   delete:
 *     tags: [商城]
 *     summary: 清空购物车（仅限本人）
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: 清空成功
 */
router.delete('/cart/:userId', ownershipMiddleware(), asyncHandler(async (req, res) => {
  await clearCart(req.params.userId);
  deleted(res);
}));

// ========== 订单 ==========

/**
 * @openapi
 * /api/shop/orders:
 *   post:
 *     tags: [商城]
 *     summary: 创建订单
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               items: { type: array, items: { type: object } }
 *     responses:
 *       201:
 *         description: 创建成功
 */
router.post('/orders', validateRequest(createOrderSchema), asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { ...data } = req.body;
  const result = await createOrder(userId, data);
  created(res, result);
}));

/**
 * @openapi
 * /api/shop/orders/{userId}:
 *   get:
 *     tags: [商城]
 *     summary: 订单列表（仅限本人）
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/orders/:userId', ownershipMiddleware(), asyncHandler(async (req, res) => {
  const result = await getOrders(req.params.userId, req.query);
  success(res, result);
}));

/**
 * @openapi
 * /api/shop/orders/{orderId}/pay:
 *   post:
 *     tags: [商城]
 *     summary: 支付订单
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: orderId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               paymentMethod: { type: string }
 *     responses:
 *       200:
 *         description: 支付成功
 */
router.post('/orders/:orderId/pay', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const result = await payOrder(userId, req.params.orderId, req.body);
  success(res, result);
}));

/**
 * @openapi
 * /api/shop/orders/{orderId}/cancel:
 *   post:
 *     tags: [商城]
 *     summary: 取消订单
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: orderId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: 取消成功
 */
router.post('/orders/:orderId/cancel', asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const result = await cancelOrder(userId, req.params.orderId);
  success(res, result);
}));

// ========== 兑换记录 ==========

/**
 * @openapi
 * /api/shop/redemptions/{userId}:
 *   get:
 *     tags: [商城]
 *     summary: 兑换记录列表（仅限本人）
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: 成功
 */
router.get('/redemptions/:userId', ownershipMiddleware(), asyncHandler(async (req, res) => {
  const result = await getRedemptions(req.params.userId, req.query);
  success(res, result);
}));

export default router;
