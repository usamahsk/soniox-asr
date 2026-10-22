-- transcripts table — idempotent (safe to re-run)

create table if not exists public.transcripts (
  id            uuid primary key default gen_random_uuid(),
  record_id     uuid not null,
  script        text not null,
  text          text not null,
  source_script text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (record_id, script)
);

create index if not exists transcripts_record_id_idx on public.transcripts (record_id);
create index if not exists transcripts_script_idx on public.transcripts (script);

-- FK to jobs(id), only if not already added
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'transcripts_record_id_fk'
      and conrelid = 'public.transcripts'::regclass
  ) then
    alter table public.transcripts
      add constraint transcripts_record_id_fk
      foreign key (record_id) references public.jobs (id)
      on delete cascade;
  end if;
end $$;

-- RLS on (service role always bypasses; clients read only their own rows)
alter table public.transcripts enable row level security;

-- Owner-select policy, only if not already created
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'transcripts'
      and policyname = 'transcripts_select_own'
  ) then
    create policy "transcripts_select_own"
      on public.transcripts for select
      to authenticated
      using (
        exists (
          select 1 from public.jobs
          where jobs.id = transcripts.record_id and jobs.user_id = auth.uid()
        )
      );
  end if;
end $$;
