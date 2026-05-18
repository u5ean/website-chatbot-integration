drop function if exists public.consume_messages(uuid, int);

create or replace function public.consume_messages(
  p_user_id uuid,
  p_limit int
)
returns table (
  allowed boolean,
  used int,
  remaining int,
  month_start_out date
)
language plpgsql
security definer
set search_path = public
as $$
declare
  ms date := date_trunc('month', timezone('utc'::text, now()))::date;
  current_used int;
begin
  insert into public.user_monthly_usage(user_id, month_start, messages_used)
  values (p_user_id, ms, 0)
  on conflict (user_id, month_start) do nothing;

  select u.messages_used into current_used
  from public.user_monthly_usage u
  where u.user_id = p_user_id and u.month_start = ms
  for update;

  if current_used >= p_limit then
    allowed := false;
    used := current_used;
    remaining := greatest(p_limit - current_used, 0);
    month_start_out := ms;
    return next;
    return;
  end if;

  update public.user_monthly_usage u
  set messages_used = current_used + 1,
      updated_at = timezone('utc'::text, now())
  where u.user_id = p_user_id and u.month_start = ms;

  allowed := true;
  used := current_used + 1;
  remaining := greatest(p_limit - (current_used + 1), 0);
  month_start_out := ms;
  return next;
end;
$$;

grant execute on function public.consume_messages(uuid, int) to service_role;
