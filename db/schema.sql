-- customers
CREATE TABLE
  IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

-- vehicles
CREATE TABLE
  IF NOT EXISTS vehicles (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers (id),
    brand TEXT,
    model TEXT,
    license_plate TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

-- goods (physical catalog: oil, tire, part, other)
CREATE TABLE
  IF NOT EXISTS goods (
    id TEXT PRIMARY KEY,
    sku TEXT UNIQUE,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- oil|tire|part|other
    default_price REAL NOT NULL,
    description TEXT,
    brand TEXT,
    model TEXT,
    taxable INTEGER NOT NULL DEFAULT 1,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

CREATE INDEX IF NOT EXISTS idx_goods_sku ON goods (sku);

-- parts (vehicle parts catalog)
CREATE TABLE
  IF NOT EXISTS parts (
    id TEXT PRIMARY KEY,
    sku TEXT UNIQUE,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- e.g., engine, body, electrical
    default_price REAL NOT NULL,
    description TEXT,
    brand TEXT,
    model TEXT,
    taxable INTEGER NOT NULL DEFAULT 1,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

CREATE INDEX IF NOT EXISTS idx_parts_sku ON parts (sku);

-- services (labor/service catalog)
CREATE TABLE
  IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE, -- e.g., SRV-CHANGE-OIL
    name TEXT NOT NULL, -- e.g., Change Engine Oil
    type TEXT NOT NULL, -- e.g., maintenance, tire, inspection
    default_price REAL NOT NULL, -- labor price or package price
    description TEXT,
    brand TEXT,
    model TEXT,
    taxable INTEGER NOT NULL DEFAULT 1,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

-- mechanics (service technicians)
CREATE TABLE
  IF NOT EXISTS mechanics (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

-- orders
CREATE TABLE
  IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    order_no TEXT UNIQUE NOT NULL,
    date TEXT NOT NULL,
    customer_id TEXT NOT NULL REFERENCES customers (id),
    vehicle_id TEXT NOT NULL REFERENCES vehicles (id),
    odometer INTEGER,
    status TEXT NOT NULL DEFAULT 'open', -- open|draft|in_progress|ready|closed|cancelled
    vat_rate REAL NOT NULL DEFAULT 0.07,
    subtotal REAL NOT NULL DEFAULT 0,
    vat REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT
  );

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);

CREATE INDEX IF NOT EXISTS idx_orders_date ON orders (date);

-- order mechanics assignments (link orders to up to 5 mechanics)
CREATE TABLE
  IF NOT EXISTS order_mechanics (
    order_id TEXT NOT NULL REFERENCES orders (id),
    mechanic_id TEXT NOT NULL REFERENCES mechanics (id),
    position INTEGER NOT NULL,
    PRIMARY KEY (order_id, mechanic_id),
    UNIQUE (order_id, position)
  );

-- order_items (line items) — link to EITHER goods OR services
CREATE TABLE
  IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders (id),
    no INTEGER NOT NULL,
    goods_id TEXT REFERENCES goods (id),
    service_id TEXT REFERENCES services (id),
    part_id TEXT REFERENCES parts (id),
    type TEXT NOT NULL, -- 'goods', 'service', or 'part'
    qty REAL NOT NULL,
    CHECK (
      (
        goods_id IS NOT NULL
        OR service_id IS NOT NULL
        OR part_id IS NOT NULL
      )
    )
  );

-- payments (kept for later; not used by MVP UI)
CREATE TABLE
  IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders (id),
    method TEXT NOT NULL, -- cash|card|transfer|credit
    amount REAL NOT NULL,
    reference TEXT,
    paid_at TEXT DEFAULT CURRENT_TIMESTAMP,
    cashier TEXT
  );

-- catalog_items view provides unified access to goods, parts, and services
CREATE VIEW
  IF NOT EXISTS catalog_items AS
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
FROM
  goods g
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
FROM
  parts p
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
FROM
  services s;