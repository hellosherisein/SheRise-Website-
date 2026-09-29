export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  whatsappNumber: string;
  createdAt: string;
};
export type Address = {
  id: string;
  name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pin: string;
  label: "Home" | "Work" | "Other";
  isDefault: boolean;
};
export type OrderItem = {
  slug: string;
  name: string;
  image?: string;
  quantity: number;
  size: string;
  flow: string;
  pack: string;
  price: number;
};
export type OrderReview = {
  slug: string;
  rating: number;
  reviewText: string;
  reviewedAt: string;
  status?: "PENDING" | "APPROVED" | "REJECTED";
  moderatedAt?: string;
};
export type CustomerOrder = {
  id: string;
  createdAt: string;
  items: OrderItem[];
  address: Address;
  subtotal: number;
  discount: number;
  gstPercent?: number;
  gstAmount?: number;
  shippingAmount?: number;
  total: number;
  status: "preview" | "packed" | "shipped" | "delivered" | "cancelled";
  payment: string;
  cancellationReason?: string;
  cancelledAt?: string;
  reviews?: OrderReview[];
};
export type CustomerData = {
  user: Customer | null;
  addresses: Address[];
  wishlist: string[];
  orders: CustomerOrder[];
};
export const emptyCustomerData: CustomerData = {
  user: null,
  addresses: [],
  wishlist: [],
  orders: [],
};
