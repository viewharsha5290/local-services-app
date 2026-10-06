-- Migration 011: a business that manages a listing can edit it (and so can an admin).
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- There is deliberately no UPDATE policy on providers: an owner may change only the fields these
-- functions accept, with the checks they apply. Name, trade, badges, ratings and reviews stay out
-- of an owner's reach.

-- ── details: description, phone, area, cities served, response time ─────────────────────────
create or replace function update_my_listing(p_provider_id uuid, p_bio text, p_phone text, p_area_note text, p_cities text[], p_responds_within text)
returns void language plpgsql security definer set search_path = public as $$
declare
  digits text;
  c text;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if not exists (select 1 from providers p where p.id = p_provider_id and (p.owner_id = auth.uid() or is_admin())) then raise exception 'Not authorized'; end if;
  digits := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  if length(digits) = 11 and left(digits, 1) = '1' then digits := substr(digits, 2); end if;
  if length(digits) <> 10 then raise exception 'Enter a 10-digit phone number'; end if;
  if char_length(coalesce(p_bio, '')) > 600 then raise exception 'The description is too long'; end if;
  if char_length(coalesce(p_area_note, '')) > 60 then raise exception 'The area is too long'; end if;
  if p_responds_within is not null and p_responds_within not in ('an hour', 'a few hours', 'a day', 'a few days') then raise exception 'Invalid response time'; end if;
  if p_cities is null or cardinality(p_cities) < 1 or cardinality(p_cities) > 12 then raise exception 'Choose between 1 and 12 cities'; end if;
  foreach c in array p_cities loop
    if c !~ '^[^,]{2,50}, [A-Z]{2}$' then raise exception 'Invalid city'; end if;
  end loop;
  update providers set bio = nullif(btrim(p_bio), ''), phone = '+1' || digits, phone_display = '(' || substr(digits, 1, 3) || ') ' || substr(digits, 4, 3) || '-' || substr(digits, 7, 4), area_note = nullif(btrim(p_area_note), ''), cities = (select array_agg(distinct x) from unnest(p_cities) x), responds_within = p_responds_within where id = p_provider_id;
end $$;

revoke execute on function update_my_listing(uuid, text, text, text, text[], text) from public, anon;
grant execute on function update_my_listing(uuid, text, text, text, text[], text) to authenticated;

-- ── photos: the ordered list of work photos (first = cover) ─────────────────────────────────
-- Every path must be a file already uploaded into this listing's own folder of the bucket.
create or replace function set_my_listing_photos(p_provider_id uuid, p_photos text[])
returns void language plpgsql security definer set search_path = public as $$
declare
  ph text;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if not exists (select 1 from providers p where p.id = p_provider_id and (p.owner_id = auth.uid() or is_admin())) then raise exception 'Not authorized'; end if;
  p_photos := coalesce(p_photos, '{}');
  if cardinality(p_photos) > 12 then raise exception 'A listing can have up to 12 photos'; end if;
  if (select count(distinct x) from unnest(p_photos) x) <> cardinality(p_photos) then raise exception 'Duplicate photo'; end if;
  foreach ph in array p_photos loop
    if left(ph, 37) <> p_provider_id::text || '/' or not exists (select 1 from storage.objects o where o.bucket_id = 'provider-photos' and o.name = ph) then raise exception 'Unknown photo'; end if;
  end loop;
  update providers set photos = p_photos where id = p_provider_id;
end $$;

revoke execute on function set_my_listing_photos(uuid, text[]) from public, anon;
grant execute on function set_my_listing_photos(uuid, text[]) to authenticated;

-- ── storage: who may add and remove files in the provider-photos bucket ─────────────────────
-- Files live at <provider id>/<file>. Viewing is public (the bucket is public); these cover the
-- storage API itself. The bucket caps files at 5 MB and to JPEG/PNG/WebP.
-- (objects.name is spelled out: inside the subquery a bare "name" would mean providers.name.)
drop policy if exists "provider photos: manager read" on storage.objects;
create policy "provider photos: manager read" on storage.objects for select to authenticated using (bucket_id = 'provider-photos' and (public.is_admin() or exists (select 1 from public.providers p where p.id::text = (storage.foldername(objects.name))[1] and p.owner_id = auth.uid())));

drop policy if exists "provider photos: manager upload" on storage.objects;
create policy "provider photos: manager upload" on storage.objects for insert to authenticated with check (bucket_id = 'provider-photos' and (public.is_admin() or exists (select 1 from public.providers p where p.id::text = (storage.foldername(objects.name))[1] and p.owner_id = auth.uid())));

drop policy if exists "provider photos: manager delete" on storage.objects;
create policy "provider photos: manager delete" on storage.objects for delete to authenticated using (bucket_id = 'provider-photos' and (public.is_admin() or exists (select 1 from public.providers p where p.id::text = (storage.foldername(objects.name))[1] and p.owner_id = auth.uid())));
