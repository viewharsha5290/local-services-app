-- Provider claim flow: a signed-in user asks to manage a listing, an admin approves or rejects.
-- Only needed if you already ran supabase/schema.sql before claims existed.
-- If you're setting up fresh, schema.sql already includes this — skip.

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
