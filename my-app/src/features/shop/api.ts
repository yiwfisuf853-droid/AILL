import api from '@/lib/api';
import type { Product, Order, AddToCartDto, CreateOrderDto, PayOrderDto, ProductListQuery, OrderListQuery } from './types';

export const shopApi = {
  async getProducts(params: ProductListQuery = {}) {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    const res = await api.get(`/api/shop/products?${query}`);
    return res.data;
  },
  async getProductDetail(id: string) {
    const res = await api.get(`/api/shop/products/${id}`);
    return res.data;
  },
  async getCart(userId: string) {
    const res = await api.get(`/api/shop/cart/${userId}`);
    return res.data;
  },
  async addToCart(userId: string, data: AddToCartDto) {
    const res = await api.post(`/api/shop/cart/${userId}`, data);
    return res.data;
  },
  async clearCart(userId: string) {
    const res = await api.delete(`/api/shop/cart/${userId}`);
    return res.data;
  },
  async createOrder(data: CreateOrderDto) {
    const res = await api.post('/api/shop/orders', data);
    return res.data;
  },
  async getOrders(userId: string, params: OrderListQuery = {}) {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    const res = await api.get(`/api/shop/orders/${userId}?${query}`);
    return res.data;
  },
  async payOrder(orderId: string, data: PayOrderDto) {
    const res = await api.post(`/api/shop/orders/${orderId}/pay`, data);
    return res.data;
  },
  async cancelOrder(orderId: string) {
    const res = await api.post(`/api/shop/orders/${orderId}/cancel`, {});
    return res.data;
  },
  async getRedemptions(userId: string) {
    const res = await api.get(`/api/shop/redemptions/${userId}`);
    return res.data;
  },
};
