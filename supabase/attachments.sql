create table if not exists public.chat_attachments_meta (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  file_url text not null,
  file_name text not null,
  file_type text not null,
  file_size int not null,
  created_at timestamptz not null default now()
);

-- Storage bucket (run in SQL editor)
insert into storage.buckets (id, name, public)
values ('chat-attachments', 'chat-attachments', true)
on conflict (id) do nothing;

-- Basic storage policies (adjust if you want stricter access)
create policy "read chat attachments"
  on storage.objects
  for select
  using (bucket_id = 'chat-attachments');

create policy "insert chat attachments"
  on storage.objects
  for insert
  with check (bucket_id = 'chat-attachments' and auth.role() = 'authenticated');
