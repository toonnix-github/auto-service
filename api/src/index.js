import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createVehicleRoutes } from './routes/vehicles'

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

  const orderSql = `
    SELECT o.*, c.name AS customer_name, c.phone, v.brand, v.model, v.license_plate, v.odometer
    FROM orders o
    JOIN customers c ON c.id = o.customer_id
    JOIN vehicles v ON v.id = o.vehicle_id
    WHERE o.id = ?
  `
  const order = await c.env.auto_service_db.prepare(orderSql).bind(id).first()
  if (!order) return c.notFound()

  const itemsSql = `SELECT id, no, type, name_snapshot, unit_price, qty, line_total FROM order_items WHERE order_id = ? ORDER BY no ASC`
  const items = (await c.env.auto_service_db.prepare(itemsSql).bind(id).all()).results

  return c.json({ order, items })
})

app.route('/api/vehicles', createVehicleRoutes())

export default app
