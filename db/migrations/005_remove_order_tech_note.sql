-- Migration: remove technician note column from orders
-- This migration drops the legacy tech_note column and keeps only the primary notes field.

PRAGMA foreign_keys = OFF;
PRAGMA defer_foreign_keys = ON;

ALTER TABLE orders RENAME TO orders_old;

CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  order_no TEXT UNIQUE NOT NULL,
  date TEXT NOT NULL,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
  odometer INTEGER,
  status TEXT NOT NULL DEFAULT 'open',
  vat_rate REAL NOT NULL DEFAULT 0.07,
  subtotal REAL NOT NULL DEFAULT 0,
  vat REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT
);

INSERT INTO orders (
  id,
  order_no,
  date,
  customer_id,
  vehicle_id,
  odometer,
  status,
  vat_rate,
  subtotal,
  vat,
  total,
  notes,
  created_at,
  updated_at
)
SELECT
  id,
  order_no,
  date,
  customer_id,
  vehicle_id,
  odometer,
  status,
  vat_rate,
  subtotal,
  vat,
  total,
  notes,
  created_at,
  updated_at
FROM orders_old;

DROP TABLE orders_old;

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(date);

PRAGMA foreign_keys = ON;
