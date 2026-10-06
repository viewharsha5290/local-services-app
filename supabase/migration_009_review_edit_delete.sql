-- Migration 009: let people edit and delete their own reviews.
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- Until now reviews could only be read and inserted, so a posted review was permanent.
-- The author check is on both sides of the update, so a review can't be handed to someone else.

drop policy if exists "reviews: author update" on reviews;
create policy "reviews: author update" on reviews for update
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

drop policy if exists "reviews: author delete" on reviews;
create policy "reviews: author delete" on reviews for delete
  using (author_id = auth.uid());
