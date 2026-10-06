-- Migration 013: category changes made on 2026-10-06 (data only; applied to the live database
-- with the service role, recorded here so a fresh setup ends up the same). Safe to re-run.
--
-- A category's label is now simply its name: the app no longer shows tab_label, and keeps the
-- column filled with the name (cut to its 16-character limit).

-- Clergy becomes Priest. ON UPDATE CASCADE renames it on every listing filed under it.
update public.categories set name = 'Priest', one = 'priest', many = 'priests' where name = 'Clergy';

insert into public.categories (name, tab_label, one, many, hook, icon, art, sort_order) values
  ('Plumber', 'Plumber', 'plumber', 'plumbers', 'Tap won''t stop dripping?', 'droplets', 'van', 70),
  ('Cakes', 'Cakes', 'cake maker', 'cake makers', 'Celebration coming up?', 'cake', 'shop', 80),
  ('Beauty', 'Beauty', 'beauty professional', 'beauty professionals', 'Time for a fresh look?', 'scissors', 'shop', 90),
  ('Orthopedic', 'Orthopedic', 'orthopedic specialist', 'orthopedic specialists', 'Joint or back pain?', 'bone', 'towers', 100)
on conflict (name) do nothing;

update public.categories set tab_label = left(name, 16) where tab_label <> left(name, 16);
