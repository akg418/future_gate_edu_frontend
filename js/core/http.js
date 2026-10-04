import CONFIG from './config.js';
import store from './store.js';

/**
 * The single HTTP client for the whole frontend.
 *
 * Responsibilities:
 *  - attach the bearer token to every authenticated request;
 *  - transparently refresh an expired access token once and replay the request,
 *    with concurrent 401s sharing one refresh rather than stampeding;
 *  - unwrap the API's `{ success, message, data, meta }` envelope;
 *  - raise a typed `ApiClientError` so callers can branch on status/details.
 */

export class ApiClientError extends Error {
  constructor(message, { status = 0, code = 'NETWORK_ERROR', details = null } = {}) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** Field-level validation messages, shaped for form rendering. */
  get fieldErrors() {
    return this.details?.fields || [];
  }
}

/** Shared promise so parallel 401s trigger exactly one refresh round-trip. */
let refreshInFlight = null;

async function performRefresh() {
  const response = await fetch(`${CONFIG.apiBase}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ refreshToken: store.refreshToken || undefined }),
  });

  if (!response.ok) throw new ApiClientError('Session expired', { status: 401, code: 'SESSION_EXPIRED' });

  const body = await response.json();
  store.setSession({
    user: body.data.user,
    accessToken: body.data.accessToken,
    refreshToken: body.data.refreshToken,
  });
  return body.data.accessToken;
}

function refreshSession() {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

function buildUrl(path, query) {
  const url = new URL(`${CONFIG.apiBase}${path}`, window.location.origin);
  for (const [key, value] of Object.entries(query || {})) {
    if (value === undefined || value === null || value === '') continue;
    url.searchParams.set(key, value);
  }
  return url.toString();
}

async function request(method, path, { body, query, headers = {}, isForm = false, raw = false, retry = true } = {}) {
  const requestHeaders = { Accept: 'application/json', ...headers };
  if (!isForm && body !== undefined) requestHeaders['Content-Type'] = 'application/json';
  if (store.accessToken) requestHeaders.Authorization = `Bearer ${store.accessToken}`;

  let response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers: requestHeaders,
      credentials: 'include',
      body: isForm ? body : body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiClientError('Cannot reach the server. Please check your connection and try again.');
  }

  // An expired access token is refreshed once, then the original call is replayed.
  if (response.status === 401 && retry && store.refreshToken) {
    try {
      await refreshSession();
      return request(method, path, { body, query, headers, isForm, raw, retry: false });
    } catch {
      store.clearSession();
      window.dispatchEvent(new CustomEvent('fg:session-expired'));
    }
  }

  if (raw) {
    if (!response.ok) throw new ApiClientError('Download failed', { status: response.status });
    return response;
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new ApiClientError(payload?.message || `Request failed with status ${response.status}`, {
      status: response.status,
      code: payload?.code || 'REQUEST_FAILED',
      details: payload?.details || null,
    });
  }

  return { data: payload?.data ?? null, meta: payload?.meta ?? null, message: payload?.message ?? '' };
}

export const http = {
  get: (path, query, options) => request('GET', path, { query, ...options }),
  post: (path, body, options) => request('POST', path, { body, ...options }),
  put: (path, body, options) => request('PUT', path, { body, ...options }),
  patch: (path, body, options) => request('PATCH', path, { body, ...options }),
  delete: (path, body, options) => request('DELETE', path, { body, ...options }),

  /** Multipart upload — the browser sets the boundary, so no Content-Type here. */
  upload: (path, formDataBody, options) => request('POST', path, { body: formDataBody, isForm: true, ...options }),

  /** Streams a file response and triggers a browser download. */
  async download(path, filename, query) {
    const response = await request('GET', path, { query, raw: true });
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};

export default http;
