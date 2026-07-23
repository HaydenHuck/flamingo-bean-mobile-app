import { API_BASE_URL } from "./api";
import type { Product } from "../types/product";

export async function fetchProducts(): Promise<Product[]> {
  const response = await fetch(`${API_BASE_URL}/products`);

  if (!response.ok) {
    throw new Error("Unable to load products.");
  }

  return response.json() as Promise<Product[]>;
}
