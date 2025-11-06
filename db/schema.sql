-- customers
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- vehicles
CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  brand TEXT,
  model TEXT,
  license_plate TEXT NOT NULL,
  odometer INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- goods (physical catalog: oil, tire, part, other)
CREATE TABLE IF NOT EXISTS goods (
  id TEXT PRIMARY KEY,
  sku TEXT UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,                -- oil|tire|part|other
  default_price REAL NOT NULL,
  taxable INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_goods_sku ON goods(sku);

-- parts (catalog specific to vehicle parts)
CREATE TABLE IF NOT EXISTS parts (
  id TEXT PRIMARY KEY,
  sku TEXT UNIQUE,
  name TEXT NOT NULL,
  default_price REAL NOT NULL,
  taxable INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  manufacturer TEXT,
  part_number TEXT,
  compatible_models TEXT,
  spec TEXT
);
CREATE INDEX IF NOT EXISTS idx_parts_sku ON parts(sku);

-- services (labor/service catalog)
CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE,                         -- e.g., SRV-CHANGE-OIL
  name TEXT NOT NULL,                       -- e.g., Change Engine Oil
  category TEXT,                            -- e.g., maintenance, tire, inspection
  default_price REAL NOT NULL,              -- labor price or package price
  taxable INTEGER NOT NULL DEFAULT 1,
  duration_minutes INTEGER,                 -- optional: estimated duration
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- orders
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_no TEXT UNIQUE NOT NULL,
  date TEXT NOT NULL,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
  status TEXT NOT NULL DEFAULT 'open',      -- open|draft|in_progress|ready|closed|cancelled
  vat_rate REAL NOT NULL DEFAULT 0.07,
  subtotal REAL NOT NULL DEFAULT 0,
  vat REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  notes TEXT,
  tech_note TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(date);

-- order_items (line items) — link to EITHER goods OR services
CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  no INTEGER NOT NULL,

  goods_id TEXT REFERENCES goods(id),
  service_id TEXT REFERENCES services(id),

  type TEXT NOT NULL,                       -- 'goods' or 'service'
  name_snapshot TEXT NOT NULL,
  unit_price REAL NOT NULL,
  qty REAL NOT NULL,
  line_total REAL NOT NULL,

  CHECK (
    (goods_id IS NOT NULL AND service_id IS NULL)
    OR
    (goods_id IS NULL AND service_id IS NOT NULL)
  )
);

-- payments (kept for later; not used by MVP UI)
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  method TEXT NOT NULL,                      -- cash|card|transfer|credit
  amount REAL NOT NULL,
  reference TEXT,
  paid_at TEXT DEFAULT CURRENT_TIMESTAMP,
  cashier TEXT
);
    