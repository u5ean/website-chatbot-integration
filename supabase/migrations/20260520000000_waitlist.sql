create table if not exists public.waitlist (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text not null,
  website text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create unique index if not exists waitlist_email_unique on public.waitlist (email);

alter table public.waitlist enable row level security;
