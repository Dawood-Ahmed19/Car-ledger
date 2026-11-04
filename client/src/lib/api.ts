export const BASE = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export const assetUrl = (p: string) =>
  p.startsWith("http") ? p : `${BASE}${p}`;

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

const NETWORK_MSG =
  "Cannot reach the server. Check your connection and try again.";

let authToken: string | null = null;
const tokenListeners = new Set<(t: string | null) => void>();
export const getAuthToken = () => authToken;
export const onAuthTokenChange = (fn: (t: string | null) => void) => {
  tokenListeners.add(fn);
  return () => {
    tokenListeners.delete(fn);
  };
};
export const setAuthToken = (t: string | null) => {
  authToken = t;
  tokenListeners.forEach((fn) => fn(t));
};

let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: (() => void) | null) => {
  onUnauthorized = fn;
};

function handle401(path: string, status: number, hadToken: boolean) {
  if (status === 401 && hadToken && !path.startsWith("/api/auth/")) {
    onUnauthorized?.();
  }
}

interface Options {
  method?: "GET" | "POST" | "DELETE";
  body?: unknown;
}

function upload<T>(path: string, form: FormData): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const hadToken = !!authToken;
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${BASE}${path}`);
    if (authToken) xhr.setRequestHeader("Authorization", `Bearer ${authToken}`);
    xhr.timeout = 60_000;
    xhr.onload = () => {
      let data: { error?: string } = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {}
      if (xhr.status >= 200 && xhr.status < 300) return resolve(data as T);
      handle401(path, xhr.status, hadToken);
      reject(
        new ApiError(
          data.error ?? "Something went wrong. Try again.",
          xhr.status,
        ),
      );
    };
    xhr.onerror = () => reject(new ApiError(NETWORK_MSG, 0));
    xhr.ontimeout = () => reject(new ApiError(NETWORK_MSG, 0));
    xhr.send(form);
  });
}

export async function api<T>(
  path: string,
  { method = "GET", body }: Options = {},
): Promise<T> {
  if (typeof FormData !== "undefined" && body instanceof FormData) {
    return upload<T>(path, body);
  }

  const hadToken = !!authToken;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 204) return undefined as T;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      handle401(path, res.status, hadToken);
      throw new ApiError(
        data.error ?? "Something went wrong. Try again.",
        res.status,
      );
    }
    return data as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(NETWORK_MSG, 0);
  } finally {
    clearTimeout(timer);
  }
}
