-- Migration 010: "Post without my name" reviews.
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- An anonymous review still belongs to an account (so its author can edit or delete it, nobody
-- can post twice under cover, and an admin can see who wrote it) but the public must not learn
-- which one. The name alone isn't enough to hide: the same author_id on a named review elsewhere
-- would give them away. So:
--   * the reviews table itself only returns an anonymous row to its author or an admin;
--   * everyone reads reviews through reviews_public, which shows anonymous rows with the name
--     and author_id blanked (author_id is kept for the author, so the app knows it's theirs).

alter table public.reviews add column if not exists anonymous boolean not null default false;

drop policy if exists "reviews: public read" on reviews;
create policy "reviews: public read" on reviews for select
  using (not anonymous or author_id = auth.uid() or is_admin());

-- Runs with its owner's rights (not security_invoker), which is what lets it list rows the
-- policy above hides, minus the identifying columns.
create or replace view public.reviews_public as
select
  r.id,
  r.provider_id,
  r.rating,
  r.tags,
  r.text,
  r.created_at,
  r.anonymous,
  case when r.anonymous and r.author_id is distinct from auth.uid() then null else r.author_id end as author_id,
  case when r.anonymous then null else r.author_name end as author_name
from public.reviews r;

grant select on public.reviews_public to anon, authenticated;
