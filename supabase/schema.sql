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
  -- The name entered on the sign-up page arrives as user metadata; fall back to the email prefix.
  values (new.id, coalesce(nullif(left(trim(new.raw_user_meta_data ->> 'name'), 60), ''), split_part(new.email, '@', 1), 'Neighbor'));
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

-- ════════════════════════════════════════════════════════════════════════════
-- Provider claim flow: a signed-in user asks to manage a listing, an admin approves or rejects.
-- (Same statements as migration_006_provider_claims.sql.)
-- ════════════════════════════════════════════════════════════════════════════
-- ── admins + listing ownership ──────────────────────────────────────────────
alter table profiles add column if not exists is_admin boolean not null default false;
alter table providers add column if not exists owner_id uuid references profiles (id) on delete set null;
create index if not exists providers_owner_id_idx on providers (owner_id);

-- "profiles: update own" would otherwise let anyone set is_admin on their own row.
-- Column-level grants limit what a signed-in user can change about themselves.
revoke update on profiles from anon, authenticated;
grant update (name, postal_code, location_scope) on profiles to authenticated;

-- security definer so policies can ask "is the caller an admin?" without recursing into
-- the profiles RLS policy.
create or replace function is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select p.is_admin from profiles p where p.id = auth.uid()), false);
$$;

-- A user-submitted provider must start unowned, unclaimed and unverified — those are earned
-- through review, never self-declared.
drop policy if exists "providers: authenticated insert" on providers;
create policy "providers: authenticated insert" on providers for insert
  with check (auth.uid() is not null and added_by = auth.uid() and owner_id is null and claimed = false and verified = false);

-- ── provider_claims ─────────────────────────────────────────────────────────
create table if not exists provider_claims (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  role_title text not null,
  contact_phone text,
  note text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references profiles (id) on delete set null,
  unique (provider_id, user_id)
);

create index if not exists provider_claims_status_idx on provider_claims (status);

alter table provider_claims enable row level security;

-- Claimants see their own claims; admins see all. Nobody updates or deletes directly —
-- decisions go through review_claim() below.
drop policy if exists "claims: read own or admin" on provider_claims;
create policy "claims: read own or admin" on provider_claims for select
  using (auth.uid() = user_id or is_admin());

drop policy if exists "claims: insert own pending" on provider_claims;
create policy "claims: insert own pending" on provider_claims for insert
  with check (
    auth.uid() = user_id
    and status = 'pending'
    and reviewed_at is null
    and reviewed_by is null
    and not exists (select 1 from providers p where p.id = provider_id and p.owner_id is not null)
  );

-- ── admin actions ───────────────────────────────────────────────────────────
-- Approving hands the listing to the claimant, marks it claimed, and closes any competing
-- pending claims on the same listing.
create or replace function review_claim(claim_id uuid, approve boolean)
returns void
language plpgsql security definer set search_path = public as $$
declare
  c provider_claims;
begin
  if not is_admin() then
    raise exception 'Not authorized';
  end if;

  select * into c from provider_claims pc where pc.id = claim_id for update;
  if not found then
    raise exception 'Claim not found';
  end if;
  if c.status <> 'pending' then
    raise exception 'Claim was already reviewed';
  end if;

  if approve then
    if exists (select 1 from providers p where p.id = c.provider_id and p.owner_id is not null) then
      raise exception 'This listing already has an owner';
    end if;
    update providers p set owner_id = c.user_id, claimed = true where p.id = c.provider_id;
    update provider_claims pc
      set status = 'rejected', reviewed_at = now(), reviewed_by = auth.uid()
      where pc.provider_id = c.provider_id and pc.status = 'pending' and pc.id <> c.id;
  end if;

  update provider_claims pc
    set status = case when approve then 'approved' else 'rejected' end, reviewed_at = now(), reviewed_by = auth.uid()
    where pc.id = c.id;
end;
$$;

-- The review queue, with the claimant's email (which lives in auth.users, not profiles).
create or replace function admin_pending_claims()
returns table (
  claim_id uuid,
  provider_id uuid,
  provider_name text,
  provider_phone text,
  claimant_name text,
  claimant_email text,
  role_title text,
  contact_phone text,
  note text,
  created_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'Not authorized';
  end if;
  return query
    select c.id, c.provider_id, p.name, p.phone_display, pr.name, u.email::text, c.role_title, c.contact_phone, c.note, c.created_at
    from provider_claims c
    join providers p on p.id = c.provider_id
    join profiles pr on pr.id = c.user_id
    join auth.users u on u.id = c.user_id
    where c.status = 'pending'
    order by c.created_at;
end;
$$;

revoke execute on function review_claim(uuid, boolean) from public, anon;
revoke execute on function admin_pending_claims() from public, anon;
grant execute on function review_claim(uuid, boolean) to authenticated;
grant execute on function admin_pending_claims() to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- Contact counts: taps on Call / WhatsApp / SMS, counted per listing for its owner.
-- (Same statements as migration_007_contact_counts.sql.)
-- ════════════════════════════════════════════════════════════════════════════
-- One anonymous row per tap. No user id on purpose: guests can contact providers, and the
-- per-user follow-up log (contact_events) is a separate, private thing.
create table if not exists provider_contact_log (
  id bigint generated always as identity primary key,
  provider_id uuid not null references providers (id) on delete cascade,
  method text not null check (method in ('whatsapp', 'sms', 'call', 'chat')),
  created_at timestamptz not null default now()
);

create index if not exists provider_contact_log_provider_idx on provider_contact_log (provider_id, created_at);

-- No policies: nobody reads or writes the table directly. Everything goes through the two
-- functions below.
alter table provider_contact_log enable row level security;

-- Called by the app for guests and signed-in users alike.
create or replace function log_provider_contact(p_provider_id uuid, p_method text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_method not in ('whatsapp', 'sms', 'call', 'chat') then
    raise exception 'Invalid contact method';
  end if;
  insert into provider_contact_log (provider_id, method) values (p_provider_id, p_method);
end;
$$;

-- Counts for the listings the caller manages — and only those.
create or replace function my_listing_stats()
returns table (
  provider_id uuid,
  provider_name text,
  total_30d bigint,
  calls_30d bigint,
  whatsapp_30d bigint,
  sms_30d bigint,
  total_all bigint,
  counting_since timestamptz
)
language sql stable security definer set search_path = public as $$
  select
    p.id,
    p.name,
    count(l.id) filter (where l.created_at > now() - interval '30 days'),
    count(l.id) filter (where l.method = 'call' and l.created_at > now() - interval '30 days'),
    count(l.id) filter (where l.method = 'whatsapp' and l.created_at > now() - interval '30 days'),
    count(l.id) filter (where l.method = 'sms' and l.created_at > now() - interval '30 days'),
    count(l.id),
    min(l.created_at)
  from providers p
  left join provider_contact_log l on l.provider_id = p.id
  where p.owner_id = auth.uid()
  group by p.id, p.name
  order by p.name;
$$;

revoke execute on function log_provider_contact(uuid, text) from public;
grant execute on function log_provider_contact(uuid, text) to anon, authenticated;
revoke execute on function my_listing_stats() from public, anon;
grant execute on function my_listing_stats() to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- Work photos: object paths in the public `provider-photos` storage bucket, cover first.
-- (Same statement as migration_008_provider_photos.sql.)
-- ════════════════════════════════════════════════════════════════════════════
alter table public.providers add column if not exists photos text[] not null default '{}';
