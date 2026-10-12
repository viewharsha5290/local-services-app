-- Migration 017: "Priests & Temples" becomes "Priests & Places of Worship" (data only).
-- Already applied to the live project on 2026-10-11; kept as a record. Safe to re-run.
-- Listings follow the new name on their own: providers.category references categories.name
-- with "on update cascade" (migration 012). tab_label is no longer shown; it holds the first
-- 16 characters of the name, as its length check requires.
update public.categories set name = 'Priests & Places of Worship', tab_label = 'Priests & Places', one = 'priest or place of worship', many = 'priests and places of worship' where name = 'Priests & Temples';
