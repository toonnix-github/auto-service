import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { ensureCustomersTable, fetchCustomerById } from './customers.js'

describe('ensureCustomersTable', () => {
  it('resolves when the table exists', async () => {
    let receivedSql
    const db = {
      prepare(sql) {
        receivedSql = sql
        return {
          async first() {
            return { name: 'customers' }
          },
        }
      },
    }

    await ensureCustomersTable(db)
    assert.ok(receivedSql.includes("sqlite_master"))
  })

  it('throws when the table is missing', async () => {
    const db = {
      prepare() {
        return {
          async first() {
            return null
          },
        }
      },
    }

    await assert.rejects(() => ensureCustomersTable(db), /customers table is missing/)
  })
})

describe('fetchCustomerById', () => {
  it('runs the expected query with id', async () => {
    const bindArgs = []
    const db = {
      prepare(sql) {
        assert.ok(sql.includes('FROM customers'))
        return {
          bind(arg) {
            bindArgs.push(arg)
            return {
              async first() {
                return { id: '123' }
              },
            }
          },
        }
      },
    }

    const result = await fetchCustomerById(db, 'customer-id')
    assert.deepEqual(bindArgs, ['customer-id'])
    assert.deepEqual(result, { id: '123' })
  })
})
