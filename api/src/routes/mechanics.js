import { Hono } from 'hono'

export const ensureMechanicsTable = async (db) => {
  const sql = "SELECT name FROM sqlite_master WHERE type='table' AND name='mechanics'"
  const table = await db.prepare(sql).first()
  if (!table) {
    throw new Error('mechanics table is missing in the database')
  }
}

export const fetchMechanicById = async (db, id) => {
  const sql = `
    SELECT id, name, created_at
    FROM mechanics
    WHERE id = ?
  `
  return db.prepare(sql).bind(id).first()
}

export const createMechanicRoutes = () => {
  const mechanics = new Hono()

  mechanics.get('/', async (c) => {
    await ensureMechanicsTable(c.env.auto_service_db)

    const { q = '' } = c.req.query()
    const where = []
    const params = []

    if (q) {
      where.push('name LIKE ?')
      params.push(`%${q}%`)
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
    const sql = `
      SELECT id, name, created_at
      FROM mechanics
      ${whereSql}
      ORDER BY name ASC
    `

    const { results } = await c.env.auto_service_db.prepare(sql).bind(...params).all()
    return c.json({ rows: results })
  })

  mechanics.get('/:id', async (c) => {
    await ensureMechanicsTable(c.env.auto_service_db)

    const id = c.req.param('id')
    const mechanic = await fetchMechanicById(c.env.auto_service_db, id)
    if (!mechanic) return c.notFound()
    return c.json({ mechanic })
  })

  mechanics.post('/', async (c) => {
    await ensureMechanicsTable(c.env.auto_service_db)

    let payload
    try {
      payload = await c.req.json()
    } catch (error) {
      return c.json({ message: 'Invalid JSON payload' }, 400)
    }

    const nameInput = payload?.name
    const name = typeof nameInput === 'string' ? nameInput.trim() : ''
    if (!name) {
      return c.json({ message: 'name is required' }, 400)
    }

    const idInput = payload?.id
    const id = typeof idInput === 'string' && idInput.trim() ? idInput.trim() : crypto.randomUUID()

    try {
      const stmt = `INSERT INTO mechanics (id, name) VALUES (?, ?)`
      await c.env.auto_service_db.prepare(stmt).bind(id, name).run()
    } catch (error) {
      return c.json({ message: 'Failed to create mechanic', details: error.message }, 400)
    }

    const mechanic = await fetchMechanicById(c.env.auto_service_db, id)
    return c.json({ mechanic }, 201)
  })

  mechanics.put('/:id', async (c) => {
    await ensureMechanicsTable(c.env.auto_service_db)

    const id = c.req.param('id')
    const existing = await fetchMechanicById(c.env.auto_service_db, id)
    if (!existing) return c.notFound()

    let payload
    try {
      payload = await c.req.json()
    } catch (error) {
      return c.json({ message: 'Invalid JSON payload' }, 400)
    }

    if (!Object.prototype.hasOwnProperty.call(payload || {}, 'name')) {
      return c.json({ message: 'No fields provided for update' }, 400)
    }

    const nameInput = payload?.name
    const name = typeof nameInput === 'string' ? nameInput.trim() : ''
    if (!name) {
      return c.json({ message: 'name is required' }, 400)
    }

    try {
      await c.env.auto_service_db
        .prepare('UPDATE mechanics SET name = ? WHERE id = ?')
        .bind(name, id)
        .run()
    } catch (error) {
      return c.json({ message: 'Failed to update mechanic', details: error.message }, 400)
    }

    const mechanic = await fetchMechanicById(c.env.auto_service_db, id)
    return c.json({ mechanic })
  })

  mechanics.delete('/:id', async (c) => {
    await ensureMechanicsTable(c.env.auto_service_db)

    const id = c.req.param('id')

    try {
      await c.env.auto_service_db
        .prepare('DELETE FROM order_mechanics WHERE mechanic_id = ?')
        .bind(id)
        .run()
      const result = await c.env.auto_service_db
        .prepare('DELETE FROM mechanics WHERE id = ?')
        .bind(id)
        .run()

      const changes =
        typeof result.meta?.changes === 'number' ? result.meta.changes : result.success ? 1 : 0
      if (!changes) return c.notFound()
    } catch (error) {
      return c.json({ message: 'Failed to delete mechanic', details: error.message }, 400)
    }

    return c.body(null, 204)
  })

  return mechanics
}
