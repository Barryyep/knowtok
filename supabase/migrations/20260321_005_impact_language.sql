-- Add language column to impact cache so we know what language the cached impact is in
ALTER TABLE user_paper_impacts ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';
