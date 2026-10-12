-- Migration 019: let a listing's manager set its website or social page.
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- providers.website already exists and is shown on the listing; until now only an import or an
-- admin script could fill it. It holds one link: the business's own site, or its Instagram or
-- Facebook page. The check below also covers recommendations, which insert the row directly.

alter table public.providers drop constraint if exists providers_website_check;
alter table public.providers add constraint providers_website_check check (website is null or (website ~* '^https?://[^\s/]+\.[^\s]+$' and char_length(website) <= 300));

create or replace function set_my_listing_website(p_provider_id uuid, p_website text)
returns void language plpgsql security definer set search_path = public as $$
declare
  link text := nullif(btrim(coalesce(p_website, '')), '');
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if not exists (select 1 from providers p where p.id = p_provider_id and (p.owner_id = auth.uid() or is_admin())) then raise exception 'Not authorized'; end if;
  if link is not null then
    if link !~* '^https?://' then link := 'https://' || link; end if;
    if link !~* '^https?://[^\s/]+\.[^\s]+$' or char_length(link) > 300 then raise exception 'Enter a full web address, like example.com or instagram.com/yourname'; end if;
  end if;
  update providers set website = link where id = p_provider_id;
end $$;

revoke execute on function set_my_listing_website(uuid, text) from public, anon;
grant execute on function set_my_listing_website(uuid, text) to authenticated;
