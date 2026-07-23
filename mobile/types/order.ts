export interface OrderItemRequest {
  product_id: number;
  quantity: number;
  size: string;
}

export interface OrderItemResponse extends OrderItemRequest {
  name: string;
  price: number;
  line_total: number;
}

export interface CreateOrderRequest {
  customer_name: string;
  customer_email: string;
  fulfillment_type: string;
  pickup_time?: string | null;
  shipping_name?: string | null;
  shipping_address_line1?: string | null;
  shipping_address_line2?: string | null;
  shipping_city?: string | null;
  shipping_state?: string | null;
  shipping_zip?: string | null;
  shipping_country?: string | null;
  items: OrderItemRequest[];
}

export type OrderStatus =
  | "received"
  | "pending_payment"
  | "paid"
  | "payment_failed"
  | "preparing"
  | "ready"
  | "completed"
  | "canceled";
export type PaymentStatus = "pending_payment" | "paid" | "payment_failed" | "canceled";

export interface OrderConfirmation {
  order_id: string;
  order_number: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  customer_name: string;
  fulfillment_type: string;
  pickup_time: string | null;
  shipping_name: string | null;
  shipping_address_line1: string | null;
  shipping_address_line2: string | null;
  shipping_city: string | null;
  shipping_state: string | null;
  shipping_zip: string | null;
  shipping_country: string | null;
  items: OrderItemResponse[];
  subtotal: number;
  tax: number;
  shipping_fee: number;
  total: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface CheckoutSession {
  local_order_number: string;
  checkout_url: string;
  status: string;
  guest_access_token: string | null;
}

export interface CreateCheckoutResponse extends CheckoutSession {}

export interface CustomerOrderSummary {
  order_id: string;
  order_number: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  fulfillment_type: string;
  pickup_time: string | null;
  shipping_fee: number;
  total: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface LinkGuestOrdersResponse {
  linked_count: number;
  message: string;
}
