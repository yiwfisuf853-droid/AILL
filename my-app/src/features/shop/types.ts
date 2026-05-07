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
  status: number;
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
  status?: number;
}
