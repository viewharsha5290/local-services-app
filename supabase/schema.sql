-- Local Services App — schema + Row Level Security policies.
-- Paste this whole file into the Supabase SQL editor (Project -> SQL Editor -> New query) and run it once.

create extension if not exists "pgcrypto";

-- ── profiles ────────────────────────────────────────────────────────────────
-- One row per signed-in user. Created automatically on signup via the trigger below.
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  postal_code text,
  location_scope text not null default 'postal' check (location_scope in ('postal', 'city')),
  created_at timestamptz not null default now()
);

-- ── providers ───────────────────────────────────────────────────────────────
create table if not exists providers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('Handyman', 'Mechanic', 'Attorney', 'Auditor', 'Clergy', 'Electrician')),
  area_note text,
  responds_within text,
  bio text,
  phone text,
  phone_display text,
  verified boolean not null default false,
  claimed boolean not null default false,
  recommend_count int not null default 0,
  lat double precision,
  lng double precision,
  -- Cities this provider offers service in — a provider can be based in one city but serve several,
  -- e.g. '{"Toronto, ON", "Mississauga, ON"}'. Matched against lib/cities.ts on the client.
  cities text[] not null default '{}',
  -- Set only on rows brought in by scripts/import-google-places.mjs; the import upserts on this.
  google_place_id text unique,
  address text,
  website text,
  synced_at timestamptz,
  -- Google's own aggregate, shown beside (never mixed into) the neighbor rating derived from `reviews`.
  -- Set by scripts/import-google-reviews.mjs.
  google_rating numeric(2, 1),
  google_rating_count int,
  google_maps_uri text,
  google_reviews_synced_at timestamptz,
  added_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists providers_category_idx on providers (category);
create index if not exists providers_cities_idx on providers using gin (cities);

-- ── reviews ─────────────────────────────────────────────────────────────────
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers (id) on delete cascade,
  author_id uuid references profiles (id) on delete set null,
  author_name text not null,
  rating int not null check (rating between 1 and 5),
  tags text[] not null default '{}',
  text text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists reviews_provider_id_idx on reviews (provider_id);

-- rating + review_count are derived, never stored directly, so they can't drift.
create or replace view providers_with_stats as
select
  p.*,
  coalesce(round(avg(r.rating)::numeric, 1), 0) as rating,
  count(r.id) as review_count
from providers p
left join reviews r on r.provider_id = p.id
group by p.id;

-- ── google_reviews ──────────────────────────────────────────────────────────
-- Up to 5 reviews per provider as returned by Google Places. Kept apart from `reviews` so
-- strangers' Google reviews never read as neighbor recommendations or move the neighbor rating.
-- Written only by the import script (service role); publicly readable.
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

-- ── saved_providers ─────────────────────────────────────────────────────────
create table if not exists saved_providers (
  user_id uuid not null references profiles (id) on delete cascade,
  provider_id uuid not null references providers (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, provider_id)
);

-- ── contact_events ──────────────────────────────────────────────────────────
create table if not exists contact_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  provider_id uuid not null references providers (id) on delete cascade,
  provider_name text not null,
  method text not null check (method in ('whatsapp', 'sms', 'call', 'chat')),
  created_at timestamptz not null default now(),
  follow_up_at timestamptz not null,
  resolved boolean not null default false
);

create index if not exists contact_events_user_id_idx on contact_events (user_id);

-- ── auto-create a profile row on signup ────────────────────────────────────
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(split_part(new.email, '@', 1), 'Neighbor'));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ── Row Level Security ──────────────────────────────────────────────────────
alter table profiles enable row level security;
alter table providers enable row level security;
alter table reviews enable row level security;
alter table google_reviews enable row level security;
alter table saved_providers enable row level security;
alter table contact_events enable row level security;

-- profiles: users can only see/edit their own row.
create policy "profiles: read own" on profiles for select using (auth.uid() = id);
create policy "profiles: update own" on profiles for update using (auth.uid() = id);

-- providers: readable by everyone (guests browse freely); only signed-in users can add.
create policy "providers: public read" on providers for select using (true);
create policy "providers: authenticated insert" on providers for insert
  with check (auth.uid() is not null and added_by = auth.uid());

-- reviews: readable by everyone; only signed-in users can post, only as themselves.
create policy "reviews: public read" on reviews for select using (true);
create policy "reviews: authenticated insert" on reviews for insert
  with check (auth.uid() is not null and author_id = auth.uid());

-- google_reviews: readable by everyone; no client writes (the import script uses the service role).
create policy "google_reviews: public read" on google_reviews for select using (true);

-- saved_providers: fully private to the owning user.
create policy "saved: read own" on saved_providers for select using (auth.uid() = user_id);
create policy "saved: insert own" on saved_providers for insert with check (auth.uid() = user_id);
create policy "saved: delete own" on saved_providers for delete using (auth.uid() = user_id);

-- contact_events: fully private to the owning user.
create policy "contact_events: read own" on contact_events for select using (auth.uid() = user_id);
create policy "contact_events: insert own" on contact_events for insert with check (auth.uid() = user_id);
create policy "contact_events: update own" on contact_events for update using (auth.uid() = user_id);
