create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.papers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  abstract text not null,
  source text not null,
  doi text,
  semantic_scholar_paper_id text,
  raw_url text not null,
  tags jsonb not null default '[]'::jsonb,
  citation_count integer,
  influential_citation_count integer,
  venue text,
  fields_of_study jsonb not null default '[]'::jsonb,
  open_access_pdf_url text,
  published_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title_hash text not null,
  ingest_status text not null default 'pending',
  embedding_status text not null default 'pending',
  summary_status text not null default 'pending',
  hook_status text not null default 'pending',
  quality_status text not null default 'active',
  retracted_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  constraint papers_source_check check (source in ('arxiv', 'semantic_scholar', 'pubmed')),
  constraint papers_ingest_status_check check (ingest_status in ('pending', 'processed', 'failed')),
  constraint papers_embedding_status_check check (embedding_status in ('pending', 'processing', 'completed', 'failed')),
  constraint papers_summary_status_check check (summary_status in ('pending', 'processing', 'completed', 'failed')),
  constraint papers_hook_status_check check (hook_status in ('pending', 'processing', 'completed', 'failed')),
  constraint papers_quality_status_check check (quality_status in ('active', 'flagged', 'blocked')),
  constraint papers_tags_is_array check (jsonb_typeof(tags) = 'array'),
  constraint papers_fields_of_study_is_array check (jsonb_typeof(fields_of_study) = 'array'),
  constraint papers_metadata_is_object check (jsonb_typeof(metadata) = 'object')
);

create trigger set_papers_updated_at
before update on public.papers
for each row
execute function public.set_updated_at();

create table if not exists public.paper_embeddings (
  id uuid primary key default gen_random_uuid(),
  paper_id uuid not null references public.papers(id) on delete cascade,
  model text not null,
  embedding vector(1024) not null,
  created_at timestamptz not null default now(),
  constraint paper_embeddings_paper_model_key unique (paper_id, model)
);

create table if not exists public.hook_cache (
  id uuid primary key default gen_random_uuid(),
  paper_id uuid not null references public.papers(id) on delete cascade,
  user_profile_hash text not null default 'generic_zh_cn',
  hook_text text not null,
  plain_summary text not null,
  template_id text not null,
  confidence numeric(4,3) not null,
  source_refs jsonb not null default '[]'::jsonb,
  language text not null default 'zh-CN',
  created_at timestamptz not null default now(),
  constraint hook_cache_confidence_check check (confidence >= 0 and confidence <= 1),
  constraint hook_cache_language_check check (language = 'zh-CN'),
  constraint hook_cache_source_refs_is_array check (jsonb_typeof(source_refs) = 'array'),
  constraint hook_cache_unique_cache_key unique (paper_id, user_profile_hash, template_id, language)
);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  paper_id uuid not null references public.papers(id) on delete cascade,
  feedback_type text not null,
  comment text,
  created_at timestamptz not null default now(),
  constraint feedback_type_check check (feedback_type in ('useful', 'not_related')),
  constraint feedback_user_paper_key unique (user_id, paper_id)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  entity_type text not null,
  entity_id uuid,
  provider text,
  model text,
  payload_hash text not null,
  status text not null,
  error_summary text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint audit_logs_status_check check (status in ('success', 'failure', 'retry')),
  constraint audit_logs_meta_is_object check (jsonb_typeof(meta) = 'object')
);
