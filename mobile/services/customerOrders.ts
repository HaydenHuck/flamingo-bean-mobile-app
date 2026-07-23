import { API_BASE_URL } from "./api";
import type { CustomerOrderSummary, LinkGuestOrdersResponse, OrderConfirmation } from "../types/order";

export async function fetchCustomerOrders(idToken: string): Promise<CustomerOrderSummary[]> {
  const response = await fetch(`${API_BASE_URL}/customer/orders`, {
    headers: createFirebaseAuthHeaders(idToken),
  });

  if (!response.ok) {
    throw new Error("Unable to load customer orders.");
  }

  return response.json() as Promise<CustomerOrderSummary[]>;
}

export async function fetchCustomerOrder(orderId: string, idToken: string): Promise<OrderConfirmation> {
  const response = await fetch(`${API_BASE_URL}/customer/orders/${encodeURIComponent(orderId)}`, {
    headers: createFirebaseAuthHeaders(idToken),
  });

  if (!response.ok) {
    throw new Error("Unable to load customer order.");
  }

  return response.json() as Promise<OrderConfirmation>;
}

export async function linkGuestOrder(
  orderNumber: string,
  guestAccessToken: string,
  idToken: string,
): Promise<LinkGuestOrdersResponse> {
  const response = await fetch(`${API_BASE_URL}/customer/link-guest-orders`, {
    body: JSON.stringify({
      guest_access_token: guestAccessToken,
      order_number: orderNumber,
    }),
    headers: {
      ...createFirebaseAuthHeaders(idToken),
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Unable to link guest orders.");
  }

  return response.json() as Promise<LinkGuestOrdersResponse>;
}

function createFirebaseAuthHeaders(idToken: string) {
  return {
    Authorization: `Bearer ${idToken}`,
  };
}
