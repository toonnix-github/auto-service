-- Add unit price and line total columns to order items for persisted pricing
ALTER TABLE order_items ADD COLUMN unit_price REAL NOT NULL DEFAULT 0;
ALTER TABLE order_items ADD COLUMN line_total REAL NOT NULL DEFAULT 0;

-- Derive line totals for existing rows based on any captured unit prices
UPDATE order_items
SET line_total = ROUND(qty * unit_price, 2)
WHERE unit_price IS NOT NULL;
