-- Add Chinese content columns to papers
ALTER TABLE papers ADD COLUMN IF NOT EXISTS hook_summary_zh TEXT;
ALTER TABLE papers ADD COLUMN IF NOT EXISTS plain_summary_zh TEXT;

-- Add language preference to user_personas
ALTER TABLE user_personas ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'zh';
