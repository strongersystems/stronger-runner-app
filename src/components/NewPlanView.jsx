import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import supabase from '../supabaseClient';

const NewPlanView = () => {
  const { planId } = useParams();
  const [plan, setPlan] = useState(null);
  const [weeks, setWeeks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState({});
  const [generatingWeek, setGeneratingWeek] = useState(null);
  const [expandedWeek, setExpandedWeek] = useState(null);
  const [sessionModal, setSessionModal] = useState({ open: false, session: null });

  useEffect(() => {
    fetchPlan();
    fetchAllWeeks();
  }, [planId, fetchPlan, fetchAllWeeks]);

  useEffect(() => {
    if (generatingWeek && weeks.map(w => Number(w.week)).includes(generatingWeek)) {
      setGeneratingWeek(null);
    }
  }, [weeks, generatingWeek]);

  const fetchPlan = async () => {
    try {
      const { data, error } = await supabase
        .from('training_intakes')
        .select('*')
        .eq('id', planId)
        .single();
      if (error) throw error;
      setPlan(data);
    } catch (err) {
      setError('Error loading plan.');
    }
  };

  const fetchAllWeeks = async () => {
    try {
      const { data: plans, error } = await supabase
        .from('training_plans')
        .select('*')
        .eq('intake_id', planId)
        .eq('status', 'complete');
      if (error) throw error;
      if (!plans || plans.length === 0) {
        setWeeks([]);
        return;
      }
      let allWeeks = [];
      for (const p of plans) {
        if (p.plan_json) {
          const planData = typeof p.plan_json === 'string' ? JSON.parse(p.plan_json) : p.plan_json;
          if (planData.weekly_breakdown && Array.isArray(planData.weekly_breakdown)) {
            allWeeks = allWeeks.concat(planData.weekly_breakdown);
          }
        }
      }
      allWeeks.sort((a, b) => Number(a.week) - Number(b.week));
      setWeeks(allWeeks);
    } catch (err) {
      setError('Error loading plan.');
    } finally {
      setLoading(false);
    }
  };

  // Determine unit preference from plan or weeks
  const unitPref = plan?.unitPreference || plan?.unit_preference || weeks[0]?.unit_preference || 'metric';
  const unit = unitPref === 'imperial' ? 'mi' : 'km';
  const paceUnit = unitPref === 'imperial' ? 'min/mile' : 'min/km';

  return (
    <div style={{ maxWidth: 700, margin: '40px auto', padding: 24, background: '#181c23', borderRadius: 16, color: '#fff', boxShadow: '0 4px 24px #0002' }}>
      <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 16, textAlign: 'center', letterSpacing: 1 }}>
        {plan?.plan_title || 'Your Training Plan'}
      </h1>
      {error && <div style={{ color: 'red', marginBottom: 16 }}>{error}</div>}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          {/* If no weeks, show Generate Plan Outline button */}
          {weeks.length === 0 && (
            <div style={{ textAlign: 'center', color: '#aaa', padding: 40 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
              <h3>No weeks generated yet</h3>
              <p>Your plan outline should appear here once it's generated. Check your dashboard for the plan status.</p>
              <button
                onClick={async () => {
                  setGenerating(g => ({ ...g, outline: true }));
                  setError(null);
                  try {
                    // 1. Insert a new pending chunk plan row for Week 1 if one doesn't exist
                    const { data: existing } = await supabase
                      .from('training_plans')
                      .select('*')
                      .eq('intake_id', planId)
                      .eq('week_range', '1-1')
                      .eq('status', 'pending');
                    if (!existing || existing.length === 0) {
                      // Get user_id and prompt from intake
                      const { data: intake } = await supabase
                        .from('training_intakes')
                        .select('*')
                        .eq('id', planId)
                        .single();
                      await supabase.from('training_plans').insert([{
                        user_id: intake.user_id,
                        intake_id: planId,
                        status: 'pending',
                        prompt: intake.prompt || 'Create a running plan.',
                        week_range: '1-1',
                        chunk_type: 'chunk',
                        error_message: null
                      }]);
                    }
                    // 2. Trigger background function with only_week_1 flag and week_number: 1
                    const response = await fetch('/.netlify/functions/generate-plan-background', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ trigger: 'manual', intake_id: planId, only_week_1: true, week_number: 1 })
                    });
                    if (!response.ok) throw new Error('Failed to generate plan outline');
                    await fetchAllWeeks();
                  } catch (err) {
                    setError('Error generating plan outline.');
                  } finally {
                    setGenerating(g => ({ ...g, outline: false }));
                  }
                }}
                disabled={generating.outline}
                style={{
                  padding: '12px 32px',
                  fontSize: 18,
                  borderRadius: 8,
                  background: generating.outline ? '#444' : '#ff6600',
                  color: '#fff',
                  border: 'none',
                  marginTop: 24,
                  cursor: generating.outline ? 'not-allowed' : 'pointer',
                  width: '100%'
                }}
              >
                {generating.outline ? 'Generating Plan Outline...' : 'Generate Plan Outline'}
              </button>
            </div>
          )}

          {/* If some weeks are missing, show Generate Week X button for the earliest missing week */}
          {weeks.length > 0 && (() => {
            // Find the first missing week number
            const weekNumbers = weeks.map(w => Number(w.week)).sort((a, b) => a - b);
            let missingWeek = null;
            for (let i = 1; i <= weekNumbers[weekNumbers.length - 1] + 1; i++) {
              if (!weekNumbers.includes(i)) {
                missingWeek = i;
                break;
              }
            }
            if (missingWeek) {
              const isGenerating = generatingWeek === missingWeek;
              return (
                <div style={{ textAlign: 'center', color: '#aaa', padding: 20 }}>
                  <button
                    onClick={async () => {
                      setGeneratingWeek(missingWeek);
                      setError(null);
                      try {
                        // Insert a new pending chunk plan row for the missing week if one doesn't exist
                        const { data: existing } = await supabase
                          .from('training_plans')
                          .select('*')
                          .eq('intake_id', planId)
                          .eq('week_range', `${missingWeek}-${missingWeek}`)
                          .eq('status', 'pending');
                        if (!existing || existing.length === 0) {
                          // Get user_id and prompt from intake
                          const { data: intake } = await supabase
                            .from('training_intakes')
                            .select('*')
                            .eq('id', planId)
                            .single();
                          await supabase.from('training_plans').insert([{
                            user_id: intake.user_id,
                            intake_id: planId,
                            status: 'pending',
                            prompt: intake.prompt || 'Create a running plan.',
                            week_range: `${missingWeek}-${missingWeek}`,
                            chunk_type: 'chunk',
                            error_message: null
                          }]);
                        }
                        // Trigger background function with only_week_1 flag and week_number: missingWeek
                        const response = await fetch('/.netlify/functions/generate-plan-background', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ trigger: 'manual', intake_id: planId, only_week_1: true, week_number: missingWeek })
                        });
                        if (!response.ok) throw new Error('Failed to generate week');
                        await fetchAllWeeks();
                      } catch (err) {
                        setError('Error generating week ' + missingWeek);
                        setGeneratingWeek(null);
                      }
                    }}
                    disabled={isGenerating}
                    style={{
                      padding: '12px 32px',
                      fontSize: 18,
                      borderRadius: 8,
                      background: isGenerating ? '#444' : '#ff6600',
                      color: '#fff',
                      border: 'none',
                      marginBottom: 24,
                      cursor: isGenerating ? 'not-allowed' : 'pointer',
                      width: '100%'
                    }}
                  >
                    {isGenerating ? `Generating Week ${missingWeek}...` : `Generate Week ${missingWeek}`}
                  </button>
                </div>
              );
            }
            return null;
          })()}

          {/* Show all generated weeks as dropdowns */}
          <div style={{ marginTop: 24 }}>
            {weeks.map((week, idx) => {
              const hasSessionDetails = week.days && week.days.every(day => day.session_details);
              const isExpanded = expandedWeek === week.week;
              return (
                <div key={week.week} style={{
                  background: isExpanded ? '#232733' : '#20232b',
                  borderRadius: 12,
                  marginBottom: 18,
                  boxShadow: isExpanded ? '0 2px 12px #0003' : '0 1px 4px #0002',
                  transition: 'box-shadow 0.2s',
                  overflow: 'hidden'
                }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '18px 28px',
                      cursor: 'pointer',
                      borderBottom: isExpanded ? '1px solid #333' : 'none',
                      background: isExpanded ? '#232733' : '#20232b',
                      fontWeight: 700,
                      fontSize: 22,
                      letterSpacing: 0.5
                    }}
                    onClick={() => setExpandedWeek(isExpanded ? null : week.week)}
                  >
                    <span>Week {week.week}</span>
                    <span style={{ color: '#ffb347', fontWeight: 600, fontSize: 18 }}>Total: {week.total_volume} {unit}</span>
                    <span style={{ fontSize: 18, marginLeft: 12 }}>{isExpanded ? '▲' : '▼'}</span>
                  </div>
                  {isExpanded && (
                    <div style={{ padding: '18px 28px', background: '#232733' }}>
                      <div style={{ color: '#aaa', marginBottom: 10, fontSize: 16 }}>{week.summary}</div>
                      <ul style={{ paddingLeft: 0, marginBottom: 0, listStyle: 'none' }}>
                        {week.days && week.days.map((day, i) => (
                          <li key={i} style={{
                            marginBottom: 14,
                            background: '#20232b',
                            borderRadius: 8,
                            padding: '14px 18px',
                            boxShadow: '0 1px 4px #0001',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}>
                            <div>
                              <b style={{ fontSize: 16 }}>{day.day}:</b> <span style={{ fontWeight: 600 }}>{day.workout}</span> <span style={{ color: '#ffb347', fontWeight: 500 }}>({day.volume} {unit})</span>
                            </div>
                            {day.session_details && (
                              <button
                                style={{
                                  background: '#ff6600',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: 6,
                                  padding: '6px 18px',
                                  fontWeight: 700,
                                  fontSize: 15,
                                  cursor: 'pointer',
                                  boxShadow: '0 1px 6px #0002',
                                  marginLeft: 16
                                }}
                                onClick={() => setSessionModal({ open: true, session: { ...day, week: week.week } })}
                              >
                                View More
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                      {/* Generate Sessions button if needed */}
                      {!hasSessionDetails && (
                        <button
                          onClick={async () => {
                            setGenerating(g => ({ ...g, [`sessions_${week.week}`]: true }));
                            setError(null);
                            try {
                              const response = await fetch('/.netlify/functions/generate-sessions-for-week', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ intake_id: planId, week_number: week.week })
                              });
                              if (!response.ok) throw new Error('Failed to generate sessions');
                              await fetchAllWeeks();
                            } catch (err) {
                              setError('Error generating sessions for week ' + week.week);
                            } finally {
                              setGenerating(g => ({ ...g, [`sessions_${week.week}`]: false }));
                            }
                          }}
                          disabled={generating[`sessions_${week.week}`]}
                          style={{
                            padding: '10px 24px',
                            fontSize: 16,
                            borderRadius: 8,
                            background: generating[`sessions_${week.week}`] ? '#444' : '#ff6600',
                            color: '#fff',
                            border: 'none',
                            marginTop: 12,
                            cursor: generating[`sessions_${week.week}`] ? 'not-allowed' : 'pointer',
                            width: '100%'
                          }}
                        >
                          {generating[`sessions_${week.week}`] ? 'Generating Sessions...' : 'Generate Sessions'}
                        </button>
                      )}
                      {hasSessionDetails && (
                        <div style={{ marginTop: 12, color: '#4ade80', fontWeight: 600, fontSize: 16 }}>
                          Week {week.week} Complete ✓
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Session Details Modal */}
          {sessionModal.open && (
            <div style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.55)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
              onClick={() => setSessionModal({ open: false, session: null })}
            >
              <div
                style={{
                  background: '#232733',
                  borderRadius: 14,
                  padding: '32px 36px',
                  minWidth: 340,
                  maxWidth: 420,
                  boxShadow: '0 4px 32px #0006',
                  color: '#fff',
                  position: 'relative',
                  cursor: 'auto'
                }}
                onClick={e => e.stopPropagation()}
              >
                <button
                  onClick={() => setSessionModal({ open: false, session: null })}
                  style={{
                    position: 'absolute',
                    top: 12, right: 16,
                    background: 'none',
                    border: 'none',
                    color: '#fff',
                    fontSize: 22,
                    cursor: 'pointer',
                    fontWeight: 700
                  }}
                  title="Close"
                >×</button>
                <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
                  Week {sessionModal.session.week} - {sessionModal.session.day}
                </h2>
                <div style={{ color: '#ffb347', fontWeight: 600, marginBottom: 8 }}>{sessionModal.session.workout} ({sessionModal.session.volume} {unit})</div>
                <div style={{ marginBottom: 10, color: '#aaa', fontSize: 15 }}>{sessionModal.session.session_details?.brief}</div>
                <div style={{ marginBottom: 8 }}><b>Target Pace:</b> {sessionModal.session.session_details?.target_pace} {paceUnit}</div>
                <div style={{ marginBottom: 8 }}><b>Effort:</b> {sessionModal.session.session_details?.effort_level}</div>
                <div style={{ marginBottom: 8 }}><b>Tips:</b> {sessionModal.session.session_details?.tips?.join('; ')}</div>
                <div style={{ marginBottom: 8 }}><b>Equipment:</b> {sessionModal.session.session_details?.equipment?.join(', ')}</div>
                {/* No warmup/cooldown shown */}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default NewPlanView; 