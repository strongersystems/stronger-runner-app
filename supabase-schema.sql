-- Create the training_intakes table with all required columns
CREATE TABLE IF NOT EXISTS training_intakes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  age INTEGER,
  weight DECIMAL,
  height DECIMAL,
  training_for TEXT,
  plan_length TEXT DEFAULT '12 Weeks',
  training_history TEXT,
  weekly_time INTEGER,
  weekly_mileage INTEGER,
  unit_preference TEXT DEFAULT 'metric',
  training_intensity TEXT,
  rpe_familiarity TEXT,
  max_hr INTEGER,
  resting_hr INTEGER,
  goals TEXT, -- New field for user goals
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the training_plans table for AI-generated plans with structured data
CREATE TABLE IF NOT EXISTS training_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  intake_id UUID REFERENCES training_intakes(id) ON DELETE CASCADE,
  plan_title TEXT,
  introduction TEXT,
  goals_summary TEXT,
  weekly_schedule JSONB, -- Store weekly schedule preferences
  weekly_breakdown JSONB, -- Store structured weekly breakdowns
  plan_content TEXT, -- Keep original full text as backup
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RLS policies for training_intakes
ALTER TABLE training_intakes ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to insert their own training intakes
CREATE POLICY "Users can insert their own training intakes" ON training_intakes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to view their own training intakes
CREATE POLICY "Users can view their own training intakes" ON training_intakes
  FOR SELECT USING (auth.uid() = user_id);

-- Policy to allow users to update their own training intakes
CREATE POLICY "Users can update their own training intakes" ON training_intakes
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy to allow users to delete their own training intakes
CREATE POLICY "Users can delete their own training intakes" ON training_intakes
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for training_plans
ALTER TABLE training_plans ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to insert their own training plans
CREATE POLICY "Users can insert their own training plans" ON training_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to view their own training plans
CREATE POLICY "Users can view their own training plans" ON training_plans
  FOR SELECT USING (auth.uid() = user_id);

-- Policy to allow users to update their own training plans
CREATE POLICY "Users can update their own training plans" ON training_plans
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy to allow users to delete their own training plans
CREATE POLICY "Users can delete their own training plans" ON training_plans
  FOR DELETE USING (auth.uid() = user_id);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at for training_intakes
CREATE TRIGGER update_training_intakes_updated_at 
  BEFORE UPDATE ON training_intakes 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to automatically update updated_at for training_plans
CREATE TRIGGER update_training_plans_updated_at 
  BEFORE UPDATE ON training_plans 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column(); 