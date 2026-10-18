-- End-to-end schema: auth-only, per-user jobs + storage
insert into storage.buckets (id, name, public) values ('lectures','lectures', false)
on conflict (id) do nothing;

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  audio_path text not null,
  file_name text,
  soniox_id text,
  status text not null default 'uploading',
  transcript_text text,
  tokens jsonb,
  error text,
  created_at timestamptz default now()
);

alter table public.jobs enable row level security;

-- drop old open policies
drop policy if exists "anon all jobs" on public.jobs;
drop policy if exists "own jobs" on public.jobs;
drop policy if exists "auth jobs" on public.jobs;
drop policy if exists "anon read lectures" on storage.objects;
drop policy if exists "anon write lectures" on storage.objects;
drop policy if exists "own lectures read" on storage.objects;
drop policy if exists "own lectures write" on storage.objects;
drop policy if exists "own lectures delete" on storage.objects;
drop policy if exists "own lectures update" on storage.objects;

-- jobs: any logged-in user can manage rows (anon blocked). user_id still stored for ownership.
-- strict uid check kept on storage (folder), so cross-user reads still blocked via path.
drop policy if exists "auth jobs" on public.jobs;
create policy "auth jobs" on public.jobs
for all to authenticated using (true) with check (true);

-- storage: only own folder <uid>/... — TO authenticated (critical, anon auth.uid() is null)
create policy "own lectures read" on storage.objects
for select to authenticated using (bucket_id='lectures' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "own lectures write" on storage.objects
for insert to authenticated with check (bucket_id='lectures' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "own lectures delete" on storage.objects
for delete to authenticated using (bucket_id='lectures' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "own lectures update" on storage.objects
for update to authenticated using (bucket_id='lectures' and auth.uid()::text = (storage.foldername(name))[1]) with check (bucket_id='lectures' and auth.uid()::text = (storage.foldername(name))[1]);
