drop index if exists public.paper_embeddings_embedding_hnsw_idx;
drop index if exists public.paper_embeddings_embedding_ivfflat_idx;

alter table public.paper_embeddings
alter column embedding type vector(2048);
