const BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8787/api'

export async function api(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  })

  if (res.status === 204) return null

  const text = await res.text()

  if (!res.ok) {
    throw new Error(text || res.statusText)
  }

  if (!text) return null

  try {
    return JSON.parse(text)
  } catch (error) {
    console.error('Failed to parse response JSON', error)
    return null
  }
}

export const Orders = {
  list: (params={}) => {
    const qs = new URLSearchParams(params).toString()
    return api(`/orders${qs ? `?${qs}`:''}`)
  },
  get: (id) => api(`/orders/${id}`)
}

export const Vehicles = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return api(`/vehicles${qs ? `?${qs}` : ''}`)
  },
  get: (id) => api(`/vehicles/${id}`),
  create: (payload) => api('/vehicles', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  update: (id, payload) => api(`/vehicles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),
  remove: (id) => api(`/vehicles/${id}`, { method: 'DELETE' }),
}

export const Customers = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return api(`/customers${qs ? `?${qs}` : ''}`)
  },
  get: (id) => api(`/customers/${id}`),
  create: (payload) => api('/customers', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  update: (id, payload) => api(`/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),
  remove: (id) => api(`/customers/${id}`, { method: 'DELETE' }),
}
