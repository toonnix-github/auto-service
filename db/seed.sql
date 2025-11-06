DELETE FROM order_items; DELETE FROM payments; DELETE FROM orders;
DELETE FROM vehicles; DELETE FROM customers; DELETE FROM parts; DELETE FROM goods; DELETE FROM services;

-- customers
INSERT INTO customers(id,name,phone,email) VALUES
  ('c1','Somchai Jaidee','0800000001','somchai@example.com'),
  ('c2','Suda Dee','0800000002','suda@example.com');

-- vehicles
INSERT INTO vehicles(id,customer_id,brand,model,license_plate) VALUES
  ('v1','c1','Toyota','Vios 1.5','กข-1234'),
  ('v2','c2','Honda','City 1.5','ขค-5678');

-- goods
INSERT INTO goods(id,sku,name,type,default_price,taxable,active) VALUES
  ('g_oil_1','OIL-5W30','Engine Oil 5W-30','oil',800,1,1),
  ('g_part_1','PART-AIRFLT','Air Filter','part',450,1,1);

INSERT INTO parts(id,manufacturer,part_number,compatible_models,spec) VALUES
  ('g_part_1','Denso','AF-1234','Toyota Vios 2007-2013','Paper filter');

-- services
INSERT INTO services(id,code,name,category,default_price,taxable,duration_minutes,active) VALUES
  ('s_srv_1','SRV-CHANGE-OIL','Change Engine Oil','maintenance',500,1,30,1),
  ('s_srv_2','SRV-TIRE-ROT','Tire Rotation','tire',400,1,25,1);

-- orders
INSERT INTO orders(id,order_no,date,customer_id,vehicle_id,odometer,status,vat_rate,subtotal,vat,total,notes,tech_note) VALUES
  ('o1','SO-202511-0001','2025-11-06','c1','v1',102345,'open',0.07,1750,122.5,1872.5,'น้ำมันเครื่อง+ไส้กรอง+บริการ','ตรวจรอยรั่ว');

-- order_items (mix goods + services)
INSERT INTO order_items(id,order_id,no,goods_id,service_id,type,name_snapshot,unit_price,qty,line_total) VALUES
  ('i1','o1',1,'g_oil_1',NULL,'goods','Engine Oil 5W-30',800,1,800),
  ('i2','o1',2,'g_part_1',NULL,'goods','Air Filter',450,1,450),
  ('i3','o1',3,NULL,'s_srv_1','service','Change Engine Oil',500,1,500);
