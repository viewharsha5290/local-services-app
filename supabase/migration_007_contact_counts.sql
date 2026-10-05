-- Contact counts: every tap on Call / WhatsApp / SMS is counted per listing so the business
-- that manages it can see what the site sends them.
-- Only needed if you already ran supabase/schema.sql before contact counts existed.
-- If you're setting up fresh, schema.sql already includes this — skip.

-- One anonymous row per tap. No user id on purpose: guests can contact providers, and the
-- per-user follow-up log (contact_events) is a separate, private thing.
create table if not exists provider_contact_log (
  id bigint generated always as identity primary key,
  provider_id uuid not null references providers (id) on delete cascade,
  method text not null check (method in ('whatsapp', 'sms', 'call', 'chat')),
  created_at timestamptz not null default now()
);

create index if not exists provider_contact_log_provider_idx on provider_contact_log (provider_id, created_at);

-- No policies: nobody reads or writes the table directly. Everything goes through the two
-- functions below.
alter table provider_contact_log enable row level security;

-- Called by the app for guests and signed-in users alike.
create or replace function log_provider_contact(p_provider_id uuid, p_method text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_method not in ('whatsapp', 'sms', 'call', 'chat') then
    raise exception 'Invalid contact method';
  end if;
  insert into provider_contact_log (provider_id, method) values (p_provider_id, p_method);
end;
$$;

-- Counts for the listings the caller manages — and only those.
create or replace function my_listing_stats()
returns table (
  provider_id uuid,
  provider_name text,
  total_30d bigint,
  calls_30d bigint,
  whatsapp_30d bigint,
  sms_30d bigint,
  total_all bigint,
  counting_since timestamptz
)
language sql stable security definer set search_path = public as $$
  select
    p.id,
    p.name,
    count(l.id) filter (where l.created_at > now() - interval '30 days'),
    count(l.id) filter (where l.method = 'call' and l.created_at > now() - interval '30 days'),
    count(l.id) filter (where l.method = 'whatsapp' and l.created_at > now() - interval '30 days'),
    count(l.id) filter (where l.method = 'sms' and l.created_at > now() - interval '30 days'),
    count(l.id),
    min(l.created_at)
  from providers p
  left join provider_contact_log l on l.provider_id = p.id
  where p.owner_id = auth.uid()
  group by p.id, p.name
  order by p.name;
$$;

revoke execute on function log_provider_contact(uuid, text) from public;
grant execute on function log_provider_contact(uuid, text) to anon, authenticated;
revoke execute on function my_listing_stats() from public, anon;
grant execute on function my_listing_stats() to authenticated;
