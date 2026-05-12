create table public.crawl_jobs (
  id uuid default gen_random_uuid() primary key,
  chatbot_id uuid references public.chatbot_configs on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  kind text not null check (kind in ('onboarding', 'recrawl')),
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed')),
  max_pages int default 50,
  attempts int default 0,
  pages_crawled int,
  last_error text,
  started_at timestamp with time zone,
  finished_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.crawl_jobs enable row level security;

create policy "Users can manage crawl jobs of their own chatbots"
  on public.crawl_jobs for all
  using (
    exists (
      select 1 from public.chatbot_configs
      where id = crawl_jobs.chatbot_id
      and user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.chatbot_configs
      where id = crawl_jobs.chatbot_id
      and user_id = auth.uid()
    )
  );

create or replace function claim_next_crawl_job()
returns table (
  id uuid,
  chatbot_id uuid,
  user_id uuid,
  kind text,
  max_pages int
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with next as (
    select cj.id
    from public.crawl_jobs cj
    where cj.status = 'queued'
    order by cj.created_at asc
    limit 1
    for update skip locked
  )
  update public.crawl_jobs cj
  set
    status = 'running',
    started_at = timezone('utc'::text, now()),
    attempts = cj.attempts + 1
  from next
  where cj.id = next.id
  returning cj.id, cj.chatbot_id, cj.user_id, cj.kind, cj.max_pages;
end;
$$;

grant execute on function claim_next_crawl_job() to anon, authenticated, service_role;

