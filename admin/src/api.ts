import { API_BASE_URL } from "./config";
import type {
  AdminOrderDetail,
  AdminOrderSummary,
  AdminSessionResponse,
  LoginResponse,
  Product,
  ProductPayload,
  StaffOrderStatus,
} from "./types";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function loginAdmin(email: string, password: string) {
  return apiRequest<LoginResponse>("/admin/auth/login", {
    body: JSON.stringify({ email, password }),
    method: "POST",
  });
}

export function fetchCurrentAdmin() {
  return apiRequest<AdminSessionResponse>("/admin/auth/me");
}

export function logoutAdmin(csrfToken: string) {
  return apiRequest<void>(
    "/admin/auth/logout",
    { method: "POST" },
    csrfToken,
    false,
  );
}

export function fetchAdminOrders() {
  return apiRequest<AdminOrderSummary[]>("/admin/orders");
}

export function fetchAdminOrder(orderId: string) {
  return apiRequest<AdminOrderDetail>(`/admin/orders/${encodeURIComponent(orderId)}`);
}

export function updateAdminOrderStatus(orderId: string, status: StaffOrderStatus, csrfToken: string) {
  return apiRequest<AdminOrderDetail>(
    `/admin/orders/${encodeURIComponent(orderId)}/status`,
    { body: JSON.stringify({ status }), method: "PUT" },
    csrfToken,
  );
}

export function fetchAdminProducts() {
  return apiRequest<Product[]>("/admin/products");
}

export function createAdminProduct(payload: ProductPayload, csrfToken: string) {
  return apiRequest<Product>(
    "/admin/products",
    { body: JSON.stringify(payload), method: "POST" },
    csrfToken,
  );
}

export function updateAdminProduct(productId: number, payload: ProductPayload, csrfToken: string) {
  return apiRequest<Product>(
    `/admin/products/${productId}`,
    { body: JSON.stringify(payload), method: "PUT" },
    csrfToken,
  );
}

export function updateAdminProductActive(productId: number, active: boolean, csrfToken: string) {
  return apiRequest<Product>(
    `/admin/products/${productId}/active`,
    { body: JSON.stringify({ active }), method: "PATCH" },
    csrfToken,
  );
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  csrfToken?: string,
  expectsJson = true,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (csrfToken) {
    headers.set("X-CSRF-Token", csrfToken);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers,
  });
  if (!response.ok) {
    throw new ApiError(await getErrorMessage(response), response.status);
  }
  if (!expectsJson || response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

async function getErrorMessage(response: Response) {
  try {
    const data = await response.json();
    return formatErrorDetail(data.detail);
  } catch {
    return "The admin API request failed.";
  }
}

function formatErrorDetail(detail: unknown) {
  if (typeof detail === "string") {
    return detail;
  }
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "msg" in item) {
          const location = "loc" in item && Array.isArray(item.loc) ? `${item.loc.join(".")}: ` : "";
          return `${location}${String(item.msg)}`;
        }
        return "Invalid request.";
      })
      .join(" ");
  }
  return "The admin API request failed.";
}
