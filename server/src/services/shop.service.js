import { generateId } from '../lib/id.js';
import * as repo from '../models/repository.js';
import { ValidationError, NotFoundError, ConflictError, AppError } from '../lib/errors.js';

// ========== 商品 ==========

/**
 * 获取商品列表
 */
export async function getProducts(options = {}) {
  const { type, status = 1, page = 1, limit = 20 } = options;

  const where = { deletedAt: null };
  if (status !== undefined) where.status = Number(status);
  if (type) where.type = Number(type);
  const result = await repo.findAll('products', {
    where,
    page,
    limit,
    orderBy: 'sort_order DESC',
  });
  return { total: result.total, page, limit, list: result.list };
}

/**
 * 获取商品详情
 */
export async function getProductDetail(id) {
  const product = await repo.rawQuery(
    'SELECT * FROM products WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );
  if (!product.rows || product.rows.length === 0) throw new NotFoundError('商品不存在');
  return repo.toCamelCase(product.rows[0]);
}

/**
 * 创建商品
 */
export async function createProduct(data) {
  if (!data.name) throw new ValidationError('缺少商品名称');
  if (data.price === undefined && data.pointsPrice === undefined) throw new ValidationError('缺少商品价格');

  const item = await repo.insert('products', {
    id: generateId(),
    name: data.name,
    description: data.description || '',
    type: data.type || 1,
    priceType: data.priceType || 1,
    price: data.price || 0,
    pointsPrice: data.pointsPrice || 0,
    stock: data.stock || 0,
    images: data.images || [],
    status: data.status !== undefined ? data.status : 1,
    sortOrder: data.sortOrder || 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  });
  return { success: true, item };
}

/**
 * 更新商品
 */
export async function updateProduct(id, data) {
  const product = await repo.rawQuery(
    'SELECT * FROM products WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );
  if (!product.rows || product.rows.length === 0) throw new NotFoundError('商品不存在');

  const fields = ['name', 'description', 'type', 'priceType', 'price', 'pointsPrice', 'stock', 'images', 'status', 'sortOrder'];
  const updateData = {};
  fields.forEach(f => {
    if (data[f] !== undefined) updateData[f] = data[f];
  });
  updateData.updatedAt = new Date().toISOString();

  const updated = await repo.update('products', id, updateData);
  return { success: true, item: updated };
}

/**
 * 删除商品
 */
export async function deleteProduct(id) {
  await repo.remove('products', id);
  return { success: true };
}

// ========== 购物车 ==========

/**
 * 获取购物车
 */
export async function getCart(userId) {
  const cartItems = await repo.findAll('carts', { where: { userId, deletedAt: null } });
  const list = [];
  for (const c of cartItems) {
    const product = await repo.rawQuery(
      'SELECT * FROM products WHERE id = $1 AND deleted_at IS NULL',
      [c.productId]
    );
    list.push({
      ...c,
      product: product.rows && product.rows.length > 0 ? repo.toCamelCase(product.rows[0]) : null,
    });
  }
  return { total: list.length, list };
}

/**
 * 添加到购物车
 */
export async function addToCart(userId, data) {
  if (!data.productId) throw new ValidationError('缺少商品ID');

  const productRes = await repo.rawQuery(
    'SELECT * FROM products WHERE id = $1 AND deleted_at IS NULL AND status = 1',
    [data.productId]
  );
  if (!productRes.rows || productRes.rows.length === 0) throw new NotFoundError('商品不存在或已下架');

  const existing = await repo.findOne('carts', { userId, productId: data.productId, deletedAt: null });
  if (existing) {
    const newQuantity = existing.quantity + (data.quantity || 1);
    await repo.update('carts', existing.id, { quantity: newQuantity, updatedAt: new Date().toISOString() });
    const updated = await repo.findById('carts', existing.id);
    return { success: true, item: updated };
  }

  const item = await repo.insert('carts', {
    id: generateId(),
    userId,
    productId: data.productId,
    quantity: data.quantity || 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return { success: true, item };
}

/**
 * 更新购物车项
 */
export async function updateCartItem(userId, cartItemId, data) {
  const item = await repo.findOne('carts', { id: cartItemId, userId });
  if (!item) throw new NotFoundError('购物车项不存在');

  if (data.quantity !== undefined) {
    if (data.quantity <= 0) {
      await repo.update('carts', cartItemId, { deletedAt: new Date().toISOString() });
    } else {
      await repo.update('carts', cartItemId, { quantity: data.quantity });
    }
  }
  await repo.update('carts', cartItemId, { updatedAt: new Date().toISOString() });
  return { success: true };
}

/**
 * 清空购物车
 */
export async function clearCart(userId) {
  await repo.updateWhere('carts', { userId, deletedAt: null }, { deletedAt: new Date().toISOString() });
  return { success: true };
}

// ========== 订单 ==========

/**
 * 创建订单
 */
export async function createOrder(userId, data) {
  if (!data.items || data.items.length === 0) throw new ValidationError('订单不能为空');

  let totalAmount = 0;
  let totalPoints = 0;
  const orderItems = [];

  for (const item of data.items) {
    const productRes = await repo.rawQuery(
      'SELECT * FROM products WHERE id = $1 AND deleted_at IS NULL AND status = 1',
      [item.productId]
    );
    if (!productRes.rows || productRes.rows.length === 0) throw new NotFoundError(`商品 ${item.productId} 不存在或已下架`);
    const product = repo.toCamelCase(productRes.rows[0]);

    if (product.stock > 0 && product.stock < (item.quantity || 1)) {
      throw new AppError(`商品 ${product.name} 库存不足`, 400);
    }

    const quantity = item.quantity || 1;
    const itemAmount = (product.price || 0) * quantity;
    const itemPoints = (product.pointsPrice || 0) * quantity;

    totalAmount += itemAmount;
    totalPoints += itemPoints;

    orderItems.push({
      id: generateId(),
      productId: product.id,
      quantity,
      price: product.price || 0,
      pointsPrice: product.pointsPrice || 0,
      createdAt: new Date().toISOString(),
    });

    // 扣减库存
    if (product.stock > 0) {
      await repo.update('products', product.id, { stock: product.stock - quantity });
    }
  }

  const orderNo = 'ORD' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();

  const order = await repo.insert('orders', {
    id: generateId(),
    userId,
    totalAmount,
    totalPoints,
    status: 'pending',
    paymentMethod: data.paymentMethod || null,
    paidAt: null,
    remark: data.remark || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  for (const oi of orderItems) {
    await repo.insert('order_items', { ...oi, orderId: order.id });
  }

  // 清空购物车
  if (data.fromCart) {
    await repo.updateWhere('carts', { userId, deletedAt: null }, { deletedAt: new Date().toISOString() });
  }

  return { success: true, order, items: orderItems };
}

/**
 * 获取订单列表
 */
export async function getOrders(userId, options = {}) {
  const { status, page = 1, limit = 20 } = options;

  const where = { userId };
  if (status) where.status = status;
  const result = await repo.findAll('orders', {
    where,
    page,
    limit,
    orderBy: 'created_at DESC',
  });

  const items = [];
  for (const o of result.list) {
    const orderItems = await repo.findAll('order_items', { where: { orderId: o.id } });
    const mappedItems = [];
    for (const oi of orderItems) {
      const product = await repo.findById('products', oi.productId);
      mappedItems.push({
        ...oi,
        product: product ? { id: product.id, name: product.name, images: product.images } : null,
      });
    }
    items.push({ ...o, items: mappedItems });
  }

  return { total: result.total, page, limit, list: items };
}

/**
 * 支付订单
 */
export async function payOrder(userId, orderId, data) {
  const order = await repo.findOne('orders', { id: orderId, userId, deletedAt: null });
  if (!order) throw new NotFoundError('订单不存在');
  if (order.status !== 'pending') throw new AppError('订单状态不允许支付', 400);

  // 扣减用户资产
  if (order.totalPoints > 0) {
    const { consumeAsset } = await import('./asset.service.js');
    await consumeAsset(userId, 1, order.totalPoints, `支付订单 ${order.id}`, order.id);
  }

  await repo.update('orders', orderId, {
    status: 'paid',
    paymentMethod: data?.paymentMethod || 'points',
    paidAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // 如果是兑换码商品，自动生成兑换码
  const orderItems = await repo.findAll('order_items', { where: { orderId } });
  for (const oi of orderItems) {
    const product = await repo.findById('products', oi.productId);
    if (product && product.type === 3) {
      for (let i = 0; i < oi.quantity; i++) {
        await repo.insert('redemptions', {
          id: generateId(),
          userId,
          productId: product.id,
          code: 'RDM' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 6).toUpperCase(),
          usedAt: new Date().toISOString(),
        });
      }
    }
  }

  // 自动完成虚拟商品订单
  const updated = await repo.update('orders', orderId, {
    status: 'completed',
    updatedAt: new Date().toISOString(),
  });

  return { success: true, order: updated };
}

/**
 * 取消订单
 */
export async function cancelOrder(userId, orderId) {
  const order = await repo.findOne('orders', { id: orderId, userId });
  if (!order) throw new NotFoundError('订单不存在');
  if (order.status !== 'pending') throw new AppError('只能取消待支付订单', 400);

  await repo.update('orders', orderId, {
    status: 'cancelled',
    updatedAt: new Date().toISOString(),
  });

  // 恢复库存
  const orderItems = await repo.findAll('order_items', { where: { orderId } });
  for (const oi of orderItems) {
    const product = await repo.findById('products', oi.productId);
    if (product && product.stock >= 0) {
      await repo.update('products', oi.productId, { stock: product.stock + oi.quantity });
    }
  }

  return { success: true };
}

/**
 * 获取兑换记录
 */
export async function getRedemptions(userId, options = {}) {
  const { page = 1, limit = 20 } = options;

  const result = await repo.findAll('redemptions', {
    where: { userId },
    page,
    limit,
    orderBy: 'used_at DESC',
  });
  const items = [];
  for (const r of result.list) {
    const product = await repo.findById('products', r.productId);
    items.push({ ...r, product: product ? { id: product.id, name: product.name } : null });
  }
  return { total: result.total, page, limit, list: items };
}
