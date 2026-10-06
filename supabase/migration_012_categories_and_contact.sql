-- Migration 012: categories become data, and a contact form for reaching the admin.
-- Run once in the Supabase SQL editor. Safe to re-run.

-- ── categories ───────────────────────────────────────────────────────────────────────────────
-- Until now the six trades were a hard-coded list in the app plus a CHECK on providers.category.
-- `icon` and `art` are keys into the app's icon and illustration sets (lib/categoryIcons.tsx,
-- components/Cover.tsx); an unknown key falls back to a generic one rather than breaking.
create table if not exists public.categories (name text primary key check (char_length(name) between 2 and 30), tab_label text not null check (char_length(tab_label) between 2 and 16), one text not null check (char_length(one) between 2 and 30), many text not null check (char_length(many) between 2 and 40), hook text not null check (char_length(hook) between 3 and 60), icon text not null, art text not null, sort_order int not null default 100, created_at timestamptz not null default now());

insert into public.categories (name, tab_label, one, many, hook, icon, art, sort_order) values ('Handyman', 'Home fixes', 'handyman', 'handymen', 'That fix you keep putting off?', 'hammer', 'house', 10), ('Mechanic', 'Cars', 'mechanic', 'mechanics', 'Car making that noise?', 'wrench', 'garage', 20), ('Attorney', 'Legal', 'attorney', 'attorneys', 'Need it in writing?', 'scale', 'columns', 30), ('Auditor', 'Money', 'auditor', 'auditors', 'Books need a second look?', 'calculator', 'towers', 40), ('Clergy', 'Faith', 'priest', 'priests and clergy', 'Planning a ceremony?', 'church', 'hall', 50), ('Electrician', 'Electric', 'electrician', 'electricians', 'Lights flickering?', 'zap', 'lights', 60) on conflict (name) do nothing;

alter table public.categories enable row level security;
drop policy if exists "categories: public read" on public.categories;
create policy "categories: public read" on public.categories for select using (true);
drop policy if exists "categories: admin write" on public.categories;
create policy "categories: admin write" on public.categories for all to authenticated using (is_admin()) with check (is_admin());
grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;

-- A listing's trade must be one of the categories. Renaming a category renames it on its
-- listings; a category that still has listings can't be deleted.
alter table public.providers drop constraint if exists providers_category_check;
alter table public.providers drop constraint if exists providers_category_fkey;
alter table public.providers add constraint providers_category_fkey foreign key (category) references public.categories (name) on update cascade;

-- Owners can't change their trade (migration 011); an admin can move a listing between trades.
create or replace function admin_set_listing_category(p_provider_id uuid, p_category text) returns void language plpgsql security definer set search_path = public as $$ begin if not is_admin() then raise exception 'Not authorized'; end if; if not exists (select 1 from categories c where c.name = p_category) then raise exception 'Unknown category'; end if; update providers set category = p_category where id = p_provider_id; end $$;
revoke execute on function admin_set_listing_category(uuid, text) from public, anon;
grant execute on function admin_set_listing_category(uuid, text) to authenticated;

-- ── contact messages ─────────────────────────────────────────────────────────────────────────
-- Anyone, signed in or not, can write to the admin. Nobody but an admin can read what was sent.
-- Messages only arrive through send_contact_message(), which validates them and caps how many
-- one address (5 a day) and everyone together (40 an hour) can send.
create table if not exists public.contact_messages (id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(), name text not null, email text not null, topic text not null, message text not null, user_id uuid references public.profiles (id) on delete set null, handled boolean not null default false);
create index if not exists contact_messages_created_at_idx on public.contact_messages (created_at desc);

alter table public.contact_messages enable row level security;
drop policy if exists "contact messages: admin read" on public.contact_messages;
create policy "contact messages: admin read" on public.contact_messages for select to authenticated using (is_admin());
drop policy if exists "contact messages: admin update" on public.contact_messages;
create policy "contact messages: admin update" on public.contact_messages for update to authenticated using (is_admin()) with check (is_admin());
drop policy if exists "contact messages: admin delete" on public.contact_messages;
create policy "contact messages: admin delete" on public.contact_messages for delete to authenticated using (is_admin());

create or replace function send_contact_message(p_name text, p_email text, p_topic text, p_message text) returns void language plpgsql security definer set search_path = public as $$ begin p_name := btrim(coalesce(p_name, '')); p_email := lower(btrim(coalesce(p_email, ''))); p_message := btrim(coalesce(p_message, '')); if char_length(p_name) < 2 or char_length(p_name) > 80 then raise exception 'Enter your name'; end if; if char_length(p_email) > 200 or p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Enter a valid email address'; end if; if p_topic is null or p_topic not in ('category', 'listing', 'remove', 'review', 'privacy', 'problem', 'other') then raise exception 'Choose a topic'; end if; if char_length(p_message) < 10 then raise exception 'Tell us a little more'; end if; if char_length(p_message) > 2000 then raise exception 'That message is too long'; end if; if (select count(*) from contact_messages m where m.email = p_email and m.created_at > now() - interval '1 day') >= 5 then raise exception 'You have already sent several messages today'; end if; if (select count(*) from contact_messages m where m.created_at > now() - interval '1 hour') >= 40 then raise exception 'We are getting a lot of messages right now'; end if; insert into contact_messages (name, email, topic, message, user_id) values (p_name, p_email, p_topic, p_message, auth.uid()); end $$;
revoke execute on function send_contact_message(text, text, text, text) from public;
grant execute on function send_contact_message(text, text, text, text) to anon, authenticated;
