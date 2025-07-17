import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import supabase from '../supabaseClient';

const IntakeForm = () => {
  const navigate = useNavigate();
  const { planId } = useParams();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    age: '',
    weight: '',
    height: '',
    trainingFor: 'Marathon',
    planLength: '12 Weeks',
    trainingHistory: '',
    weeklyTime: 8,
    unitPreference: 'metric',
    trainingIntensity: 'hr',
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
        const { data } = await supabase
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
            unitPreference: data.unit_preference || 'metric',
            trainingIntensity: data.training_intensity || 'hr',
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

  // If current mileage is above new max, clamp it
  useEffect(() => {
    if (formData.weeklyMileage > mileageMax) {
      setFormData(prev => ({ ...prev, weeklyMileage: mileageMax }));
    }
  }, [formData.unitPreference, formData.weeklyMileage, mileageMax]);

  const handleInputChange = (e) => {
    const { name, value, checked } = e.target;
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
    setSuccess('');
    setIsGenerating(true);

    if (!user) {
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
        unit_preference: formData.unitPreference,
        training_intensity: formData.trainingIntensity,
        max_hr: formData.max_hr ? parseInt(formData.max_hr) : null,
        resting_hr: formData.resting_hr ? parseInt(formData.resting_hr) : null,
        days_per_week: formData.daysPerWeek,
        other_requests: formData.otherRequests,
        starting_volume: formData.startingVolume ? parseFloat(formData.startingVolume) : null,
        max_volume: formData.maxVolume ? parseFloat(formData.maxVolume) : null,
        ai_choose_max_volume: formData.aiChooseMaxVolume,
        // Add a detailed prompt for the backend
        prompt: `CRITICAL USER REQUIREMENTS:\n- The plan must be ${formData.planLength}.\n- The first week's total_volume must be no more than ${formData.startingVolume || "the user's current weekly volume"} (${formData.unitPreference === 'imperial' ? 'mi' : 'km'}), and should start at or below the user's current or a safe starting volume.\n- The final week's total_volume must be no more than ${formData.maxVolume || "the user's maximum weekly volume"} (${formData.unitPreference === 'imperial' ? 'mi' : 'km'}).\n- Weekly total_volume should increase gradually, with no more than a 10% increase per week, ramping up from the starting volume to the max volume over the full plan length.\n- For each week, total_volume must always equal the sum of the daily volumes.\n- Long runs must never exceed 3 hours or 20-24 miles (32-38 km) for non-elite runners, and should build up gradually. In early weeks, the long run should be a safe, reasonable percentage of the weekly total (e.g., 20-30%), and only allow longer for elite athletes with a clear rationale.\n- All volumes and paces must use the user's selected units: ${formData.unitPreference === 'imperial' ? 'mi' : 'km'}.\n- The plan should be progressive, safe, and tailored to the user's experience and goals.\n- Take into account the user's training history, goals, and available time per week.\n${formData.otherRequests ? `- Additional user requests: ${formData.otherRequests}` : ''}`
      };

      let data;
      if (planId) {
        // Update existing plan
        dbData.updated_at = new Date().toISOString();
        ({ data } = await supabase
          .from('training_intakes')
          .update(dbData)
          .eq('id', planId)
          .select());
      } else {
        // Create new plan
        dbData.created_at = new Date().toISOString();
        ({ data } = await supabase
          .from('training_intakes')
          .insert([dbData])
          .select());
      }

      setSuccess(planId ? 'Plan updated!' : 'Plan outline created! You can now generate detailed sessions for each week.');
      setLoading(false);
      
      // Always navigate to dashboard after submit
      navigate(`/new-plan/${data[0].id}`);
    } catch (error) {
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
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
      <div className="card" style={{ maxWidth: 420, width: '100%', textAlign: 'center', padding: 40, background: '#23272f', borderRadius: 16 }}>
        <h1 style={{ color: '#fc5200', fontSize: 32, fontWeight: 800, marginBottom: 18 }}>Create A Plan</h1>
        <p style={{ color: '#ffe066', fontSize: 20, marginBottom: 32 }}>Coming Soon!</p>
        <button disabled style={{ width: '100%', background: '#888', color: '#fff', border: 'none', borderRadius: 8, padding: '16px', fontWeight: 700, fontSize: 18, opacity: 0.7, cursor: 'not-allowed' }}>
          🚧 Coming Soon 🚧
        </button>
      </div>
    </div>
  );
};

export default IntakeForm; 