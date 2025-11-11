import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { roundCurrency, generateOrderNumber, fetchOrderDetail } from './index.js'

describe('roundCurrency', () => {
  it('rounds to two decimal places', () => {
    assert.equal(roundCurrency(10.005), 10.01)
    assert.equal(roundCurrency(10.004), 10)
  })
})

describe('generateOrderNumber', () => {
  const createDbMock = (latest) => {
    const state = {
      prepareCalls: 0,
      bindArgs: [],
    }

    return {
      state,
      db: {
        prepare(sql) {
          state.prepareCalls += 1
          return {
            bind(arg) {
              state.bindArgs.push(arg)
              return {
                async first() {
                  return latest
                },
              }
            },
          }
        },
      },
    }
  }

  it('generates the first sequence when none exist', async () => {
    const { db, state } = createDbMock(null)
    const result = await generateOrderNumber(db, new Date('2024-05-10T10:00:00Z'))
    assert.equal(result, 'SO-202405-0001')
    assert.equal(state.prepareCalls, 1)
    assert.deepEqual(state.bindArgs, ['SO-202405-%'])
  })

  it('increments based on the latest record', async () => {
    const { db } = createDbMock({ order_no: 'SO-202405-0042' })
    const result = await generateOrderNumber(db, new Date('2024-05-10T10:00:00Z'))
    assert.equal(result, 'SO-202405-0043')
  })
})

describe('fetchOrderDetail', () => {
  const orderRecord = {
    id: 'order-1',
    order_no: 'SO-1',
  }
  const itemRecords = [{ id: 'item-1', qty: 2 }]
  const mechanicRecords = [{ id: 'm1', name: 'Jane Doe' }]

  const createDbMock = (
    order = orderRecord,
    items = itemRecords,
    mechanics = mechanicRecords,
  ) => {
    return {
      prepare(sql) {
        if (sql.includes('FROM orders')) {
          return {
            bind() {
              return {
                async first() {
                  return order
                },
              }
            },
          }
        }
        if (sql.includes('FROM order_items')) {
          return {
            bind() {
              return {
                async all() {
                  return { results: items }
                },
              }
            },
          }
        }
        if (sql.includes('FROM order_mechanics')) {
          return {
            bind() {
              return {
                async all() {
                  return { results: mechanics }
                },
              }
            },
          }
        }
        throw new Error(`Unexpected SQL: ${sql}`)
      },
    }
  }

  it('returns null when order is not found', async () => {
    const db = createDbMock(null)
    const detail = await fetchOrderDetail(db, 'missing')
    assert.equal(detail, null)
  })

  it('returns order with items when found', async () => {
    const db = createDbMock(orderRecord, itemRecords, mechanicRecords)
    const detail = await fetchOrderDetail(db, orderRecord.id)
    assert.deepEqual(detail, {
      order: orderRecord,
      items: itemRecords,
      mechanics: mechanicRecords,
    })
  })
})
