import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createCustomerRoutes } from './routes/customers.js'
import { createVehicleRoutes } from './routes/vehicles.js'
import { createGoodsRoutes } from './routes/goods.js'
import { createPartRoutes } from './routes/parts.js'
import { createServiceRoutes } from './routes/services.js'
import { createCatalogRoutes } from './routes/catalog.js'
import { createMechanicRoutes } from './routes/mechanics.js'

const ORDER_STATUS_SET = new Set(['draft', 'open', 'in_progress', 'ready', 'closed', 'cancelled'])
const ITEM_TYPES = new Set(['goods', 'service', 'part'])

const roundCurrency = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100

const generateOrderNumber = async (db, date) => {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const prefix = `SO-${year}${month}`
  const latest = await db
    .prepare('SELECT order_no FROM orders WHERE order_no LIKE ? ORDER BY order_no DESC LIMIT 1')
    .bind(`${prefix}-%`)
    .first()

  let sequence = 1
  if (latest?.order_no) {
    const match = latest.order_no.match(/(\d+)$/)
    if (match) {
      sequence = Number(match[1]) + 1
    }
  }

  return `${prefix}-${String(sequence).padStart(4, '0')}`
}

const fetchOrderDetail = async (db, id) => {
  const orderSql = `
    SELECT o.*, c.name AS customer_name, c.phone, v.brand, v.model, v.license_plate
    FROM orders o
    JOIN customers c ON c.id = o.customer_id
    JOIN vehicles v ON v.id = o.vehicle_id
    WHERE o.id = ?
  `
  const order = await db.prepare(orderSql).bind(id).first()
  if (!order) return null

  const itemsSql = `
    SELECT
      oi.id,
      oi.no,
      oi.type,
      COALESCE(g.name, s.name, p.name) AS name_snapshot,
      oi.unit_price,
      oi.qty,
      ROUND(oi.qty * oi.unit_price, 2) AS line_total
    FROM order_items oi
    LEFT JOIN goods g ON g.id = oi.goods_id
    LEFT JOIN services s ON s.id = oi.service_id
    LEFT JOIN parts p ON p.id = oi.part_id
    WHERE oi.order_id = ?
    ORDER BY oi.no ASC
  `
  const items = (await db.prepare(itemsSql).bind(id).all()).results

  const mechanicsSql = `
    SELECT m.id, m.name
    FROM order_mechanics om
    JOIN mechanics m ON m.id = om.mechanic_id
    WHERE om.order_id = ?
    ORDER BY om.position ASC, m.name ASC
  `
  const mechanics = (await db.prepare(mechanicsSql).bind(id).all()).results

  return { order, items, mechanics }
}

const app = new Hono()

app.use('*', cors({ origin: '*', allowHeaders: ['Content-Type'] }))

// Health
app.get('/api/health', (c) => c.json({ ok: true }))

// Info
app.get('/api/info', (c) =>
  c.json({
    name: 'Auto Service API',
    version: '1.0.1',
    environment: c.env.CORS_ORIGIN || 'local',
    timestamp: new Date().toISOString(),
  })
)

