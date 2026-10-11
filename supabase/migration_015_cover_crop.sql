-- Migration 015: let a listing's manager frame its cover photo.
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- The cover is the first work photo, shown cropped to a card in search results and to a banner on
-- the listing. cover_crop says which part of it to show: a focal point (x and y, as percentages of
-- the photo) and a zoom of 1 to 3. The photo itself is never altered. The crop remembers which
-- photo it was made for, so it stops applying on its own once another photo becomes the cover.

alter table public.providers add column if not exists cover_crop jsonb;

create or replace function set_my_listing_cover_crop(p_provider_id uuid, p_x numeric, p_y numeric, p_zoom numeric)
returns void language plpgsql security definer set search_path = public as $$
declare
  cover text;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  select p.photos[1] into cover from providers p where p.id = p_provider_id and (p.owner_id = auth.uid() or is_admin());
  if not found then raise exception 'Not authorized'; end if;
  if cover is null or p_x is null or p_y is null or p_zoom is null then
    update providers set cover_crop = null where id = p_provider_id;
  else
    update providers set cover_crop = jsonb_build_object('photo', cover, 'x', round(least(greatest(p_x, 0), 100), 1), 'y', round(least(greatest(p_y, 0), 100), 1), 'zoom', round(least(greatest(p_zoom, 1), 3), 2)) where id = p_provider_id;
  end if;
end $$;

revoke execute on function set_my_listing_cover_crop(uuid, numeric, numeric, numeric) from public, anon;
grant execute on function set_my_listing_cover_crop(uuid, numeric, numeric, numeric) to authenticated;
