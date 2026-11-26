export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function apiUrl(path: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured.");
  }
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

function errorMessage(body: unknown, fallback: string): string {
  if (typeof body === "string" && body.trim()) return body;
  if (typeof body === "object" && body !== null && "detail" in body) {
    const detail = body.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((item) =>
          typeof item === "object" && item !== null && "msg" in item
            ? String(item.msg)
            : String(item),
        )
        .join("; ");
    }
  }
  if (typeof body === "object" && body !== null && "message" in body) {
    return String(body.message);
  }
  return fallback;
}

async function send(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(apiUrl(path), {
    ...init,
    credentials: "include",
    headers,
  });

  if (response.status === 401 && typeof window !== "undefined") {
    window.dispatchEvent(new Event("projecthub:auth-required"));
  }

  if (!response.ok) {
    const responseText = await response.text();
    let responseBody: unknown = responseText;
    try {
      responseBody = responseText ? JSON.parse(responseText) : null;
    } catch {
      responseBody = responseText;
    }
    throw new ApiError(
      errorMessage(responseBody, `Request failed (${response.status}).`),
      response.status,
    );
  }
  return response;
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await send(path, init);
  if (response.status === 204) return undefined as T;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }
  return (await response.text()) as T;
}

export async function apiDownload(
  path: string,
  signal?: AbortSignal,
): Promise<{ blob: Blob; filename: string | null }> {
  const response = await send(path, { method: "GET", signal });
  const disposition = response.headers.get("content-disposition") ?? "";
  const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1] ?? null;
  return { blob: await response.blob(), filename };
}
