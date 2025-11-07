CREATE TABLE IF NOT EXISTS mechanics (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_mechanics (
  order_id TEXT NOT NULL REFERENCES orders (id),
  mechanic_id TEXT NOT NULL REFERENCES mechanics (id),
  position INTEGER NOT NULL,
  PRIMARY KEY (order_id, mechanic_id),
  UNIQUE (order_id, position)
);
