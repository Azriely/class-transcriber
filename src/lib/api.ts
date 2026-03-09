const BASE_URL = '/api';

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  /** If true, do not redirect to /login on 401 responses */
  noRedirect?: boolean;
}

async function handleResponse<T>(
  response: Response,
  options?: RequestOptions,
): Promise<T> {
  if (response.status === 401) {
    if (!options?.noRedirect) {
      window.location.href = '/login';
    }
    throw new ApiError('Unauthorized', 401);
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const body = await response.json();
      if (body.error) message = body.error;
    } catch {
      // response may not be JSON
    }
    throw new ApiError(message, response.status);
  }

  return response.json() as Promise<T>;
}

function get<T>(path: string, options?: RequestOptions): Promise<T> {
  return fetch(`${BASE_URL}${path}`, {
    method: 'GET',
    credentials: 'include',
    headers: { 'Accept': 'application/json' },
  }).then((res) => handleResponse<T>(res, options));
}

function post<T>(path: string, body?: unknown): Promise<T> {
  return fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }).then((res) => handleResponse<T>(res));
}

function postMultipart<T>(path: string, formData: FormData): Promise<T> {
  return fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    // Do NOT set Content-Type — browser sets it with boundary for multipart
    headers: { 'Accept': 'application/json' },
    body: formData,
  }).then((res) => handleResponse<T>(res));
}

function del<T>(path: string): Promise<T> {
  return fetch(`${BASE_URL}${path}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'Accept': 'application/json' },
  }).then((res) => handleResponse<T>(res));
}

export const api = { get, post, postMultipart, del };
export { ApiError };
