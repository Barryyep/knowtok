create unique index if not exists papers_doi_unique_idx
  on public.papers (doi)
  where doi is not null;

create unique index if not exists papers_source_title_hash_unique_idx
  on public.papers (source, title_hash);

create index if not exists papers_published_at_idx
  on public.papers (published_at desc);

create index if not exists papers_source_idx
  on public.papers (source);

create index if not exists papers_semantic_scholar_paper_id_idx
  on public.papers (semantic_scholar_paper_id);

create index if not exists papers_quality_status_idx
  on public.papers (quality_status);

create index if not exists paper_embeddings_paper_id_idx
  on public.paper_embeddings (paper_id);

create index if not exists paper_embeddings_model_idx
  on public.paper_embeddings (model);

create index if not exists paper_embeddings_embedding_ivfflat_idx
  on public.paper_embeddings
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);


create index if not exists hook_cache_paper_id_idx
  on public.hook_cache (paper_id);

create index if not exists hook_cache_user_profile_hash_idx
  on public.hook_cache (user_profile_hash);

create index if not exists hook_cache_created_at_idx
  on public.hook_cache (created_at desc);

create index if not exists feedback_user_id_idx
  on public.feedback (user_id);

create index if not exists feedback_paper_id_idx
  on public.feedback (paper_id);

create index if not exists feedback_user_created_at_idx
  on public.feedback (user_id, created_at desc);

create index if not exists audit_logs_entity_idx
  on public.audit_logs (entity_type, entity_id);

create index if not exists audit_logs_event_type_idx
  on public.audit_logs (event_type);

create index if not exists audit_logs_created_at_idx
  on public.audit_logs (created_at desc);
