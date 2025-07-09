import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';

const IntakeForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    age: '',
    weight: '',
    height: '',
    trainingFor: 'Marathon',
    planLength: '16 Weeks',
    trainingHistory: '',
    weeklyTime: 8,
    weeklyMileage: 40,
    unitPreference: 'metric',
    trainingIntensity: 'rpe',
    rpeFamiliarity: 'Somewhat',
    max_hr: '',
    resting_hr: ''
  });

  const [user, setUser] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  // Update mileage max when unit changes
  const mileageMax = formData.unitPreference === 'metric' ? 160 : 100;
  const mileageLabel = formData.unitPreference === 'metric' ? 'km' : 'miles';

  // If current mileage is above new max, clamp it
  useEffect(() => {
    if (formData.weeklyMileage > mileageMax) {
      setFormData(prev => ({ ...prev, weeklyMileage: mileageMax }));
    }
  }, [formData.unitPreference]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!user) {
      setError('You must be logged in to submit this form');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('training_intakes')
        .insert([
          {
            user_id: user.id,
            ...formData,
            created_at: new Date().toISOString()
          }
        ]);

      if (error) throw error;

      setSuccess('Training plan created successfully!');
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error) {
      setError(error.message);
    } finally {
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
          Create Training Plan
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
                  Weight ({formData.unitPreference === 'metric' ? 'kg' : 'lbs'})
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
                  Height ({formData.unitPreference === 'metric' ? 'cm' : 'inches'})
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
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                color: 'var(--text-light)', 
                marginBottom: '8px',
                fontWeight: '500'
              }}>
                Recent Weekly Average Mileage: {formData.weeklyMileage} {mileageLabel}
              </label>
              <input
                type="range"
                min="5"
                max={mileageMax}
                value={formData.weeklyMileage}
                onChange={(e) => handleSliderChange('weeklyMileage', e.target.value)}
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

          <button
            type="submit"
            className="btn"
            disabled={loading}
            style={{ width: '100%', fontSize: '16px', padding: '15px' }}
          >
            {loading ? 'Creating Plan...' : 'Create Training Plan'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default IntakeForm; 