// List orders (simple; seeded data)
app.get('/api/orders', async (c) => {
  const { q = '' } = c.req.query()

  const where = []
  const params = []
  if (q) {
    where.push('(o.order_no LIKE ? OR c.name LIKE ? OR c.phone LIKE ? OR v.license_plate LIKE ?)')
    params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`)
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const sql = `
    SELECT o.id, o.order_no, o.date, o.status, o.subtotal, o.vat, o.total,
           c.name AS customer_name, c.phone,
           v.brand, v.model, v.license_plate,
           (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS items
    FROM orders o
    JOIN customers c ON c.id = o.customer_id
    JOIN vehicles v ON v.id = o.vehicle_id
    ${whereSql}
    ORDER BY o.date DESC, o.order_no DESC
  `
  const { results } = await c.env.auto_service_db.prepare(sql).bind(...params).all()
  return c.json({ rows: results })
})

// Order detail (with items)
app.get('/api/orders/:id', async (c) => {
  const id = c.req.param('id')
  const detail = await fetchOrderDetail(c.env.auto_service_db, id)
  if (!detail) return c.notFound()
  return c.json(detail)
})

app.post('/api/orders', async (c) => {
  let payload
  try {
    payload = await c.req.json()
  } catch (error) {
    return c.json({ message: 'Invalid JSON payload' }, 400)
  }

  const customerId = payload?.customerId
  const vehicleId = payload?.vehicleId
  const itemsInput = Array.isArray(payload?.items) ? payload.items : []

  if (!customerId || !vehicleId) {
    return c.json({ message: 'customerId and vehicleId are required' }, 400)
  }

  if (!itemsInput.length) {
    return c.json({ message: 'At least one item is required' }, 400)
  }

  const db = c.env.auto_service_db

  const customer = await db.prepare('SELECT id FROM customers WHERE id = ?').bind(customerId).first()
  if (!customer) {
    return c.json({ message: 'Customer not found' }, 400)
  }

  const vehicle = await db
    .prepare('SELECT id, customer_id FROM vehicles WHERE id = ?')
    .bind(vehicleId)
    .first()
  if (!vehicle) {
    return c.json({ message: 'Vehicle not found' }, 400)
  }
  if (vehicle.customer_id !== customerId) {
    return c.json({ message: 'Vehicle does not belong to the selected customer' }, 400)
  }

  let orderDate
  if (payload?.date) {
    const parsed = new Date(payload.date)
    if (Number.isNaN(parsed.getTime())) {
      return c.json({ message: 'date must be a valid date string (YYYY-MM-DD)' }, 400)
    }
    orderDate = parsed
  } else {
    orderDate = new Date()
  }

  const orderDateStr = orderDate.toISOString().slice(0, 10)

  const status = (payload?.status || 'open').toLowerCase()
  if (!ORDER_STATUS_SET.has(status)) {
    return c.json({ message: 'Invalid status' }, 400)
  }

  const vatRateInput = Number(payload?.vatRate ?? 0.07)
  const vatRate = Number.isFinite(vatRateInput) && vatRateInput >= 0 ? vatRateInput : 0.07

  let odometer = null
  if (payload?.odometer !== undefined && payload?.odometer !== null && payload?.odometer !== '') {
    const parsedOdometer = Number(payload.odometer)
    if (!Number.isFinite(parsedOdometer) || parsedOdometer < 0) {
      return c.json({ message: 'odometer must be a positive number' }, 400)
    }
    odometer = Math.round(parsedOdometer)
  }

  const mechanicsInput = Array.isArray(payload?.mechanics) ? payload.mechanics : []
  const mechanicIds = []
  const mechanicSeen = new Set()
  for (const raw of mechanicsInput) {
    if (!raw && raw !== 0) continue
    const id = String(raw).trim()
    if (!id || mechanicSeen.has(id)) continue
    mechanicSeen.add(id)
    mechanicIds.push(id)
  }

  if (mechanicIds.length > 5) {
    return c.json({ message: 'You can assign up to 5 mechanics per order' }, 400)
  }

  if (mechanicIds.length) {
    const placeholders = mechanicIds.map(() => '?').join(', ')
    const mechanicsSql = `SELECT id FROM mechanics WHERE id IN (${placeholders})`
    const existing = await db.prepare(mechanicsSql).bind(...mechanicIds).all()
    const foundIds = new Set((existing?.results ?? []).map((row) => row.id))
    for (const id of mechanicIds) {
      if (!foundIds.has(id)) {
        return c.json({ message: `Mechanic ${id} not found` }, 400)
      }
    }
  }

  const resolvedItems = []
  for (let index = 0; index < itemsInput.length; index += 1) {
    const item = itemsInput[index]
    const type = String(item?.type || '').toLowerCase()
    const sourceId = item?.sourceId
    const qtyNumber = Number(item?.qty)

    if (!ITEM_TYPES.has(type)) {
      return c.json({ message: `Item ${index + 1} has invalid type` }, 400)
    }
    if (!sourceId) {
      return c.json({ message: `Item ${index + 1} is missing sourceId` }, 400)
    }
    if (!Number.isFinite(qtyNumber) || qtyNumber <= 0) {
      return c.json({ message: `Item ${index + 1} quantity must be greater than zero` }, 400)
    }

    const unitPriceRaw = item?.unitPrice ?? item?.price
    const unitPriceNumber = Number(unitPriceRaw)

    if (!Number.isFinite(unitPriceNumber) || unitPriceNumber < 0) {
      return c.json({ message: `Item ${index + 1} price must be zero or a positive number` }, 400)
    }

    let record
    if (type === 'goods') {
      record = await db.prepare('SELECT id, taxable FROM goods WHERE id = ?').bind(sourceId).first()
    } else if (type === 'service') {
      record = await db.prepare('SELECT id, taxable FROM services WHERE id = ?').bind(sourceId).first()
    } else {
      record = await db.prepare('SELECT id, taxable FROM parts WHERE id = ?').bind(sourceId).first()
    }

    if (!record) {
      return c.json({ message: `Item ${index + 1} not found` }, 400)
    }

    const unitPrice = roundCurrency(unitPriceNumber)
    resolvedItems.push({
      type,
      sourceId: record.id,
      qty: qtyNumber,
      unitPrice,
      taxable: Boolean(record.taxable),
    })
  }

  const subtotal = roundCurrency(resolvedItems.reduce((sum, item) => sum + item.unitPrice * item.qty, 0))
  const taxableSubtotal = roundCurrency(
    resolvedItems.reduce((sum, item) => (item.taxable ? sum + item.unitPrice * item.qty : sum), 0)
  )
  const vat = roundCurrency(taxableSubtotal * vatRate)
  const total = roundCurrency(subtotal + vat)

  const orderId = crypto.randomUUID()
  const orderNo = await generateOrderNumber(db, orderDate)
  const nowIso = new Date().toISOString()

  const notes = typeof payload?.notes === 'string' ? payload.notes.trim() || null : null

  const statements = [
    db
      .prepare(`
        INSERT INTO orders (
          id, order_no, date, customer_id, vehicle_id, odometer, status, vat_rate,
          subtotal, vat, total, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        orderId,
        orderNo,
        orderDateStr,
        customerId,
        vehicleId,
        odometer,
        status,
        vatRate,
        subtotal,
        vat,
        total,
        notes,
        nowIso,
        nowIso,
      ),
  ]

  for (let index = 0; index < resolvedItems.length; index += 1) {
    const item = resolvedItems[index]
    statements.push(
      db
        .prepare(`
          INSERT INTO order_items (id, order_id, no, goods_id, service_id, part_id, type, qty, unit_price)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          crypto.randomUUID(),
          orderId,
          index + 1,
          item.type === 'goods' ? item.sourceId : null,
          item.type === 'service' ? item.sourceId : null,
          item.type === 'part' ? item.sourceId : null,
          item.type,
          item.qty,
          item.unitPrice,
        ),
    )
  }

  for (let index = 0; index < mechanicIds.length; index += 1) {
    statements.push(
      db
        .prepare(
          'INSERT INTO order_mechanics (order_id, mechanic_id, position) VALUES (?, ?, ?)',
        )
        .bind(orderId, mechanicIds[index], index + 1),
    )
  }

  try {
    await db.batch(statements)
  } catch (error) {
    return c.json({ message: 'Failed to create order', details: error.message }, 400)
  }

  const detail = await fetchOrderDetail(db, orderId)
  return c.json(detail, 201)
})

app.route('/api/customers', createCustomerRoutes())
app.route('/api/vehicles', createVehicleRoutes())
app.route('/api/goods', createGoodsRoutes())
app.route('/api/parts', createPartRoutes())
app.route('/api/services', createServiceRoutes())
app.route('/api/catalog', createCatalogRoutes())
app.route('/api/mechanics', createMechanicRoutes())

export default app

export { ORDER_STATUS_SET, ITEM_TYPES, roundCurrency, generateOrderNumber, fetchOrderDetail }
