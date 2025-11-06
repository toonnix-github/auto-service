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
    SELECT g.id, g.sku, g.name, g.type, g.default_price, g.taxable, g.active, g.created_at,
           p.manufacturer, p.part_number, p.compatible_models, p.spec
    FROM goods g
    LEFT JOIN parts p ON p.id = g.id
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

const GOODS_TYPES = new Set(['oil', 'tire', 'part', 'other'])

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
      where.push('(g.sku LIKE ? OR g.name LIKE ? OR g.type LIKE ? OR p.manufacturer LIKE ? OR p.part_number LIKE ?)')
      params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`)
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

    const sql = `
      SELECT g.id, g.sku, g.name, g.type, g.default_price, g.taxable, g.active, g.created_at,
             p.manufacturer, p.part_number, p.compatible_models, p.spec
      FROM goods g
      LEFT JOIN parts p ON p.id = g.id
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

    const { sku, name, type, defaultPrice, taxable = true, active = true, part } = payload || {}

    if (!name || !type || defaultPrice === undefined) {
      return c.json({ message: 'name, type, and defaultPrice are required' }, 400)
    }

    if (!GOODS_TYPES.has(type)) {
      return c.json({ message: `type must be one of: ${Array.from(GOODS_TYPES).join(', ')}` }, 400)
    }

    if (part && type !== 'part') {
      return c.json({ message: 'Part details can only be provided when type is "part"' }, 400)
    }

    const numericPrice = Number(defaultPrice)
    if (Number.isNaN(numericPrice)) {
      return c.json({ message: 'defaultPrice must be a number' }, 400)
    }

    const id = payload?.id || crypto.randomUUID()

    try {
      const stmt = `
        INSERT INTO goods (id, sku, name, type, default_price, taxable, active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `
      await c.env.auto_service_db
        .prepare(stmt)
        .bind(id, sku ?? null, name, type, numericPrice, toBooleanInt(taxable, 1), toBooleanInt(active, 1))
        .run()
    } catch (error) {
      return c.json({ message: 'Failed to create goods item', details: error.message }, 400)
    }

    if (type === 'part') {
      const manufacturer = part?.manufacturer ?? null
      const partNumber = part?.partNumber ?? null
      const compatibleModels = part?.compatibleModels ?? null
      const spec = part?.spec ?? null
      try {
        await c.env.auto_service_db
          .prepare(
            `INSERT INTO parts (id, manufacturer, part_number, compatible_models, spec)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET manufacturer=excluded.manufacturer, part_number=excluded.part_number,
             compatible_models=excluded.compatible_models, spec=excluded.spec`
          )
          .bind(id, manufacturer, partNumber, compatibleModels, spec)
          .run()
      } catch (error) {
        return c.json({ message: 'Failed to save part details', details: error.message }, 400)
      }
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

    const nextType = payload?.type ?? existing.type

    if (payload?.part && nextType !== 'part') {
      return c.json({ message: 'Part details can only be provided when type is "part"' }, 400)
    }

    const fields = {
      sku: payload?.sku,
      name: payload?.name,
      type: payload?.type,
      default_price: payload?.defaultPrice !== undefined ? Number(payload.defaultPrice) : undefined,
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

    const typeChangedAwayFromPart = existing.type === 'part' && nextType !== 'part'

    if (nextType === 'part' && payload?.part !== null) {
      const manufacturer =
        payload?.part === undefined ? existing.manufacturer ?? null : payload.part?.manufacturer ?? null
      const partNumber =
        payload?.part === undefined ? existing.part_number ?? null : payload.part?.partNumber ?? null
      const compatibleModels =
        payload?.part === undefined ? existing.compatible_models ?? null : payload.part?.compatibleModels ?? null
      const spec = payload?.part === undefined ? existing.spec ?? null : payload.part?.spec ?? null

      try {
        await c.env.auto_service_db
          .prepare(
            `INSERT INTO parts (id, manufacturer, part_number, compatible_models, spec)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET manufacturer=excluded.manufacturer, part_number=excluded.part_number,
             compatible_models=excluded.compatible_models, spec=excluded.spec`
          )
          .bind(id, manufacturer, partNumber, compatibleModels, spec)
          .run()
      } catch (error) {
        return c.json({ message: 'Failed to update part details', details: error.message }, 400)
      }
    } else if (payload?.part === null || typeChangedAwayFromPart) {
      try {
        await c.env.auto_service_db.prepare('DELETE FROM parts WHERE id = ?').bind(id).run()
      } catch (error) {
        return c.json({ message: 'Failed to remove part details', details: error.message }, 400)
      }
    }

    const item = await fetchGoodsById(c.env.auto_service_db, id)
    return c.json({ goods: item })
  })

  goods.delete('/:id', async (c) => {
    await ensureGoodsTable(c.env.auto_service_db)

    const id = c.req.param('id')

    try {
      await c.env.auto_service_db.prepare('DELETE FROM parts WHERE id = ?').bind(id).run()
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
