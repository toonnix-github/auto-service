import { Hono } from 'hono'

const ensurePartsTables = async (db) => {
  const goodsSql = "SELECT name FROM sqlite_master WHERE type='table' AND name='goods'"
  const goodsTable = await db.prepare(goodsSql).first()
  if (!goodsTable) {
    throw new Error('goods table is missing in the database')
  }

  const partsSql = "SELECT name FROM sqlite_master WHERE type='table' AND name='parts'"
  const partsTable = await db.prepare(partsSql).first()
  if (!partsTable) {
    throw new Error('parts table is missing in the database')
  }
}

const fetchPartById = async (db, id) => {
  const sql = `
    SELECT
      g.id,
      g.sku,
      g.name,
      g.default_price AS defaultPrice,
      g.taxable,
      g.active,
      g.created_at AS createdAt,
      p.manufacturer,
      p.part_number AS partNumber,
      p.compatible_models AS compatibleModels,
      p.spec
    FROM goods g
    LEFT JOIN parts p ON p.id = g.id
    WHERE g.id = ? AND g.type = 'part'
  `
  return db.prepare(sql).bind(id).first()
}

export const createPartRoutes = () => {
  const parts = new Hono()

  parts.get('/db-status', async (c) => {
    try {
      await ensurePartsTables(c.env.auto_service_db)
      return c.json({ ready: true })
    } catch (error) {
      return c.json({ ready: false, message: error.message }, 500)
    }
  })

  parts.get('/', async (c) => {
    await ensurePartsTables(c.env.auto_service_db)

    const { q = '', active } = c.req.query()

    const where = ["g.type = 'part'"]
    const params = []

    if (active !== undefined) {
      const normalized = typeof active === 'string' ? active.toLowerCase() : active
      const activeValue =
        normalized === '0' || normalized === 'false' || normalized === 'no'
          ? 0
          : normalized === '1' || normalized === 'true' || normalized === 'yes'
            ? 1
            : Number(normalized) ? 1 : 0
      where.push('g.active = ?')
      params.push(activeValue)
    }

    if (q) {
      where.push('(' + ['g.sku LIKE ?', 'g.name LIKE ?', 'p.manufacturer LIKE ?', 'p.part_number LIKE ?'].join(' OR ') + ')')
      const like = `%${q}%`
      params.push(like, like, like, like)
    }

    const sql = `
      SELECT
        g.id,
        g.sku,
        g.name,
        g.default_price AS defaultPrice,
        g.taxable,
        g.active,
        g.created_at AS createdAt,
        p.manufacturer,
        p.part_number AS partNumber,
        p.compatible_models AS compatibleModels,
        p.spec
      FROM goods g
      LEFT JOIN parts p ON p.id = g.id
      WHERE ${where.join(' AND ')}
      ORDER BY g.name ASC
    `

    const { results } = await c.env.auto_service_db.prepare(sql).bind(...params).all()

    return c.json({ rows: results })
  })

  parts.get('/:id', async (c) => {
    await ensurePartsTables(c.env.auto_service_db)

    const id = c.req.param('id')
    const part = await fetchPartById(c.env.auto_service_db, id)
    if (!part) return c.notFound()

    return c.json({ part })
  })

  parts.post('/', async (c) => {
    await ensurePartsTables(c.env.auto_service_db)

    let payload
    try {
      payload = await c.req.json()
    } catch (error) {
      return c.json({ message: 'Invalid JSON payload' }, 400)
    }

    const {
      id: providedId,
      sku,
      name,
      defaultPrice,
      taxable = 1,
      active = 1,
      manufacturer,
      partNumber,
      compatibleModels,
      spec,
    } = payload || {}

    if (!name || defaultPrice === undefined || defaultPrice === null) {
      return c.json({ message: 'name and defaultPrice are required' }, 400)
    }

    const id = providedId || crypto.randomUUID()

    try {
      const insertGoods = `
        INSERT INTO goods (id, sku, name, type, default_price, taxable, active)
        VALUES (?, ?, ?, 'part', ?, ?, ?)
      `
      await c.env.auto_service_db
        .prepare(insertGoods)
        .bind(id, sku ?? null, name, defaultPrice, taxable ? 1 : 0, active ? 1 : 0)
        .run()

      const insertPart = `
        INSERT INTO parts (id, manufacturer, part_number, compatible_models, spec)
        VALUES (?, ?, ?, ?, ?)
      `
      await c.env.auto_service_db
        .prepare(insertPart)
        .bind(id, manufacturer ?? null, partNumber ?? null, compatibleModels ?? null, spec ?? null)
        .run()
    } catch (error) {
      if (error?.message) {
        try {
          await c.env.auto_service_db.prepare('DELETE FROM goods WHERE id = ?').bind(id).run()
        } catch (cleanupError) {
          console.error('Failed to rollback goods insert for part', cleanupError)
        }
      }
      return c.json({ message: 'Failed to create part', details: error.message }, 400)
    }

    const part = await fetchPartById(c.env.auto_service_db, id)
    return c.json({ part }, 201)
  })

  parts.put('/:id', async (c) => {
    await ensurePartsTables(c.env.auto_service_db)

    const id = c.req.param('id')
    const existing = await fetchPartById(c.env.auto_service_db, id)
    if (!existing) return c.notFound()

    let payload
    try {
      payload = await c.req.json()
    } catch (error) {
      return c.json({ message: 'Invalid JSON payload' }, 400)
    }

    const goodsFields = {
      sku: payload?.sku,
      name: payload?.name,
      default_price: payload?.defaultPrice,
      taxable: payload?.taxable,
      active: payload?.active,
    }

    const goodsSet = []
    const goodsParams = []

    for (const [column, value] of Object.entries(goodsFields)) {
      if (value !== undefined) {
        if (column === 'taxable' || column === 'active') {
          goodsSet.push(`${column} = ?`)
          goodsParams.push(value ? 1 : 0)
        } else {
          goodsSet.push(`${column} = ?`)
          goodsParams.push(value)
        }
      }
    }

    const partFields = {
      manufacturer: payload?.manufacturer,
      part_number: payload?.partNumber,
      compatible_models: payload?.compatibleModels,
      spec: payload?.spec,
    }

    const partSet = []
    const partParams = []

    for (const [column, value] of Object.entries(partFields)) {
      if (value !== undefined) {
        partSet.push(`${column} = ?`)
        partParams.push(value ?? null)
      }
    }

    if (!goodsSet.length && !partSet.length) {
      return c.json({ message: 'No fields provided for update' }, 400)
    }

    try {
      if (goodsSet.length) {
        await c.env.auto_service_db
          .prepare(`UPDATE goods SET ${goodsSet.join(', ')} WHERE id = ? AND type = 'part'`)
          .bind(...goodsParams, id)
          .run()
      }

      if (partSet.length) {
        await c.env.auto_service_db
          .prepare(`UPDATE parts SET ${partSet.join(', ')} WHERE id = ?`)
          .bind(...partParams, id)
          .run()
      }
    } catch (error) {
      return c.json({ message: 'Failed to update part', details: error.message }, 400)
    }

    const part = await fetchPartById(c.env.auto_service_db, id)
    return c.json({ part })
  })

  parts.delete('/:id', async (c) => {
    await ensurePartsTables(c.env.auto_service_db)

    const id = c.req.param('id')

    try {
      await c.env.auto_service_db.prepare('DELETE FROM parts WHERE id = ?').bind(id).run()
      const result = await c.env.auto_service_db
        .prepare("DELETE FROM goods WHERE id = ? AND type = 'part'")
        .bind(id)
        .run()

      const changes = typeof result.meta?.changes === 'number' ? result.meta.changes : result.success ? 1 : 0
      if (!changes) return c.notFound()
    } catch (error) {
      return c.json({ message: 'Failed to delete part', details: error.message }, 400)
    }

    return c.body(null, 204)
  })

  return parts
}
