-- Migration 008: work photos on a listing.
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- `photos` holds object paths inside the public `provider-photos` storage bucket, in display
-- order; the first one is the listing's cover. Photos are added with
-- scripts/add-provider-photos.mjs (service role) until owners can upload their own.

alter table public.providers add column if not exists photos text[] not null default '{}';
