import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';
import StructuredPlanView from './StructuredPlanView';
import EditPlan from './EditPlan';

const safeRender = (value) => {
  if (typeof value === 'object' && value !== null) {
    return <pre style={{fontSize:'12px', background:'#222', color:'#fff', padding:'4px', borderRadius:'4px', overflowX:'auto'}}>{JSON.stringify(value, null, 2)}</pre>;
  }
  if (Array.isArray(value)) {
    return value.map((v, i) => <span key={i}>{safeRender(v)}{i < value.length - 1 ? ', ' : ''}</span>);
  }
  return value;
};

const ViewPlan = () => {
  const { planId } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [aiPlan, setAiPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [regenerating, setRegenerating] = useState(false);
  const [waitSeconds, setWaitSeconds] = useState(0);
  // Remove showEdit and handleEditSave/handleEditCancel

  // Main effect: fetch and parse plan, set up polling
  useEffect(() => {
    setLoading(true);
    const fetchPlan = async () => {
      try {
        // Fetch the intake data
        const { data: intakeData, error: intakeError } = await supabase
          .from('training_intakes')
          .select('*')
          .eq('id', planId)
          .single();

        if (intakeError) throw intakeError;

        // Fetch all AI-generated plans for this intake
        const { data: aiPlanData } = await supabase
          .from('training_plans')
          .select('*')
          .eq('intake_id', planId)
          .order('created_at', { ascending: true });

        setPlan(intakeData);

        // Parse and combine all plan data
        if (aiPlanData && aiPlanData.length > 0) {
          // Find the main plan (full plan) or the first complete plan
          const mainPlan = aiPlanData.find(p => p.chunk_type === 'full' && p.status === 'complete') || 
                          aiPlanData.find(p => p.status === 'complete');
          
          // Find all chunk plans (all statuses)
          let chunkPlans = aiPlanData.filter(p => p.chunk_type === 'chunk');
          // Only use the most recent chunk for each week_range
          const latestChunks = {};
          chunkPlans.forEach(chunk => {
            if (!latestChunks[chunk.week_range] || new Date(chunk.created_at) > new Date(latestChunks[chunk.week_range].created_at)) {
              latestChunks[chunk.week_range] = chunk;
            }
          });
          const latestChunkList = Object.values(latestChunks);
          // Debug: log all latest chunk plans and their statuses
          console.log('Latest chunk plans:', latestChunkList.map(p => ({week_range: p.week_range, status: p.status, id: p.id})));
          console.log('All chunk plans found:', aiPlanData.map(p => ({week_range: p.week_range, status: p.status, chunk_type: p.chunk_type, id: p.id})));
          // Instead of grouping by week_range, just collect all valid weeks from all latest chunks
          let allWeeks = [];
          let parseErrors = [];
          latestChunkList.forEach(chunk => {
            try {
              const chunkData = chunk.plan_json || JSON.parse(chunk.plan_content || '{}');
              if (Array.isArray(chunkData.weekly_breakdown)) {
                let [start, end] = (chunk.week_range || '').split('-').map(Number);
                chunkData.weekly_breakdown.forEach(w => {
                  // Always create a new object with a guaranteed 'week' property
                  const weekNum = w.week !== undefined ? w.week : (w.week_number !== undefined ? w.week_number : undefined);
                  if (weekNum !== undefined) {
                    allWeeks.push({
                      ...w,
                      week: weekNum, // Always use 'week' property
                      _chunkRangeStart: start,
                      _chunkRangeEnd: end
                    });
                  }
                });
              } else {
                console.warn('Chunk has no weekly_breakdown array:', chunk.week_range, chunkData);
              }
            } catch (error) {
              console.error('Error parsing chunk plan:', error);
              parseErrors.push({ week_range: chunk.week_range, error: error.message });
            }
          });
          // Sort all weeks by week number
          allWeeks.sort((a, b) => a.week - b.week);
          // Remove duplicate week numbers, keeping the one with the most complete data (prefer days array, then latest chunk)
          const weekMap = new Map();
          allWeeks.forEach(week => {
            const existing = weekMap.get(week.week);
            // Prefer week with non-empty days array, or latest chunk if both have days
            const hasDays = Array.isArray(week.days) && week.days.length > 0;
            const existingHasDays = existing && Array.isArray(existing.days) && existing.days.length > 0;
            if (!existing || (hasDays && !existingHasDays) || (hasDays === existingHasDays && week._chunkRangeEnd > existing._chunkRangeEnd)) {
              weekMap.set(week.week, week);
            }
          });
          const uniqueWeeks = Array.from(weekMap.values());
          uniqueWeeks.sort((a, b) => a.week - b.week);
          
          console.log('Parsed weeks:', uniqueWeeks.map(w => ({week: w.week, summary: w.summary?.substring(0, 50)})));
          console.log('Total weeks found:', uniqueWeeks.length);
          
          if (uniqueWeeks.length > 0) {
            setAiPlan({
              ...latestChunkList[0],
              weekly_breakdown: uniqueWeeks,
              plan_parse_error: parseErrors.length > 0 ? `Some chunks had parsing errors: ${parseErrors.map(e => e.week_range).join(', ')}` : null
            });
          } else {
            console.error('No weeks could be parsed from any chunks');
            setAiPlan({
              ...latestChunkList[0],
              plan_parse_error: 'No weeks could be parsed from chunk plans',
              weekly_breakdown: []
            });
          }
          // --- END CHUNK MERGING FROM SCRATCH ---
        } else {
          setAiPlan(null);
        }
      } catch (error) {
        setError('Failed to load plan');
        console.error('Error fetching plan:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPlan();
    // Re-enable polling to check for new chunks
    const interval = setInterval(fetchPlan, 5000);
    return () => clearInterval(interval);
  }, [planId]);

  // Extract aiPlan.status === 'pending' to a variable for useEffect dependency
  const isPending = aiPlan && aiPlan.status === 'pending';
  useEffect(() => {
    if (isPending) {
      setWaitSeconds(0);
      const timer = setInterval(() => setWaitSeconds(s => s + 1), 1000);
      return () => clearInterval(timer);
    }
  }, [isPending]);

  // Re-submit plan generation (set status to 'pending' and update prompt)
  const regeneratePlan = async () => {
    if (!plan) return;
    setRegenerating(true);
    try {
      // Build the prompt as in IntakeForm.jsx
      const weeklyScheduleText = plan.weekly_schedule ? Object.entries(plan.weekly_schedule).map(([day, schedule]) => {
        const available = Object.entries(schedule).filter(([type, checked]) => checked).map(([type]) => {
          return type === 'easyRun' ? 'Easy Run' : type === 'session' ? 'Session/Workout' : 'Long Run';
        });
        return `${day}: ${available.length > 0 ? available.join(', ') : 'No preference'}`;
      }).join('\n') : '';
      const currentVolume = plan.weekly_mileage ? `Current (recent) weekly mileage: ${plan.weekly_mileage} ${plan.unit_preference === 'metric' ? 'km' : 'miles'}.` : '';
      const startingVolume = plan.starting_volume ? `Starting weekly volume: ${plan.starting_volume} ${plan.unit_preference === 'metric' ? 'km' : 'miles'}.` : '';
      const maxVolume = plan.max_volume ? `Maximum weekly volume: ${plan.max_volume} ${plan.unit_preference === 'metric' ? 'km' : 'miles'}.` : '';
      const otherRequests = plan.other_requests ? `Additional user requests: ${plan.other_requests}` : '';
      const prompt = `\nCreate a detailed 4-week segment (weeks 1-4) of a marathon training plan for a runner with the following profile:\n\nAge: ${plan.age || 'Not specified'}\nWeight: ${plan.weight || 'Not specified'} ${plan.unit_preference === 'metric' ? 'kg' : 'lbs'}\nHeight: ${plan.height || 'Not specified'} ${plan.unit_preference === 'metric' ? 'cm' : 'inches'}\nTraining for: ${plan.training_for}\nGoals: ${plan.goals || 'Not specified'}\n${currentVolume}\n${startingVolume}\n${maxVolume}\nWeekly training time: ${plan.weekly_time} hours\nTraining intensity preference: ${plan.training_intensity}\nRPE familiarity: ${plan.rpe_familiarity}\nMax heart rate: ${plan.max_hr || 'Not specified'} bpm\nResting heart rate: ${plan.resting_hr || 'Not specified'} bpm\nTraining history: ${plan.training_history || 'Not specified'}\n\nWeekly Schedule Preferences (user's preferred days for easy runs, sessions, long runs):\n${weeklyScheduleText}\n\n${otherRequests}\n\nInstructions:\n- You are an expert running coach creating the FIRST 4 WEEKS of a progressive marathon training plan.\n- Structure the plan so that at least 80% of running is easy, and no more than 20% is moderate/intense. Always lean toward easy running and prioritize volume over intensity.\n- Use the user's preferred days for easy runs, sessions, and long runs as suggestions, but optimize for best training outcomes.\n- For each week, provide a summary of the key sessions to be completed (do not assign to specific days in the summary).\n- For each day, suggest a workout (easy run, session, long run, rest, etc.), a mileage target, and ${plan.training_intensity === 'hr' ? 'a heart rate range (bpm)' : 'an RPE value'}. The sum of daily mileages should match the weekly total.\n- This is the STARTING phase of the plan - focus on building consistency and establishing good habits.\n- Only respond with valid JSON. Do NOT include any explanations, comments, or markdown. Do NOT wrap your response in triple backticks or any other formatting. Output a complete, valid JSON object for weeks 1-4 only.`;
      // Create a new chunk plan entry (first 4 weeks)
      const { data: newPlan, error: insertError } = await supabase
        .from('training_plans')
        .insert([{
          user_id: plan.user_id,
          intake_id: planId,
          status: 'pending',
          prompt,
          chunk_type: 'chunk',
          week_range: '1-4',
          error_message: null
        }])
        .select()
        .single();

      if (insertError) {
        console.error('Error creating full plan:', insertError);
        alert('Failed to re-submit plan.');
        setRegenerating(false);
        return;
      }
      setRegenerating(false);
    } catch (err) {
      setRegenerating(false);
      alert('Failed to re-submit plan.');
    }
  };

  // Helper to generate a prompt for a given week range
  const buildPromptForWeeks = (startWeek, endWeek, priorWeeksSummary = '') => {
    // Build comprehensive runner profile
    const weeklyScheduleText = plan.weekly_schedule ? Object.entries(plan.weekly_schedule).map(([day, schedule]) => {
      const available = Object.entries(schedule).filter(([type, checked]) => checked).map(([type]) => {
        return type === 'easyRun' ? 'Easy Run' : type === 'session' ? 'Session/Workout' : 'Long Run';
      });
      return `${day}: ${available.length > 0 ? available.join(', ') : 'No preference'}`;
    }).join('\n') : '';
    const currentVolume = plan.weekly_mileage ? `Current (recent) weekly mileage: ${plan.weekly_mileage} ${plan.unit_preference === 'metric' ? 'km' : 'miles'}.` : '';
    const startingVolume = plan.starting_volume ? `Starting weekly volume: ${plan.starting_volume} ${plan.unit_preference === 'metric' ? 'km' : 'miles'}.` : '';
    const maxVolume = plan.max_volume ? `Maximum weekly volume: ${plan.max_volume} ${plan.unit_preference === 'metric' ? 'km' : 'miles'}.` : '';
    const otherRequests = plan.other_requests ? `Additional user requests: ${plan.other_requests}` : '';

    // Determine total plan length in weeks (default to 16 if not set)
    const planLengthStr = plan.planLength || '16 Weeks';
    const totalWeeks = parseInt(planLengthStr.match(/\d+/)?.[0] || '16', 10);
    const isFinalChunk = endWeek >= totalWeeks;

    let baseProfile = `Create a detailed ${endWeek - startWeek + 1}-week segment (weeks ${startWeek}-${endWeek}) of a marathon training plan for a runner with the following profile:\n\n` +
      `Age: ${plan.age || 'Not specified'}\n` +
      `Weight: ${plan.weight || 'Not specified'} ${plan.unit_preference === 'metric' ? 'kg' : 'lbs'}\n` +
      `Height: ${plan.height || 'Not specified'} ${plan.unit_preference === 'metric' ? 'cm' : 'inches'}\n` +
      `Training for: ${plan.training_for}\n` +
      `Goals: ${plan.goals || 'Not specified'}\n` +
      `${currentVolume}\n` +
      `${startingVolume}\n` +
      `${maxVolume}\n` +
      `Weekly training time: ${plan.weekly_time} hours\n` +
      `Training intensity preference: ${plan.training_intensity}\n` +
      `RPE familiarity: ${plan.rpe_familiarity}\n` +
      `Max heart rate: ${plan.max_hr || 'Not specified'} bpm\n` +
      `Resting heart rate: ${plan.resting_hr || 'Not specified'} bpm\n` +
      `Training history: ${plan.training_history || 'Not specified'}\n\n` +
      `Weekly Schedule Preferences (user's preferred days for easy runs, sessions, long runs):\n${weeklyScheduleText}\n\n` +
      `${otherRequests}\n`;

    // Add context from previous weeks if available
    if (priorWeeksSummary) {
      baseProfile += `\nCONTEXT FROM PREVIOUS WEEKS:\n${priorWeeksSummary}\n\n`;
    }

    // Add phase-specific instructions
    let phaseInstructions = '';
    if (startWeek <= 4) {
      phaseInstructions = 'This is the BUILDING phase - focus on establishing consistency and building base fitness.';
    } else if (startWeek <= 8) {
      phaseInstructions = 'This is the DEVELOPMENT phase - gradually increase volume and introduce more structured workouts.';
    } else {
      phaseInstructions = 'This is the PEAKING phase - focus on race-specific preparation and tapering.';
    }

    // Add total plan length and taper/race week instructions
    baseProfile += `\nThis is part of a ${totalWeeks}-week marathon plan. You are creating weeks ${startWeek}-${endWeek} of ${totalWeeks}.`;
    if (isFinalChunk) {
      baseProfile += '\nInclude the taper and race week in this chunk.';
    } else {
      baseProfile += '\nDo NOT include the final taper or race week in this chunk.';
    }

    baseProfile += `\nInstructions:\n` +
      `- You are an expert running coach creating weeks ${startWeek}-${endWeek} of a progressive marathon training plan.\n` +
      `- ${phaseInstructions}\n` +
      `- Structure the plan so that at least 80% of running is easy, and no more than 20% is moderate/intense.\n` +
      `- Use the user's preferred days for easy runs, sessions, and long runs as suggestions, but optimize for best training outcomes.\n` +
      `- For each week, provide a summary of the key sessions to be completed.\n` +
      `- For each day, suggest a workout (easy run, session, long run, rest, etc.), a mileage target, and ${plan.training_intensity === 'hr' ? 'a heart rate range (bpm)' : 'an RPE value'}.\n` +
      `- The sum of daily mileages should match the weekly total.\n` +
      `- Build progressively on the previous weeks' training if available.\n` +
      `- Only respond with valid JSON. Do NOT include any explanations, comments, or markdown. Do NOT wrap your response in triple backticks or any other formatting.\n` +
      `- Output a complete, valid JSON object for weeks ${startWeek} to ${endWeek} only.\n` +
      `- For each week in weekly_breakdown, always use the property 'week' (not 'week_number') for the week number.`;

    return baseProfile;
  };

  // Handler to trigger week chunk generation
  const generateWeeks = async (startWeek, endWeek) => {
    setRegenerating(true);
    try {
      // Remove the delete step: always insert a new row
      let priorWeeksSummary = '';
      if (startWeek > 1 && aiPlan && aiPlan.weekly_breakdown) {
        // Create detailed summary of previous weeks for context
        const previousWeeks = aiPlan.weekly_breakdown.filter(w => w.week < startWeek);
        if (previousWeeks.length > 0) {
          priorWeeksSummary = previousWeeks.map(w => {
            let summary = `Week ${w.week}: `;
            if (w.summary) summary += w.summary;
            if (w.volume) summary += ` (${w.volume})`;
            if (w.key_sessions && w.key_sessions.length > 0) {
              summary += ` - Key sessions: ${w.key_sessions.join(', ')}`;
            }
            return summary;
          }).join('\n');
          
          // Add overall progression context
          const totalWeeks = previousWeeks.length;
          const avgVolume = previousWeeks.reduce((sum, w) => {
            const vol = w.volume ? parseFloat(w.volume.match(/\d+/)?.[0] || 0) : 0;
            return sum + vol;
          }, 0) / totalWeeks;
          
          priorWeeksSummary += `\n\nPROGRESSION CONTEXT: The runner has completed ${totalWeeks} weeks with an average weekly volume of approximately ${Math.round(avgVolume)} ${plan.unit_preference === 'metric' ? 'km' : 'miles'}.`;
        }
      }
      const prompt = buildPromptForWeeks(startWeek, endWeek, priorWeeksSummary);
      
      // Debug: log before insert
      console.log(`Inserting new plan chunk for weeks ${startWeek}-${endWeek} with intake_id:`, planId);
      // Create a new plan entry for this chunk
      const { data: newPlan, error: insertError } = await supabase
        .from('training_plans')
        .insert([{
          user_id: plan.user_id,
          intake_id: planId,
          status: 'pending',
          prompt,
          week_range: `${startWeek}-${endWeek}`,
          chunk_type: 'chunk',
          error_message: null
        }])
        .select()
        .single();

      // Debug: log after insert
      console.log('Insert result:', { newPlan, insertError });

      if (insertError) {
        console.error('Error creating chunk plan:', insertError);
        alert(`Failed to create plan chunk for weeks ${startWeek}-${endWeek}: ${insertError.message}`);
        setRegenerating(false);
        return;
      }

      setRegenerating(false);
      
      // Trigger background function immediately for this chunk
      try {
        await fetch('/.netlify/functions/generate-plan-background', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            trigger: 'manual',
            intake_id: planId
          })
        });
        console.log('Background function triggered for weeks', startWeek, '-', endWeek);
      } catch (error) {
        console.log('Background function trigger failed (will run on schedule):', error);
      }
    } catch (err) {
      setRegenerating(false);
      alert('Failed to generate weeks.');
      console.error('generateWeeks error:', err);
    }
  };

  // Helper to determine which weeks are present
  const availableWeeks = aiPlan && aiPlan.weekly_breakdown ? aiPlan.weekly_breakdown.map(w => w.week) : [];
  
  // Get plan length from the plan data
  const planLengthStr = plan?.plan_length || '12 Weeks';
  const totalWeeks = parseInt(planLengthStr.match(/\d+/)?.[0] || '12', 10);
  
  // Generate button configurations based on plan length
  const weekRanges = [];
  if (plan) { // Only generate buttons if plan exists
    for (let start = 1; start <= totalWeeks; start += 4) {
      const end = Math.min(start + 3, totalWeeks);
      weekRanges.push({ start, end, label: `Weeks ${start}-${end}` });
    }
  }
  
  // Check which week ranges are available
  const weekStatus = weekRanges.map(range => ({
    ...range,
    hasWeeks: availableWeeks.includes(range.start) && availableWeeks.includes(range.end)
  }));

  // Remove showEdit and handleEditSave/handleEditCancel

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh',
        color: 'var(--text-muted)'
      }}>
        Loading plan...
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '60px 20px',
        color: 'var(--text-muted)'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
        <h3 style={{ fontSize: '20px', marginBottom: '8px', color: 'var(--text-light)' }}>
          Plan not found
        </h3>
        <p style={{ marginBottom: '24px' }}>
          The training plan you're looking for doesn't exist or has been deleted.
        </p>
        <button onClick={() => navigate('/dashboard')} className="btn">
          Back to Dashboard
        </button>
      </div>
    );
  }

  // Show pending or error status
  if (aiPlan && aiPlan.status === 'pending') {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '60vh',
        color: 'var(--neon-cyan)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
        <h3 style={{ fontSize: '22px', marginBottom: '8px' }}>
          Your plan is being generated...
        </h3>
        <p style={{ maxWidth: '400px' }}>
          This may take up to a minute. The page will update automatically when your plan is ready.
        </p>
        <p style={{ marginTop: '10px', color: 'var(--text-muted)' }}>
          Waiting: {waitSeconds} seconds
        </p>
        <button onClick={regeneratePlan} className="btn" disabled={regenerating} style={{ marginTop: '20px' }}>
          {regenerating ? 'Re-submitting...' : 'Re-Submit Plan'}
        </button>
      </div>
    );
  }
  // Show plan if JSON parses, even if status is error
  if (aiPlan && aiPlan.plan_parse_error === null && aiPlan.weekly_breakdown) {
    return (
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
        {/* Generate Weeks Buttons */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '10px', justifyContent: 'flex-end', alignItems: 'center' }}>
          <button
            className="btn-secondary"
            onClick={() => window.location.reload()}
            style={{ fontSize: '12px', padding: '8px 12px' }}
            title="Refresh to see new chunks"
          >
            🔄
          </button>
          {weekStatus.map((range, index) => (
            <button
              key={index}
              className="btn"
              onClick={() => generateWeeks(range.start, range.end)}
              disabled={regenerating}
              style={{ 
                background: range.hasWeeks ? 'var(--success)' : 'var(--primary)',
                color: 'white'
              }}
            >
              {regenerating ? `Generating ${range.label}...` : 
               range.hasWeeks ? `${range.label} Ready ✓` : `Create ${range.label}`}
            </button>
          ))}
        </div>
        {/* Edit Plan Button */}
        <div style={{ textAlign: 'right', marginBottom: '10px' }}>
          <button
            className="btn"
            onClick={() => navigate(`/intake/${planId}`)}
            disabled={regenerating || !plan}
          >
            Edit Plan
          </button>
        </div>
        <StructuredPlanView aiPlan={aiPlan} />
      </div>
    );
  }
  
  // Show create weeks buttons even when there's no AI plan yet
  if (plan && (!aiPlan || !aiPlan.weekly_breakdown)) {
    return (
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
        {/* Generate Weeks Buttons */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '10px', justifyContent: 'flex-end' }}>
          {weekStatus.map((range, index) => (
            <button
              key={index}
              className="btn"
              onClick={() => generateWeeks(range.start, range.end)}
              disabled={regenerating}
              style={{ 
                background: range.hasWeeks ? 'var(--success)' : 'var(--primary)',
                color: 'white'
              }}
            >
              {regenerating ? `Generating ${range.label}...` : 
               range.hasWeeks ? `${range.label} Ready ✓` : `Create ${range.label}`}
            </button>
          ))}
        </div>
        {/* Edit Plan Button */}
        <div style={{ textAlign: 'right', marginBottom: '10px' }}>
          <button
            className="btn"
            onClick={() => navigate(`/intake/${planId}`)}
            disabled={regenerating || !plan}
          >
            Edit Plan
          </button>
        </div>
        <StructuredPlanView aiPlan={aiPlan} />
      </div>
    );
  }
  if (aiPlan && aiPlan.plan_parse_error) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '60vh',
        color: 'var(--error)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
        <h3 style={{ fontSize: '22px', marginBottom: '8px' }}>
          Plan generation failed
        </h3>
        <p style={{ maxWidth: '400px' }}>
          {aiPlan.error_message || 'An error occurred while generating your plan. Please try re-submitting.'}
        </p>
        {/* Show parse error and raw content for debugging */}
        <div style={{ color: 'var(--text-muted)', marginTop: '16px', fontSize: '12px', wordBreak: 'break-all' }}>
          <strong>Parse error:</strong> {aiPlan.plan_parse_error}<br/>
          <strong>Raw plan content:</strong> <pre style={{ whiteSpace: 'pre-wrap', textAlign: 'left' }}>{aiPlan.raw_plan_content}</pre>
        </div>
        {/* Fallback: try to display the raw plan content as a string */}
        {aiPlan.raw_plan_content && (
          <div style={{ marginTop: '24px', color: 'var(--text-light)' }}>
            <strong>Raw Plan (as text):</strong>
            <pre style={{ whiteSpace: 'pre-wrap', textAlign: 'left', background: '#222', padding: '10px', borderRadius: '8px', marginTop: '8px' }}>{aiPlan.raw_plan_content}</pre>
          </div>
        )}
        <button onClick={regeneratePlan} className="btn" disabled={regenerating} style={{ marginTop: '20px' }}>
          {regenerating ? 'Re-submitting...' : 'Re-Submit Plan'}
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      {/* rest of the plan view... */}
      {/* (Debug output removed for cleaner UI) */}
    </div>
  );
};

export default ViewPlan; 