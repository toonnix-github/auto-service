import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { api, Orders, Vehicles, Customers, Catalog, Mechanics } from './api.js'

describe('api helper', () => {
  let originalFetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('returns parsed json response', async () => {
    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      async text() {
        return '{"hello":"world"}'
      },
    })

    const data = await api('/hello')
    assert.deepEqual(data, { hello: 'world' })
  })

  it('returns null for 204 responses', async () => {
    globalThis.fetch = async () => ({
      ok: true,
      status: 204,
      async text() {
        return ''
      },
    })

    const data = await api('/no-content')
    assert.equal(data, null)
  })

  it('throws when response is not ok', async () => {
    globalThis.fetch = async () => ({
      ok: false,
      status: 500,
      statusText: 'Server Error',
      async text() {
        return 'Failure'
      },
    })

    await assert.rejects(() => api('/error'), /Failure/)
  })

  it('gracefully handles invalid json', async () => {
    const messages = []
    const originalError = console.error
    console.error = (...args) => messages.push(args.join(' '))
    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      async text() {
        return 'not json'
      },
    })

    const result = await api('/broken')
    assert.equal(result, null)
    assert.ok(messages.length > 0)
    console.error = originalError
  })
})

describe('resource helpers build urls correctly', () => {
  let originalFetch
  let calls

  beforeEach(() => {
    originalFetch = globalThis.fetch
    calls = []
    globalThis.fetch = async (url, options = {}) => {
      calls.push({ url, options })
      return {
        ok: true,
        status: 200,
        async text() {
          return 'null'
        },
      }
    }
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    calls = []
  })

  it('orders list includes query parameters', async () => {
    await Orders.list({ q: 'test' })
    assert.ok(calls[0].url.endsWith('/orders?q=test'))
  })

  it('vehicles update targets the correct endpoint', async () => {
    await Vehicles.update('veh-1', { name: 'Car' })
    assert.ok(calls[0].url.endsWith('/vehicles/veh-1'))
    assert.equal(calls[0].options.method, 'PUT')
  })

  it('customers remove issues DELETE request', async () => {
    await Customers.remove('cust-1')
    assert.ok(calls[0].url.endsWith('/customers/cust-1'))
    assert.equal(calls[0].options.method, 'DELETE')
  })

  it('catalog get fetches the item', async () => {
    await Catalog.get('cat-1')
    assert.ok(calls[0].url.endsWith('/catalog/items/cat-1'))
  })

  it('mechanics list builds the correct url', async () => {
    await Mechanics.list({ q: 'krit' })
    assert.ok(calls[0].url.endsWith('/mechanics?q=krit'))
  })
})
