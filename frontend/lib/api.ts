export const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

const API_PREFIX = "/api";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

function friendlyDetail(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const parts = (detail as Array<{ type?: string; loc?: unknown; msg?: string }>).map(
      (e) => {
        const loc = Array.isArray(e.loc) ? e.loc : [];
        const field =
          loc.length > 0 ? String(loc[loc.length - 1]) : "";
        const msg = e.msg ?? "Invalid value";
        if (e.type === "missing" && field) return `Missing field: ${field}`;
        if (field && field !== "body" && msg !== "Field required")
          return `${field}: ${msg}`;
        return msg;
      },
    );
    return parts.join("; ");
  }
  return JSON.stringify(detail);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;
  const res = await fetch(`${API_URL}${API_PREFIX}${path}`, {
    credentials: "include",
    headers: {
      ...(options.headers ?? {}),
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
    },
    ...options,
    body: options.body,
  });

  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data.detail) detail = friendlyDetail(data.detail);
    } catch {
      /* noop */
    }
    throw new ApiError(detail, res.status);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function buildBody(body: unknown): BodyInit | undefined {
  if (body === undefined) return undefined;
  if (typeof FormData !== "undefined" && body instanceof FormData) return body;
  return JSON.stringify(body);
}

export const api = {
  get: <T>(path: string, params?: Record<string, string>) => {
    const qs = params
      ? "?" + new URLSearchParams(params).toString()
      : "";
    return request<T>(path + qs);
  },
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: buildBody(body) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: buildBody(body) }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  upload: <T>(path: string, formData: FormData) =>
    request<T>(path, { method: "POST", body: formData }),
};
