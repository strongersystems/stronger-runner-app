import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import supabase from '../supabaseClient';

const IntakeForm = () => {
  const navigate = useNavigate();
  const { planId } = useParams();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    age: '',
    weight: '',
    height: '',
    trainingFor: 'Marathon',
    planLength: '12 Weeks',
    trainingHistory: '',
    weeklyTime: 8,
    weeklyMileage: 40,
    unitPreference: 'metric',
    trainingIntensity: 'rpe',
    rpeFamiliarity: 'Somewhat',
    max_hr: '',
    resting_hr: '',
    goals: '',
    daysPerWeek: 4, // Default to 4 days per week
    otherRequests: '',
    startingVolume: '',
    maxVolume: '',
    aiChooseMaxVolume: false,
  });

  const [user, setUser] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  useEffect(() => {
    if (planId) {
      // Fetch plan and pre-fill form for editing
      const fetchPlan = async () => {
        setLoading(true);
        const { data, error } = await supabase
          .from('training_intakes')
          .select('*')
          .eq('id', planId)
          .single();
        if (data) {
          setFormData({
            age: data.age || '',
            weight: data.weight || '',
            height: data.height || '',
            trainingFor: data.training_for || 'Marathon',
            planLength: data.plan_length || '12 Weeks',
            trainingHistory: data.training_history || '',
            weeklyTime: data.weekly_time || 8,
            weeklyMileage: data.weekly_mileage || 40,
            unitPreference: data.unit_preference || 'metric',
            trainingIntensity: data.training_intensity || 'rpe',
            rpeFamiliarity: data.rpe_familiarity || 'Somewhat',
            max_hr: data.max_hr || '',
            resting_hr: data.resting_hr || '',
            goals: data.goals || '',
            daysPerWeek: data.days_per_week || 4,
            otherRequests: data.other_requests || '',
            startingVolume: data.starting_volume || '',
            maxVolume: data.max_volume || '',
            aiChooseMaxVolume: data.ai_choose_max_volume || false,
          });
        }
        setLoading(false);
      };
      fetchPlan();
    }
  }, [planId]);

  // Update mileage max when unit changes
  const mileageMax = formData.unitPreference === 'metric' ? 160 : 100;
  const mileageLabel = formData.unitPreference === 'metric' ? 'km' : 'miles';
  const weightLabel = formData.unitPreference === 'metric' ? 'kg' : 'lbs';
  const heightLabel = formData.unitPreference === 'metric' ? 'cm' : 'inches';

  // If current mileage is above new max, clamp it
  useEffect(() => {
    if (formData.weeklyMileage > mileageMax) {
      setFormData(prev => ({ ...prev, weeklyMileage: mileageMax }));
    }
  }, [formData.unitPreference, formData.weeklyMileage, mileageMax]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'aiChooseMaxVolume') {
      setFormData(prev => ({
        ...prev,
        aiChooseMaxVolume: checked,
        maxVolume: checked ? '' : prev.maxVolume
      }));
      return;
    }
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSliderChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: parseInt(value)
    }));
  };

  // Remove generateAITrainingPlan and Netlify function call from the frontend

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    console.log('Form submission started');
    console.log('User:', user);
    console.log('Form data:', formData);

    if (!user) {
      setError('You must be logged in to submit this form');
      setLoading(false);
      return;
    }

    try {
      // Transform formData to match database column names
      const dbData = {
        user_id: user.id,
        age: formData.age ? parseInt(formData.age) : null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        height: formData.height ? parseFloat(formData.height) : null,
        training_for: formData.trainingFor,
        plan_length: formData.planLength,
        training_history: formData.trainingHistory,
        goals: formData.goals,
        weekly_time: formData.weeklyTime,
        weekly_mileage: formData.weeklyMileage,
        unit_preference: formData.unitPreference,
        training_intensity: formData.trainingIntensity,
        rpe_familiarity: formData.rpeFamiliarity,
        max_hr: formData.max_hr ? parseInt(formData.max_hr) : null,
        resting_hr: formData.resting_hr ? parseInt(formData.resting_hr) : null,
        days_per_week: formData.daysPerWeek,
        other_requests: formData.otherRequests,
        starting_volume: formData.startingVolume ? parseFloat(formData.startingVolume) : null,
        max_volume: formData.maxVolume ? parseFloat(formData.maxVolume) : null,
        ai_choose_max_volume: formData.aiChooseMaxVolume,
      };

      console.log('Saving to Supabase with data:', dbData);
      
      let data, error;
      if (planId) {
        // Update existing plan
        dbData.updated_at = new Date().toISOString();
        ({ data, error } = await supabase
          .from('training_intakes')
          .update(dbData)
          .eq('id', planId)
          .select());
      } else {
        // Create new plan
        dbData.created_at = new Date().toISOString();
        ({ data, error } = await supabase
          .from('training_intakes')
          .insert([dbData])
          .select());
      }

      console.log('Supabase response:', { data, error });

      if (error) throw error;

      // Compose the prompt for the background function
      const userData = { ...dbData, id: data[0].id };
      const daysPerWeekText = `Preferred days per week to run: ${userData.days_per_week || formData.daysPerWeek}`;
      const currentVolume = userData.weekly_mileage ? `Current (recent) weekly mileage: ${userData.weekly_mileage} ${userData.unit_preference === 'metric' ? 'km' : 'miles'}.` : '';
      const startingVolume = userData.starting_volume ? `Starting weekly volume: ${userData.starting_volume} ${userData.unit_preference === 'metric' ? 'km' : 'miles'}.` : '';
      let maxVolume = '';
      if (formData.aiChooseMaxVolume || userData.aiChooseMaxVolume) {
        maxVolume = 'Let the AI choose the maximum weekly volume based on the runner profile.';
      } else if (userData.max_volume) {
        maxVolume = `Maximum weekly volume: ${userData.max_volume} ${userData.unit_preference === 'metric' ? 'km' : 'miles'}.`;
      }
      const otherRequests = userData.other_requests ? `Additional user requests: ${userData.other_requests}` : '';
      const prompt = `\nCreate a detailed 4-week segment (weeks 1-4) of a marathon training plan for a runner with the following profile:\n\nAge: ${userData.age || 'Not specified'}\nWeight: ${userData.weight || 'Not specified'} ${userData.unit_preference === 'metric' ? 'kg' : 'lbs'}\nHeight: ${userData.height || 'Not specified'} ${userData.unit_preference === 'metric' ? 'cm' : 'inches'}\nTraining for: ${userData.training_for}\nGoals: ${userData.goals || 'Not specified'}\n${currentVolume}\n${startingVolume}\n${maxVolume}\nWeekly training time: ${userData.weekly_time} hours\nTraining intensity preference: ${userData.training_intensity}\nRPE familiarity: ${userData.rpe_familiarity}\nMax heart rate: ${userData.max_hr || 'Not specified'} bpm\nResting heart rate: ${userData.resting_hr || 'Not specified'} bpm\nTraining history: ${userData.training_history || 'Not specified'}\n\n${daysPerWeekText}\n\n${otherRequests}\n\nInstructions:\n- You are an expert running coach creating the FIRST 4 WEEKS of a progressive marathon training plan.\n- Structure the plan so that at least 80% of running is easy, and no more than 20% is moderate/intense. Always lean toward easy running and prioritize volume over intensity.\n- Use the user's preferred number of days per week to run as a guide, and optimize for best training outcomes.\n- For each week, provide a summary of the key sessions to be completed (do not assign to specific days in the summary).\n- For each day, suggest a workout (easy run, session, long run, rest, etc.), a mileage target, and ${userData.training_intensity === 'hr' ? 'a heart rate range (bpm)' : 'an RPE value'}. The sum of daily mileages should match the weekly total.\n- This is the STARTING phase of the plan - focus on building consistency and establishing good habits.\n- Only respond with valid JSON. Do NOT include any explanations, comments, or markdown. Do NOT wrap your response in triple backticks or any other formatting. Output a complete, valid JSON object for weeks 1-4 only.`;

      // Insert a pending plan for this intake (create as first chunk for better reliability)
      const { error: planInsertError } = await supabase
        .from('training_plans')
        .insert([{
          user_id: user.id,
          intake_id: userData.id,
          status: 'pending',
          prompt: prompt,
          chunk_type: 'chunk',
          week_range: '1-4'
        }]);

      if (planInsertError) {
        console.error('Error inserting pending plan:', planInsertError);
        setError('Failed to queue plan for generation.');
        setLoading(false);
        return;
      }

      setSuccess(planId ? 'Plan updated!' : 'Your first 4 weeks are being generated! This is faster and more reliable. You can generate additional weeks once this is ready.');
      setLoading(false);
      
      // Trigger background function immediately
      try {
        await fetch('/.netlify/functions/generate-plan-background', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            trigger: 'manual',
            intake_id: userData.id
          })
        });
        console.log('Background function triggered immediately');
      } catch (error) {
        console.log('Background function trigger failed (will run on schedule):', error);
      }
      
      // Always navigate to dashboard after submit
      navigate('/dashboard');
    } catch (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  // Karvonen method for HR zones
  const renderHrZones = () => {
    const max = parseInt(formData.max_hr);
    const rest = parseInt(formData.resting_hr);
    if (!max || !rest || max <= rest) return null;
    const hrr = max - rest;
    // Standard running zones (percentages)
    const zones = {
      z1: [0.5, 0.6],
      z2: [0.6, 0.7],
      z3: [0.7, 0.8],
      z4: [0.8, 0.9],
      z5: [0.9, 1.0]
    };
    return (
      <div style={{ marginTop: '15px' }}>
        <div style={{
          height: '40px',
          display: 'flex',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          {Object.entries(zones).map(([id, [low, high]], i) => {
            const lowBpm = Math.round(hrr * low + rest);
            const highBpm = Math.round(hrr * high + rest);
            const colors = [
              'linear-gradient(to right, #10b981, #059669)',
              'linear-gradient(to right, #3b82f6, #2563eb)',
              'linear-gradient(to right, #f59e0b, #d97706)',
              'linear-gradient(to right, #f97316, #ea580c)',
              'linear-gradient(to right, #ef4444, #dc2626)'
            ];
            return (
              <div key={id} style={{
                flex: 1,
                background: colors[i],
                color: 'white',
                textAlign: 'center',
                fontSize: '12px',
                lineHeight: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column'
              }}>
                {id.toUpperCase()}: {lowBpm}-{highBpm} bpm
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div style={{ 
      maxWidth: '800px', 
      margin: '0 auto', 
      padding: '20px' 
    }}>
      <div className="card">
        <h1 style={{ 
          textAlign: 'center', 
          color: 'var(--text-light)', 
          fontSize: '28px',
          fontWeight: '700',
          marginBottom: '30px'
        }}>
          {planId ? 'Edit Training Plan' : 'Create Training Plan (First 4 Weeks)'}
        </h1>

        {error && (
          <div style={{ 
            background: 'rgba(220, 38, 38, 0.1)', 
            color: 'var(--error)', 
            padding: '12px', 
            borderRadius: '8px', 
            marginBottom: '20px',
            border: '1px solid var(--error)',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ 
            background: 'rgba(5, 150, 105, 0.1)', 
            color: 'var(--success)', 
            padding: '12px', 
            borderRadius: '8px', 
            marginBottom: '20px',
            border: '1px solid var(--success)',
            fontSize: '14px'
          }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Unit Preference - moved to top */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              color: 'var(--text-light)', 
              marginBottom: '8px',
              fontWeight: '500'
            }}>
              Unit Preference
            </label>
            <select
              name="unitPreference"
              value={formData.unitPreference}
              onChange={handleInputChange}
              style={{ width: '100%' }}
            >
              <option value="metric">Metric (KM, min/km)</option>
              <option value="imperial">Imperial (Miles, min/mile)</option>
            </select>
          </div>

          {/* Personal Information (user details removed) */}
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ color: 'var(--text-light)', marginBottom: '15px', fontSize: '20px', fontWeight: '600' }}>Personal Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  color: 'var(--text-light)', 
                  marginBottom: '8px',
                  fontWeight: '500'
                }}>
                  Age
                </label>
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleInputChange}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ 
                  display: 'block', 
                  color: 'var(--text-light)', 
                  marginBottom: '8px',
                  fontWeight: '500'
                }}>
                  Weight ({weightLabel})
                </label>
                <input
                  type="number"
                  name="weight"
                  value={formData.weight}
                  onChange={handleInputChange}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ 
                  display: 'block', 
                  color: 'var(--text-light)', 
                  marginBottom: '8px',
                  fontWeight: '500'
                }}>
                  Height ({heightLabel})
                </label>
                <input
                  type="number"
                  name="height"
                  value={formData.height}
                  onChange={handleInputChange}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>

          {/* Training Information */}
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ color: 'var(--text-light)', marginBottom: '15px', fontSize: '20px', fontWeight: '600' }}>Training Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  color: 'var(--text-light)', 
                  marginBottom: '8px',
                  fontWeight: '500'
                }}>
                  Training for
                </label>
                <select
                  name="trainingFor"
                  value={formData.trainingFor}
                  onChange={handleInputChange}
                  style={{ width: '100%' }}
                >
                  <option>5K</option>
                  <option>10K</option>
                  <option>Half Marathon</option>
                  <option>Marathon</option>
                </select>
              </div>
              <div>
                <label style={{ 
                  display: 'block', 
                  color: 'var(--text-light)', 
                  marginBottom: '8px',
                  fontWeight: '500'
                }}>
                  Plan Length
                </label>
                <select
                  name="planLength"
                  value={formData.planLength}
                  onChange={handleInputChange}
                  style={{ width: '100%' }}
                >
                  <option>8 Weeks</option>
                  <option>12 Weeks</option>
                  <option>16 Weeks</option>
                  <option>20 Weeks</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ 
                display: 'block', 
                color: 'var(--text-light)', 
                marginBottom: '8px',
                fontWeight: '500'
              }}>
                Training History
              </label>
              <textarea
                name="trainingHistory"
                value={formData.trainingHistory}
                onChange={handleInputChange}
                rows="3"
                placeholder="e.g. 10K in 52:00 (6 months ago), Half in 2:05 (1 year ago)"
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ 
                display: 'block', 
                color: 'var(--text-light)', 
                marginBottom: '8px',
                fontWeight: '500'
              }}>
                Goals
              </label>
              <textarea
                name="goals"
                value={formData.goals}
                onChange={handleInputChange}
                rows="3"
                placeholder="e.g. Complete my first marathon, Break 4 hours, Run consistently 4x per week"
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ 
                display: 'block', 
                color: 'var(--text-light)', 
                marginBottom: '8px',
                fontWeight: '500'
              }}>
                Starting Weekly Volume (optional)
              </label>
              <input
                type="number"
                name="startingVolume"
                value={formData.startingVolume}
                onChange={handleInputChange}
                placeholder={`e.g. 40 (${mileageLabel})`}
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ 
                display: 'block', 
                color: 'var(--text-light)', 
                marginBottom: '8px',
                fontWeight: '500'
              }}>
                Maximum Weekly Volume (optional)
              </label>
              <input
                type="number"
                name="maxVolume"
                value={formData.maxVolume}
                onChange={handleInputChange}
                placeholder={`e.g. 80 (${mileageLabel})`}
                disabled={formData.aiChooseMaxVolume}
                style={{ width: '100%' }}
              />
             <label style={{ display: 'flex', alignItems: 'center', marginTop: 6, fontSize: 14, color: 'var(--text-muted)' }}>
               <input
                 type="checkbox"
                 name="aiChooseMaxVolume"
                 checked={formData.aiChooseMaxVolume}
                 onChange={handleInputChange}
                 style={{ marginRight: 6 }}
               />
               Let the AI choose this for me
             </label>
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ 
                display: 'block', 
                color: 'var(--text-light)', 
                marginBottom: '8px',
                fontWeight: '500'
              }}>
                Any other requests? (optional)
              </label>
              <textarea
                name="otherRequests"
                value={formData.otherRequests}
                onChange={handleInputChange}
                rows="2"
                placeholder="e.g. I want to include trail runs, or avoid running on Mondays."
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>
          </div>

          {/* Sliders */}
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ color: 'var(--text-light)', marginBottom: '15px', fontSize: '20px', fontWeight: '600' }}>Training Preferences</h3>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                color: 'var(--text-light)', 
                marginBottom: '8px',
                fontWeight: '500'
              }}>
                Days per week to run: {formData.daysPerWeek}
              </label>
              <input
                type="range"
                min="3"
                max="7"
                value={formData.daysPerWeek}
                onChange={(e) => handleSliderChange('daysPerWeek', e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                color: 'var(--text-light)', 
                marginBottom: '8px',
                fontWeight: '500'
              }}>
                Weekly Time Available: {formData.weeklyTime} hours
              </label>
              <input
                type="range"
                min="1"
                max="15"
                value={formData.weeklyTime}
                onChange={(e) => handleSliderChange('weeklyTime', e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Training Intensity */}
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ color: 'var(--text-light)', marginBottom: '15px', fontSize: '20px', fontWeight: '600' }}>Training Intensity</h3>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ 
                display: 'block', 
                color: 'var(--text-light)', 
                marginBottom: '8px',
                fontWeight: '500'
              }}>
                Training Intensity Preference
              </label>
              <select
                name="trainingIntensity"
                value={formData.trainingIntensity}
                onChange={handleInputChange}
                style={{ width: '100%' }}
              >
                <option value="rpe">RPE</option>
                <option value="hr">Heart Rate</option>
              </select>
            </div>
            {formData.trainingIntensity === 'rpe' && (
              <div style={{ marginBottom: '15px' }}>
                <label style={{ 
                  display: 'block', 
                  color: 'var(--text-light)', 
                  marginBottom: '8px',
                  fontWeight: '500'
                }}>
                  RPE Familiarity
                </label>
                <select
                  name="rpeFamiliarity"
                  value={formData.rpeFamiliarity}
                  onChange={handleInputChange}
                  style={{ width: '100%' }}
                >
                  <option>Not at all</option>
                  <option>Somewhat</option>
                  <option>Very Familiar</option>
                </select>
              </div>
            )}
            {formData.trainingIntensity === 'hr' && (
              <div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ 
                    display: 'block', 
                    color: 'var(--text-light)', 
                    marginBottom: '8px',
                    fontWeight: '500'
                  }}>
                    Max HR
                  </label>
                  <input
                    type="number"
                    name="max_hr"
                    value={formData.max_hr}
                    onChange={handleInputChange}
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ 
                    display: 'block', 
                    color: 'var(--text-light)', 
                    marginBottom: '8px',
                    fontWeight: '500'
                  }}>
                    Resting HR
                  </label>
                  <input
                    type="number"
                    name="resting_hr"
                    value={formData.resting_hr}
                    onChange={handleInputChange}
                    style={{ width: '100%' }}
                  />
                </div>
                {renderHrZones()}
              </div>
            )}
          </div>

          {/* Weekly Schedule */}
          {/* This section is removed as per the edit hint */}

          <button
            type="submit"
            className="btn"
            style={{ width: '100%', marginTop: '20px', fontSize: '18px', fontWeight: 'bold' }}
            disabled={loading}
          >
            {planId ? 'Update Plan' : 'Create Training Plan (First 4 Weeks)'}
          </button>
          <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '8px', textAlign: 'center' }}>
            {planId
              ? 'This will update your plan details. To generate new weeks, use the dashboard after saving.'
              : 'This will create your plan and generate Weeks 1-4.'}
          </div>
        </form>
      </div>
    </div>
  );
};

export default IntakeForm; 