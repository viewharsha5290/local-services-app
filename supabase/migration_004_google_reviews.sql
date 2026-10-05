-- Only needed if you already ran supabase/schema.sql before Google reviews existed.
-- If you're setting up fresh, schema.sql already includes this — skip.
alter table providers add column if not exists google_rating numeric(2, 1);
alter table providers add column if not exists google_rating_count int;
alter table providers add column if not exists google_maps_uri text;
alter table providers add column if not exists google_reviews_synced_at timestamptz;

create table if not exists google_reviews (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers (id) on delete cascade,
  author_name text not null,
  author_uri text,
  author_photo_uri text,
  rating int not null check (rating between 1 and 5),
  text text not null default '',
  published_at timestamptz,
  google_maps_uri text,
  created_at timestamptz not null default now()
);

create index if not exists google_reviews_provider_id_idx on google_reviews (provider_id);

alter table google_reviews enable row level security;
drop policy if exists "google_reviews: public read" on google_reviews;
create policy "google_reviews: public read" on google_reviews for select using (true);
