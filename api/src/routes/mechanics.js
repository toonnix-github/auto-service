import { Hono } from 'hono'

export const createMechanicRoutes = () => {
  const mechanics = new Hono()

  mechanics.get('/', async (c) => {
    const { q = '' } = c.req.query()
    const where = []
    const params = []

    if (q) {
      where.push('name LIKE ?')
      params.push(`%${q}%`)
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
    const sql = `
      SELECT id, name
      FROM mechanics
      ${whereSql}
      ORDER BY name ASC
    `

    const { results } = await c.env.auto_service_db.prepare(sql).bind(...params).all()
    return c.json({ rows: results })
  })

  mechanics.get('/:id', async (c) => {
    const id = c.req.param('id')
    const sql = 'SELECT id, name FROM mechanics WHERE id = ?'
    const mechanic = await c.env.auto_service_db.prepare(sql).bind(id).first()
    if (!mechanic) return c.notFound()
    return c.json({ mechanic })
  })

  return mechanics
}
