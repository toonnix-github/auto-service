import { Hono } from 'hono'

const ensurePartsTable = async (db) => {
  const tableSql = "SELECT name FROM sqlite_master WHERE type='table' AND name='parts'"
  const table = await db.prepare(tableSql).first()
  if (!table) {
    throw new Error('parts table is missing in the database')
  }

  const { results } = await db.prepare('PRAGMA table_info(parts)').all()
  const columnNames = new Set(results?.map((row) => row.name) ?? [])
  const requiredColumns = ['id', 'sku', 'name', 'default_price', 'taxable', 'active', 'created_at']
  for (const column of requiredColumns) {
    if (!columnNames.has(column)) {
      throw new Error(`parts table is missing required column: ${column}`)
    }
  }
}

const normalizeBooleanInput = (value, defaultValue) => {
  if (value === undefined || value === null) return defaultValue
  if (typeof value === 'number') return value ? 1 : 0
  const normalized = String(value).trim().toLowerCase()
  if (['1', 'true', 'yes', 'y'].includes(normalized)) return 1
  if (['0', 'false', 'no', 'n'].includes(normalized)) return 0
  return defaultValue
}

const fetchPartById = async (db, id) => {
  const sql = `
    SELECT
      id,
      sku,
      name,
      default_price AS defaultPrice,
      taxable,
      active,
      created_at AS createdAt,
      manufacturer,
      part_number AS partNumber,
      compatible_models AS compatibleModels,
      spec
    FROM parts
    WHERE id = ?
  `
  return db.prepare(sql).bind(id).first()
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

    const { q = '', active } = c.req.query()

    const where = []
    const params = []

    if (active !== undefined) {
      where.push('active = ?')
      params.push(normalizeBooleanInput(active, 1))
    }

    if (q) {
      where.push(
        '('
          + ['sku LIKE ?', 'name LIKE ?', 'manufacturer LIKE ?', 'part_number LIKE ?', 'compatible_models LIKE ?', 'spec LIKE ?'].join(
            ' OR ',
          )
          + ')',
      )
      const like = `%${q}%`
      params.push(like, like, like, like, like, like)
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
    const sql = `
      SELECT
        id,
        sku,
        name,
        default_price AS defaultPrice,
        taxable,
        active,
        created_at AS createdAt,
        manufacturer,
        part_number AS partNumber,
        compatible_models AS compatibleModels,
        spec
      FROM parts
      ${whereSql}
      ORDER BY name ASC
    `

    const { results } = await c.env.auto_service_db.prepare(sql).bind(...params).all()

    return c.json({ rows: results })
  })

  parts.get('/:id', async (c) => {
    await ensurePartsTable(c.env.auto_service_db)

    const id = c.req.param('id')
    const part = await fetchPartById(c.env.auto_service_db, id)
    if (!part) return c.notFound()

    return c.json({ part })
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
      id: providedId,
      sku,
      name,
      defaultPrice,
      taxable,
      active,
      manufacturer,
      partNumber,
      compatibleModels,
      spec,
    } = payload || {}

    if (!name) {
      return c.json({ message: 'name is required' }, 400)
    }

    if (defaultPrice === undefined || defaultPrice === null) {
      return c.json({ message: 'defaultPrice is required' }, 400)
    }

    const price = Number(defaultPrice)
    if (!Number.isFinite(price)) {
      return c.json({ message: 'defaultPrice must be a number' }, 400)
    }

    const id = providedId || crypto.randomUUID()
    const taxableValue = normalizeBooleanInput(taxable, 1)
    const activeValue = normalizeBooleanInput(active, 1)

    try {
      const insertSql = `
        INSERT INTO parts (
          id,
          sku,
          name,
          default_price,
          taxable,
          active,
          manufacturer,
          part_number,
          compatible_models,
          spec
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      await c.env.auto_service_db
        .prepare(insertSql)
        .bind(
          id,
          sku ?? null,
          name,
          price,
          taxableValue,
          activeValue,
          manufacturer ?? null,
          partNumber ?? null,
          compatibleModels ?? null,
          spec ?? null,
        )
        .run()
    } catch (error) {
      return c.json({ message: 'Failed to create part', details: error.message }, 400)
    }

    const part = await fetchPartById(c.env.auto_service_db, id)
    return c.json({ part }, 201)
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

    const setClauses = []
    const params = []

    if (payload?.sku !== undefined) {
      setClauses.push('sku = ?')
      params.push(payload.sku ?? null)
    }

    if (payload?.name !== undefined) {
      if (!payload.name) {
        return c.json({ message: 'name cannot be empty' }, 400)
      }
      setClauses.push('name = ?')
      params.push(payload.name)
    }

    if (payload?.defaultPrice !== undefined) {
      const price = Number(payload.defaultPrice)
      if (!Number.isFinite(price)) {
        return c.json({ message: 'defaultPrice must be a number' }, 400)
      }
      setClauses.push('default_price = ?')
      params.push(price)
    }

    if (payload?.taxable !== undefined) {
      setClauses.push('taxable = ?')
      params.push(normalizeBooleanInput(payload.taxable, existing.taxable ?? 1))
    }

    if (payload?.active !== undefined) {
      setClauses.push('active = ?')
      params.push(normalizeBooleanInput(payload.active, existing.active ?? 1))
    }

    if (payload?.manufacturer !== undefined) {
      setClauses.push('manufacturer = ?')
      params.push(payload.manufacturer ?? null)
    }

    if (payload?.partNumber !== undefined) {
      setClauses.push('part_number = ?')
      params.push(payload.partNumber ?? null)
    }

    if (payload?.compatibleModels !== undefined) {
      setClauses.push('compatible_models = ?')
      params.push(payload.compatibleModels ?? null)
    }

    if (payload?.spec !== undefined) {
      setClauses.push('spec = ?')
      params.push(payload.spec ?? null)
    }

    if (!setClauses.length) {
      return c.json({ message: 'No fields provided for update' }, 400)
    }

    try {
      await c.env.auto_service_db
        .prepare(`UPDATE parts SET ${setClauses.join(', ')} WHERE id = ?`)
        .bind(...params, id)
        .run()
    } catch (error) {
      return c.json({ message: 'Failed to update part', details: error.message }, 400)
    }

    const part = await fetchPartById(c.env.auto_service_db, id)
    return c.json({ part })
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
