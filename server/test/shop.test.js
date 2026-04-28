import { describe, it, expect, beforeEach } from 'vitest';
import { db, generateId, clearDatabase } from '../src/models/db.js';
import { getProducts, createProduct, deleteProduct, createOrder, payOrder, cancelOrder } from '../src/services/shop.service.js';

describe('Shop Service', () => {
  beforeEach(() => {
    clearDatabase();
  });

  describe('Products', () => {
    it('should create a product', async () => {
      const result = await createProduct({
        name: 'Test Product',
        description: 'A test product',
        price: 100,
        pointsPrice: 500,
        stock: 10,
      });

      expect(result.success).toBe(true);
      expect(result.item.name).toBe('Test Product');
      expect(result.item.pointsPrice).toBe(500);
    });

    it('should not create product without name', async () => {
      await expect(createProduct({ price: 100 }))
        .rejects.toThrow('缺少商品名称');
    });

    it('should get products list', async () => {
      await createProduct({ name: 'Product 1', price: 100 });
      await createProduct({ name: 'Product 2', price: 200 });

      const result = await getProducts();
      expect(result.list).toHaveLength(2);
    });

    it('should soft delete a product', async () => {
      const { item } = await createProduct({ name: 'ToDelete', price: 100 });
      const result = await deleteProduct(item.id);
      expect(result.success).toBe(true);

      const products = await getProducts();
      expect(products.list).toHaveLength(0);
    });
  });

  describe('Orders', () => {
    it('should create an order', async () => {
      const { item: product } = await createProduct({
        name: 'Order Product',
        price: 0,
        pointsPrice: 100,
        stock: 10,
      });

      // Setup user asset
      if (!db.userAssets) db.userAssets = [];
      db.userAssets.push({
        id: generateId(),
        userId: 'user1',
        assetTypeId: 1,
        balance: 1000,
        frozenAmount: 0,
      });

      // Setup asset transactions
      if (!db.assetTransactions) db.assetTransactions = [];

      const result = await createOrder('user1', {
        items: [{ productId: product.id, quantity: 1 }],
        fromCart: false,
      });

      expect(result.success).toBe(true);
      expect(result.order.totalPoints).toBe(100);
      expect(result.order.status).toBe(1);
    });

    it('should not create empty order', async () => {
      await expect(createOrder('user1', { items: [] }))
        .rejects.toThrow('订单不能为空');
    });
  });
});
