-- Remove pricing columns from catalog tables and refresh catalog view
PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;

-- Rebuild goods table without default_price
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

-- Rebuild parts table without default_price
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

-- Rebuild services table without default_price
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

-- Refresh catalog view without price column
DROP VIEW IF EXISTS catalog_items;
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
