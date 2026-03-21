-- Papers table: add plain summary and human category
ALTER TABLE papers ADD COLUMN IF NOT EXISTS plain_summary_en TEXT;
ALTER TABLE papers ADD COLUMN IF NOT EXISTS human_category TEXT DEFAULT 'AI & Robots';
CREATE INDEX IF NOT EXISTS idx_papers_human_category ON papers(human_category);

-- User profiles: add location, age range, curiosity tags
ALTER TABLE user_personas ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE user_personas ADD COLUMN IF NOT EXISTS age_range TEXT;
ALTER TABLE user_personas ADD COLUMN IF NOT EXISTS curiosity_tags TEXT[] DEFAULT '{}';

-- Personalized hooks cache
-- job_title_normalized = lower(trim(job_title)) for MVP. No clustering yet.
CREATE TABLE IF NOT EXISTS personalized_hooks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  paper_id UUID NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  job_title_normalized TEXT NOT NULL,
  hook_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(paper_id, job_title_normalized)
);
CREATE INDEX IF NOT EXISTS idx_personalized_hooks_paper ON personalized_hooks(paper_id);

-- RLS for personalized_hooks: all authenticated users can read (shared cache)
ALTER TABLE personalized_hooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read personalized hooks"
ON personalized_hooks FOR SELECT
USING (auth.role() = 'authenticated');

-- Backfill: existing papers get human_category based on primary_category prefix
UPDATE papers SET human_category = 'AI & Robots' WHERE primary_category LIKE 'cs.%' AND human_category IS NULL;
UPDATE papers SET human_category = 'Your Health' WHERE primary_category LIKE 'q-bio.%' AND human_category IS NULL;
UPDATE papers SET human_category = 'Your Money' WHERE (primary_category LIKE 'q-fin.%' OR primary_category LIKE 'econ.%') AND human_category IS NULL;
UPDATE papers SET human_category = 'Climate' WHERE (primary_category LIKE 'physics.ao-ph%' OR primary_category LIKE 'physics.geo-ph%') AND human_category IS NULL;
UPDATE papers SET human_category = 'AI & Robots' WHERE human_category IS NULL;
