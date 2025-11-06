import { Hono } from 'hono'

const ensureVehiclesTable = async (db) => {
  const sql = "SELECT name FROM sqlite_master WHERE type='table' AND name='vehicles'"
  const table = await db.prepare(sql).first()
  if (!table) {
    throw new Error('vehicles table is missing in the database')
  }
}

const fetchVehicleById = async (db, id) => {
  const sql = `
    SELECT v.id, v.customer_id, v.brand, v.model, v.license_plate, v.odometer, v.created_at,
           c.name AS customer_name, c.phone AS customer_phone
    FROM vehicles v
    JOIN customers c ON c.id = v.customer_id
    WHERE v.id = ?
  `
  return db.prepare(sql).bind(id).first()
}

export const createVehicleRoutes = () => {
  const vehicles = new Hono()

  vehicles.get('/db-status', async (c) => {
    try {
      await ensureVehiclesTable(c.env.auto_service_db)
      return c.json({ ready: true })
    } catch (error) {
      return c.json({ ready: false, message: error.message }, 500)
    }
  })

  vehicles.get('/', async (c) => {
    await ensureVehiclesTable(c.env.auto_service_db)

    const { q = '', customer_id: customerId } = c.req.query()

    const where = []
    const params = []

    if (customerId) {
      where.push('v.customer_id = ?')
      params.push(customerId)
    }

    if (q) {
      where.push('(v.license_plate LIKE ? OR v.brand LIKE ? OR v.model LIKE ? OR c.name LIKE ? OR c.phone LIKE ?)')
      params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`)
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

    const sql = `
      SELECT v.id, v.customer_id, v.brand, v.model, v.license_plate, v.odometer, v.created_at,
             c.name AS customer_name, c.phone AS customer_phone
      FROM vehicles v
      JOIN customers c ON c.id = v.customer_id
      ${whereSql}
      ORDER BY v.created_at DESC, v.license_plate ASC
    `

    const { results } = await c.env.auto_service_db.prepare(sql).bind(...params).all()

    return c.json({ rows: results })
  })

  vehicles.get('/:id', async (c) => {
    await ensureVehiclesTable(c.env.auto_service_db)

    const id = c.req.param('id')
    const vehicle = await fetchVehicleById(c.env.auto_service_db, id)
    if (!vehicle) return c.notFound()

    return c.json({ vehicle })
  })

  vehicles.post('/', async (c) => {
    await ensureVehiclesTable(c.env.auto_service_db)

    let payload
    try {
      payload = await c.req.json()
    } catch (error) {
      return c.json({ message: 'Invalid JSON payload' }, 400)
    }

    const { customerId, brand, model, licensePlate, odometer = 0 } = payload || {}

    if (!customerId || !licensePlate) {
      return c.json({ message: 'customerId and licensePlate are required' }, 400)
    }

    const id = payload?.id || crypto.randomUUID()

    try {
      const stmt = `
        INSERT INTO vehicles (id, customer_id, brand, model, license_plate, odometer)
        VALUES (?, ?, ?, ?, ?, ?)
      `
      await c.env.auto_service_db
        .prepare(stmt)
        .bind(id, customerId, brand ?? null, model ?? null, licensePlate, odometer ?? 0)
        .run()
    } catch (error) {
      return c.json({ message: 'Failed to create vehicle', details: error.message }, 400)
    }

    const vehicle = await fetchVehicleById(c.env.auto_service_db, id)
    return c.json({ vehicle }, 201)
  })

  vehicles.put('/:id', async (c) => {
    await ensureVehiclesTable(c.env.auto_service_db)

    const id = c.req.param('id')
    const existing = await fetchVehicleById(c.env.auto_service_db, id)
    if (!existing) return c.notFound()

    let payload
    try {
      payload = await c.req.json()
    } catch (error) {
      return c.json({ message: 'Invalid JSON payload' }, 400)
    }

    const fields = {
      customer_id: payload?.customerId,
      brand: payload?.brand,
      model: payload?.model,
      license_plate: payload?.licensePlate,
      odometer: payload?.odometer,
    }

    const setClauses = []
    const params = []

    for (const [column, value] of Object.entries(fields)) {
      if (value !== undefined) {
        setClauses.push(`${column} = ?`)
        params.push(value)
      }
    }

    if (!setClauses.length) {
      return c.json({ message: 'No fields provided for update' }, 400)
    }

    try {
      await c.env.auto_service_db
        .prepare(`UPDATE vehicles SET ${setClauses.join(', ')} WHERE id = ?`)
        .bind(...params, id)
        .run()
    } catch (error) {
      return c.json({ message: 'Failed to update vehicle', details: error.message }, 400)
    }

    const vehicle = await fetchVehicleById(c.env.auto_service_db, id)
    return c.json({ vehicle })
  })

  vehicles.delete('/:id', async (c) => {
    await ensureVehiclesTable(c.env.auto_service_db)

    const id = c.req.param('id')

    try {
      const result = await c.env.auto_service_db.prepare('DELETE FROM vehicles WHERE id = ?').bind(id).run()
      const changes = typeof result.meta?.changes === 'number' ? result.meta.changes : result.success ? 1 : 0
      if (!changes) return c.notFound()
    } catch (error) {
      return c.json({ message: 'Failed to delete vehicle', details: error.message }, 400)
    }

    return c.body(null, 204)
  })

  return vehicles
}
