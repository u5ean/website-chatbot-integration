alter table public.chat_sessions
add column if not exists lead_tags text[] not null default '{}'::text[];

create policy "Users can update sessions of their own chatbots"
  on public.chat_sessions for update
  using (
    exists (
      select 1 from public.chatbot_configs
      where id = chat_sessions.chatbot_id
      and user_id = auth.uid()
    )
  );

