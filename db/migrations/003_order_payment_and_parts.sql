-- Add payment columns to orders
ALTER TABLE orders ADD COLUMN payment_method TEXT;
ALTER TABLE orders ADD COLUMN is_credit INTEGER NOT NULL DEFAULT 0;

-- Rebuild order_items table to support parts reference
BEGIN TRANSACTION;
CREATE TABLE order_items_new (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  no INTEGER NOT NULL,
  goods_id TEXT REFERENCES goods(id),
  service_id TEXT REFERENCES services(id),
  part_id TEXT REFERENCES parts(id),
  type TEXT NOT NULL,
  name_snapshot TEXT NOT NULL,
  unit_price REAL NOT NULL,
  qty REAL NOT NULL,
  line_total REAL NOT NULL,
  CHECK (
    (goods_id IS NOT NULL AND service_id IS NULL AND part_id IS NULL)
    OR
    (goods_id IS NULL AND service_id IS NOT NULL AND part_id IS NULL)
    OR
    (goods_id IS NULL AND service_id IS NULL AND part_id IS NOT NULL)
  )
);
INSERT INTO order_items_new (id, order_id, no, goods_id, service_id, part_id, type, name_snapshot, unit_price, qty, line_total)
SELECT id, order_id, no, goods_id, service_id, NULL, type, name_snapshot, unit_price, qty, line_total FROM order_items;
DROP TABLE order_items;
ALTER TABLE order_items_new RENAME TO order_items;
COMMIT;
