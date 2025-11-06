import { Hono } from 'hono'

const ensureServicesTable = async (db) => {
  const sql = "SELECT name FROM sqlite_master WHERE type='table' AND name='services'"
  const table = await db.prepare(sql).first()
  if (!table) {
    throw new Error('services table is missing in the database')
  }
}

const fetchServiceById = async (db, id) => {
  const sql = `
    SELECT id, code, name, category, default_price, taxable, duration_minutes, active, created_at
    FROM services
    WHERE id = ?
  `
  return db.prepare(sql).bind(id).first()
}

const parseBooleanInput = (value) => {
  if (value === undefined) return { provided: false, invalid: false }
  if (typeof value === 'boolean') return { provided: true, value }
  if (typeof value === 'number') return { provided: true, value: value !== 0 }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (!normalized) return { provided: false, invalid: false }
    if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return { provided: true, value: true }
    if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return { provided: true, value: false }
  }
  return { provided: true, invalid: true }
}

const toNullableNumber = (value, { allowNull = true } = {}) => {
  if (value === undefined) return { provided: false }
  if (value === null) {
    return allowNull ? { provided: true, value: null } : { provided: true, invalid: true }
  }
  if (typeof value === 'string' && value.trim() === '') {
    return { provided: true, invalid: true }
  }
  const num = Number(value)
  if (Number.isNaN(num)) {
    return { provided: true, invalid: true }
  }
  return { provided: true, value: num }
}

