# Stronger Runner - Marathon Training App

A complete React web application with Supabase authentication and database integration, featuring a modern dark neon theme. The app includes a comprehensive marathon training intake form and an advanced race time predictor.

## Features

### 🔐 Authentication
- **Login/Signup**: Email and password authentication via Supabase
- **Protected Routes**: Secure access to dashboard and predictor pages
- **Session Management**: Automatic login state management

### 📋 Intake Form (`/dashboard`)
- **Personal Information**: Name, email, phone, age, weight, height
- **Training Details**: Distance, plan length, training history
- **Interactive Sliders**: Weekly time and mileage preferences
- **Unit Toggle**: Dynamic Metric/Imperial conversion
- **Training Intensity**: RPE or Heart Rate zones with color-coded displays
- **Supabase Integration**: Saves form data to `training_intakes` table

### 🏃‍♂️ Race Time Predictor (`/predictor`)
- **Time Inputs**: 1M, 5K, 10K, Half Marathon, Marathon
- **Predictions**: Calculates race times with ±3% range
- **Split Times**: Dynamic split generation with terrain/temperature adjustments
- **Pace Bands**: Customizable pacing strategies (even, negative, positive splits)
- **Interactive Controls**: Real-time updates for all parameters

### 🎨 Design
- **Dark Neon Theme**: Consistent futuristic aesthetic
- **Responsive Design**: Mobile-friendly layout
- **Smooth Animations**: Fade-in effects and hover states
- **Color-coded Results**: Different colors for actual, predicted, and range times

## Tech Stack

- **Frontend**: React 18 with Hooks
- **Routing**: React Router v6
- **Backend**: Supabase (Auth + Database)
- **Styling**: CSS with CSS Variables
- **Build Tool**: Create React App

## Setup Instructions

### 1. Clone and Install Dependencies
```bash
git clone <your-repo-url>
cd stronger-runner-app
npm install
```

### 2. Supabase Setup

#### Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note your project URL and anon key

#### Database Schema
Create the `training_intakes` table in your Supabase dashboard:

```sql
CREATE TABLE training_intakes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  phone TEXT,
  age INTEGER,
  weight NUMERIC,
  height NUMERIC,
  training_for TEXT,
  plan_length TEXT,
  training_history TEXT,
  weekly_time INTEGER,
  weekly_mileage INTEGER,
  unit_preference TEXT,
  training_intensity TEXT,
  rpe_familiarity TEXT,
  max_hr INTEGER,
  resting_hr INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE training_intakes ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to insert their own data
CREATE POLICY "Users can insert their own training data" ON training_intakes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to view their own data
CREATE POLICY "Users can view their own training data" ON training_intakes
  FOR SELECT USING (auth.uid() = user_id);
```

### 3. Environment Configuration
Create a `.env` file in the root directory:

```env
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Start Development Server
```bash
npm start
```

The app will open at `http://localhost:3000`

## Project Structure

```
src/
├── components/
│   ├── Login.jsx          # Authentication login page
│   ├── Signup.jsx         # Authentication signup page
│   ├── IntakeForm.jsx     # Marathon training intake form
│   ├── Predictor.jsx      # Race time predictor
│   └── ProtectedRoute.jsx # Route protection wrapper
├── App.jsx                # Main app with routing
├── supabaseClient.js      # Supabase configuration
├── index.js              # React entry point
└── index.css             # Global styles
```

## Deployment

### Netlify Deployment
1. Connect your GitHub repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `build`
4. Add environment variables in Netlify dashboard:
   - `REACT_APP_SUPABASE_URL`
   - `REACT_APP_SUPABASE_ANON_KEY`

### Vercel Deployment
1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Add environment variables in Vercel dashboard

## Usage

### For New Users
1. Navigate to `/signup` to create an account
2. Complete the intake form on `/dashboard`
3. Use the race predictor on `/predictor`

### For Existing Users
1. Login at `/login`
2. Access dashboard and predictor via navigation

## Features in Detail

### Intake Form Features
- **Dynamic Unit Conversion**: Toggle between metric and imperial units
- **Heart Rate Zones**: Real-time calculation and color-coded display
- **Form Validation**: Required fields and data validation
- **Auto-save**: Form data persists in Supabase

### Predictor Features
- **Multi-distance Input**: Enter times for any combination of distances
- **Advanced Algorithms**: Fatigue factor calculations for accurate predictions
- **Customizable Splits**: Adjust intervals, units, and conditions
- **Pace Band Generation**: Create custom pacing strategies
- **Environmental Factors**: Terrain and temperature adjustments

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues or questions, please open an issue on GitHub or contact the development team. 