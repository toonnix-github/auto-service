import { Hono } from 'hono'

const ensureCustomersTable = async (db) => {
  const sql = "SELECT name FROM sqlite_master WHERE type='table' AND name='customers'"
  const table = await db.prepare(sql).first()
  if (!table) {
    throw new Error('customers table is missing in the database')
  }
}

const fetchCustomerById = async (db, id) => {
  const sql = `
    SELECT id, name, phone, email, created_at
    FROM customers
    WHERE id = ?
  `
  return db.prepare(sql).bind(id).first()
}

export const createCustomerRoutes = () => {
  const customers = new Hono()

  customers.get('/db-status', async (c) => {
    try {
      await ensureCustomersTable(c.env.auto_service_db)
      return c.json({ ready: true })
    } catch (error) {
      return c.json({ ready: false, message: error.message }, 500)
    }
  })

  customers.get('/', async (c) => {
    await ensureCustomersTable(c.env.auto_service_db)

    const { q = '' } = c.req.query()

    const where = []
    const params = []

    if (q) {
      where.push('(name LIKE ? OR phone LIKE ? OR email LIKE ?)')
      params.push(`%${q}%`, `%${q}%`, `%${q}%`)
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

    const sql = `
      SELECT id, name, phone, email, created_at
      FROM customers
      ${whereSql}
      ORDER BY created_at DESC, name ASC
    `

    const { results } = await c.env.auto_service_db.prepare(sql).bind(...params).all()

    return c.json({ rows: results })
  })

  customers.get('/:id', async (c) => {
    await ensureCustomersTable(c.env.auto_service_db)

    const id = c.req.param('id')
    const customer = await fetchCustomerById(c.env.auto_service_db, id)
    if (!customer) return c.notFound()

    return c.json({ customer })
  })

  customers.post('/', async (c) => {
    await ensureCustomersTable(c.env.auto_service_db)

    let payload
    try {
      payload = await c.req.json()
    } catch (error) {
      return c.json({ message: 'Invalid JSON payload' }, 400)
    }

    const { name, phone, email = null } = payload || {}

    if (!name || !phone) {
      return c.json({ message: 'name and phone are required' }, 400)
    }

    const id = payload?.id || crypto.randomUUID()

    try {
      const stmt = `
        INSERT INTO customers (id, name, phone, email)
        VALUES (?, ?, ?, ?)
      `
      await c.env.auto_service_db.prepare(stmt).bind(id, name, phone, email ?? null).run()
    } catch (error) {
      return c.json({ message: 'Failed to create customer', details: error.message }, 400)
    }

    const customer = await fetchCustomerById(c.env.auto_service_db, id)
    return c.json({ customer }, 201)
  })

  customers.put('/:id', async (c) => {
    await ensureCustomersTable(c.env.auto_service_db)

    const id = c.req.param('id')
    const existing = await fetchCustomerById(c.env.auto_service_db, id)
    if (!existing) return c.notFound()

    let payload
    try {
      payload = await c.req.json()
    } catch (error) {
      return c.json({ message: 'Invalid JSON payload' }, 400)
    }

    const fields = {
      name: payload?.name,
      phone: payload?.phone,
      email: payload?.email,
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
        .prepare(`UPDATE customers SET ${setClauses.join(', ')} WHERE id = ?`)
        .bind(...params, id)
        .run()
    } catch (error) {
      return c.json({ message: 'Failed to update customer', details: error.message }, 400)
    }

    const customer = await fetchCustomerById(c.env.auto_service_db, id)
    return c.json({ customer })
  })

  customers.delete('/:id', async (c) => {
    await ensureCustomersTable(c.env.auto_service_db)

    const id = c.req.param('id')

    try {
      const result = await c.env.auto_service_db.prepare('DELETE FROM customers WHERE id = ?').bind(id).run()
      const changes = typeof result.meta?.changes === 'number' ? result.meta.changes : result.success ? 1 : 0
      if (!changes) return c.notFound()
    } catch (error) {
      return c.json({ message: 'Failed to delete customer', details: error.message }, 400)
    }

    return c.body(null, 204)
  })

  return customers
}
