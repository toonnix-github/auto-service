import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  currencyFormatter,
  quantityFormatter,
  normalizeNumber,
  deriveLineTotal,
  normalizeOrderItems,
} from './orderDetailUtils.js'

describe('order detail utils', () => {
  it('formats currency values with two decimals', () => {
    assert.equal(currencyFormatter(600), '600.00')
    assert.equal(currencyFormatter('1250.5'), '1,250.50')
    assert.equal(currencyFormatter(null), '—')
  })

  it('formats quantity values appropriately', () => {
    assert.equal(quantityFormatter(2), '2')
    assert.equal(quantityFormatter('3.5'), '3.5')
    assert.equal(quantityFormatter(undefined), '—')
  })

  it('normalizes numeric inputs into finite numbers', () => {
    assert.equal(normalizeNumber('12'), 12)
    assert.equal(normalizeNumber(4.5), 4.5)
    assert.equal(normalizeNumber('not-a-number'), null)
    assert.equal(normalizeNumber(''), null)
  })

  it('derives line total when explicit value is missing', () => {
    assert.equal(deriveLineTotal(2, 150, null), 300)
    assert.equal(deriveLineTotal(1, 200, 250), 250)
    assert.equal(deriveLineTotal(null, 100, null), null)
  })

  it('normalizes order items to expose numeric prices', () => {
    const items = normalizeOrderItems([
      {
        id: 'item-1',
        qty: '2',
        unitPrice: '600',
        lineTotal: '',
      },
      {
        id: 'item-2',
        qty: 1,
        unit_price: 400,
        line_total: 400,
      },
    ])

    assert.equal(items[0].unit_price, 600)
    assert.equal(items[0].line_total, 1200)
    assert.equal(items[0].qty, 2)
    assert.equal(items[1].unit_price, 400)
    assert.equal(items[1].line_total, 400)
    assert.equal(items[0].no, 1)
    assert.equal(items[1].no, 2)
  })
})
