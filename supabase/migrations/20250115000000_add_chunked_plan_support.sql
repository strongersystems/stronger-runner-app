-- Add missing fields for chunked plan generation support
-- This migration adds the fields needed for the new chunked plan generation feature

-- Add status field to training_plans (for tracking pending/complete/error states)
ALTER TABLE training_plans 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Add prompt field to store the AI generation prompt
ALTER TABLE training_plans 
ADD COLUMN IF NOT EXISTS prompt TEXT;

-- Add error_message field to store error details
ALTER TABLE training_plans 
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Add plan_json field to store the structured JSON plan data
ALTER TABLE training_plans 
ADD COLUMN IF NOT EXISTS plan_json JSONB;

-- Add plan_content field to store raw plan content (if not already present)
ALTER TABLE training_plans 
ADD COLUMN IF NOT EXISTS plan_content TEXT;

-- Add week_range field to track which weeks this plan chunk covers
ALTER TABLE training_plans 
ADD COLUMN IF NOT EXISTS week_range TEXT;

-- Add chunk_type field to identify if this is a full plan or a chunk
ALTER TABLE training_plans 
ADD COLUMN IF NOT EXISTS chunk_type TEXT DEFAULT 'full';

-- Add parent_plan_id field to link chunks to a parent plan (for future use)
ALTER TABLE training_plans 
ADD COLUMN IF NOT EXISTS parent_plan_id UUID REFERENCES training_plans(id);

-- Create index for faster status-based queries
CREATE INDEX IF NOT EXISTS idx_training_plans_status ON training_plans(status);

-- Create index for faster intake_id queries
CREATE INDEX IF NOT EXISTS idx_training_plans_intake_id ON training_plans(intake_id);

-- Update existing plans to have a default status if they don't have one
UPDATE training_plans 
SET status = 'complete' 
WHERE status IS NULL AND plan_content IS NOT NULL;

UPDATE training_plans 
SET status = 'pending' 
WHERE status IS NULL AND plan_content IS NULL; 