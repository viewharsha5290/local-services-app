-- Migration 016: remember when each listing last had something new.
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- The home page can list businesses by recent activity. Activity means something a visitor would
-- notice: the listing being added, new work photos, a "What's new" update or a neighbour's review.
-- Editing the description or phone number doesn't count, so a listing can't be bumped to the top
-- by re-saving it. Triggers keep the date, so it is right however the change was made.

alter table public.providers add column if not exists activity_at timestamptz;
update public.providers p set activity_at = greatest(p.created_at, (select max(r.created_at) from public.reviews r where r.provider_id = p.id), (select max(x.created_at) from public.provider_posts x where x.provider_id = p.id), (select max(o.created_at) from storage.objects o where o.bucket_id = 'provider-photos' and o.name like p.id::text || '/%')) where p.activity_at is null;
alter table public.providers alter column activity_at set default now();
alter table public.providers alter column activity_at set not null;
create index if not exists providers_activity_idx on public.providers (activity_at desc);

-- A new review or update on a listing.
create or replace function touch_provider_activity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update providers set activity_at = now() where id = new.provider_id;
  return new;
end $$;

drop trigger if exists reviews_touch_activity on public.reviews;
create trigger reviews_touch_activity after insert on public.reviews for each row execute function touch_provider_activity();
drop trigger if exists provider_posts_touch_activity on public.provider_posts;
create trigger provider_posts_touch_activity after insert on public.provider_posts for each row execute function touch_provider_activity();

-- A photo that wasn't there before (reordering or removing photos doesn't count).
create or replace function providers_photo_activity()
returns trigger language plpgsql set search_path = public as $$
begin
  if exists (select 1 from unnest(new.photos) ph where ph <> all (old.photos)) then new.activity_at := now(); end if;
  return new;
end $$;

drop trigger if exists providers_photo_activity on public.providers;
create trigger providers_photo_activity before update of photos on public.providers for each row execute function providers_photo_activity();
