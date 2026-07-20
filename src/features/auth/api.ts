export const API_URL = import.meta.env.VITE_API_URL || '';

export async function apiRequest(path: string, options: RequestInit = {}, token?: string) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.message || 'Không thể kết nối máy chủ.');
    Object.assign(error, { details: body, status: response.status });
    throw error;
  }
  return body;
}
