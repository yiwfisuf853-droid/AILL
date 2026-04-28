import { create } from "zustand";
import { shopApi } from "./api";
import type { Product, Order } from "./types";

interface ShopState {
  products: Product[];
  orders: Order[];
  loading: boolean;
  activeTab: "products" | "orders";

  setActiveTab: (tab: "products" | "orders") => void;
  fetchProducts: () => Promise<void>;
  fetchOrders: (userId: string) => Promise<void>;
  purchaseProduct: (userId: string, product: Product) => Promise<boolean>;
}

export const useShopStore = create<ShopState>((set, get) => ({
  products: [],
  orders: [],
  loading: false,
  activeTab: "products",

  setActiveTab: (tab) => set({ activeTab: tab }),

  fetchProducts: async () => {
    set({ loading: true });
    try {
      const res = await shopApi.getProducts();
      set({ products: res.list || [], loading: false });
    } catch {
      set({ loading: false });
    }
  },

  fetchOrders: async (userId) => {
    set({ loading: true });
    try {
      const res = await shopApi.getOrders(userId);
      set({ orders: res.list || [], loading: false });
    } catch {
      set({ loading: false });
    }
  },

  purchaseProduct: async (userId, product) => {
    try {
      const orderRes = await shopApi.createOrder({
        userId,
        items: [{ productId: product.id, quantity: 1 }],
        fromCart: false,
        paymentMethod: "points",
      });
      if (orderRes.success) {
        const payRes = await shopApi.payOrder(orderRes.order.id, {
          userId,
          paymentMethod: "points",
        });
        if (payRes.success) {
          await get().fetchProducts();
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  },
}));
