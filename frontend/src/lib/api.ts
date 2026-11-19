const RENDER_BACKEND = 'https://urban-water-logged-ai-backend.onrender.com';
const configuredBase = import.meta.env.VITE_API_BASE_URL;
export const API_BASE_URL =
  typeof configuredBase === 'string' && configuredBase.trim().length > 0
    ? configuredBase.replace(/\/+$/, '')
    : '';

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

  // Primary URL: uses reverse proxy (relative) or configured base URL
  const primaryUrl = API_BASE_URL ? `${API_BASE_URL}${cleanPath}` : cleanPath;
  // Fallback URL: direct Render cloud backend if primary was relative, or relative if primary was explicit
  const fallbackUrl = API_BASE_URL ? cleanPath : `${RENDER_BACKEND}${cleanPath}`;

  let response: Response;
  try {
    response = await fetch(primaryUrl, {
      ...init,
      headers,
      credentials: 'include',
    });
    // In case edge proxy returned gateway timeout or 502/503 during cold-wake, try fallback
    if (!response.ok && (response.status === 502 || response.status === 503 || response.status === 504) && primaryUrl !== fallbackUrl) {
      try {
        const altResponse = await fetch(fallbackUrl, {
          ...init,
          headers,
          credentials: 'include',
        });
        if (altResponse.ok) {
          response = altResponse;
        }
      } catch {
        // keep original response
      }
    }
  } catch (err) {
    // Network failure (CORS block, DNS, or offline proxy) -> auto fallback
    if (primaryUrl !== fallbackUrl) {
      response = await fetch(fallbackUrl, {
        ...init,
        headers,
        credentials: 'include',
      });
    } else {
      throw err;
    }
  }

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
