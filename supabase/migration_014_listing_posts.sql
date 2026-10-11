-- Migration 014: a "What's new" feed on each listing.
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- The business that manages a listing (or an admin) posts short updates: a line of text, an
-- optional price and an optional photo. Posts drop off the public page after 30 days unless
-- renewed, so a listing doesn't fill up with stock that sold months ago. As with listing edits
-- (migration 011) there are no write policies: everything goes through the functions below.

-- ── table ────────────────────────────────────────────────────────────────────────────────────
-- `photo` is an object path in the provider-photos bucket, inside the listing's own folder.
create table if not exists public.provider_posts (id uuid primary key default gen_random_uuid(), provider_id uuid not null references public.providers (id) on delete cascade, caption text not null check (char_length(caption) between 3 and 280), price text check (price is null or char_length(price) between 1 and 40), photo text, created_at timestamptz not null default now(), expires_at timestamptz not null default (now() + interval '30 days'), created_by uuid references public.profiles (id) on delete set null);
create index if not exists provider_posts_provider_idx on public.provider_posts (provider_id, created_at desc);
create index if not exists provider_posts_created_idx on public.provider_posts (created_at desc);

alter table public.provider_posts enable row level security;
drop policy if exists "posts: public read while live" on public.provider_posts;
create policy "posts: public read while live" on public.provider_posts for select using (expires_at > now() or is_admin() or exists (select 1 from public.providers p where p.id = provider_posts.provider_id and p.owner_id = auth.uid()));
grant select on public.provider_posts to anon, authenticated;

-- ── functions ────────────────────────────────────────────────────────────────────────────────
create or replace function create_listing_post(p_provider_id uuid, p_caption text, p_price text, p_photo text) returns uuid language plpgsql security definer set search_path = public as $$ declare new_id uuid; begin if auth.uid() is null then raise exception 'Sign in first'; end if; if not exists (select 1 from providers p where p.id = p_provider_id and (p.owner_id = auth.uid() or is_admin())) then raise exception 'Not authorized'; end if; p_caption := btrim(coalesce(p_caption, '')); p_price := nullif(btrim(coalesce(p_price, '')), ''); p_photo := nullif(btrim(coalesce(p_photo, '')), ''); if char_length(p_caption) < 3 then raise exception 'Write a line about what is new'; end if; if char_length(p_caption) > 280 then raise exception 'That update is too long'; end if; if p_price is not null and char_length(p_price) > 40 then raise exception 'The price is too long'; end if; if p_photo is not null and (left(p_photo, 37) <> p_provider_id::text || '/' or not exists (select 1 from storage.objects o where o.bucket_id = 'provider-photos' and o.name = p_photo)) then raise exception 'Unknown photo'; end if; if (select count(*) from provider_posts x where x.provider_id = p_provider_id and x.expires_at > now()) >= 20 then raise exception 'A listing can have up to 20 live updates'; end if; insert into provider_posts (provider_id, caption, price, photo, created_by) values (p_provider_id, p_caption, p_price, p_photo, auth.uid()) returning id into new_id; return new_id; end $$;

create or replace function renew_listing_post(p_post_id uuid) returns void language plpgsql security definer set search_path = public as $$ declare pid uuid; begin select x.provider_id into pid from provider_posts x where x.id = p_post_id; if pid is null then raise exception 'Unknown update'; end if; if not exists (select 1 from providers p where p.id = pid and (p.owner_id = auth.uid() or is_admin())) then raise exception 'Not authorized'; end if; if (select count(*) from provider_posts x where x.provider_id = pid and x.expires_at > now() and x.id <> p_post_id) >= 20 then raise exception 'A listing can have up to 20 live updates'; end if; update provider_posts set expires_at = now() + interval '30 days' where id = p_post_id; end $$;

-- Returns the deleted post's photo path (or null) so the caller can remove the file as well.
create or replace function delete_listing_post(p_post_id uuid) returns text language plpgsql security definer set search_path = public as $$ declare pid uuid; old_photo text; begin select x.provider_id, x.photo into pid, old_photo from provider_posts x where x.id = p_post_id; if pid is null then raise exception 'Unknown update'; end if; if not exists (select 1 from providers p where p.id = pid and (p.owner_id = auth.uid() or is_admin())) then raise exception 'Not authorized'; end if; delete from provider_posts where id = p_post_id; return old_photo; end $$;

revoke execute on function create_listing_post(uuid, text, text, text) from public, anon;
revoke execute on function renew_listing_post(uuid) from public, anon;
revoke execute on function delete_listing_post(uuid) from public, anon;
grant execute on function create_listing_post(uuid, text, text, text) to authenticated;
grant execute on function renew_listing_post(uuid) to authenticated;
grant execute on function delete_listing_post(uuid) to authenticated;
