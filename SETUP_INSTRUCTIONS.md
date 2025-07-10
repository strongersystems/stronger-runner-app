# Stronger Runner App - Setup Instructions

## Database Setup

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note down your project URL and anon key

### 2. Set Environment Variables
Create a `.env` file in the root directory:
```
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Create Database Tables
Run the SQL commands from `supabase-schema.sql` in your Supabase SQL editor:

```sql
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the training_plans table for AI-generated plans
CREATE TABLE IF NOT EXISTS training_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  intake_id UUID REFERENCES training_intakes(id) ON DELETE CASCADE,
  plan_content TEXT,
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
```

## ChatGPT Integration Setup

### 1. Get OpenAI API Key
1. Go to [platform.openai.com](https://platform.openai.com)
2. Create an account and get an API key
3. Add the API key to your environment variables

### 2. Set OpenAI Environment Variable
Add to your `.env` file:
```
OPENAI_API_KEY=your_openai_api_key
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Test Locally
```bash
npm start
```

## Netlify Deployment

### 1. Environment Variables for Netlify
In your Netlify dashboard, add these environment variables:
- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`
- `OPENAI_API_KEY`

### 2. Deploy
1. Connect your GitHub repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `build`
4. Deploy!

## Features

### AI Training Plan Generation
- When you click "Create Plan" in the intake form, the app will:
  1. Save your training data to Supabase
  2. Send your data to ChatGPT via the Netlify function
  3. Generate a personalized 12-week training plan
  4. Save the AI-generated plan to the database
  5. Display the plan in a dedicated view

### Plan View
- View detailed AI-generated training plans
- See your training profile and plan statistics
- Plans are automatically generated when you submit the intake form

### Dashboard
- View all your training plans
- See which plans have AI-generated content
- Quick access to create new plans and use the race predictor

## Troubleshooting

### Database Errors
- Make sure all SQL commands are executed in Supabase
- Check that RLS policies are properly set up
- Verify environment variables are correct

### ChatGPT Integration
- Ensure OpenAI API key is valid and has credits
- Check Netlify function logs for errors
- Verify the function is properly deployed

### Local Development
- Run `npm install` to install all dependencies
- Make sure all environment variables are set in `.env`
- Check browser console for any errors 