-- Migration 020: credit for photos that are not the business's own.
--
-- providers.photo_credits maps a photo's storage path to who took it, e.g.
--   { "<provider id>/google-<uuid>.jpg": { "source": "google", "name": "Jane D.", "uri": "https://maps.google.com/maps/contrib/…" } }
-- The listing page shows the credit on the cover and keeps credited photos out of "Their work".
-- Written only by scripts/import-google-photos.mjs (service role); a path that is later removed
-- from providers.photos simply leaves an unused entry behind.

alter table public.providers add column if not exists photo_credits jsonb not null default '{}'::jsonb;
