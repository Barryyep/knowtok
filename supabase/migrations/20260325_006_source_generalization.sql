-- ============================================================
-- SOURCE GENERALIZATION (non-breaking)
-- Adds a generic `source_id` column so `papers` can hold works
-- from sources beyond arXiv (OpenAlex, Europe PMC, Wikipedia, ...).
-- `arxiv_id_base` is kept intact for backward compatibility.
-- ============================================================

-- 1. Generic per-source identifier (e.g. arXiv id, OpenAlex short id).
ALTER TABLE public.papers
  ADD COLUMN IF NOT EXISTS source_id TEXT;

-- 2. Backfill existing rows: every current row is arXiv, so its
--    source_id is its arxiv_id_base.
UPDATE public.papers
  SET source_id = arxiv_id_base
  WHERE source_id IS NULL;

-- 3. A work is unique within its source. Two different sources may
--    legitimately share an id string, so we scope uniqueness by source.
CREATE UNIQUE INDEX IF NOT EXISTS idx_papers_source_source_id
  ON public.papers(source, source_id);
