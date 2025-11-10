PRAGMA foreign_keys=OFF;

BEGIN TRANSACTION;

-- Add unit_price column to order_items and backfill from existing default prices
ALTER TABLE order_items ADD COLUMN unit_price REAL NOT NULL DEFAULT 0;

UPDATE order_items
SET unit_price = COALESCE(
  (SELECT default_price FROM goods WHERE goods.id = order_items.goods_id),
  (SELECT default_price FROM services WHERE services.id = order_items.service_id),
  (SELECT default_price FROM parts WHERE parts.id = order_items.part_id),
  unit_price
);

-- Remove catalog view before restructuring catalog tables
DROP VIEW IF EXISTS catalog_items;

-- Rebuild goods table without default_price column
CREATE TABLE goods_new (
  id TEXT PRIMARY KEY,
  sku TEXT UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  brand TEXT,
  model TEXT,
  taxable INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO goods_new (id, sku, name, type, description, brand, model, taxable, active, created_at)
SELECT id, sku, name, type, description, brand, model, taxable, active, created_at
FROM goods;

DROP TABLE goods;
ALTER TABLE goods_new RENAME TO goods;
CREATE INDEX IF NOT EXISTS idx_goods_sku ON goods (sku);

-- Rebuild parts table without default_price column
CREATE TABLE parts_new (
  id TEXT PRIMARY KEY,
  sku TEXT UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  brand TEXT,
  model TEXT,
  taxable INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO parts_new (id, sku, name, type, description, brand, model, taxable, active, created_at)
SELECT id, sku, name, type, description, brand, model, taxable, active, created_at
FROM parts;

DROP TABLE parts;
ALTER TABLE parts_new RENAME TO parts;
CREATE INDEX IF NOT EXISTS idx_parts_sku ON parts (sku);

-- Rebuild services table without default_price column
CREATE TABLE services_new (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  brand TEXT,
  model TEXT,
  taxable INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO services_new (id, code, name, type, description, brand, model, taxable, active, created_at)
SELECT id, code, name, type, description, brand, model, taxable, active, created_at
FROM services;

DROP TABLE services;
ALTER TABLE services_new RENAME TO services;

-- Recreate catalog view without price column
CREATE VIEW catalog_items AS
SELECT
  g.id AS item_id,
  'goods' AS item_type,
  g.id AS source_id,
  g.sku AS source_code,
  g.name,
  g.description,
  g.brand,
  g.type AS category,
  g.taxable,
  g.active,
  g.created_at
FROM goods g
UNION ALL
SELECT
  p.id AS item_id,
  'part' AS item_type,
  p.id AS source_id,
  p.sku AS source_code,
  p.name,
  p.description,
  p.brand,
  p.type AS category,
  p.taxable,
  p.active,
  p.created_at
FROM parts p
UNION ALL
SELECT
  s.id AS item_id,
  'service' AS item_type,
  s.id AS source_id,
  s.code AS source_code,
  s.name,
  s.description,
  s.brand,
  s.type AS category,
  s.taxable,
  s.active,
  s.created_at
FROM services s;

COMMIT;

PRAGMA foreign_keys=ON;
