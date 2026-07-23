export interface AdminUser {
  id: number;
  email: string;
  role: string;
  active: boolean;
}

export interface LoginResponse {
  admin: AdminUser;
  csrf_token: string;
}

export type AdminSessionResponse = LoginResponse;

export type OrderStatus =
  | "received"
  | "pending_payment"
  | "paid"
  | "payment_failed"
  | "preparing"
  | "ready"
  | "completed"
  | "canceled";

export type StaffOrderStatus = "received" | "preparing" | "ready" | "completed" | "canceled";

export type PaymentStatus = "pending_payment" | "paid" | "payment_failed" | "canceled";

export interface AdminOrderSummary {
  order_id: string;
  customer_name: string;
  customer_email: string;
  customer_firebase_uid: string | null;
  customer_account_email: string | null;
  guest_email: string | null;
  fulfillment_type: string;
  pickup_time: string | null;
  shipping_name: string | null;
  shipping_address_line1: string | null;
  shipping_address_line2: string | null;
  shipping_city: string | null;
  shipping_state: string | null;
  shipping_zip: string | null;
  shipping_country: string | null;
  status: OrderStatus;
  payment_status: PaymentStatus;
  subtotal: number;
  tax: number;
  shipping_fee: number;
  total: number;
  currency: string;
  created_at: string;
}

export interface AdminOrderItem {
  product_id: number;
  name: string;
  price: number;
  quantity: number;
  size: string;
  line_total: number;
}

export interface AdminOrderDetail extends AdminOrderSummary {
  items: AdminOrderItem[];
}

export interface Product {
  id: number;
  name: string;
  description: string;
  category: string;
  price: number;
  image_url: string;
  roast_level: string;
  origin: string;
  size: string;
  active: boolean;
}

export interface ProductPayload {
  name: string;
  description: string;
  category: string;
  price: number;
  image_url: string;
  roast_level: string;
  origin: string;
  size: string;
  active: boolean;
}
