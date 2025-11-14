import { Hono } from 'hono'

const ensureCatalogView = async (db) => {
  const sql = "SELECT name FROM sqlite_master WHERE (type='table' OR type='view') AND name='catalog_items'"
  const view = await db.prepare(sql).first()
  if (!view) {
    throw new Error('catalog_items view is missing in the database')
  }
}

const parseBoolean = (value) => {
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

const ITEM_TYPES = new Set(['goods', 'part', 'service'])

const buildCatalogName = ({ name, category, brand, model }) => {
  const parts = [category, brand, model]
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter((value) => value)

  if (!parts.length) {
    return name
  }

  return parts.join(' ')
}

export const createCatalogRoutes = () => {
  const catalog = new Hono()

  catalog.get('/db-status', async (c) => {
    try {
      await ensureCatalogView(c.env.auto_service_db)
      return c.json({ ready: true })
    } catch (error) {
      return c.json({ ready: false, message: error.message }, 500)
    }
  })

  catalog.get('/items', async (c) => {
    await ensureCatalogView(c.env.auto_service_db)

    const { q = '', type, active } = c.req.query()

    const where = []
    const params = []

    if (type && ITEM_TYPES.has(type)) {
      where.push('item_type = ?')
      params.push(type)
    }

    const activeParsed = parseBoolean(active)
    if (activeParsed.invalid) {
      return c.json({ message: 'active filter must be boolean-like' }, 400)
    }
    if (activeParsed.provided) {
      where.push('active = ?')
      params.push(activeParsed.value ? 1 : 0)
    }

    if (q) {
      const searchClauses = [
        'name LIKE ?',
        'description LIKE ?',
        'brand LIKE ?',
        'model LIKE ?',
        'source_code LIKE ?',
      ]
      where.push(`(${searchClauses.join(' OR ')})`)
      params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`)
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

    const sql = `
      SELECT
        item_id,
        item_type,
        source_id,
        source_code,
        name,
        description,
        brand,
        model,
        category,
        taxable,
        active,
        created_at
      FROM catalog_items
      ${whereSql}
      ORDER BY name ASC
    `

    const { results } = await c.env.auto_service_db.prepare(sql).bind(...params).all()
    const rows = results
      .map((row) => ({
        ...row,
        name: buildCatalogName(row),
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
    return c.json({ rows })
  })

  catalog.get('/items/:id', async (c) => {
    await ensureCatalogView(c.env.auto_service_db)

    const id = c.req.param('id')
    const sql = `
      SELECT
        item_id,
        item_type,
        source_id,
        source_code,
        name,
        description,
        brand,
        model,
        category,
        taxable,
        active,
        created_at
      FROM catalog_items
      WHERE item_id = ?
    `
    const item = await c.env.auto_service_db.prepare(sql).bind(id).first()
    if (!item) return c.notFound()

    return c.json({ item: { ...item, name: buildCatalogName(item) } })
  })

  return catalog
}
