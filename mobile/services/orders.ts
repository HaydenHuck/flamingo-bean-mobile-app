import { API_BASE_URL } from "./api";
import type { OrderConfirmation } from "../types/order";

export async function fetchGuestOrder(
  orderNumber: string,
  guestAccessToken: string,
): Promise<OrderConfirmation> {
  const response = await fetch(`${API_BASE_URL}/orders/${encodeURIComponent(orderNumber)}`, {
    headers: { "X-Guest-Access-Token": guestAccessToken },
  });
  if (!response.ok) {
    throw new Error("Unable to load order status.");
  }
  return response.json() as Promise<OrderConfirmation>;
}
