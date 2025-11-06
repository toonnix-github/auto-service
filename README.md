# Auto Service (Cloudflare JS — Tiny MVP)

Minimal internal app to list orders and view order details.

## Stack
- UI: React + Vite (Cloudflare Pages)
- API: Cloudflare Workers (Hono)
- DB: Cloudflare D1 (SQLite)

## Quick Start (Local)

1. Install Wrangler
   ```bash
   npm i -g wrangler
   ```
2. Apply database schema and seed data
   ```bash
   wrangler d1 execute auto_service_db --local --file=db/schema.sql
   wrangler d1 execute auto_service_db --local --file=db/seed.sql
   ```
3. Run the API worker locally
   ```bash
   cd api
   npm install
   npm run dev
   ```
4. Run the frontend locally (separate terminal)
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Troubleshooting

### Error: `table orders has no column named odometer`

Older databases created before the `odometer` column was added to the schema will trigger this error when seeding or inserting orders. Run the migration once to rebuild the `orders` table with the new column:

```bash
wrangler d1 execute auto_service_db --local --file=db/migrations/002_add_orders_odometer.sql
```

If you need to update a remote D1 database instead of the local preview, remove the `--local` flag.
