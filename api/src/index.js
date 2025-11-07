import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createCustomerRoutes } from './routes/customers'
import { createVehicleRoutes } from './routes/vehicles'
import { createGoodsRoutes } from './routes/goods'
import { createPartRoutes } from './routes/parts'
import { createServiceRoutes } from './routes/services'

const ORDER_ITEM_TYPES = new Set(['goods', 'service', 'part'])

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
    SELECT id, no, type, goods_id, service_id, part_id, name_snapshot, unit_price, qty, line_total
    FROM order_items
    WHERE order_id = ?
    ORDER BY no ASC
  `
  const items = (await db.prepare(itemsSql).bind(id).all()).results

  return { order, items }
}

const generateOrderNo = (date) => {
  const base = (date || new Date().toISOString().slice(0, 10)).replace(/-/g, '')
  const random = Math.floor(Math.random() * 9000) + 1000
  return `SO-${base}-${random}`
}

const hasColumn = async (db, table, column) => {
  const sql = `SELECT 1 FROM pragma_table_info('${table}') WHERE name = ? LIMIT 1`
  const row = await db.prepare(sql).bind(column).first()
  return Boolean(row)
}

const ensureOrderSchema = async (db) => {
  if (!(await hasColumn(db, 'orders', 'payment_method'))) {
    await db.prepare('ALTER TABLE orders ADD COLUMN payment_method TEXT').run()
  }
  if (!(await hasColumn(db, 'orders', 'is_credit'))) {
    await db
      .prepare('ALTER TABLE orders ADD COLUMN is_credit INTEGER NOT NULL DEFAULT 0')
      .run()
  }

  if (!(await hasColumn(db, 'order_items', 'part_id'))) {
    await db.transaction(async (tx) => {
      await tx.prepare(`
        CREATE TABLE order_items_new (
          id TEXT PRIMARY KEY,
          order_id TEXT NOT NULL REFERENCES orders(id),
          no INTEGER NOT NULL,
          goods_id TEXT REFERENCES goods(id),
          service_id TEXT REFERENCES services(id),
          part_id TEXT REFERENCES parts(id),
          type TEXT NOT NULL,
          name_snapshot TEXT NOT NULL,
          unit_price REAL NOT NULL,
          qty REAL NOT NULL,
          line_total REAL NOT NULL,
          CHECK (
            (goods_id IS NOT NULL AND service_id IS NULL AND part_id IS NULL)
            OR
            (goods_id IS NULL AND service_id IS NOT NULL AND part_id IS NULL)
            OR
            (goods_id IS NULL AND service_id IS NULL AND part_id IS NOT NULL)
          )
        )
      `).run()

      await tx.prepare(`
        INSERT INTO order_items_new (
          id, order_id, no, goods_id, service_id, part_id, type,
          name_snapshot, unit_price, qty, line_total
        )
        SELECT
          id, order_id, no, goods_id, service_id, NULL, type,
          name_snapshot, unit_price, qty, line_total
        FROM order_items
      `).run()

      await tx.prepare('DROP TABLE order_items').run()
      await tx.prepare('ALTER TABLE order_items_new RENAME TO order_items').run()
    })
  }
}

let schemaReady
const ensureSchemaReady = async (db) => {
  if (!schemaReady) {
    schemaReady = ensureOrderSchema(db).catch((error) => {
      schemaReady = undefined
      throw error
    })
  }
  return schemaReady
}

const app = new Hono()

app.use('*', cors({ origin: '*', allowHeaders: ['Content-Type'] }))
app.use('*', async (c, next) => {
  await ensureSchemaReady(c.env.auto_service_db)
  await next()
})

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
           o.payment_method, o.is_credit,
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
  const data = await fetchOrderDetail(c.env.auto_service_db, id)
  if (!data) return c.notFound()

  return c.json(data)
})

app.post('/api/orders', async (c) => {
  let payload
  try {
    payload = await c.req.json()
  } catch (error) {
    return c.json({ message: 'Invalid JSON payload' }, 400)
  }

  const orderInput = payload?.order || {}
  const itemsInput = Array.isArray(payload?.items) ? payload.items : []

  if (!orderInput.customerId || !orderInput.vehicleId) {
    return c.json({ message: 'customerId and vehicleId are required' }, 400)
  }

  if (!itemsInput.length) {
    return c.json({ message: 'At least one item is required' }, 400)
  }

  const vatRateRaw = orderInput.vatRate !== undefined ? Number(orderInput.vatRate) : 0.07
  if (!Number.isFinite(vatRateRaw) || vatRateRaw < 0) {
    return c.json({ message: 'vatRate must be a positive number' }, 400)
  }

  const date = (orderInput.date || new Date().toISOString().slice(0, 10)).slice(0, 10)
  let orderNo = (orderInput.orderNo || generateOrderNo(date)).trim()
  if (!orderNo) {
    orderNo = generateOrderNo(date)
  }

  const cleanedItems = []
  let subtotal = 0

  for (const [index, item] of itemsInput.entries()) {
    const type = typeof item?.type === 'string' ? item.type.toLowerCase() : ''
    if (!ORDER_ITEM_TYPES.has(type)) {
      return c.json({ message: `Invalid item type at index ${index}` }, 400)
    }

    const sourceId = item?.sourceId
    if (!sourceId) {
      return c.json({ message: `Missing sourceId for item at index ${index}` }, 400)
    }

    const qty = Number(item?.qty ?? 0)
    const unitPrice = Number(item?.unitPrice ?? 0)
    if (!Number.isFinite(qty) || qty <= 0) {
      return c.json({ message: `Invalid qty for item at index ${index}` }, 400)
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      return c.json({ message: `Invalid unitPrice for item at index ${index}` }, 400)
    }

    const lineTotal = Number((qty * unitPrice).toFixed(2))
    subtotal += lineTotal

    cleanedItems.push({
      type,
      sourceId,
      qty,
      unitPrice,
      lineTotal,
      nameSnapshot: item?.nameSnapshot || item?.name || '',
    })
  }

  subtotal = Number(subtotal.toFixed(2))
  const vat = Number((subtotal * vatRateRaw).toFixed(2))
  const total = Number((subtotal + vat).toFixed(2))

  const orderId = crypto.randomUUID()
  const odometer = orderInput.odometer === null || orderInput.odometer === undefined || orderInput.odometer === ''
    ? null
    : Number(orderInput.odometer)
  if (odometer !== null && !Number.isFinite(odometer)) {
    return c.json({ message: 'odometer must be numeric' }, 400)
  }

  const notes = orderInput.notes ?? null
  const techNote = orderInput.techNote ?? null
  const paymentMethod = orderInput.paymentMethod ? String(orderInput.paymentMethod) : null
  const isCredit = orderInput.credit ? 1 : 0

  const db = c.env.auto_service_db

  const insertOrderWithItems = async () => {
    await db.transaction(async (tx) => {
      const orderStmt = `
        INSERT INTO orders (
          id, order_no, date, customer_id, vehicle_id, odometer, status, vat_rate,
          subtotal, vat, total, payment_method, is_credit, notes, tech_note, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `

      await tx.prepare(orderStmt).bind(
        orderId,
        orderNo,
        date,
        orderInput.customerId,
        orderInput.vehicleId,
        odometer,
        orderInput.status || 'open',
        vatRateRaw,
        subtotal,
        vat,
        total,
        paymentMethod,
        isCredit,
        notes,
        techNote,
      ).run()

      for (const [index, item] of cleanedItems.entries()) {
        const itemId = crypto.randomUUID()
        const goodsId = item.type === 'goods' ? item.sourceId : null
        const serviceId = item.type === 'service' ? item.sourceId : null
        const partId = item.type === 'part' ? item.sourceId : null

        const itemStmt = `
          INSERT INTO order_items (
            id, order_id, no, goods_id, service_id, part_id, type, name_snapshot, unit_price, qty, line_total
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `

        await tx.prepare(itemStmt).bind(
          itemId,
          orderId,
          index + 1,
          goodsId,
          serviceId,
          partId,
          item.type,
          item.nameSnapshot || '',
          item.unitPrice,
          item.qty,
          item.lineTotal,
        ).run()
      }
    })
  }

  let attempts = 0
  while (true) {
    try {
      await insertOrderWithItems()
      break
    } catch (error) {
      const message = error?.message || ''
      const isOrderNoConflict = message.includes('UNIQUE') && message.includes('orders.order_no')
      if (isOrderNoConflict && !orderInput.orderNo && attempts < 4) {
        attempts += 1
        orderNo = generateOrderNo(date)
        continue
      }
      return c.json({ message: 'Failed to create order', details: message }, 400)
    }
  }

  const data = await fetchOrderDetail(c.env.auto_service_db, orderId)
  return c.json(data, 201)
})

app.route('/api/customers', createCustomerRoutes())
app.route('/api/vehicles', createVehicleRoutes())
app.route('/api/goods', createGoodsRoutes())
app.route('/api/parts', createPartRoutes())
app.route('/api/services', createServiceRoutes())

export default app
