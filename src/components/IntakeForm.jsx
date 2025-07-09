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
    name: '',
    email: '',
    phone: '',
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
    maxHr: '',
    restingHr: ''
  });

  const [user, setUser] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

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

      setSuccess('Form submitted successfully!');
      setTimeout(() => {
        navigate('/predictor');
      }, 2000);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderHrZones = () => {
    const max = parseInt(formData.maxHr);
    if (!max || max < 100) return null;

    const zones = {
      z1: [Math.round(max * 0.5), Math.round(max * 0.6)],
      z2: [Math.round(max * 0.6), Math.round(max * 0.7)],
      z3: [Math.round(max * 0.7), Math.round(max * 0.8)],
      z4: [Math.round(max * 0.8), Math.round(max * 0.9)],
      z5: [Math.round(max * 0.9), max]
    };

    return (
      <div style={{ marginTop: '15px' }}>
        <div style={{
          height: '40px',
          display: 'flex',
          borderRadius: '6px',
          overflow: 'hidden'
        }}>
          <div style={{
            flex: 1,
            background: 'linear-gradient(to right, #a8e6cf, #2ecc71)',
            color: '#000',
            textAlign: 'center',
            fontSize: '12px',
            lineHeight: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column'
          }}>
            Z1: {zones.z1[0]}-{zones.z1[1]} bpm
          </div>
          <div style={{
            flex: 1,
            background: 'linear-gradient(to right, #74b9ff, #3498db)',
            color: '#fff',
            textAlign: 'center',
            fontSize: '12px',
            lineHeight: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column'
          }}>
            Z2: {zones.z2[0]}-{zones.z2[1]} bpm
          </div>
          <div style={{
            flex: 1,
            background: 'linear-gradient(to right, #ffeaa7, #f1c40f)',
            color: '#000',
            textAlign: 'center',
            fontSize: '12px',
            lineHeight: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column'
          }}>
            Z3: {zones.z3[0]}-{zones.z3[1]} bpm
          </div>
          <div style={{
            flex: 1,
            background: 'linear-gradient(to right, #fab1a0, #e67e22)',
            color: '#fff',
            textAlign: 'center',
            fontSize: '12px',
            lineHeight: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column'
          }}>
            Z4: {zones.z4[0]}-{zones.z4[1]} bpm
          </div>
          <div style={{
            flex: 1,
            background: 'linear-gradient(to right, #ff7675, #e74c3c)',
            color: '#fff',
            textAlign: 'center',
            fontSize: '12px',
            lineHeight: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column'
          }}>
            Z5: {zones.z5[0]}-{zones.z5[1]} bpm
          </div>
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
          color: 'var(--neon-cyan)', 
          textShadow: '0 0 10px var(--neon-cyan)',
          marginBottom: '30px'
        }}>
          Marathon Training Intake Form
        </h1>

        {error && (
          <div style={{ 
            background: 'rgba(255, 0, 0, 0.1)', 
            color: '#ff6b6b', 
            padding: '10px', 
            borderRadius: '5px', 
            marginBottom: '20px',
            border: '1px solid #ff6b6b'
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ 
            background: 'rgba(0, 255, 0, 0.1)', 
            color: '#51cf66', 
            padding: '10px', 
            borderRadius: '5px', 
            marginBottom: '20px',
            border: '1px solid #51cf66'
          }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Personal Information */}
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ color: 'var(--neon-cyan)', marginBottom: '15px' }}>Personal Information</h3>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ 
                display: 'block', 
                color: 'var(--neon-cyan)', 
                marginBottom: '5px' 
              }}>
                Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ 
                display: 'block', 
                color: 'var(--neon-cyan)', 
                marginBottom: '5px' 
              }}>
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ 
                display: 'block', 
                color: 'var(--neon-cyan)', 
                marginBottom: '5px' 
              }}>
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  color: 'var(--neon-cyan)', 
                  marginBottom: '5px' 
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
                  color: 'var(--neon-cyan)', 
                  marginBottom: '5px' 
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
                  color: 'var(--neon-cyan)', 
                  marginBottom: '5px' 
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
            <h3 style={{ color: 'var(--neon-cyan)', marginBottom: '15px' }}>Training Information</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  color: 'var(--neon-cyan)', 
                  marginBottom: '5px' 
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
                  color: 'var(--neon-cyan)', 
                  marginBottom: '5px' 
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
                color: 'var(--neon-cyan)', 
                marginBottom: '5px' 
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
            <h3 style={{ color: 'var(--neon-cyan)', marginBottom: '15px' }}>Training Preferences</h3>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                color: 'var(--neon-cyan)', 
                marginBottom: '5px' 
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
                color: 'var(--neon-cyan)', 
                marginBottom: '5px' 
              }}>
                Recent Weekly Average Mileage: {formData.weeklyMileage} {formData.unitPreference === 'metric' ? 'km' : 'miles'}
              </label>
              <input
                type="range"
                min="5"
                max="100"
                value={formData.weeklyMileage}
                onChange={(e) => handleSliderChange('weeklyMileage', e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                color: 'var(--neon-cyan)', 
                marginBottom: '5px' 
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
          </div>

          {/* Training Intensity */}
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ color: 'var(--neon-cyan)', marginBottom: '15px' }}>Training Intensity</h3>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ 
                display: 'block', 
                color: 'var(--neon-cyan)', 
                marginBottom: '5px' 
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
                  color: 'var(--neon-cyan)', 
                  marginBottom: '5px' 
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
                    color: 'var(--neon-cyan)', 
                    marginBottom: '5px' 
                  }}>
                    Max HR
                  </label>
                  <input
                    type="number"
                    name="maxHr"
                    value={formData.maxHr}
                    onChange={handleInputChange}
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ 
                    display: 'block', 
                    color: 'var(--neon-cyan)', 
                    marginBottom: '5px' 
                  }}>
                    Resting HR
                  </label>
                  <input
                    type="number"
                    name="restingHr"
                    value={formData.restingHr}
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
            {loading ? 'Submitting...' : 'Submit Form'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default IntakeForm; 