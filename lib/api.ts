// API helper for making authenticated requests

export async function api(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers: Record<string, string> = {};

  // Copy existing headers
  if (options.headers) {
    const existingHeaders = options.headers as Record<string, string>;
    Object.assign(headers, existingHeaders);
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Add Content-Type for non-FormData requests
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  return fetch(`/api${endpoint}`, {
    ...options,
    headers,
  });
}

// Convenience methods
export const apiGet = (endpoint: string) => api(endpoint);

export const apiPost = (endpoint: string, data: any) =>
  api(endpoint, {
    method: 'POST',
    body: data instanceof FormData ? data : JSON.stringify(data),
  });

export const apiPut = (endpoint: string, data: any) =>
  api(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const apiDelete = (endpoint: string) =>
  api(endpoint, { method: 'DELETE' });
