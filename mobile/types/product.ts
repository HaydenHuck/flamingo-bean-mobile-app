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

export interface AdminProductPayload {
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
