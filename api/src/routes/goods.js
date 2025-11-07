import { Hono } from 'hono'

const ensureGoodsTable = async (db) => {
  const sql = "SELECT name FROM sqlite_master WHERE type='table' AND name='goods'"
  const table = await db.prepare(sql).first()
  if (!table) {
    throw new Error('goods table is missing in the database')
  }
}

const fetchGoodsById = async (db, id) => {
  const sql = `
    SELECT g.id, g.sku, g.name, g.type, g.default_price, g.description, g.brand, g.taxable, g.active, g.created_at
    FROM goods g
    WHERE g.id = ?
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

const GOODS_TYPES = new Set(['oil', 'tire', 'other'])

export const createGoodsRoutes = () => {
  const goods = new Hono()

  goods.get('/db-status', async (c) => {
    try {
      await ensureGoodsTable(c.env.auto_service_db)
      return c.json({ ready: true })
    } catch (error) {
      return c.json({ ready: false, message: error.message }, 500)
    }
  })

  goods.get('/', async (c) => {
    await ensureGoodsTable(c.env.auto_service_db)

    const { q = '', type, active } = c.req.query()

    const where = []
    const params = []

    if (type && GOODS_TYPES.has(type)) {
      where.push('g.type = ?')
      params.push(type)
    }

    const activeFilter = parseActiveParam(active)
    if (activeFilter !== undefined) {
      where.push('g.active = ?')
      params.push(activeFilter)
    }

    if (q) {
      where.push('(g.sku LIKE ? OR g.name LIKE ? OR g.type LIKE ? OR g.brand LIKE ? OR g.description LIKE ?)')
      params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`)
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

    const sql = `
      SELECT g.id, g.sku, g.name, g.type, g.default_price, g.description, g.brand, g.taxable, g.active, g.created_at
      FROM goods g
      ${whereSql}
      ORDER BY g.created_at DESC, g.name ASC
    `

    const { results } = await c.env.auto_service_db.prepare(sql).bind(...params).all()
    return c.json({ rows: results })
  })

  goods.get('/:id', async (c) => {
    await ensureGoodsTable(c.env.auto_service_db)

    const id = c.req.param('id')
    const item = await fetchGoodsById(c.env.auto_service_db, id)
    if (!item) return c.notFound()

    return c.json({ goods: item })
  })

  goods.post('/', async (c) => {
    await ensureGoodsTable(c.env.auto_service_db)

    let payload
    try {
      payload = await c.req.json()
    } catch (error) {
      return c.json({ message: 'Invalid JSON payload' }, 400)
    }

    const { sku, name, type, defaultPrice, description, brand, taxable = true, active = true } = payload || {}

    if (!name || !type || defaultPrice === undefined) {
      return c.json({ message: 'name, type, and defaultPrice are required' }, 400)
    }

    if (!GOODS_TYPES.has(type)) {
      return c.json({ message: `type must be one of: ${Array.from(GOODS_TYPES).join(', ')}` }, 400)
    }

    const numericPrice = Number(defaultPrice)
    if (Number.isNaN(numericPrice)) {
      return c.json({ message: 'defaultPrice must be a number' }, 400)
    }

    const id = payload?.id || crypto.randomUUID()

    try {
      const stmt = `
        INSERT INTO goods (id, sku, name, type, default_price, description, brand, taxable, active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      await c.env.auto_service_db
        .prepare(stmt)
        .bind(
          id,
          sku ?? null,
          name,
          type,
          numericPrice,
          description ?? null,
          brand ?? null,
          toBooleanInt(taxable, 1),
          toBooleanInt(active, 1)
        )
        .run()
    } catch (error) {
      return c.json({ message: 'Failed to create goods item', details: error.message }, 400)
    }

    const item = await fetchGoodsById(c.env.auto_service_db, id)
    return c.json({ goods: item }, 201)
  })

  goods.put('/:id', async (c) => {
    await ensureGoodsTable(c.env.auto_service_db)

    const id = c.req.param('id')
    const existing = await fetchGoodsById(c.env.auto_service_db, id)
    if (!existing) return c.notFound()

    let payload
    try {
      payload = await c.req.json()
    } catch (error) {
      return c.json({ message: 'Invalid JSON payload' }, 400)
    }

    if (payload?.type && !GOODS_TYPES.has(payload.type)) {
      return c.json({ message: `type must be one of: ${Array.from(GOODS_TYPES).join(', ')}` }, 400)
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
          .prepare(`UPDATE goods SET ${setClauses.join(', ')} WHERE id = ?`)
          .bind(...params, id)
          .run()
      } catch (error) {
        return c.json({ message: 'Failed to update goods item', details: error.message }, 400)
      }
    }

    const item = await fetchGoodsById(c.env.auto_service_db, id)
    return c.json({ goods: item })
  })

  goods.delete('/:id', async (c) => {
    await ensureGoodsTable(c.env.auto_service_db)

    const id = c.req.param('id')

    try {
      const result = await c.env.auto_service_db.prepare('DELETE FROM goods WHERE id = ?').bind(id).run()
      const changes = typeof result.meta?.changes === 'number' ? result.meta.changes : result.success ? 1 : 0
      if (!changes) return c.notFound()
    } catch (error) {
      return c.json({ message: 'Failed to delete goods item', details: error.message }, 400)
    }

    return c.body(null, 204)
  })

  return goods
}
