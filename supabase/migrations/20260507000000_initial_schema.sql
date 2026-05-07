-- Enable the pgvector extension to work with embeddings
create extension if not exists vector;

-- Create profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  stripe_customer_id text,
  subscription_tier text default 'free',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS) for profiles
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using ( auth.uid() = id );

create policy "Users can update own profile"
  on public.profiles for update
  using ( auth.uid() = id );

-- Create chatbot_configs table
create table public.chatbot_configs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  website_url text not null,
  name text not null,
  tone text default 'professional',
  persona_name text default 'AI Assistant',
  language text default 'en',
  avatar_url text,
  colors jsonb default '{"primary": "#000000", "text": "#ffffff"}'::jsonb,
  bubble_position text default 'bottom-right',
  welcome_message text default 'Hi! How can I help you today?',
  starter_questions text[] default array['How does it work?', 'What are the pricing plans?'],
  lead_capture_enabled boolean default false,
  handoff_url text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up RLS for chatbot_configs
alter table public.chatbot_configs enable row level security;

create policy "Users can manage their own chatbots"
  on public.chatbot_configs for all
  using ( auth.uid() = user_id );

-- Create knowledge_chunks table
create table public.knowledge_chunks (
  id uuid default gen_random_uuid() primary key,
  chatbot_id uuid references public.chatbot_configs on delete cascade not null,
  content text not null,
  embedding vector(1536),
  metadata jsonb default '{}'::jsonb,
  source_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up RLS for knowledge_chunks
alter table public.knowledge_chunks enable row level security;

create policy "Users can manage knowledge chunks of their own chatbots"
  on public.knowledge_chunks for all
  using (
    exists (
      select 1 from public.chatbot_configs
      where id = knowledge_chunks.chatbot_id
      and user_id = auth.uid()
    )
  );

-- Create chat_sessions table
create table public.chat_sessions (
  id uuid default gen_random_uuid() primary key,
  chatbot_id uuid references public.chatbot_configs on delete cascade not null,
  visitor_id text,
  lead_name text,
  lead_email text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up RLS for chat_sessions
alter table public.chat_sessions enable row level security;

create policy "Users can view sessions of their own chatbots"
  on public.chat_sessions for select
  using (
    exists (
      select 1 from public.chatbot_configs
      where id = chat_sessions.chatbot_id
      and user_id = auth.uid()
    )
  );

-- Create chat_messages table
create table public.chat_messages (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.chat_sessions on delete cascade not null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up RLS for chat_messages
alter table public.chat_messages enable row level security;

create policy "Users can view messages of their own chatbots' sessions"
  on public.chat_messages for select
  using (
    exists (
      select 1 from public.chat_sessions
      join public.chatbot_configs on chat_sessions.chatbot_id = chatbot_configs.id
      where chat_sessions.id = chat_messages.session_id
      and chatbot_configs.user_id = auth.uid()
    )
  );

-- Function to match chunks based on cosine similarity
create or replace function match_chunks (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_chatbot_id uuid
)
returns table (
  id uuid,
  content text,
  source_url text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    knowledge_chunks.id,
    knowledge_chunks.content,
    knowledge_chunks.source_url,
    1 - (knowledge_chunks.embedding <=> query_embedding) as similarity
  from knowledge_chunks
  where knowledge_chunks.chatbot_id = p_chatbot_id
  and 1 - (knowledge_chunks.embedding <=> query_embedding) > match_threshold
  order by knowledge_chunks.embedding <=> query_embedding
  limit match_count;
end;
$$;
