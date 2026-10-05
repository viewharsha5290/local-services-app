-- Only needed if you already ran supabase/schema.sql before the Google Places import
-- existed. If you're setting up fresh, schema.sql already includes this — skip.
alter table providers add column if not exists google_place_id text unique;
alter table providers add column if not exists address text;
alter table providers add column if not exists website text;
alter table providers add column if not exists synced_at timestamptz;
