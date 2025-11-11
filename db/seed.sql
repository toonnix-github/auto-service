DELETE FROM order_items;

DELETE FROM order_mechanics;

DELETE FROM payments;

DELETE FROM orders;

DELETE FROM vehicles;

DELETE FROM customers;

DELETE FROM mechanics;

DELETE FROM parts;

DELETE FROM goods;

DELETE FROM services;

-- ลูกค้า
INSERT INTO
  customers (id, name, phone, email)
VALUES
  (
    'c1',
    'สมชาย ใจดี',
    '0800000001',
    'somchai@example.com'
  ),
  ('c2', 'สุดา ดี', '0800000002', 'suda@example.com');

-- รถยนต์
INSERT INTO
  vehicles (id, customer_id, brand, model, license_plate)
VALUES
  ('v1', 'c1', 'โตโยต้า', 'วีออส 1.5', 'กข-1234'),
  ('v2', 'c2', 'ฮอนด้า', 'ซิตี้ 1.5', 'ขค-5678');

-- สินค้า (น้ำมัน ยาง อะไหล่ อื่น ๆ)
INSERT INTO
  goods (
    id,
    sku,
    name,
    type,
    model,
    description,
    brand,
    taxable,
    active
  )
VALUES
  (
    'g0000001',
    'OIL-5W30',
    'น้ำมันเครื่อง 5W-30',
    'oil',
    'Universal',
    'น้ำมันเครื่องสังเคราะห์แท้ 5W-30',
    'โมบิลวัน',
    1,
    1
  ),
  (
    'g0000002',
    'TIRE-185R14',
    'ยางรถยนต์ 185R14',
    'tire',
    'Universal',
    'ยางมาตรฐานขนาด 185R14',
    'มิชลิน',
    1,
    1
  ),
  (
    'g0000003',
    'PART-AIRFILTER',
    'กรองอากาศ',
    'part',
    'วีออส 1.5',
    'กรองอากาศสำหรับเครื่องยนต์ 1.5 ลิตร โตโยต้า',
    'โตโยต้า',
    1,
    1
  ),
  (
    'g0000004',
    'MISC-COOLANT',
    'น้ำยาหล่อเย็น',
    'other',
    'Universal',
    'น้ำยาหล่อเย็นเอนกประสงค์ ขนาด 1 ลิตร',
    'คาสตรอล',
    1,
    1
  );

-- อะไหล่ (เครื่องยนต์ ตัวถัง ไฟฟ้า)
INSERT INTO
  parts (
    id,
    sku,
    name,
    type,
    model,
    description,
    brand,
    taxable,
    active
  )
VALUES
  (
    'p0000001',
    'PART-SPKPLUG',
    'หัวเทียน',
    'engine',
    'ยาริส 1.2',
    'หัวเทียนมาตรฐานสำหรับเครื่องยนต์ 1.2 ลิตร',
    'เอ็นจีเค',
    1,
    1
  ),
  (
    'p0000002',
    'PART-WIPER',
    'ใบปัดน้ำฝน',
    'body',
    'วีออส',
    'ใบปัดน้ำฝนด้านหน้า ขนาด 22 นิ้ว',
    'บ๊อช',
    1,
    1
  ),
  (
    'p0000003',
    'PART-BATTERY',
    'แบตเตอรี่รถยนต์ 45Ah',
    'electrical',
    'Universal',
    'แบตเตอรี่รถยนต์ 12V 45Ah',
    'พานาโซนิค',
    1,
    1
  );

-- บริการ (ค่าแรง / แคตตาล็อกบริการ)
INSERT INTO
  services (
    id,
    code,
    name,
    type,
    model,
    description,
    brand,
    taxable,
    active
  )
VALUES
  (
    's0000001',
    'SRV-CHANGE-OIL',
    'เปลี่ยนน้ำมันเครื่อง',
    'maintenance',
    'Universal',
    'บริการเปลี่ยนน้ำมันเครื่องและกรองน้ำมัน',
    NULL,
    1,
    1
  ),
  (
    's0000002',
    'SRV-TIRE-ROTATE',
    'สลับยางรถยนต์',
    'tire',
    'Universal',
    'บริการสลับและถ่วงล้อ',
    NULL,
    1,
    1
  ),
  (
    's0000003',
    'SRV-INSPECT',
    'ตรวจเช็กทั่วไป',
    'inspection',
    'Universal',
    'ตรวจเช็กสภาพรถยนต์ 20 จุดสำคัญ',
    NULL,
    1,
    1
  );

-- ช่างซ่อม
INSERT INTO
  mechanics (id, name)
VALUES
  ('m1', 'อนันต์ ศรีทอง'),
  ('m2', 'กฤต นพรัตน์'),
  ('m3', 'สมพร ดี');

-- ใบสั่งซ่อม
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
    notes
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
    1710,
    119.7,
    1829.7,
    'เปลี่ยนน้ำมันเครื่อง + อะไหล่ + บริการ'
  );

-- รายการสั่งซื้อ (สินค้า + บริการ + อะไหล่)
INSERT INTO
  order_items (
    id,
    order_id,
    no,
    goods_id,
    service_id,
    part_id,
    type,
    qty
  )
VALUES
  ('i1', 'o1', 1, 'g0000001', NULL, NULL, 'goods', 1),
  (
    'i2',
    'o1',
    2,
    NULL,
    's0000001',
    NULL,
    'service',
    1
  ),
  ('i3', 'o1', 3, NULL, NULL, 'p0000001', 'part', 2);

-- ช่างในใบสั่งซ่อม
INSERT INTO
  order_mechanics (order_id, mechanic_id, position)
VALUES
  ('o1', 'm1', 1),
  ('o1', 'm2', 2);