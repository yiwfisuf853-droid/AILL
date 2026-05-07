import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError, NotFoundError, ValidationError } from '../src/lib/errors.js';

const repoMock = vi.hoisted(() => ({
  rawQuery: vi.fn(),
  findAll: vi.fn(),
  findOne: vi.fn(),
  findById: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  increment: vi.fn(),
  updateWhere: vi.fn(),
  toCamelCase: vi.fn((row) => {
    if (!row || typeof row !== 'object') return row;
    const output = {};
    for (const [key, value] of Object.entries(row)) {
      output[key.replace(/_([a-z])/g, (_, char) => char.toUpperCase())] = value;
    }
    return output;
  }),
}));

const pgMock = vi.hoisted(() => ({
  client: {
    query: vi.fn(),
    release: vi.fn(),
  },
  getClient: vi.fn(),
}));

const assetMock = vi.hoisted(() => ({
  consumeAsset: vi.fn(() => Promise.resolve()),
}));

vi.mock('../src/models/repository.js', () => repoMock);
vi.mock('../src/models/pg.js', () => ({ default: pgMock }));
vi.mock('../src/services/asset.service.js', () => assetMock);

import {
  addToCart,
  cancelOrder,
  clearCart,
  createOrder,
  createProduct,
  deleteProduct,
  getCart,
  getOrders,
  getProductDetail,
  getProducts,
  getRedemptions,
  payOrder,
  updateCartItem,
  updateProduct,
} from '../src/services/shop.service.js';

