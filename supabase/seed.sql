-- Sample data. Run AFTER schema.sql.
-- Step 1 (Supabase dashboard → Authentication → Users → Add user), create:
--   admin@test.com     (check "Auto Confirm User")
--   employee@test.com  (check "Auto Confirm User")
-- Step 2: run this file in the SQL editor.

insert into companies (id, name) values
  ('00000000-0000-0000-0000-000000000001', 'Demo Pomegranate Farm');

insert into profiles (id, company_id, full_name, role)
select id, '00000000-0000-0000-0000-000000000001', 'Demo Admin', 'admin'
from auth.users where email = 'admin@test.com';

insert into profiles (id, company_id, full_name, role)
select id, '00000000-0000-0000-0000-000000000001', 'Demo Employee', 'employee'
from auth.users where email = 'employee@test.com';

-- Item types: Bin is the base; Field, Truck contain Bins; Juice Batch contains Trucks.
insert into item_types (id, company_id, name, child_type_id) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000001', 'Bin',         null),
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-000000000001', 'Field',       '00000000-0000-0000-0000-0000000000b1'),
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000001', 'Truck',       '00000000-0000-0000-0000-0000000000b1'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000001', 'Juice Batch', '00000000-0000-0000-0000-0000000000a1');

insert into field_definitions (item_type_id, key, label, field_type, options, required, is_public, sort_order) values
  -- Field
  ('00000000-0000-0000-0000-0000000000f1', 'field_name',   'Field Name',   'text',   '[]', true,  true,  0),
  ('00000000-0000-0000-0000-0000000000f1', 'section',      'Section',      'text',   '[]', false, false, 1),
  ('00000000-0000-0000-0000-0000000000f1', 'variety',      'Variety',      'select', '["Wonderful","Granada","Parfianka"]', true, true, 2),
  -- Bin
  ('00000000-0000-0000-0000-0000000000b1', 'harvest_date', 'Harvest Date', 'date',   '[]', true,  true,  0),
  ('00000000-0000-0000-0000-0000000000b1', 'weight_lbs',   'Weight (lbs)', 'number', '[]', false, false, 1),
  -- Truck
  ('00000000-0000-0000-0000-0000000000a1', 'plate',        'License Plate','text',   '[]', true,  false, 0),
  ('00000000-0000-0000-0000-0000000000a1', 'destination',  'Destination',  'text',   '[]', true,  true,  1),
  -- Juice Batch
  ('00000000-0000-0000-0000-0000000000c1', 'batch_number', 'Batch #',      'text',   '[]', true,  true,  0),
  ('00000000-0000-0000-0000-0000000000c1', 'volume_l',     'Volume (L)',   'number', '[]', false, false, 1),
  ('00000000-0000-0000-0000-0000000000c1', 'bottling_date','Bottling Date','date',   '[]', true,  true,  2);
