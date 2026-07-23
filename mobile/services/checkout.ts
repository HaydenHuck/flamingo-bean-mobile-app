import { API_BASE_URL } from "./api";
import type { CartItem } from "../contexts/CartContext";
import type { CreateCheckoutResponse, CreateOrderRequest, OrderItemRequest } from "../types/order";

interface CreateCheckoutInput {
  customerName: string;
  customerEmail: string;
  firebaseIdToken?: string | null;
  fulfillmentType: string;
  pickupTime?: string;
  shippingName?: string;
  shippingAddressLine1?: string;
  shippingAddressLine2?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingZip?: string;
  shippingCountry?: string;
  items: CartItem[];
}

export async function createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResponse> {
  const payload: CreateOrderRequest = {
    customer_name: input.customerName,
    customer_email: input.customerEmail,
    fulfillment_type: input.fulfillmentType,
    pickup_time: input.pickupTime || null,
    shipping_name: input.shippingName || null,
    shipping_address_line1: input.shippingAddressLine1 || null,
    shipping_address_line2: input.shippingAddressLine2 || null,
    shipping_city: input.shippingCity || null,
    shipping_state: input.shippingState || null,
    shipping_zip: input.shippingZip || null,
    shipping_country: input.shippingCountry || null,
    items: input.items.map(toOrderItemRequest),
  };

  const response = await fetch(`${API_BASE_URL}/checkout/create`, {
    body: JSON.stringify(payload),
    headers: {
      ...(input.firebaseIdToken ? { Authorization: `Bearer ${input.firebaseIdToken}` } : {}),
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Unable to start Square checkout.");
  }

  return response.json() as Promise<CreateCheckoutResponse>;
}

function toOrderItemRequest(item: CartItem): OrderItemRequest {
  return {
    product_id: item.productId,
    quantity: item.quantity,
    size: item.size,
  };
}

