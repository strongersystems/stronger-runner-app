-- Add missing columns to training_intakes
ALTER TABLE training_intakes 
ADD COLUMN IF NOT EXISTS goals TEXT,
ADD COLUMN IF NOT EXISTS weekly_schedule JSONB;

-- Add missing columns to training_plans  
ALTER TABLE training_plans 
ADD COLUMN IF NOT EXISTS plan_title TEXT,
ADD COLUMN IF NOT EXISTS introduction TEXT,
ADD COLUMN IF NOT EXISTS goals_summary TEXT,
ADD COLUMN IF NOT EXISTS weekly_schedule JSONB,
ADD COLUMN IF NOT EXISTS weekly_breakdown JSONB;
