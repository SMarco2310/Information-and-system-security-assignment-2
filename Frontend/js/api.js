// credentials:'include' sends the session cookie.
export const API = 'http://localhost:4000'

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status }
}

export async function api(path, { method = 'GET', body, redirectOn401 = true } = {}) {
  let res
  try {
    res = await fetch(API + path, {
      method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined
    })
  } catch {
    throw new ApiError('Cannot reach the server. Is the backend running?', 0)
  }
  const data = await res.json().catch(() => null)
  if (res.status === 401 && redirectOn401) {   // no / expired / logged-out session
    location.replace('login.html')
    throw new ApiError('Please sign in.', 401)
  }
  if (!res.ok) throw new ApiError(data?.message || 'Request failed.', res.status)
  return data
}
