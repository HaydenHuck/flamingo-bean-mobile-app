declare const process: { env: Record<string, string | undefined> } | undefined;

const env = typeof process === "undefined" ? {} : process.env;
export const API_BASE_URL = (env.EXPO_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000").replace(/\/+$/, "");

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function throwApiError(response: Response, message: string): never {
  throw new ApiError(message, response.status);
}
