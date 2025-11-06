const BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8787/api'

export async function api(path, opts){
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type':'application/json' },
    ...opts
  })
  if(!res.ok) throw new Error(await res.text())
  return res.json()
}

export const Orders = {
  list: (params={}) => {
    const qs = new URLSearchParams(params).toString()
    return api(`/orders${qs ? `?${qs}`:''}`)
  },
  get: (id) => api(`/orders/${id}`)
}
