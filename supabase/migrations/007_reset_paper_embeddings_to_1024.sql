drop index if exists public.paper_embeddings_embedding_hnsw_idx;
drop index if exists public.paper_embeddings_embedding_ivfflat_idx;

delete from public.paper_embeddings;

alter table public.paper_embeddings
alter column embedding type vector(1024);

create index if not exists paper_embeddings_embedding_ivfflat_idx
  on public.paper_embeddings
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);