function createProductRecord(overrides = {}) {
  return {
    id: 'product-1',
    name: 'Test Product',
    description: 'A test product',
    type: 1,
    priceType: 1,
    price: 100,
    pointsPrice: 500,
    stock: 10,
    images: [],
    status: 1,
    sortOrder: 0,
    createdAt: '2026-05-07T00:00:00.000Z',
    updatedAt: '2026-05-07T00:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

function createOrderRecord(overrides = {}) {
  return {
    id: 'order-1',
    userId: 'user-1',
    totalAmount: 100,
    totalPoints: 500,
    status: 'pending',
    createdAt: '2026-05-07T00:00:00.000Z',
    updatedAt: '2026-05-07T00:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

describe('Shop Service 当前架构测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repoMock.rawQuery.mockResolvedValue({ rows: [] });
    repoMock.findAll.mockResolvedValue({ total: 0, list: [] });
    repoMock.findOne.mockResolvedValue(null);
    repoMock.findById.mockResolvedValue(null);
    pgMock.client.query.mockReset();
    pgMock.client.release.mockReset();
    pgMock.getClient.mockResolvedValue(pgMock.client);
  });

  describe('products', () => {
    it('createProduct should validate and insert product with defaults', async () => {
      repoMock.insert.mockImplementationOnce(async (table, data) => ({ ...data }));

      const result = await createProduct({
        name: 'Test Product',
        description: 'A test product',
        price: 100,
        pointsPrice: 500,
        stock: 10,
      });

      expect(result.success).toBe(true);
      expect(result.item.name).toBe('Test Product');
      expect(repoMock.insert).toHaveBeenCalledWith('products', expect.objectContaining({
        name: 'Test Product',
        description: 'A test product',
        type: 1,
        priceType: 1,
        price: 100,
        pointsPrice: 500,
        stock: 10,
        images: [],
        status: 1,
        sortOrder: 0,
        deletedAt: null,
      }));
    });

    it('createProduct should reject missing name or missing price', async () => {
      await expect(createProduct({ price: 100 })).rejects.toThrow(ValidationError);
      await expect(createProduct({ name: 'No Price' })).rejects.toThrow(ValidationError);
    });

    it('getProducts should call repository with active product filters', async () => {
      repoMock.findAll.mockResolvedValueOnce({ total: 1, list: [createProductRecord({ id: 'product-1' })] });

      const result = await getProducts({ type: 2, status: 1, page: 2, limit: 5 });

      expect(result.total).toBe(1);
      expect(result.page).toBe(2);
      expect(repoMock.findAll).toHaveBeenCalledWith('products', {
        where: { deletedAt: null, status: 1, type: 2 },
        page: 2,
        limit: 5,
        orderBy: 'sort_order DESC',
      });
    });

    it('getProductDetail/updateProduct/deleteProduct should use deleted-safe access', async () => {
      repoMock.rawQuery
        .mockResolvedValueOnce({ rows: [{ id: 'product-1', name: 'Detail', points_price: 100 }] })
        .mockResolvedValueOnce({ rows: [{ id: 'product-1', name: 'Detail' }] });
      repoMock.update.mockResolvedValueOnce(createProductRecord({ id: 'product-1', name: 'Updated' }));
      repoMock.remove.mockResolvedValueOnce(true);

      await expect(getProductDetail('product-1')).resolves.toEqual({ id: 'product-1', name: 'Detail', pointsPrice: 100 });
      const updated = await updateProduct('product-1', { name: 'Updated', stock: 5, attacker: true });
      expect(updated.success).toBe(true);
      expect(repoMock.update).toHaveBeenCalledWith('products', 'product-1', expect.objectContaining({
        name: 'Updated',
        stock: 5,
        updatedAt: expect.any(String),
      }));
      expect(repoMock.update.mock.calls[0][2]).not.toHaveProperty('attacker');

      await expect(deleteProduct('product-1')).resolves.toEqual({ success: true });
      expect(repoMock.remove).toHaveBeenCalledWith('products', 'product-1');
    });

    it('getProductDetail/updateProduct should reject missing product', async () => {
      repoMock.rawQuery.mockResolvedValueOnce({ rows: [] });
      await expect(getProductDetail('missing')).rejects.toThrow(NotFoundError);

      repoMock.rawQuery.mockResolvedValueOnce({ rows: [] });
      await expect(updateProduct('missing', { name: 'x' })).rejects.toThrow(NotFoundError);
    });
  });

  describe('cart', () => {
    it('getCart should attach product snapshot for each cart item', async () => {
      repoMock.findAll.mockResolvedValueOnce([
        { id: 'cart-1', userId: 'user-1', productId: 'product-1', quantity: 2 },
      ]);
      repoMock.rawQuery.mockResolvedValueOnce({ rows: [{ id: 'product-1', name: 'Product', images: [] }] });

      const result = await getCart('user-1');

      expect(result.total).toBe(1);
      expect(result.list[0].product).toEqual({ id: 'product-1', name: 'Product', images: [] });
      expect(repoMock.findAll).toHaveBeenCalledWith('carts', { where: { userId: 'user-1', deletedAt: null } });
    });

    it('addToCart should create new cart item or increment existing item', async () => {
      repoMock.rawQuery.mockResolvedValueOnce({ rows: [{ id: 'product-1', name: 'Product' }] });
      repoMock.findOne.mockResolvedValueOnce(null);
      repoMock.insert.mockImplementationOnce(async (table, data) => ({ ...data }));

      const created = await addToCart('user-1', { productId: 'product-1', quantity: 2 });
      expect(created.success).toBe(true);
      expect(repoMock.insert).toHaveBeenCalledWith('carts', expect.objectContaining({
        userId: 'user-1',
        productId: 'product-1',
        quantity: 2,
      }));

      repoMock.rawQuery.mockResolvedValueOnce({ rows: [{ id: 'product-1', name: 'Product' }] });
      repoMock.findOne.mockResolvedValueOnce({ id: 'cart-1', userId: 'user-1', productId: 'product-1' });
      repoMock.increment.mockResolvedValueOnce({ quantity: 3 });
      repoMock.update.mockResolvedValueOnce({});
      repoMock.findById.mockResolvedValueOnce({ id: 'cart-1', quantity: 3 });

      const updated = await addToCart('user-1', { productId: 'product-1', quantity: 1 });
      expect(updated.item).toEqual({ id: 'cart-1', quantity: 3 });
      expect(repoMock.increment).toHaveBeenCalledWith('carts', 'cart-1', 'quantity', 1);
    });

    it('addToCart/updateCartItem/clearCart should validate and mutate cart safely', async () => {
      await expect(addToCart('user-1', {})).rejects.toThrow(ValidationError);

      repoMock.rawQuery.mockResolvedValueOnce({ rows: [] });
      await expect(addToCart('user-1', { productId: 'missing' })).rejects.toThrow(NotFoundError);

      repoMock.findOne.mockResolvedValueOnce({ id: 'cart-1', userId: 'user-1' });
      await expect(updateCartItem('user-1', 'cart-1', { quantity: 3 })).resolves.toEqual({ success: true });
      expect(repoMock.update).toHaveBeenCalledWith('carts', 'cart-1', { quantity: 3 });
      expect(repoMock.update).toHaveBeenCalledWith('carts', 'cart-1', expect.objectContaining({ updatedAt: expect.any(String) }));

      repoMock.findOne.mockResolvedValueOnce({ id: 'cart-1', userId: 'user-1' });
      await expect(updateCartItem('user-1', 'cart-1', { quantity: 0 })).resolves.toEqual({ success: true });
      expect(repoMock.update).toHaveBeenCalledWith('carts', 'cart-1', expect.objectContaining({ deletedAt: expect.any(String) }));

      repoMock.updateWhere.mockResolvedValueOnce({});
      await expect(clearCart('user-1')).resolves.toEqual({ success: true });
      expect(repoMock.updateWhere).toHaveBeenCalledWith('carts', { userId: 'user-1', deletedAt: null }, expect.objectContaining({ deletedAt: expect.any(String) }));
    });
  });

  describe('orders', () => {
    it('createOrder should use transaction, lock products, create order/items, and clear cart when requested', async () => {
      pgMock.client.query
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [{ id: 'product-1', name: 'Product', price: 10, points_price: 100, stock: 5 }] })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [{ id: 'order-1', user_id: 'user-1', total_amount: 20, total_points: 200, status: 1 }] })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});

      const result = await createOrder('user-1', {
        items: [{ productId: 'product-1', quantity: 2 }],
        fromCart: true,
        remark: 'test',
      });

      expect(result.success).toBe(true);
      expect(result.order).toEqual({ id: 'order-1', userId: 'user-1', totalAmount: 20, totalPoints: 200, status: 1 });
      expect(result.items[0]).toEqual(expect.objectContaining({ productId: 'product-1', quantity: 2, price: 10, pointsPrice: 100 }));
      expect(pgMock.client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
      expect(pgMock.client.query.mock.calls[1][0]).toContain('FOR UPDATE');
      expect(pgMock.client.query.mock.calls[2][0]).toContain('UPDATE products SET stock = stock - $1');
      expect(pgMock.client.query.mock.calls[3][0]).toContain('INSERT INTO orders');
      expect(pgMock.client.query.mock.calls[5][0]).toContain('UPDATE carts SET deleted_at = NOW()');
      expect(pgMock.client.query).toHaveBeenLastCalledWith('COMMIT');
      expect(pgMock.client.release).toHaveBeenCalled();
    });

    it('createOrder should reject empty order and rollback transaction on product errors', async () => {
      await expect(createOrder('user-1', { items: [] })).rejects.toThrow(ValidationError);

      pgMock.client.query
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({});
      await expect(createOrder('user-1', { items: [{ productId: 'missing', quantity: 1 }] })).rejects.toThrow(NotFoundError);
      expect(pgMock.client.query).toHaveBeenLastCalledWith('ROLLBACK');
      expect(pgMock.client.release).toHaveBeenCalled();

      pgMock.client.query.mockReset();
      pgMock.client.release.mockReset();
      pgMock.client.query
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [{ id: 'product-1', name: 'Product', price: 0, points_price: 100, stock: 1 }] })
        .mockResolvedValueOnce({});
      await expect(createOrder('user-1', { items: [{ productId: 'product-1', quantity: 2 }] })).rejects.toThrow(AppError);
      expect(pgMock.client.query).toHaveBeenLastCalledWith('ROLLBACK');
    });

    it('getOrders should attach product snapshots to order items', async () => {
      repoMock.findAll
        .mockResolvedValueOnce({ total: 1, list: [createOrderRecord({ id: 'order-1', status: 'pending' })] })
        .mockResolvedValueOnce([{ id: 'oi-1', orderId: 'order-1', productId: 'product-1', quantity: 1 }]);
      repoMock.findById.mockResolvedValueOnce(createProductRecord({ id: 'product-1', name: 'Product', images: ['/p.png'] }));

      const result = await getOrders('user-1', { status: 1, page: 2, limit: 5 });

      expect(result.total).toBe(1);
      expect(result.list[0].items[0].product).toEqual({ id: 'product-1', name: 'Product', images: ['/p.png'] });
      expect(repoMock.findAll).toHaveBeenNthCalledWith(1, 'orders', {
        where: { userId: 'user-1', status: 'pending' },
        page: 2,
        limit: 5,
        orderBy: 'created_at DESC',
      });
    });

    it('payOrder should consume points, mark paid/completed, and generate redemptions for code products', async () => {
      repoMock.findOne.mockResolvedValueOnce(createOrderRecord({ id: 'order-1', totalPoints: 500, status: '1' }));
      repoMock.update
        .mockResolvedValueOnce(createOrderRecord({ id: 'order-1', status: 'paid' }))
        .mockResolvedValueOnce(createOrderRecord({ id: 'order-1', status: 'completed' }));
      repoMock.findAll.mockResolvedValueOnce([
        { id: 'oi-1', orderId: 'order-1', productId: 'product-1', quantity: 2 },
      ]);
      repoMock.findById.mockResolvedValueOnce(createProductRecord({ id: 'product-1', type: 3 }));
      repoMock.insert.mockResolvedValue({});

      const result = await payOrder('user-1', 'order-1', { paymentMethod: 'points' });

      expect(result.order.status).toBe('completed');
      expect(assetMock.consumeAsset).toHaveBeenCalledWith('user-1', 1, 500, '支付订单 order-1', 'order-1');
      expect(repoMock.update).toHaveBeenNthCalledWith(1, 'orders', 'order-1', expect.objectContaining({
        status: 'paid',
        paymentMethod: 'points',
        paidAt: expect.any(String),
      }));
      expect(repoMock.insert).toHaveBeenCalledTimes(2);
      expect(repoMock.insert).toHaveBeenCalledWith('redemptions', expect.objectContaining({
        userId: 'user-1',
        productId: 'product-1',
        code: expect.stringContaining('RDM'),
      }));
    });

    it('payOrder should reject missing or non-pending order', async () => {
      repoMock.findOne.mockResolvedValueOnce(null);
      await expect(payOrder('user-1', 'missing', {})).rejects.toThrow(NotFoundError);

      repoMock.findOne.mockResolvedValueOnce(createOrderRecord({ id: 'order-1', status: 'completed' }));
      await expect(payOrder('user-1', 'order-1', {})).rejects.toThrow(AppError);
    });

    it('cancelOrder should mark pending order cancelled and restore stock', async () => {
      repoMock.findOne.mockResolvedValueOnce(createOrderRecord({ id: 'order-1', status: 1 }));
      repoMock.update.mockResolvedValueOnce(createOrderRecord({ id: 'order-1', status: 'cancelled' }));
      repoMock.findAll.mockResolvedValueOnce([
        { id: 'oi-1', orderId: 'order-1', productId: 'product-1', quantity: 2 },
      ]);
      repoMock.findById.mockResolvedValueOnce(createProductRecord({ id: 'product-1', stock: 10 }));
      repoMock.increment.mockResolvedValueOnce({ stock: 12 });

      await expect(cancelOrder('user-1', 'order-1')).resolves.toEqual({ success: true });
      expect(repoMock.update).toHaveBeenCalledWith('orders', 'order-1', expect.objectContaining({ status: 'cancelled' }));
      expect(repoMock.increment).toHaveBeenCalledWith('products', 'product-1', 'stock', 2);
    });
  });

  describe('redemptions', () => {
    it('getRedemptions should attach product name snapshot', async () => {
      repoMock.findAll.mockResolvedValueOnce({
        total: 1,
        list: [{ id: 'redemption-1', userId: 'user-1', productId: 'product-1', code: 'RDMTEST' }],
      });
      repoMock.findById.mockResolvedValueOnce(createProductRecord({ id: 'product-1', name: 'Product' }));

      const result = await getRedemptions('user-1', { page: 2, limit: 5 });

      expect(result.list[0].product).toEqual({ id: 'product-1', name: 'Product' });
      expect(repoMock.findAll).toHaveBeenCalledWith('redemptions', {
        where: { userId: 'user-1' },
        page: 2,
        limit: 5,
        orderBy: 'used_at DESC',
      });
    });
  });
});
