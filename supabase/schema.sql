-- Traceability App schema (run once in the Supabase SQL editor)
-- Tables: companies, profiles, item_types, field_definitions, items

create extension if not exists "pgcrypto";

-- ---------- Tables ----------

create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- One row per login. id matches auth.users.id.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  full_name text,
  role text not null check (role in ('admin', 'employee')),
  created_at timestamptz not null default now()
);

-- Admin-defined kinds of things: Field, Bin, Truck, Juice Batch...
-- child_type_id = the type of item that gets scanned INTO this one (e.g. Truck contains Bins).
create table item_types (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  child_type_id uuid references item_types(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (company_id, name)
);

-- The custom fields on each item type. These drive the generated forms.
create table field_definitions (
  id uuid primary key default gen_random_uuid(),
  item_type_id uuid not null references item_types(id) on delete cascade,
  key text not null,
  label text not null,
  field_type text not null check (field_type in ('text', 'number', 'date', 'select')),
  options jsonb not null default '[]'::jsonb,   -- choices for 'select'
  required boolean not null default false,
  is_public boolean not null default false,     -- shown to consumers?
  sort_order int not null default 0,
  unique (item_type_id, key)
);

-- Actual registered things. Field values live in data (keys = field_definitions.key).
-- id is generated on the device so offline submissions can't create duplicates.
create table items (
  id uuid primary key,
  company_id uuid not null references companies(id) on delete cascade,
  item_type_id uuid not null references item_types(id) on delete restrict,
  data jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index on item_types (company_id);
create index on field_definitions (item_type_id, sort_order);
create index on items (company_id, item_type_id);

-- ---------- Helper functions (used by RLS) ----------
-- security definer so they can read profiles without recursing through RLS.

create or replace function public.my_company_id()
returns uuid language sql stable security definer set search_path = public as $$
  select company_id from profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin')
$$;

-- ---------- Row Level Security ----------

alter table companies         enable row level security;
alter table profiles          enable row level security;
alter table item_types        enable row level security;
alter table field_definitions enable row level security;
alter table items             enable row level security;

-- companies: see your own
create policy "read own company" on companies
  for select to authenticated using (id = my_company_id());

-- profiles: see coworkers; only admins change them
create policy "read company profiles" on profiles
  for select to authenticated using (company_id = my_company_id());
create policy "admins manage profiles" on profiles
  for all to authenticated
  using (is_admin() and company_id = my_company_id())
  with check (is_admin() and company_id = my_company_id());

-- item_types: everyone in the company reads; admins write
create policy "read item types" on item_types
  for select to authenticated using (company_id = my_company_id());
create policy "admins write item types" on item_types
  for all to authenticated
  using (is_admin() and company_id = my_company_id())
  with check (is_admin() and company_id = my_company_id());

-- field_definitions: scoped through their item type
create policy "read field definitions" on field_definitions
  for select to authenticated using (
    exists (select 1 from item_types t
            where t.id = item_type_id and t.company_id = my_company_id()));
create policy "admins write field definitions" on field_definitions
  for all to authenticated
  using (is_admin() and exists (select 1 from item_types t
            where t.id = item_type_id and t.company_id = my_company_id()))
  with check (is_admin() and exists (select 1 from item_types t
            where t.id = item_type_id and t.company_id = my_company_id()));

-- items: anyone in the company reads and creates; only creator or admin edits/deletes
create policy "read items" on items
  for select to authenticated using (company_id = my_company_id());
create policy "create items" on items
  for insert to authenticated
  with check (company_id = my_company_id() and created_by = auth.uid());
create policy "edit own items or admin" on items
  for update to authenticated
  using (company_id = my_company_id() and (created_by = auth.uid() or is_admin()));
create policy "admins delete items" on items
  for delete to authenticated
  using (company_id = my_company_id() and is_admin());
