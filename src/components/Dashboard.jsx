import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [savedPlans, setSavedPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPlans: 0,
    totalMileage: 0,
    averageWeeklyTime: 0
  });
  const [savedPredictions, setSavedPredictions] = useState([]);
  const [showPredictionModal, setShowPredictionModal] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState(null);
  const [editMode, setEditMode] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        fetchSavedPlans(user.id);
      }
    };
    getUser();
  }, []);

  // Fetch predictions for the user
  useEffect(() => {
    const fetchPredictions = async (userId) => {
      const { data, error } = await supabase
        .from('predictions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (!error && data) setSavedPredictions(data);
    };
    const getUserAndPredictions = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) fetchPredictions(user.id);
    };
    getUserAndPredictions();
  }, []);

  const fetchSavedPlans = async (userId) => {
    try {
      // Fetch both intakes and AI-generated plans
      const { data: intakes, error: intakesError } = await supabase
        .from('training_intakes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (intakesError) throw intakesError;

      const { data: aiPlans, error: plansError } = await supabase
        .from('training_plans')
        .select('*, training_intakes(*)')
        .eq('user_id', userId)
        .order('generated_at', { ascending: false });

      if (plansError) throw plansError;

      // Combine intakes with their AI plans
      const plansWithAI = intakes?.map(intake => {
        const relatedPlans = aiPlans?.filter(plan => plan.intake_id === intake.id) || [];
        // Determine overall status: if any chunk is pending, status is pending; else if any complete, status is complete; else null
        let overallStatus = null;
        if (relatedPlans.some(p => p.status === 'pending')) {
          overallStatus = 'pending';
        } else if (relatedPlans.some(p => p.status === 'complete')) {
          overallStatus = 'complete';
        }
        return {
          ...intake,
          ai_plan: {
            status: overallStatus,
            // Optionally, include more info if needed
          }
        };
      }) || [];

      setSavedPlans(plansWithAI);
      
      // Calculate stats
      const totalPlans = plansWithAI?.length || 0;
      const totalMileage = plansWithAI?.reduce((sum, plan) => sum + (plan.weekly_mileage || 0), 0) || 0;
      const averageWeeklyTime = plansWithAI?.length ? 
        plansWithAI.reduce((sum, plan) => sum + (plan.weekly_time || 0), 0) / plansWithAI.length : 0;

      setStats({
        totalPlans,
        totalMileage,
        averageWeeklyTime: Math.round(averageWeeklyTime)
      });
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  // Delete plan and all associated records
  const handleDeletePlan = useCallback(async (planId) => {
    if (!window.confirm('Are you sure you want to delete this plan? This action is permanent and cannot be undone.')) return;
    setLoading(true);
    try {
      // Delete all associated training_plans
      await supabase.from('training_plans').delete().eq('intake_id', planId);
      // Delete the intake itself
      await supabase.from('training_intakes').delete().eq('id', planId);
      // Refresh plans
      if (user) fetchSavedPlans(user.id);
    } catch (err) {
      alert('Failed to delete plan.');
      console.error('Delete plan error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const handleDeletePrediction = async (id) => {
    if (!window.confirm('Are you sure you want to delete this prediction? This action cannot be undone.')) return;
    await supabase.from('predictions').delete().eq('id', id);
    setSavedPredictions(preds => preds.filter(p => p.id !== id));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDistanceIcon = (distance) => {
    const icons = {
      '5K': '🏃‍♂️',
      '10K': '🏃‍♂️',
      'Half Marathon': '🏃‍♂️',
      'Marathon': '🏃‍♂️'
    };
    return icons[distance] || '🏃‍♂️';
  };

  const getIntensityColor = (intensity) => {
    const colors = {
      'rpe': 'var(--warning)',
      'hr': 'var(--error)'
    };
    return colors[intensity] || 'var(--text-muted)';
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh',
        color: 'var(--text-muted)'
      }}>
        Loading your dashboard...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      {/* Race Predictor Card - moved to top */}
      <div className="card fade-in" style={{ marginBottom: '32px', background: 'linear-gradient(135deg, var(--secondary) 0%, #8b5cf6 100%)', color: 'white', textAlign: 'center', padding: '32px 20px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: 12 }}>Race Predictor</h1>
        <p style={{ fontSize: '1.1rem', marginBottom: 18 }}>Predict your race times and generate pace bands for your next event.</p>
        <Link to="/predictor" className="btn btn-secondary" style={{ fontSize: 18, padding: '12px 32px', borderRadius: 8, fontWeight: 700 }}>Go to Race Predictor</Link>
      </div>

      {/* Optionally keep a minimal stats summary below */}
      {/*
      <div className="card fade-in" style={{ marginBottom: '32px', background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
          <div style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 22 }}>Plans: {stats.totalPlans}</div>
          <div style={{ color: 'var(--success)', fontWeight: 700, fontSize: 22 }}>Volume: {stats.totalMileage}</div>
          <div style={{ color: '#8b5cf6', fontWeight: 700, fontSize: 22 }}>Avg Weekly: {stats.averageWeeklyTime}h</div>
        </div>
      </div>
      */}

      {/* Saved Race Predictions - moved to top */}
      <div className="card fade-in" style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ color: 'var(--text-light)', fontSize: '24px', fontWeight: '600' }}>
            Saved Race Predictions
          </h2>
        </div>
        {savedPredictions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>⏱️</div>
            <h3 style={{ fontSize: '18px', marginBottom: '8px', color: 'var(--text-light)' }}>
              No predictions saved yet
            </h3>
            <p>Use the Race Predictor to save your first prediction.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '18px' }}>
            {savedPredictions.map(pred => (
              <div
                key={pred.id}
                className="card card-hover"
                style={{ cursor: 'pointer', border: '2px solid var(--primary)', padding: 18, background: '#181c24', position: 'relative' }}
              >
                <div style={{ fontWeight: 700, color: 'var(--neon-cyan)', fontSize: 18, marginBottom: 6 }}>
                  {new Date(pred.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </div>
                <div style={{ color: 'var(--text-light)', fontSize: 15 }}>
                  {pred.prediction?.splitRace || 'Race'} ({pred.prediction?.splitIsImperial ? 'mi' : 'km'})
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
                  {pred.prediction?.raceEntries?.map((e, i) => `${e.distance}: ${e.h}h ${e.m}m ${e.s}s`).join(', ')}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button
                    className="btn-secondary"
                    style={{ fontSize: 13, padding: '6px 16px', borderRadius: 6 }}
                    onClick={() => { setSelectedPrediction(pred); setShowPredictionModal(true); }}
                  >
                    View
                  </button>
                  <button
                    className="btn-secondary"
                    style={{ fontSize: 13, padding: '6px 16px', borderRadius: 6 }}
                    onClick={() => navigate(`/predictor/${pred.id}`)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn-secondary"
                    style={{ fontSize: 13, padding: '6px 10px', borderRadius: 6, background: '#ef4444', color: '#fff', display: 'inline-flex', alignItems: 'center' }}
                    title="Delete Prediction"
                    onClick={() => handleDeletePrediction(pred.id)}
                  >
                    <span style={{ fontSize: 18 }}>🗑️</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Your Training Plans - now below predictions */}
      <div className="card fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ color: 'var(--text-light)', fontSize: '24px', fontWeight: '600' }}>
            Your Training Plans
          </h2>
          <Link to="/intake" className="btn">
            Create New Plan
          </Link>
        </div>

        {savedPlans.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px',
            color: 'var(--text-muted)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
            <h3 style={{ fontSize: '20px', marginBottom: '8px', color: 'var(--text-light)' }}>
              No training plans yet
            </h3>
            <p style={{ marginBottom: '24px' }}>
              Create your first training plan to get started on your running journey.
            </p>
            <Link to="/intake" className="btn">
              Create Your First Plan
            </Link>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
            gap: '20px' 
          }}>
            {savedPlans.map((plan, index) => (
              <div 
                key={plan.id} 
                className="card card-hover fade-in"
                style={{ 
                  animationDelay: `${index * 0.1}s`,
                  cursor: 'pointer'
                }}
                onClick={() => {/* TODO: View plan details */}}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontSize: '24px' }}>
                      {getDistanceIcon(plan.training_for)}
                    </div>
                    <div>
                      <h3 style={{ 
                        color: 'var(--text-light)', 
                        fontSize: '18px',
                        fontWeight: '600',
                        marginBottom: '4px'
                      }}>
                        {plan.training_for} Training
                      </h3>
                      <p style={{ 
                        color: 'var(--text-muted)', 
                        fontSize: '14px' 
                      }}>
                        {plan.plan_length} • {formatDate(plan.created_at)}
                      </p>
                    </div>
                  </div>
                  <div style={{
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '600',
                    background: getIntensityColor(plan.training_intensity),
                    color: 'white'
                  }}>
                    {plan.training_intensity?.toUpperCase()}
                  </div>
                </div>

                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(2, 1fr)', 
                  gap: '12px',
                  marginBottom: '16px'
                }}>
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '4px' }}>
                      Weekly Time
                    </div>
                    <div style={{ color: 'var(--text-light)', fontWeight: '600' }}>
                      {plan.weekly_time}h
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '4px' }}>
                      Volume
                    </div>
                    <div style={{ color: 'var(--text-light)', fontWeight: '600' }}>
                      {/* Show weekly volume range if available, else fallback to intake values, else dash */}
                      {plan.weekly_breakdown && plan.weekly_breakdown.length > 0
                        ? (() => {
                            const vols = plan.weekly_breakdown.map(w => Number(w.total_volume)).filter(Boolean);
                            if (vols.length === 0) return '-';
                            const min = Math.min(...vols);
                            const max = Math.max(...vols);
                            return min === max ? `${min} ${plan.unit_preference === 'imperial' ? 'mi' : 'km'}` : `${min} - ${max} ${plan.unit_preference === 'imperial' ? 'mi' : 'km'}`;
                          })()
                        : (plan.starting_volume && plan.max_volume
                            ? `${plan.starting_volume} - ${plan.max_volume} ${plan.unit_preference === 'imperial' ? 'mi' : 'km'}`
                            : '-')}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '4px' }}>
                      Age
                    </div>
                    <div style={{ color: 'var(--text-light)', fontWeight: '600' }}>
                      {plan.age || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '4px' }}>
                      Weight
                    </div>
                    <div style={{ color: 'var(--text-light)', fontWeight: '600' }}>
                      {plan.weight} kg
                    </div>
                  </div>
                </div>

                {plan.ai_plan ? (
                  <div style={{ 
                    background: plan.ai_plan.status === 'pending'
                      ? 'var(--warning)'
                      : 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)',
                    padding: '12px',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    color: 'white',
                    fontSize: '12px',
                    textAlign: 'center',
                    fontWeight: '600'
                  }}>
                    {plan.ai_plan.status === 'pending'
                      ? '⏳ Generating AI Plan...'
                      : '🤖 AI-Generated Plan Ready'}
                  </div>
                ) : (
                  <div style={{ 
                    background: 'var(--warning)',
                    padding: '12px',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    color: 'white',
                    fontSize: '12px',
                    textAlign: 'center',
                    fontWeight: '600'
                  }}>
                    ⏳ Generating AI Plan...
                  </div>
                )}

                <div style={{ 
                  display: 'flex', 
                  gap: '8px',
                  borderTop: '1px solid var(--border)',
                  paddingTop: '16px'
                }}>
                  <Link to={`/new-plan/${plan.id}`} style={{ flex: 1, textDecoration: 'none' }}>
                    <button className="btn-secondary" style={{ width: '100%', fontSize: '12px', padding: '8px 16px' }}>
                      {plan.ai_plan ? 'View AI Plan' : 'View Details'}
                    </button>
                  </Link>
                  <Link to={`/intake/${plan.id}`} style={{ flex: 1, textDecoration: 'none' }}>
                    <button className="btn-secondary" style={{ width: '100%', fontSize: '12px', padding: '8px 16px' }}>
                      Edit Plan
                    </button>
                  </Link>
                  <button
                    className="btn-secondary"
                    style={{ 
                      width: '40px', 
                      height: '40px', 
                      padding: '8px', 
                      background: 'var(--error)', 
                      color: 'white',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '16px',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePlan(plan.id);
                    }}
                    title="Delete Plan"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Prediction Modal/Lightbox */}
      {showPredictionModal && selectedPrediction && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => { setShowPredictionModal(false); setEditMode(false); }}>
          <div style={{ background: '#23272f', borderRadius: 16, padding: 32, minWidth: 320, maxWidth: 420, color: 'var(--text-light)', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => { setShowPredictionModal(false); setEditMode(false); }} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer' }}>×</button>
            <h2 style={{ color: 'var(--neon-cyan)', marginBottom: 10 }}>{editMode ? 'Edit Prediction' : 'Prediction Details'}</h2>
            {/* Editable fields if in edit mode */}
            {editMode ? (
              <EditPredictionForm prediction={selectedPrediction} onSave={handleUpdatePrediction} onCancel={() => setEditMode(false)} />
            ) : (
              <>
                <div style={{ marginBottom: 10, color: '#ffe066', fontWeight: 700 }}>
                  {selectedPrediction.prediction?.splitRace} ({selectedPrediction.prediction?.splitIsImperial ? 'mi' : 'km'})
                </div>
                <div style={{ marginBottom: 10 }}>
                  <strong>Saved:</strong> {new Date(selectedPrediction.created_at).toLocaleString()}
                </div>
                <div style={{ marginBottom: 10 }}>
                  <strong>Inputs:</strong>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {selectedPrediction.prediction?.raceEntries?.map((e, i) => (
                      <li key={i}>{e.distance}: {e.h}h {e.m}m {e.s}s</li>
                    ))}
                  </ul>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <strong>Predicted Times:</strong>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {selectedPrediction.prediction?.results && Object.entries(selectedPrediction.prediction.results).map(([dist, res], i) => (
                      <li key={i}>{dist}: {res.predicted ? secondsToTime(res.predicted) : '-'} (±4%: {res.predicted ? `${secondsToTime(res.predicted * 0.96)} - ${secondsToTime(res.predicted * 1.04)}` : '-'})</li>
                    ))}
                  </ul>
                </div>
                <div style={{ textAlign: 'center', marginTop: 18 }}>
                  <button
                    className="btn"
                    style={{ fontSize: 16, padding: '8px 24px', borderRadius: 8, background: '#3b82f6', color: '#fff', fontWeight: 700, boxShadow: '0 2px 8px 0 rgba(59,130,246,0.15)', cursor: 'pointer' }}
                    onClick={() => { setShowPredictionModal(false); navigate(`/predictor/${selectedPrediction.id}`); }}
                  >
                    View Splits
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="card fade-in">
        <h2 style={{ 
          color: 'var(--text-light)', 
          fontSize: '24px',
          fontWeight: '600',
          marginBottom: '20px'
        }}>
          Quick Actions
        </h2>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '16px' 
        }}>
          <Link to="/intake" style={{ textDecoration: 'none' }}>
            <div className="card card-hover" style={{ textAlign: 'center', padding: '24px' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>📝</div>
              <h3 style={{ color: 'var(--text-light)', marginBottom: '8px' }}>Create New Plan</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                Start a new training plan for your next race
              </p>
            </div>
          </Link>
          
          <Link to="/predictor" style={{ textDecoration: 'none' }}>
            <div className="card card-hover" style={{ textAlign: 'center', padding: '24px' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏱️</div>
              <h3 style={{ color: 'var(--text-light)', marginBottom: '8px' }}>Race Predictor</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                Predict your race times and generate pace bands
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 

// Helper to format seconds as HH:MM:SS
function secondsToTime(seconds) {
  if (!seconds && seconds !== 0) return '-';
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hours) return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
} 

function EditPredictionForm({ prediction, onSave, onCancel }) {
  const [form, setForm] = useState({ ...prediction.prediction });
  const [saving, setSaving] = useState(false);
  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };
  // For simplicity, only allow editing splitTargetTime and splitRace here
  return (
    <form onSubmit={async e => {
      e.preventDefault();
      setSaving(true);
      await onSave(prediction.id, form);
      setSaving(false);
    }}>
      <div style={{ marginBottom: 12 }}>
        <label style={{ color: '#6ec1e4', fontWeight: 700 }}>Race Type:</label>
        <select value={form.splitRace} onChange={e => handleChange('splitRace', e.target.value)} style={{ marginLeft: 8, padding: 6, borderRadius: 6 }}>
          <option value="Marathon">Marathon</option>
          <option value="Half Marathon">Half Marathon</option>
        </select>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ color: '#6ec1e4', fontWeight: 700 }}>Target Time:</label>
        <input type="text" value={form.splitTargetTime} onChange={e => handleChange('splitTargetTime', e.target.value)} style={{ marginLeft: 8, padding: 6, borderRadius: 6 }} />
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
        <button type="submit" className="btn" style={{ padding: '8px 24px', borderRadius: 6 }} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        <button type="button" className="btn-secondary" style={{ padding: '8px 24px', borderRadius: 6 }} onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

async function handleUpdatePrediction(id, updatedPrediction) {
  await supabase.from('predictions').update({ prediction: updatedPrediction }).eq('id', id);
  // Optionally, refresh predictions list here
  window.location.reload();
} 