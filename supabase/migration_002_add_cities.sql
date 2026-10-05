-- Only needed if you already ran the original supabase/schema.sql before the "cities"
-- column existed. If you're setting up fresh, schema.sql already includes this — skip.
alter table providers add column if not exists cities text[] not null default '{}';
create index if not exists providers_cities_idx on providers using gin (cities);
