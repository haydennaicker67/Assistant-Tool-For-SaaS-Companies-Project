export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': process.env.NEXT_PUBLIC_CONTROL_PLANE_API_KEY!,
    ...options.headers,
  };

  return fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
}