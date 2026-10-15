-- Langer's Farm item types: pomegranate orchard → bottled juice.
-- Placeholder set based on a typical orchard-to-juice flow; adjust names and
-- fields to match the mentor-provided info. Run AFTER schema.sql and seed.sql.
-- Safe to re-run: existing types/fields with the same name/key are left alone.
--
-- Chain (each type contains the one below it, i.e. what gets scanned into it):
--   Bottle Lot ⊃ Production Batch ⊃ Receiving Lot ⊃ Truck Load ⊃ Harvest Bin
--   Orchard Block ⊃ Harvest Bin   (harvest scan: block, then its bins)

do $$
declare
  v_co uuid := '00000000-0000-0000-0000-000000000001';  -- Demo company from seed.sql
  v_bin uuid; v_block uuid; v_truck uuid; v_receiving uuid; v_batch uuid; v_bottle uuid;
begin
  insert into item_types (company_id, name) values (v_co, 'Harvest Bin')
    on conflict (company_id, name) do nothing;
  select id into v_bin from item_types where company_id = v_co and name = 'Harvest Bin';

  insert into item_types (company_id, name, child_type_id) values (v_co, 'Orchard Block', v_bin)
    on conflict (company_id, name) do nothing;
  select id into v_block from item_types where company_id = v_co and name = 'Orchard Block';

  insert into item_types (company_id, name, child_type_id) values (v_co, 'Truck Load', v_bin)
    on conflict (company_id, name) do nothing;
  select id into v_truck from item_types where company_id = v_co and name = 'Truck Load';

  insert into item_types (company_id, name, child_type_id) values (v_co, 'Receiving Lot', v_truck)
    on conflict (company_id, name) do nothing;
  select id into v_receiving from item_types where company_id = v_co and name = 'Receiving Lot';

  insert into item_types (company_id, name, child_type_id) values (v_co, 'Production Batch', v_receiving)
    on conflict (company_id, name) do nothing;
  select id into v_batch from item_types where company_id = v_co and name = 'Production Batch';

  insert into item_types (company_id, name, child_type_id) values (v_co, 'Bottle Lot', v_batch)
    on conflict (company_id, name) do nothing;
  select id into v_bottle from item_types where company_id = v_co and name = 'Bottle Lot';

  insert into field_definitions (item_type_id, key, label, field_type, options, required, is_public, sort_order) values
    -- Orchard Block
    (v_block, 'ranch_name',     'Ranch Name',       'text',   '[]', true,  true,  0),
    (v_block, 'block_id',       'Block ID',         'text',   '[]', true,  false, 1),
    (v_block, 'variety',        'Variety',          'select', '["Wonderful","Granada","Parfianka","Sweet"]', true, true, 2),
    (v_block, 'region',         'Region',           'text',   '[]', false, true,  3),
    (v_block, 'acres',          'Acres',            'number', '[]', false, false, 4),
    -- Harvest Bin
    (v_bin,   'harvest_date',   'Harvest Date',     'date',   '[]', true,  true,  0),
    (v_bin,   'gross_weight_lbs','Gross Weight (lbs)','number','[]', true,  false, 1),
    (v_bin,   'bin_grade',      'Bin Grade',        'select', '["Juice","Fresh Market","Cull"]', true, false, 2),
    (v_bin,   'picking_crew',   'Picking Crew',     'text',   '[]', false, false, 3),
    -- Truck Load
    (v_truck, 'load_number',    'Load Number',      'text',   '[]', true,  false, 0),
    (v_truck, 'departure_date', 'Departure Date',   'date',   '[]', true,  true,  1),
    (v_truck, 'destination',    'Destination',      'select', '["Langer''s Juice Plant","Cold Storage","Packing House"]', true, true, 2),
    (v_truck, 'license_plate',  'License Plate',    'text',   '[]', true,  false, 3),
    (v_truck, 'carrier',        'Carrier',          'text',   '[]', false, false, 4),
    -- Receiving Lot (weigh-in and inspection at the plant)
    (v_receiving, 'received_date',   'Received Date',     'date',   '[]', true,  true,  0),
    (v_receiving, 'net_weight_lbs',  'Net Weight (lbs)',  'number', '[]', true,  false, 1),
    (v_receiving, 'inspection',      'Inspection Result', 'select', '["Accepted","On Hold","Rejected"]', true, false, 2),
    (v_receiving, 'brix',            'Brix',              'number', '[]', false, false, 3),
    (v_receiving, 'inspector',       'Inspector',         'text',   '[]', false, false, 4),
    -- Production Batch
    (v_batch, 'batch_number',    'Batch Number',      'text',   '[]', true,  true,  0),
    (v_batch, 'production_date', 'Production Date',   'date',   '[]', true,  true,  1),
    (v_batch, 'process',         'Process',           'select', '["Not From Concentrate","From Concentrate"]', true, true, 2),
    (v_batch, 'volume_gal',      'Volume (gal)',      'number', '[]', true,  false, 3),
    (v_batch, 'pasteurization_f','Pasteurization Temp (°F)', 'number', '[]', false, false, 4),
    -- Bottle Lot (the code printed on the bottle that consumers scan)
    (v_bottle, 'lot_code',       'Lot Code',          'text',   '[]', true,  true,  0),
    (v_bottle, 'bottling_date',  'Bottling Date',     'date',   '[]', true,  true,  1),
    (v_bottle, 'best_by',        'Best By Date',      'date',   '[]', true,  true,  2),
    (v_bottle, 'bottle_size',    'Bottle Size',       'select', '["15.2 oz","32 oz","64 oz"]', true, true, 3),
    (v_bottle, 'units_bottled',  'Units Bottled',     'number', '[]', false, false, 4)
  on conflict (item_type_id, key) do nothing;
end $$;
