const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {}
const BASE = env.VITE_API_BASE || 'http://127.0.0.1:8787/api'

export async function api(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  })

  if (res.status === 204) return null

  const text = await res.text()

  if (res.status === 404 && !text) {
    return null
  }

  if (!res.ok) {
    let message = ''

    if (text) {
      try {
        const parsed = JSON.parse(text)
        if (parsed && typeof parsed.message === 'string' && parsed.message.trim()) {
          message = parsed.message.trim()
        } else {
          message = text
        }
      } catch (error) {
        message = text
      }
    }

    if (!message) {
      message = res.statusText || `Request failed with status ${res.status}`
    }

    throw new Error(message)
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
  get: (id) => api(`/orders/${id}`),
  create: (payload) => api('/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  updateStatus: (id, status) =>
    api(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
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

export const Catalog = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return api(`/catalog/items${qs ? `?${qs}` : ''}`)
  },
  get: (id) => api(`/catalog/items/${id}`),
}

const jsonBody = (payload) => ({
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
})

const createCrud = (basePath, resourceKey) => ({
  get: async (id) => {
    const response = await api(`/${basePath}/${id}`)
    return response?.[resourceKey] ?? null
  },
  create: (payload) =>
    api(`/${basePath}`, {
      method: 'POST',
      ...jsonBody(payload),
    }),
  update: (id, payload) =>
    api(`/${basePath}/${id}`, {
      method: 'PUT',
      ...jsonBody(payload),
    }),
  remove: (id) => api(`/${basePath}/${id}`, { method: 'DELETE' }),
})

export const Goods = createCrud('goods', 'goods')
export const Parts = createCrud('parts', 'part')
export const Services = createCrud('services', 'service')

export const Mechanics = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return api(`/mechanics${qs ? `?${qs}` : ''}`)
  },
  get: (id) => api(`/mechanics/${id}`),
  create: (payload) =>
    api('/mechanics', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id, payload) =>
    api(`/mechanics/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  remove: (id) => api(`/mechanics/${id}`, { method: 'DELETE' }),
}
