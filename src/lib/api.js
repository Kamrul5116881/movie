const API_URL = import.meta.env.VITE_API_URL || ''

export const hasApi = () => Boolean(API_URL)

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || `Request failed: ${response.status}`)
  return data
}

function toParams(params = {}) {
  const clean = {}
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') clean[k] = String(v)
  }
  return new URLSearchParams(clean).toString()
}

export const api = {
  movies: (params = {}) => request(`/api/movies?${toParams(params)}`),
  movie: (slug) => request(`/api/movies/${encodeURIComponent(slug)}`),
  availability: (slug) => request(`/api/movies/${encodeURIComponent(slug)}/availability`),
  genres: () => request('/api/genres'),
  login: (credentials) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  me: () => request('/api/auth/me'),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  watchlist: () => request('/api/watchlist'),
  addWatchlist: (id) => request(`/api/watchlist/${id}`, { method: 'POST' }),
  removeWatchlist: (id) => request(`/api/watchlist/${id}`, { method: 'DELETE' }),
  stats: () => request('/api/admin/stats'),
  adminMovies: (params = {}) => request(`/api/admin/movies?${toParams(params)}`),
  updateMovie: (id, body) => request(`/api/admin/movies/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  resyncMovie: (id) => request(`/api/admin/movies/${id}/resync`, { method: 'POST' }),
  jobs: () => request('/api/admin/jobs'),
  sync: (type = 'trending', pages = 1) => request('/api/admin/sync', { method: 'POST', body: JSON.stringify({ type, pages }) }),
  settings: () => request('/api/admin/settings'),
  saveSetting: (key, value) => request('/api/admin/settings', { method: 'PUT', body: JSON.stringify({ key, value }) }),
}

export function tmdbPoster(path, size = 'w500') {
  if (!path) return null
  const clean = path.startsWith('/') ? path : `/${path}`
  return `https://image.tmdb.org/t/p/${size}${clean}`
}
