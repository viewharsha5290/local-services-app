-- Only needed if you already ran supabase/schema.sql before the sign-up page collected a name.
-- If you're setting up fresh, schema.sql already includes this — skip.
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  -- The name entered on the sign-up page arrives as user metadata; fall back to the email prefix.
  values (new.id, coalesce(nullif(left(trim(new.raw_user_meta_data ->> 'name'), 60), ''), split_part(new.email, '@', 1), 'Neighbor'));
  return new;
end;
$$ language plpgsql security definer;
