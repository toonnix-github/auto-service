const currencyFormatter = (value) => {
  if (value === null || value === undefined || value === '') return '—'
  const num = Number(value)
  if (!Number.isFinite(num)) return '—'
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const quantityFormatter = (value) => {
  if (value === null || value === undefined || value === '') return '—'
  const num = Number(value)
  if (!Number.isFinite(num)) return '—'
  return num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

const normalizeNumber = (value) => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const deriveLineTotal = (qty, unitPrice, fallback) => {
  if (fallback !== null && fallback !== undefined && fallback !== '') {
    const parsed = Number(fallback)
    if (Number.isFinite(parsed)) {
      return Math.round((parsed + Number.EPSILON) * 100) / 100
    }
  }
  if (!Number.isFinite(qty) || !Number.isFinite(unitPrice)) return null
  return Math.round((qty * unitPrice + Number.EPSILON) * 100) / 100
}

const normalizeOrderItems = (items = []) =>
  items.map((item, index) => {
    const qty = normalizeNumber(item.qty)
    const unitPrice = normalizeNumber(item.unit_price ?? item.unitPrice)
    const lineTotal = deriveLineTotal(
      qty,
      unitPrice,
      normalizeNumber(item.line_total ?? item.lineTotal),
    )

    return {
      ...item,
      no: item.no ?? index + 1,
      qty,
      unit_price: unitPrice,
      line_total: lineTotal,
    }
  })

export {
  currencyFormatter,
  quantityFormatter,
  normalizeNumber,
  deriveLineTotal,
  normalizeOrderItems,
}
