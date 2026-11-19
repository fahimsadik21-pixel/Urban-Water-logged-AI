const rawBase =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? 'https://urban-water-logged-ai-backend.onrender.com' : '');
export const API_BASE_URL = rawBase.replace(/\/+$/, '');

export class ApiError extends Error {
  readonly status: number;
  constructor(
    message: string,
    status: number,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const token = typeof window !== 'undefined' ? localStorage.getItem('uwai_token') : null;
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const targetUrl = API_BASE_URL ? `${API_BASE_URL}${cleanPath}` : cleanPath;
  const response = await fetch(targetUrl, {
    ...init,
    headers,
    credentials: 'include',
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    let errorMessage = `Request failed with HTTP ${response.status}`;
    if (payload) {
      if (typeof payload.detail === 'string') {
        errorMessage = payload.detail;
      } else if (Array.isArray(payload.detail)) {
        errorMessage = payload.detail
          .map((item: any) => {
            if (typeof item === 'string') return item;
            if (item && item.msg) return `${item.loc ? item.loc.slice(-1)[0] + ': ' : ''}${item.msg}`;
            return JSON.stringify(item);
          })
          .join(', ');
      } else if (typeof payload.detail === 'object' && payload.detail !== null) {
        errorMessage = JSON.stringify(payload.detail);
      } else if (payload.message) {
        errorMessage = String(payload.message);
      }
    }
    throw new ApiError(errorMessage, response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
