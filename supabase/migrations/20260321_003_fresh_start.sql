-- ============================================================
-- FRESH START MIGRATION
-- Drops old tables and creates the full schema the app needs.
-- Run this in Supabase SQL Editor.
-- ============================================================

-- Drop old tables (order matters for foreign keys)
DROP TABLE IF EXISTS public.hook_cache CASCADE;
DROP TABLE IF EXISTS public.paper_embeddings CASCADE;
DROP TABLE IF EXISTS public.feedback CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.personalized_hooks CASCADE;
DROP TABLE IF EXISTS public.user_events CASCADE;
DROP TABLE IF EXISTS public.user_paper_impacts CASCADE;
DROP TABLE IF EXISTS public.user_saved_papers CASCADE;
DROP TABLE IF EXISTS public.user_resumes CASCADE;
DROP TABLE IF EXISTS public.user_personas CASCADE;
DROP TABLE IF EXISTS public.ingest_runs CASCADE;
DROP TABLE IF EXISTS public.papers CASCADE;

-- ============================================================
-- PAPERS
-- ============================================================
CREATE TABLE public.papers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL DEFAULT 'arxiv',
  arxiv_id_base TEXT NOT NULL UNIQUE,
  arxiv_id_version INT NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  abstract TEXT NOT NULL,
  hook_summary_en TEXT NOT NULL,
  plain_summary_en TEXT,
  human_category TEXT DEFAULT 'AI & Robots',
  tags TEXT[] NOT NULL DEFAULT '{}',
  authors JSONB NOT NULL DEFAULT '[]'::jsonb,
  primary_category TEXT NOT NULL,
  categories TEXT[] NOT NULL DEFAULT '{}',
  published_at TIMESTAMPTZ NOT NULL,
  source_updated_at TIMESTAMPTZ NOT NULL,
  pdf_url TEXT,
  abs_url TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX papers_primary_category_idx ON public.papers(primary_category);
CREATE INDEX papers_published_at_idx ON public.papers(published_at DESC);
CREATE INDEX idx_papers_human_category ON public.papers(human_category);

-- ============================================================
-- USER PERSONAS
-- ============================================================
CREATE TABLE public.user_personas (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  job_title TEXT,
  industry TEXT,
  skills TEXT[] NOT NULL DEFAULT '{}',
  interests TEXT[] NOT NULL DEFAULT '{}',
  manual_notes TEXT,
  location TEXT,
  age_range TEXT,
  curiosity_tags TEXT[] DEFAULT '{}',
  profile_source TEXT NOT NULL DEFAULT 'manual' CHECK (profile_source IN ('manual', 'resume', 'mixed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- USER RESUMES
-- ============================================================
CREATE TABLE public.user_resumes (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'docx')),
  file_size_bytes BIGINT NOT NULL,
  extracted_text TEXT NOT NULL,
  parser_status TEXT NOT NULL DEFAULT 'parsed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- USER SAVED PAPERS
-- ============================================================
CREATE TABLE public.user_saved_papers (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paper_id UUID NOT NULL REFERENCES public.papers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, paper_id)
);

CREATE INDEX user_saved_papers_user_created_idx ON public.user_saved_papers(user_id, created_at DESC);

-- ============================================================
-- USER PAPER IMPACTS
-- ============================================================
CREATE TABLE public.user_paper_impacts (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paper_id UUID NOT NULL REFERENCES public.papers(id) ON DELETE CASCADE,
  impact_text_en TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  latency_ms INT NOT NULL DEFAULT 0,
  token_input INT NOT NULL DEFAULT 0,
  token_output INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, paper_id)
);

-- ============================================================
-- USER EVENTS
-- ============================================================
CREATE TABLE public.user_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paper_id UUID REFERENCES public.papers(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'skip', 'save', 'impact_click', 'impact_refresh')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX user_events_user_type_created_idx ON public.user_events(user_id, event_type, created_at DESC);
CREATE INDEX user_events_paper_idx ON public.user_events(paper_id);

-- ============================================================
-- INGEST RUNS
-- ============================================================
CREATE TABLE public.ingest_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  triggered_by TEXT NOT NULL CHECK (triggered_by IN ('cli', 'cron')),
  run_mode TEXT NOT NULL CHECK (run_mode IN ('daily', 'backfill')),
  backfill_days INT,
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'partial', 'failed')),
  fetched_count INT NOT NULL DEFAULT 0,
  upserted_count INT NOT NULL DEFAULT 0,
  llm_failed_count INT NOT NULL DEFAULT 0,
  skipped_count INT NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  log JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- ============================================================
-- PERSONALIZED HOOKS CACHE
-- ============================================================
CREATE TABLE public.personalized_hooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id UUID NOT NULL REFERENCES public.papers(id) ON DELETE CASCADE,
  job_title_normalized TEXT NOT NULL,
  hook_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(paper_id, job_title_normalized)
);

CREATE INDEX idx_personalized_hooks_paper ON public.personalized_hooks(paper_id);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER touch_papers_updated_at
BEFORE UPDATE ON public.papers
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER touch_user_personas_updated_at
BEFORE UPDATE ON public.user_personas
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER touch_user_resumes_updated_at
BEFORE UPDATE ON public.user_resumes
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER touch_user_paper_impacts_updated_at
BEFORE UPDATE ON public.user_paper_impacts
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_saved_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_paper_impacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingest_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personalized_hooks ENABLE ROW LEVEL SECURITY;

-- Papers: all authenticated users can read
CREATE POLICY "Authenticated users can read papers" ON public.papers
FOR SELECT USING (auth.role() = 'authenticated');

-- Personalized hooks: all authenticated users can read (shared cache)
CREATE POLICY "Authenticated users can read personalized hooks" ON public.personalized_hooks
FOR SELECT USING (auth.role() = 'authenticated');

-- User personas: owner only
CREATE POLICY "Persona owner select" ON public.user_personas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Persona owner insert" ON public.user_personas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Persona owner update" ON public.user_personas FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Persona owner delete" ON public.user_personas FOR DELETE USING (auth.uid() = user_id);

-- User resumes: owner only
CREATE POLICY "Resume owner select" ON public.user_resumes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Resume owner insert" ON public.user_resumes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Resume owner update" ON public.user_resumes FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Resume owner delete" ON public.user_resumes FOR DELETE USING (auth.uid() = user_id);

-- Saved papers: owner only
CREATE POLICY "Saved owner select" ON public.user_saved_papers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Saved owner insert" ON public.user_saved_papers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Saved owner delete" ON public.user_saved_papers FOR DELETE USING (auth.uid() = user_id);

-- Impacts: owner only
CREATE POLICY "Impacts owner select" ON public.user_paper_impacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Impacts owner insert" ON public.user_paper_impacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Impacts owner update" ON public.user_paper_impacts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Impacts owner delete" ON public.user_paper_impacts FOR DELETE USING (auth.uid() = user_id);

-- Events: owner only
CREATE POLICY "Events owner select" ON public.user_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Events owner insert" ON public.user_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Events owner delete" ON public.user_events FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- RESUME STORAGE BUCKET
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'resumes', 'resumes', false, 10485760,
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can read own resume objects" ON storage.objects
FOR SELECT USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can insert own resume objects" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own resume objects" ON storage.objects
FOR UPDATE USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own resume objects" ON storage.objects
FOR DELETE USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);
