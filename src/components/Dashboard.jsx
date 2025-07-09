import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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

  const fetchSavedPlans = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('training_intakes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSavedPlans(data || []);
      
      // Calculate stats
      const totalPlans = data?.length || 0;
      const totalMileage = data?.reduce((sum, plan) => sum + (plan.weekly_mileage || 0), 0) || 0;
      const averageWeeklyTime = data?.length ? 
        data.reduce((sum, plan) => sum + (plan.weekly_time || 0), 0) / data.length : 0;

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
      {/* Header */}
      <div className="card fade-in" style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ 
              color: 'var(--text-light)', 
              fontSize: '28px',
              fontWeight: '700',
              marginBottom: '8px'
            }}>
              Welcome back, {user?.email?.split('@')[0]}! 👋
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '16px' }}>
              Ready to crush your next race? Let's see your training progress.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Link to="/intake" className="btn">
              + New Plan
            </Link>
            <Link to="/predictor" className="btn btn-secondary">
              Race Predictor
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '20px' 
        }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)',
            padding: '20px',
            borderRadius: '12px',
            color: 'white',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>
              {stats.totalPlans}
            </div>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>Training Plans</div>
          </div>
          
          <div style={{
            background: 'linear-gradient(135deg, var(--accent) 0%, var(--success) 100%)',
            padding: '20px',
            borderRadius: '12px',
            color: 'white',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>
              {stats.totalMileage}
            </div>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>Total Mileage</div>
          </div>
          
          <div style={{
            background: 'linear-gradient(135deg, var(--secondary) 0%, #8b5cf6 100%)',
            padding: '20px',
            borderRadius: '12px',
            color: 'white',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>
              {stats.averageWeeklyTime}h
            </div>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>Avg Weekly Time</div>
          </div>
        </div>
      </div>

      {/* Saved Plans */}
      <div className="card fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ 
            color: 'var(--text-light)', 
            fontSize: '24px',
            fontWeight: '600'
          }}>
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
                      Mileage
                    </div>
                    <div style={{ color: 'var(--text-light)', fontWeight: '600' }}>
                      {plan.weekly_mileage} {plan.unit_preference === 'metric' ? 'km' : 'mi'}
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
                      {plan.weight} {plan.unit_preference === 'metric' ? 'kg' : 'lbs'}
                    </div>
                  </div>
                </div>

                <div style={{ 
                  display: 'flex', 
                  gap: '8px',
                  borderTop: '1px solid var(--border)',
                  paddingTop: '16px'
                }}>
                  <button className="btn-secondary" style={{ flex: 1, fontSize: '12px', padding: '8px 16px' }}>
                    View Details
                  </button>
                  <button className="btn-secondary" style={{ flex: 1, fontSize: '12px', padding: '8px 16px' }}>
                    Edit Plan
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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