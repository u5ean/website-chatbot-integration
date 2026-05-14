alter table public.chatbot_configs
add column if not exists allowed_origins text[] default array[]::text[];

create table if not exists public.api_rate_limits (
  key text primary key,
  window_start timestamp with time zone not null,
  count int not null
);

alter table public.api_rate_limits enable row level security;

create or replace function public.check_rate_limit(
  p_key text,
  p_window_seconds int,
  p_limit int
)
returns table (
  allowed boolean,
  current_count int,
  reset_at timestamp with time zone
)
language plpgsql
security definer
set search_path = public
as $$
declare
  now_ts timestamp with time zone := timezone('utc'::text, now());
  window_ts timestamp with time zone;
  new_count int;
begin
  insert into public.api_rate_limits(key, window_start, count)
  values (p_key, now_ts, 1)
  on conflict (key) do update
    set
      window_start =
        case
          when public.api_rate_limits.window_start < now_ts - (p_window_seconds * interval '1 second')
            then now_ts
          else public.api_rate_limits.window_start
        end,
      count =
        case
          when public.api_rate_limits.window_start < now_ts - (p_window_seconds * interval '1 second')
            then 1
          else public.api_rate_limits.count + 1
        end
  returning public.api_rate_limits.count, public.api_rate_limits.window_start into new_count, window_ts;

  allowed := new_count <= p_limit;
  current_count := new_count;
  reset_at := window_ts + (p_window_seconds * interval '1 second');
  return next;
end;
$$;

grant execute on function public.check_rate_limit(text, int, int) to service_role;
