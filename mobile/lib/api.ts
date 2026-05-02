import { useSession } from './store';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:8000';

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

type RequestOptions = {
  method?: Method;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  auth?: boolean;
  token?: string;
};

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(`${BASE_URL}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

export async function apiRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, auth = true, token: explicitToken } = opts;
  const token = explicitToken ?? useSession.getState().token;
  const url = buildUrl(path, query);

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    throw new ApiError(
      0,
      `No se pudo conectar con el backend en ${BASE_URL}. Revisa que FastAPI este corriendo y que EXPO_PUBLIC_API_URL sea accesible desde Android.`,
      error,
    );
  }

  let parsed: unknown = null;
  const text = await res.text();
  if (text) {
    try { parsed = JSON.parse(text); } catch { parsed = text; }
  }

  if (!res.ok) {
    if (res.status === 401 && auth) {
      useSession.getState().clearSession();
    }
    const detail = (parsed && typeof parsed === 'object' && 'detail' in (parsed as object))
      ? String((parsed as { detail: unknown }).detail)
      : `HTTP ${res.status}`;
    throw new ApiError(res.status, detail, parsed);
  }

  return parsed as T;
}
