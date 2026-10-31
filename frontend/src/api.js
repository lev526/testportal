export async function apiRequest(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  let body = options.body;

  // Если передан обычный объект (не FormData для картинок), сериализуем в JSON
  if (body && typeof body === 'object' && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    body,
    credentials: 'include',
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Ошибка сервера (${response.status})`);
  }

  return data;
}