export const createServiceRoutes = () => {
  const services = new Hono()

  services.get('/db-status', async (c) => {
    try {
      await ensureServicesTable(c.env.auto_service_db)
      return c.json({ ready: true })
    } catch (error) {
      return c.json({ ready: false, message: error.message }, 500)
    }
  })

  services.get('/', async (c) => {
    await ensureServicesTable(c.env.auto_service_db)

    const { q = '', category, active } = c.req.query()

    const where = []
    const params = []

    if (category) {
      where.push('category = ?')
      params.push(category)
    }

    const activeParsed = parseBooleanInput(active)
    if (activeParsed.invalid) {
      return c.json({ message: 'active filter must be boolean-like' }, 400)
    }
    if (activeParsed.provided) {
      where.push('active = ?')
      params.push(activeParsed.value ? 1 : 0)
    }

    if (q) {
      where.push('(code LIKE ? OR name LIKE ? OR category LIKE ?)')
      params.push(`%${q}%`, `%${q}%`, `%${q}%`)
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

    const sql = `
      SELECT id, code, name, category, default_price, taxable, duration_minutes, active, created_at
      FROM services
      ${whereSql}
      ORDER BY created_at DESC, name ASC
    `

    const { results } = await c.env.auto_service_db.prepare(sql).bind(...params).all()

    return c.json({ rows: results })
  })

  services.get('/:id', async (c) => {
    await ensureServicesTable(c.env.auto_service_db)

    const id = c.req.param('id')
    const service = await fetchServiceById(c.env.auto_service_db, id)
    if (!service) return c.notFound()

    return c.json({ service })
  })

  services.post('/', async (c) => {
    await ensureServicesTable(c.env.auto_service_db)

    let payload
    try {
      payload = await c.req.json()
    } catch (error) {
      return c.json({ message: 'Invalid JSON payload' }, 400)
    }

    const {
      id: providedId,
      code,
      name,
      category,
      defaultPrice,
      taxable = 1,
      durationMinutes,
      active = 1,
    } = payload || {}

    if (!name) {
      return c.json({ message: 'name is required' }, 400)
    }

    const defaultPriceParsed = toNullableNumber(defaultPrice, { allowNull: false })
    if (!defaultPriceParsed.provided || defaultPriceParsed.invalid) {
      return c.json({ message: 'defaultPrice is required' }, 400)
    }

    const taxableParsed = parseBooleanInput(taxable)
    if (taxableParsed.invalid || !taxableParsed.provided) {
      return c.json({ message: 'taxable must be boolean-like' }, 400)
    }

    const activeParsed = parseBooleanInput(active)
    if (activeParsed.invalid || !activeParsed.provided) {
      return c.json({ message: 'active must be boolean-like' }, 400)
    }

    const durationParsed = toNullableNumber(durationMinutes)
    if (durationParsed.invalid) {
      return c.json({ message: 'durationMinutes must be a number' }, 400)
    }

    const id = providedId || crypto.randomUUID()

    try {
      const stmt = `
        INSERT INTO services (id, code, name, category, default_price, taxable, duration_minutes, active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
      await c.env.auto_service_db
        .prepare(stmt)
        .bind(
          id,
          code ?? null,
          name,
          category ?? null,
          defaultPriceParsed.value,
          taxableParsed.value ? 1 : 0,
          durationParsed.provided ? durationParsed.value : null,
          activeParsed.value ? 1 : 0,
        )
        .run()
    } catch (error) {
      return c.json({ message: 'Failed to create service', details: error.message }, 400)
    }

    const service = await fetchServiceById(c.env.auto_service_db, id)
    return c.json({ service }, 201)
  })

  services.put('/:id', async (c) => {
    await ensureServicesTable(c.env.auto_service_db)

    const id = c.req.param('id')
    const existing = await fetchServiceById(c.env.auto_service_db, id)
    if (!existing) return c.notFound()

    let payload
    try {
      payload = await c.req.json()
    } catch (error) {
      return c.json({ message: 'Invalid JSON payload' }, 400)
    }

    const fields = new Map()

    if (payload?.code !== undefined) fields.set('code', payload.code ?? null)
    if (payload?.name !== undefined) fields.set('name', payload.name ?? null)
    if (payload?.category !== undefined) fields.set('category', payload.category ?? null)

    if (payload?.defaultPrice !== undefined) {
      const parsed = toNullableNumber(payload.defaultPrice, { allowNull: false })
      if (parsed.invalid || !parsed.provided) {
        return c.json({ message: 'defaultPrice must be a number' }, 400)
      }
      fields.set('default_price', parsed.value)
    }

    if (payload?.durationMinutes !== undefined) {
      const parsed = toNullableNumber(payload.durationMinutes)
      if (parsed.invalid) {
        return c.json({ message: 'durationMinutes must be a number' }, 400)
      }
      fields.set('duration_minutes', parsed.value)
    }

    if (payload?.taxable !== undefined) {
      const parsed = parseBooleanInput(payload.taxable)
      if (parsed.invalid || !parsed.provided) {
        return c.json({ message: 'taxable must be boolean-like' }, 400)
      }
      fields.set('taxable', parsed.value ? 1 : 0)
    }

    if (payload?.active !== undefined) {
      const parsed = parseBooleanInput(payload.active)
      if (parsed.invalid || !parsed.provided) {
        return c.json({ message: 'active must be boolean-like' }, 400)
      }
      fields.set('active', parsed.value ? 1 : 0)
    }

    if (!fields.size) {
      return c.json({ message: 'No fields provided for update' }, 400)
    }

    const setClauses = []
    const params = []
    for (const [column, value] of fields) {
      setClauses.push(`${column} = ?`)
      params.push(value)
    }

    try {
      await c.env.auto_service_db
        .prepare(`UPDATE services SET ${setClauses.join(', ')} WHERE id = ?`)
        .bind(...params, id)
        .run()
    } catch (error) {
      return c.json({ message: 'Failed to update service', details: error.message }, 400)
    }

    const service = await fetchServiceById(c.env.auto_service_db, id)
    return c.json({ service })
  })

  services.delete('/:id', async (c) => {
    await ensureServicesTable(c.env.auto_service_db)

    const id = c.req.param('id')

    try {
      const result = await c.env.auto_service_db.prepare('DELETE FROM services WHERE id = ?').bind(id).run()
      const changes = typeof result.meta?.changes === 'number' ? result.meta.changes : result.success ? 1 : 0
      if (!changes) return c.notFound()
    } catch (error) {
      return c.json({ message: 'Failed to delete service', details: error.message }, 400)
    }

    return c.body(null, 204)
  })

  return services
}
