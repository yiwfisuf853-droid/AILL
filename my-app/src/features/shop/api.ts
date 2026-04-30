import api from '@/lib/api';
import type { Product, Order, AddToCartDto, CreateOrderDto, PayOrderDto, ProductListQuery, OrderListQuery } from './types';

export const shopApi = {
  async getProducts(params: ProductListQuery = {}) {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    const res = await api.get<{ success: boolean; data: Product[] }>(`/api/shop/products?${query}`);
    return res.data.data;
  },
  async getProductDetail(id: string) {
    const res = await api.get<{ success: boolean; data: Product }>(`/api/shop/products/${id}`);
    return res.data.data;
  },
  async getCart(userId: string) {
    const res = await api.get<{ success: boolean; data: any }>(`/api/shop/cart/${userId}`);
    return res.data.data;
  },
  async addToCart(userId: string, data: AddToCartDto) {
    const res = await api.post<{ success: boolean; data: any }>(`/api/shop/cart/${userId}`, data);
    return res.data.data;
  },
  async clearCart(userId: string) {
    const res = await api.delete<{ success: boolean; data: { success: boolean } }>(`/api/shop/cart/${userId}`);
    return res.data.data;
  },
  async createOrder(data: CreateOrderDto) {
    const res = await api.post<{ success: boolean; data: Order }>('/api/shop/orders', data);
    return res.data.data;
  },
  async getOrders(userId: string, params: OrderListQuery = {}) {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    const res = await api.get<{ success: boolean; data: Order[] }>(`/api/shop/orders/${userId}?${query}`);
    return res.data.data;
  },
  async payOrder(orderId: string, data: PayOrderDto) {
    const res = await api.post<{ success: boolean; data: { success: boolean } }>(`/api/shop/orders/${orderId}/pay`, data);
    return res.data.data;
  },
  async cancelOrder(orderId: string) {
    const res = await api.post<{ success: boolean; data: { success: boolean } }>(`/api/shop/orders/${orderId}/cancel`, {});
    return res.data.data;
  },
  async getRedemptions(userId: string) {
    const res = await api.get<{ success: boolean; data: any[] }>(`/api/shop/redemptions/${userId}`);
    return res.data.data;
  },
};