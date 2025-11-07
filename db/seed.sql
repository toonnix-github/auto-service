DELETE FROM order_items;

DELETE FROM payments;

DELETE FROM orders;

DELETE FROM vehicles;

DELETE FROM customers;

DELETE FROM parts;

DELETE FROM goods;

DELETE FROM services;

-- customers
INSERT INTO
  customers (id, name, phone, email)
VALUES
  (
    'c1',
    'Somchai Jaidee',
    '0800000001',
    'somchai@example.com'
  ),
  (
    'c2',
    'Suda Dee',
    '0800000002',
    'suda@example.com'
  );

-- vehicles
INSERT INTO
  vehicles (id, customer_id, brand, model, license_plate)
VALUES
  ('v1', 'c1', 'Toyota', 'Vios 1.5', 'กข-1234'),
  ('v2', 'c2', 'Honda', 'City 1.5', 'ขค-5678');

-- GOODS (oil, tire, part, other)
INSERT INTO
  goods (
    id,
    sku,
    name,
    type,
    model,
    default_price,
    description,
    brand,
    taxable,
    active
  )
VALUES
  (
    'g0000001',
    'OIL-5W30',
    'Engine Oil 5W-30',
    'oil',
    'Universal',
    850,
    'Synthetic engine oil 5W-30',
    'Mobil 1',
    1,
    1
  ),
  (
    'g0000002',
    'TIRE-185R14',
    'Tire 185R14',
    'tire',
    'Universal',
    3200,
    'Standard car tire 185R14',
    'Michelin',
    1,
    1
  ),
  (
    'g0000003',
    'PART-AIRFILTER',
    'Air Filter',
    'part',
    'Vios 1.5',
    450,
    'Air filter for 1.5L Toyota engine',
    'Toyota',
    1,
    1
  ),
  (
    'g0000004',
    'MISC-COOLANT',
    'Coolant Bottle',
    'other',
    'Universal',
    250,
    'Universal coolant 1L',
    'Castrol',
    1,
    1
  );

-- PARTS (engine, body, electrical)
INSERT INTO
  parts (
    id,
    sku,
    name,
    type,
    model,
    default_price,
    description,
    brand,
    taxable,
    active
  )
VALUES
  (
    'p0000001',
    'PART-SPKPLUG',
    'Spark Plug',
    'engine',
    'Yaris 1.2',
    180,
    'Standard spark plug for 1.2L engine',
    'NGK',
    1,
    1
  ),
  (
    'p0000002',
    'PART-WIPER',
    'Wiper Blade',
    'body',
    'Vios',
    250,
    'Front wiper blade 22 inch',
    'Bosch',
    1,
    1
  ),
  (
    'p0000003',
    'PART-BATTERY',
    'Car Battery 45Ah',
    'electrical',
    'Universal',
    2200,
    '12V 45Ah car battery',
    'Panasonic',
    1,
    1
  );

-- SERVICES (labor/service catalog)
INSERT INTO
  services (
    id,
    code,
    name,
    type,
    model,
    default_price,
    description,
    brand,
    taxable,
    active
  )
VALUES
  (
    's0000001',
    'SRV-CHANGE-OIL',
    'Change Engine Oil',
    'maintenance',
    'Universal',
    500,
    'Replace engine oil and filter',
    NULL,
    1,
    1
  ),
  (
    's0000002',
    'SRV-TIRE-ROTATE',
    'Tire Rotation',
    'tire',
    'Universal',
    350,
    'Rotate and balance all tires',
    NULL,
    1,
    1
  ),
  (
    's0000003',
    'SRV-INSPECT',
    'General Inspection',
    'inspection',
    'Universal',
    600,
    '20-point safety and performance check',
    NULL,
    1,
    1
  );

-- orders
INSERT INTO
  orders (
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
    tech_note
  )
VALUES
  (
    'o1',
    'SO-202511-0001',
    '2025-11-06',
    'c1',
    'v1',
    102345,
    'open',
    0.07,
    1750,
    122.5,
    1872.5,
    'น้ำมันเครื่อง+ไส้กรอง+บริการ',
    'ตรวจรอยรั่ว'
  );

-- order_items (mix goods + services)
INSERT INTO
  order_items (
    id,
    order_id,
    no,
    goods_id,
    service_id,
    type,
    name_snapshot,
    unit_price,
    qty,
    line_total
  )
VALUES
  (
    'i1',
    'o1',
    1,
    'g_oil_1',
    NULL,
    'goods',
    'Engine Oil 5W-30',
    800,
    1,
    800
  ),
  (
    'i2',
    'o1',
    2,
    NULL,
    's_srv_1',
    'service',
    'Change Engine Oil',
    500,
    1,
    500
  );