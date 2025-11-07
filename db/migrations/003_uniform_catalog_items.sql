ALTER TABLE goods ADD COLUMN description TEXT;
ALTER TABLE goods ADD COLUMN brand TEXT;

ALTER TABLE parts ADD COLUMN description TEXT;
ALTER TABLE parts ADD COLUMN brand TEXT;

ALTER TABLE services ADD COLUMN description TEXT;
ALTER TABLE services ADD COLUMN brand TEXT;

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
  g.default_price AS price,
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
  p.default_price AS price,
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
  s.default_price AS price,
  s.taxable,
  s.active,
  s.created_at
FROM services s;

