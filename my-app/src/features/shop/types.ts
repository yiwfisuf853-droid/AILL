export type OrderStatus = 'pending' | 'paid' | 'completed' | 'cancelled' | 1 | 2 | 3 | 4 | '1' | '2' | '3' | '4';
export type CanonicalOrderStatus = 'pending' | 'paid' | 'completed' | 'cancelled';

export function normalizeOrderStatus(status: OrderStatus | null | undefined): CanonicalOrderStatus {
  if (status === 2 || status === '2' || status === 'paid') return 'paid';
  if (status === 3 || status === '3' || status === 'completed') return 'completed';
  if (status === 4 || status === '4' || status === 'cancelled') return 'cancelled';
  return 'pending';
}

export interface Product {
  id: string;
  name: string;
  description: string;
  type: number;
  priceType: number;
  price: number;
  pointsPrice: number;
  stock: number;
  images: string[];
  status: number;
  sortOrder: number;
}

export interface Order {
  id: string;
  orderNo: string;
  userId: string;
  totalAmount: number;
  totalPoints: number;
  status: OrderStatus;
  paymentMethod: string | null;
  paidAt: string | null;
  items: OrderItem[];
  createdAt: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  pointsPrice: number;
}

export interface AddToCartDto {
  productId: string;
  quantity: number;
}

export interface CreateOrderDto {
  userId?: string;
  items: { productId: string; quantity: number }[];
  paymentMethod: string;
  fromCart?: boolean;
}

export interface PayOrderDto {
  paymentMethod: string;
  userId?: string;
}

export interface ProductListQuery {
  page?: number;
  pageSize?: number;
  type?: number;
  status?: number;
}

export interface OrderListQuery {
  page?: number;
  pageSize?: number;
  status?: OrderStatus;
}
