import { Hono } from 'hono'

const ensurePartsTable = async (db) => {
  const sql = "SELECT name FROM sqlite_master WHERE type='table' AND name='parts'"
  const table = await db.prepare(sql).first()
  if (!table) {
    throw new Error('parts table is missing in the database')
  }
}

const fetchPartById = async (db, id) => {
  const sql = `
    SELECT p.id, p.sku, p.name, p.type, p.default_price, p.description, p.brand, p.model, p.taxable, p.active, p.created_at
    FROM parts p
    WHERE p.id = ?
  `
  return db.prepare(sql).bind(id).first()
}

const toBooleanInt = (value, fallback) => {
  if (value === undefined) return fallback
  return value ? 1 : 0
}

const parseActiveParam = (value) => {
  if (value === undefined) return undefined
  if (value === 'true' || value === '1') return 1
  if (value === 'false' || value === '0') return 0
  return undefined
}

export const createPartRoutes = () => {
  const parts = new Hono()

  parts.get('/db-status', async (c) => {
    try {
      await ensurePartsTable(c.env.auto_service_db)
      return c.json({ ready: true })
    } catch (error) {
      return c.json({ ready: false, message: error.message }, 500)
    }
  })

  parts.get('/', async (c) => {
    await ensurePartsTable(c.env.auto_service_db)

    const { q = '', type, active } = c.req.query()

    const where = []
    const params = []

    if (type) {
      where.push('p.type = ?')
      params.push(type)
    }

    const activeFilter = parseActiveParam(active)
    if (activeFilter !== undefined) {
      where.push('p.active = ?')
      params.push(activeFilter)
    }

    if (q) {
      const searchClauses = [
        'p.sku LIKE ?',
        'p.name LIKE ?',
        'p.type LIKE ?',
        'p.brand LIKE ?',
        'p.model LIKE ?',
        'p.description LIKE ?'
      ]
      where.push(`(${searchClauses.join(' OR ')})`)
      params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`)
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

    const sql = `
      SELECT p.id, p.sku, p.name, p.type, p.default_price, p.description, p.brand, p.model, p.taxable, p.active, p.created_at
      FROM parts p
      ${whereSql}
      ORDER BY p.created_at DESC, p.name ASC
    `

    const { results } = await c.env.auto_service_db.prepare(sql).bind(...params).all()
    return c.json({ rows: results })
  })

  parts.get('/:id', async (c) => {
    await ensurePartsTable(c.env.auto_service_db)

    const id = c.req.param('id')
    const item = await fetchPartById(c.env.auto_service_db, id)
    if (!item) return c.notFound()

    return c.json({ part: item })
  })

  parts.post('/', async (c) => {
    await ensurePartsTable(c.env.auto_service_db)

    let payload
    try {
      payload = await c.req.json()
    } catch (error) {
      return c.json({ message: 'Invalid JSON payload' }, 400)
    }

    const {
      sku,
      name,
      type,
      defaultPrice,
      description,
      brand,
      model,
      taxable = true,
      active = true,
    } = payload || {}

    if (!name || !type || defaultPrice === undefined) {
      return c.json({ message: 'name, type, and defaultPrice are required' }, 400)
    }

    const numericPrice = Number(defaultPrice)
    if (Number.isNaN(numericPrice)) {
      return c.json({ message: 'defaultPrice must be a number' }, 400)
    }

    const id = payload?.id || crypto.randomUUID()

    try {
      const stmt = `
        INSERT INTO parts (
          id,
          sku,
          name,
          type,
          default_price,
          description,
          brand,
          model,
          taxable,
          active
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      await c.env.auto_service_db
        .prepare(stmt)
        .bind(
          id,
          sku ?? null,
          name,
          type ?? null,
          numericPrice,
          description ?? null,
          brand ?? null,
          model ?? null,
          toBooleanInt(taxable, 1),
          toBooleanInt(active, 1)
        )
        .run()
    } catch (error) {
      return c.json({ message: 'Failed to create part', details: error.message }, 400)
    }

    const item = await fetchPartById(c.env.auto_service_db, id)
    return c.json({ part: item }, 201)
  })

  parts.put('/:id', async (c) => {
    await ensurePartsTable(c.env.auto_service_db)

    const id = c.req.param('id')
    const existing = await fetchPartById(c.env.auto_service_db, id)
    if (!existing) return c.notFound()

    let payload
    try {
      payload = await c.req.json()
    } catch (error) {
      return c.json({ message: 'Invalid JSON payload' }, 400)
    }

    if (payload?.defaultPrice !== undefined && Number.isNaN(Number(payload.defaultPrice))) {
      return c.json({ message: 'defaultPrice must be a number' }, 400)
    }

    const fields = {
      sku: payload?.sku,
      name: payload?.name,
      type: payload?.type,
      default_price: payload?.defaultPrice !== undefined ? Number(payload.defaultPrice) : undefined,
      description: payload?.description,
      brand: payload?.brand,
      model: payload?.model,
      taxable: payload?.taxable !== undefined ? toBooleanInt(payload.taxable) : undefined,
      active: payload?.active !== undefined ? toBooleanInt(payload.active) : undefined,
    }

    const setClauses = []
    const params = []

    for (const [column, value] of Object.entries(fields)) {
      if (value !== undefined) {
        setClauses.push(`${column} = ?`)
        params.push(value)
      }
    }

    if (setClauses.length) {
      try {
        await c.env.auto_service_db
          .prepare(`UPDATE parts SET ${setClauses.join(', ')} WHERE id = ?`)
          .bind(...params, id)
          .run()
      } catch (error) {
        return c.json({ message: 'Failed to update part', details: error.message }, 400)
      }
    }

    const item = await fetchPartById(c.env.auto_service_db, id)
    return c.json({ part: item })
  })

  parts.delete('/:id', async (c) => {
    await ensurePartsTable(c.env.auto_service_db)

    const id = c.req.param('id')

    try {
      const result = await c.env.auto_service_db.prepare('DELETE FROM parts WHERE id = ?').bind(id).run()
      const changes = typeof result.meta?.changes === 'number' ? result.meta.changes : result.success ? 1 : 0
      if (!changes) return c.notFound()
    } catch (error) {
      return c.json({ message: 'Failed to delete part', details: error.message }, 400)
    }

    return c.body(null, 204)
  })

  return parts
}
