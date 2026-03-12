alter table public.papers
add column if not exists semantic_scholar_paper_id text,
add column if not exists citation_count integer,
add column if not exists influential_citation_count integer,
add column if not exists venue text,
add column if not exists fields_of_study jsonb not null default '[]'::jsonb,
add column if not exists open_access_pdf_url text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'papers_fields_of_study_is_array'
  ) then
    alter table public.papers
    add constraint papers_fields_of_study_is_array
    check (jsonb_typeof(fields_of_study) = 'array');
  end if;
end
$$;

create index if not exists papers_semantic_scholar_paper_id_idx
  on public.papers (semantic_scholar_paper_id);
