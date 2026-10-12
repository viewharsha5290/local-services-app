-- Migration 018: let an admin correct a listing's name.
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- The business that manages a listing still can't rename it (migration 011): the name is what
-- neighbours' reviews are attached to. An admin can, to fix a misspelling or a changed trading name.

create or replace function admin_set_listing_name(p_provider_id uuid, p_name text)
returns void language plpgsql security definer set search_path = public as $$
declare
  cleaned text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  if char_length(cleaned) < 2 or char_length(cleaned) > 80 then raise exception 'Enter a name between 2 and 80 characters'; end if;
  update providers set name = cleaned where id = p_provider_id;
  if not found then raise exception 'Unknown listing'; end if;
end $$;

revoke execute on function admin_set_listing_name(uuid, text) from public, anon;
grant execute on function admin_set_listing_name(uuid, text) to authenticated;
