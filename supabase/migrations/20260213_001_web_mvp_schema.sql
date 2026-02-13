create extension if not exists "pgcrypto";

create table if not exists public.papers (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'arxiv',
  arxiv_id_base text not null unique,
  arxiv_id_version int not null default 1,
  title text not null,
  abstract text not null,
  hook_summary_en text not null,
  tags text[] not null default '{}',
  authors jsonb not null default '[]'::jsonb,
  primary_category text not null,
  categories text[] not null default '{}',
  published_at timestamptz not null,
  source_updated_at timestamptz not null,
  pdf_url text,
  abs_url text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_personas (
  user_id uuid primary key references auth.users(id) on delete cascade,
  job_title text,
  industry text,
  skills text[] not null default '{}',
  interests text[] not null default '{}',
  manual_notes text,
  profile_source text not null default 'manual' check (profile_source in ('manual', 'resume', 'mixed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_resumes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  file_type text not null check (file_type in ('pdf', 'docx')),
  file_size_bytes bigint not null,
  extracted_text text not null,
  parser_status text not null default 'parsed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_saved_papers (
  user_id uuid not null references auth.users(id) on delete cascade,
  paper_id uuid not null references public.papers(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, paper_id)
);

create table if not exists public.user_paper_impacts (
  user_id uuid not null references auth.users(id) on delete cascade,
  paper_id uuid not null references public.papers(id) on delete cascade,
  impact_text_en text not null,
  model text not null,
  prompt_version text not null,
  latency_ms int not null default 0,
  token_input int not null default 0,
  token_output int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, paper_id)
);

create table if not exists public.user_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  paper_id uuid references public.papers(id) on delete cascade,
  event_type text not null check (event_type in ('view', 'skip', 'save', 'impact_click', 'impact_refresh')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ingest_runs (
  id uuid primary key default gen_random_uuid(),
  triggered_by text not null check (triggered_by in ('cli', 'cron')),
  run_mode text not null check (run_mode in ('daily', 'backfill')),
  backfill_days int,
  status text not null check (status in ('running', 'success', 'partial', 'failed')),
  fetched_count int not null default 0,
  upserted_count int not null default 0,
  llm_failed_count int not null default 0,
  skipped_count int not null default 0,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  log jsonb not null default '{}'::jsonb
);

create index if not exists papers_primary_category_idx on public.papers(primary_category);
create index if not exists papers_published_at_idx on public.papers(published_at desc);
create index if not exists user_events_user_type_created_idx on public.user_events(user_id, event_type, created_at desc);
create index if not exists user_events_paper_idx on public.user_events(paper_id);
create index if not exists user_saved_papers_user_created_idx on public.user_saved_papers(user_id, created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_papers_updated_at on public.papers;
create trigger touch_papers_updated_at
before update on public.papers
for each row execute function public.touch_updated_at();

drop trigger if exists touch_user_personas_updated_at on public.user_personas;
create trigger touch_user_personas_updated_at
before update on public.user_personas
for each row execute function public.touch_updated_at();

drop trigger if exists touch_user_resumes_updated_at on public.user_resumes;
create trigger touch_user_resumes_updated_at
before update on public.user_resumes
for each row execute function public.touch_updated_at();

drop trigger if exists touch_user_paper_impacts_updated_at on public.user_paper_impacts;
create trigger touch_user_paper_impacts_updated_at
before update on public.user_paper_impacts
for each row execute function public.touch_updated_at();

alter table public.papers enable row level security;
alter table public.user_personas enable row level security;
alter table public.user_resumes enable row level security;
alter table public.user_saved_papers enable row level security;
alter table public.user_paper_impacts enable row level security;
alter table public.user_events enable row level security;
alter table public.ingest_runs enable row level security;

drop policy if exists "Authenticated users can read papers" on public.papers;
create policy "Authenticated users can read papers"
on public.papers
for select
using (auth.role() = 'authenticated');

drop policy if exists "Persona owner select" on public.user_personas;
create policy "Persona owner select"
on public.user_personas
for select
using (auth.uid() = user_id);

drop policy if exists "Persona owner insert" on public.user_personas;
create policy "Persona owner insert"
on public.user_personas
for insert
with check (auth.uid() = user_id);

drop policy if exists "Persona owner update" on public.user_personas;
create policy "Persona owner update"
on public.user_personas
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Persona owner delete" on public.user_personas;
create policy "Persona owner delete"
on public.user_personas
for delete
using (auth.uid() = user_id);

drop policy if exists "Resume owner select" on public.user_resumes;
create policy "Resume owner select"
on public.user_resumes
for select
using (auth.uid() = user_id);

drop policy if exists "Resume owner insert" on public.user_resumes;
create policy "Resume owner insert"
on public.user_resumes
for insert
with check (auth.uid() = user_id);

drop policy if exists "Resume owner update" on public.user_resumes;
create policy "Resume owner update"
on public.user_resumes
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Resume owner delete" on public.user_resumes;
create policy "Resume owner delete"
on public.user_resumes
for delete
using (auth.uid() = user_id);

drop policy if exists "Saved owner select" on public.user_saved_papers;
create policy "Saved owner select"
on public.user_saved_papers
for select
using (auth.uid() = user_id);

drop policy if exists "Saved owner insert" on public.user_saved_papers;
create policy "Saved owner insert"
on public.user_saved_papers
for insert
with check (auth.uid() = user_id);

drop policy if exists "Saved owner delete" on public.user_saved_papers;
create policy "Saved owner delete"
on public.user_saved_papers
for delete
using (auth.uid() = user_id);

drop policy if exists "Impacts owner select" on public.user_paper_impacts;
create policy "Impacts owner select"
on public.user_paper_impacts
for select
using (auth.uid() = user_id);

drop policy if exists "Impacts owner insert" on public.user_paper_impacts;
create policy "Impacts owner insert"
on public.user_paper_impacts
for insert
with check (auth.uid() = user_id);

drop policy if exists "Impacts owner update" on public.user_paper_impacts;
create policy "Impacts owner update"
on public.user_paper_impacts
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Impacts owner delete" on public.user_paper_impacts;
create policy "Impacts owner delete"
on public.user_paper_impacts
for delete
using (auth.uid() = user_id);

drop policy if exists "Events owner select" on public.user_events;
create policy "Events owner select"
on public.user_events
for select
using (auth.uid() = user_id);

drop policy if exists "Events owner insert" on public.user_events;
create policy "Events owner insert"
on public.user_events
for insert
with check (auth.uid() = user_id);

drop policy if exists "Events owner delete" on public.user_events;
create policy "Events owner delete"
on public.user_events
for delete
using (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resumes',
  'resumes',
  false,
  10485760,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do nothing;

drop policy if exists "Users can read own resume objects" on storage.objects;
create policy "Users can read own resume objects"
on storage.objects
for select
using (
  bucket_id = 'resumes'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can insert own resume objects" on storage.objects;
create policy "Users can insert own resume objects"
on storage.objects
for insert
with check (
  bucket_id = 'resumes'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can update own resume objects" on storage.objects;
create policy "Users can update own resume objects"
on storage.objects
for update
using (
  bucket_id = 'resumes'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'resumes'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can delete own resume objects" on storage.objects;
create policy "Users can delete own resume objects"
on storage.objects
for delete
using (
  bucket_id = 'resumes'
  and auth.uid()::text = (storage.foldername(name))[1]
);
