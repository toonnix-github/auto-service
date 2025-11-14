import { Hono } from 'hono'
import { composeCatalogName } from '../utils/catalog.js'

const ensureServicesTable = async (db) => {
  const sql = "SELECT name FROM sqlite_master WHERE type='table' AND name='services'"
  const table = await db.prepare(sql).first()
  if (!table) {
    throw new Error('services table is missing in the database')
  }
}

const mapServiceRow = (row) =>
  row
    ? {
        ...row,
        name: composeCatalogName(row.type, row.brand, row.model),
      }
    : null

const fetchServiceById = async (db, id) => {
  const sql = `
    SELECT id, code, type, description, brand, model, taxable, active, created_at
    FROM services
    WHERE id = ?
  `
  const row = await db.prepare(sql).bind(id).first()
  return mapServiceRow(row)
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

    const { q = '', type, active } = c.req.query()

    const where = []
    const params = []

    if (type) {
      where.push('type = ?')
      params.push(type)
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
      const nameExpression = `TRIM(REPLACE(REPLACE(IFNULL(type, '') || ' ' || IFNULL(brand, '') || ' ' || IFNULL(model, ''), '  ', ' '), '  ', ' '))`
      where.push(`(${nameExpression} LIKE ? OR code LIKE ? OR type LIKE ? OR brand LIKE ? OR model LIKE ? OR description LIKE ?)`)
      params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`)
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

    const sql = `
      SELECT id, code, type, description, brand, model, taxable, active, created_at
      FROM services
      ${whereSql}
      ORDER BY type ASC, brand ASC, model ASC, created_at DESC
    `

    const { results } = await c.env.auto_service_db.prepare(sql).bind(...params).all()

    return c.json({ rows: results.map(mapServiceRow) })
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
      type,
      model,
      description,
      brand,
      taxable = 1,
      active = 1,
    } = payload || {}

    const taxableParsed = parseBooleanInput(taxable)
    if (taxableParsed.invalid || !taxableParsed.provided) {
      return c.json({ message: 'taxable must be boolean-like' }, 400)
    }

    const activeParsed = parseBooleanInput(active)
    if (activeParsed.invalid || !activeParsed.provided) {
      return c.json({ message: 'active must be boolean-like' }, 400)
    }

    const id = providedId || crypto.randomUUID()

    try {
      if (!type) {
        return c.json({ message: 'type is required' }, 400)
      }

      const stmt = `
        INSERT INTO services (id, code, type, description, brand, model, taxable, active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
      await c.env.auto_service_db
        .prepare(stmt)
        .bind(
          id,
          code ?? null,
          type ?? null,
          description ?? null,
          brand ?? null,
          model ?? null,
          taxableParsed.value ? 1 : 0,
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
    if (payload?.type !== undefined) fields.set('type', payload.type ?? null)

    if (payload?.description !== undefined) {
      fields.set('description', payload.description ?? null)
    }

    if (payload?.brand !== undefined) {
      fields.set('brand', payload.brand ?? null)
    }

    if (payload?.model !== undefined) {
      fields.set('model', payload.model ?? null)
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
