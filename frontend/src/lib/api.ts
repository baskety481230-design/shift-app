const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8000";
// VITE_MOCK_API=1 enables an in-browser mock backend (works in dev AND prod builds — for demo deployments)
const USE_MOCK = import.meta.env.VITE_MOCK_API === "1";

export const isMockMode = USE_MOCK;

export class ApiError extends Error {
  constructor(public status: number, public detail: string) {
    super(`${status}: ${detail}`);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (USE_MOCK) {
    const { mockRequest } = await import("./dev-mock");
    const method = (init.method ?? "GET") as "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
    const body = init.body ? JSON.parse(init.body as string) : undefined;
    return mockRequest<T>(method, path, body);
  }
  const res = await fetch(`${BASE_URL}/api${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
    ...init,
  });
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;
  if (!res.ok) {
    const detail = (data && (data.detail || data.message)) || res.statusText;
    throw new ApiError(res.status, typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

export const apiBaseUrl = BASE_URL;
