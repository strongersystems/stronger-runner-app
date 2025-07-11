// netlify/functions/generate-plan-background.js
// Netlify Background Function: Generates training plans for all 'pending' entries in Supabase

const { createClient } = require('@supabase/supabase-js');
const { OpenAI } = require('openai');

// Set up Supabase client (use service role key for admin access)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Set up OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Function to process a single plan
async function processPlan(plan) {
  try {
    // --- NEW: Clean up stuck/errored/pending chunks for this intake except the first chunk ---
    if (plan.intake_id && plan.week_range && plan.week_range !== '1-4') {
      // Only run this for the first chunk in the chain
      // Only keep the current chunk, delete all others for this intake with status not 'complete'
      await supabase.from('training_plans')
        .delete()
        .eq('intake_id', plan.intake_id)
        .not('status', 'eq', 'complete')
        .not('week_range', 'eq', plan.week_range);
    }
    // 2. Build the prompt from plan/intake data
    const userPrompt = plan.prompt || plan.user_prompt || 'Create a running plan.';
    // Make the prompt even stricter and specify the required schema
    const prompt = `${userPrompt}

Respond ONLY with a valid JSON object. Do NOT include any text, explanations, comments (such as // or /* ... */), or markdown. Do NOT wrap your response in triple backticks or any other formatting.

The JSON must have the following top-level keys: plan_title, introduction, goals_summary, weekly_breakdown (an array of weeks, each with days, etc). The goals_summary field MUST be a single, readable string summarizing the runner's goals and context, not a JSON object. Output a complete, valid JSON object for the full plan.

For each week in weekly_breakdown:
- Always include a 'summary' field (1-2 sentence overview of the week).
- Always include a 'key_sessions' array (list of the most important sessions for the week).
- Always include a 'total_volume' field (number, sum of all daily volumes for the week).
- Always include a 'days' array. Each day must have:
  - 'day' (e.g., "Monday")
  - 'workout' (e.g., "Easy Run")
  - 'volume' (number, 0 if rest)
  - EITHER 'heart_rate_range' (an array of two numbers, e.g., [120, 140]) OR 'rpe_range' (an array of two numbers, e.g., [4, 6]), depending on the user's training intensity preference. Never include both for the same day.
- Do NOT use any other summary fields (like 'key_sessions_summary').
- Do NOT use any extra fields.
- The output must be consistent for all weeks and all days.

Example (HR-based week):
{
  "week": 1,
  "summary": "This week focuses on building aerobic base with a long run on Sunday.",
  "key_sessions": [
    "Long run of 32 km, mostly easy pace",
    "Tempo run of 12 km at moderate intensity"
  ],
  "total_volume": 110,
  "days": [
    { "day": "Monday", "workout": "Easy Run", "volume": 10, "heart_rate_range": [120, 140] },
    { "day": "Tuesday", "workout": "Rest", "volume": 0, "heart_rate_range": [0, 0] },
    { "day": "Wednesday", "workout": "Tempo Run", "volume": 12, "heart_rate_range": [145, 165] }
    // ...other days...
  ]
}

Example (RPE-based week):
{
  "week": 2,
  "summary": "This week introduces more intensity with a focus on intervals.",
  "key_sessions": [
    "Interval session: 6x800m at RPE 7",
    "Long run of 28 km at RPE 5"
  ],
  "total_volume": 105,
  "days": [
    { "day": "Monday", "workout": "Easy Run", "volume": 10, "rpe_range": [4, 6] },
    { "day": "Tuesday", "workout": "Intervals", "volume": 12, "rpe_range": [6, 8] },
    { "day": "Wednesday", "workout": "Rest", "volume": 0, "rpe_range": [0, 0] }
    // ...other days...
  ]
}

Do not use any other summary fields. Always use the 'summary' field for each week. Always use 'heart_rate_range' OR 'rpe_range' as an array of two numbers for every day, never both, and never as a string.`;

    // 3. Call OpenAI to generate the plan (with timeout)
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 90000) // 90 seconds
    );
    let completion;
    try {
      completion = await Promise.race([
        openai.chat.completions.create({
          model: 'gpt-4-1106-preview',
          messages: [
            {
              role: 'system',
              content: 'You are an expert running coach. Always respond with valid JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 4096,
          temperature: 0.7
        }),
        timeoutPromise
      ]);
    } catch (err) {
      if (err.message === 'timeout') {
        await supabase.from('training_plans').update({
          status: 'error',
          error_message: 'OpenAI timed out.'
        }).eq('id', plan.id);
        return;
      } else {
        await supabase.from('training_plans').update({
          status: 'error',
          error_message: err.message
        }).eq('id', plan.id);
        return;
      }
    }

    // 4. Parse and clean the OpenAI response
    let planContent = completion.choices[0].message.content.trim();
    // Remove code fences
    planContent = planContent.replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();
    // Remove JS-style comments (// and /* ... */)
    planContent = planContent.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
    // Extract the first {...} JSON block only
    const firstBrace = planContent.indexOf('{');
    const lastBrace = planContent.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      planContent = planContent.substring(firstBrace, lastBrace + 1);
    }
    let structuredPlan;
    try {
      structuredPlan = JSON.parse(planContent);
    } catch (err) {
      await supabase.from('training_plans').update({
        status: 'error',
        error_message: 'Invalid JSON from OpenAI',
        plan_json: planContent
      }).eq('id', plan.id);
      return;
    }

    // 5. Update Supabase with the generated plan
    await supabase.from('training_plans').update({
      status: 'complete',
      plan_json: structuredPlan,
      plan_content: JSON.stringify(structuredPlan), // Store as text for backward compatibility
      error_message: null
      // Keep existing chunk_type if it's already set
    }).eq('id', plan.id);
    console.log(`Plan ${plan.id} generated and saved.`);

    // --- Auto-create next chunk if more weeks remain ---
    try {
      // Try to get total plan length and current chunk info
      let totalWeeks = null; // Don't default - we need to get it from intake
      let thisChunkStart = 1, thisChunkEnd = 4;
      let intake = null;
      let weeklySchedule = null;
      // FIRST: Get all intake data (most reliable)
      if (plan.intake_id) {
        try {
          const { data: intakeData } = await supabase
            .from('training_intakes')
            .select('*')
            .eq('id', plan.intake_id)
            .single();
          if (intakeData) {
            intake = intakeData;
            console.log(`[AUTO-CHUNK] Intake data:`, intake);
            if (intake.plan_length) {
              const intakeMatch = intake.plan_length.match(/(\d+)/);
              if (intakeMatch) {
                totalWeeks = parseInt(intakeMatch[1], 10);
                console.log(`[AUTO-CHUNK] Got total weeks from intake: ${totalWeeks}`);
              } else {
                console.log(`[AUTO-CHUNK] Could not parse plan_length: ${intake.plan_length}`);
              }
            } else {
              console.log(`[AUTO-CHUNK] No plan_length found in intake`);
            }
          }
        } catch (intakeErr) {
          console.log(`[AUTO-CHUNK] Could not fetch intake data:`, intakeErr.message);
        }
      }
      // SECOND: Parse week range from prompt
      if (plan.prompt) {
        // Try to match 'weeks X-Y' or 'weeks X to Y' or 'week X-Y'
        const match = plan.prompt.match(/weeks?\s*(\d+)\s*[-to]+\s*(\d+)/i);
        if (match) {
          thisChunkStart = parseInt(match[1], 10);
          thisChunkEnd = parseInt(match[2], 10);
        } else {
          // Try to match a single week (e.g., 'week 1')
          const singleMatch = plan.prompt.match(/week\s*(\d+)/i);
          if (singleMatch) {
            thisChunkStart = parseInt(singleMatch[1], 10);
            thisChunkEnd = thisChunkStart;
          }
        }
        // Fallback: look for "X-week" or "X weeks" pattern in prompt
        const totalMatch = plan.prompt.match(/(\d+)\s*[- ]*week\s*plan/i) || 
                          plan.prompt.match(/(\d+)\s*[- ]*week\s*marathon/i) ||
                          plan.prompt.match(/(\d+)\s*[- ]*week\s*training/i) ||
                          plan.prompt.match(/(\d+)\s*[- ]*week/i);
        if (totalMatch) {
          const promptWeeks = parseInt(totalMatch[1], 10);
          if (promptWeeks) {
            totalWeeks = promptWeeks;
            console.log(`[AUTO-CHUNK] Got total weeks from prompt: ${totalWeeks}`);
          }
        }
      }
      // Try to get from plan_json if available
      if (structuredPlan && Array.isArray(structuredPlan.weekly_breakdown)) {
        const maxWeek = Math.max(...structuredPlan.weekly_breakdown.map(w => w.week || 0));
        if (!thisChunkEnd || isNaN(thisChunkEnd) || thisChunkEnd < 1) {
          thisChunkEnd = maxWeek;
        } else if (maxWeek > thisChunkEnd) {
          thisChunkEnd = maxWeek;
        }
      }
      console.log(`[AUTO-CHUNK] Parsed: thisChunkStart=${thisChunkStart}, thisChunkEnd=${thisChunkEnd}, totalWeeks=${totalWeeks}`);
      // If more weeks remain, insert next chunk
      if (totalWeeks && thisChunkEnd < totalWeeks) {
        let nextStart = thisChunkEnd + 1;
        let nextEnd = Math.min(thisChunkEnd + 4, totalWeeks);
        // Fallback: if nextStart is not a valid number, set to 1
        if (!nextStart || isNaN(nextStart) || nextStart < 1) nextStart = 1;
        if (!nextEnd || isNaN(nextEnd) || nextEnd < nextStart) nextEnd = nextStart + 3;
        // Only insert if not already present (and only one pending chunk per week range)
        const { data: existing, error: findErr } = await supabase
          .from('training_plans')
          .select('*')
          .eq('intake_id', plan.intake_id)
          .eq('week_range', `${nextStart}-${nextEnd}`);
        if (findErr) {
          console.error(`[AUTO-CHUNK] Error checking for existing chunk:`, findErr);
        }
        if (!existing || existing.length === 0) {
          // --- Build the prompt from scratch using intake data ---
          let weeklyScheduleText = '';
          if (plan.weekly_schedule) {
            // Use from plan if available
            weeklySchedule = plan.weekly_schedule;
          } else if (intake && intake.weekly_schedule) {
            weeklySchedule = intake.weekly_schedule;
          }
          if (weeklySchedule) {
            try {
              const ws = typeof weeklySchedule === 'string' ? JSON.parse(weeklySchedule) : weeklySchedule;
              weeklyScheduleText = Object.entries(ws).map(([day, schedule]) => {
                const available = Object.entries(schedule).filter(([type, checked]) => checked).map(([type]) => {
                  return type === 'easyRun' ? 'Easy Run' : type === 'session' ? 'Session/Workout' : 'Long Run';
                });
                return `${day}: ${available.length > 0 ? available.join(', ') : 'No preference'}`;
              }).join('\n');
            } catch (e) {
              weeklyScheduleText = '';
            }
          }
          // Compose the prompt
          const unit = intake && intake.unit_preference === 'imperial' ? 'miles' : 'km';
          const prompt = `Create a detailed ${nextEnd - nextStart + 1}-week segment (weeks ${nextStart}-${nextEnd}) of a marathon training plan for a runner with the following profile:\n\n` +
            `Age: ${intake?.age || 'Not specified'}\n` +
            `Weight: ${intake?.weight || 'Not specified'} ${unit === 'km' ? 'kg' : 'lbs'}\n` +
            `Height: ${intake?.height || 'Not specified'} ${unit === 'km' ? 'cm' : 'inches'}\n` +
            `Training for: ${intake?.training_for || 'Marathon'}\n` +
            `Goals: ${intake?.goals || 'Not specified'}\n` +
            `${intake?.weekly_mileage ? `Current (recent) weekly mileage: ${intake.weekly_mileage} ${unit}.\n` : ''}` +
            `${intake?.starting_volume ? `Starting weekly volume: ${intake.starting_volume} ${unit}.\n` : ''}` +
            `${intake?.max_volume ? `Maximum weekly volume: ${intake.max_volume} ${unit}.\n` : ''}` +
            `Weekly training time: ${intake?.weekly_time || 'Not specified'} hours\n` +
            `Training intensity preference: ${intake?.training_intensity || 'hr'}\n` +
            `RPE familiarity: ${intake?.rpe_familiarity || 'Not specified'}\n` +
            `Max heart rate: ${intake?.max_hr || 'Not specified'} bpm\n` +
            `Resting heart rate: ${intake?.resting_hr || 'Not specified'} bpm\n` +
            `Training history: ${intake?.training_history || 'Not specified'}\n\n` +
            `Weekly Schedule Preferences (user's preferred days for easy runs, sessions, long runs):\n${weeklyScheduleText}\n\n` +
            `${intake?.other_requests ? `Additional user requests: ${intake.other_requests}\n` : ''}` +
            `\nThis is part of a ${totalWeeks}-week marathon plan. You are creating weeks ${nextStart}-${nextEnd} of ${totalWeeks}.\nDo NOT include the final taper or race week in this chunk.\nInstructions:\n- You are an expert running coach creating weeks ${nextStart}-${nextEnd} of a progressive marathon training plan.\n- This is the DEVELOPMENT or PEAKING phase - gradually increase volume and introduce more structured workouts.\n- Structure the plan so that at least 80% of running is easy, and no more than 20% is moderate/intense.\n- Use the user's preferred days for easy runs, sessions, and long runs as suggestions, but optimize for best training outcomes.\n- For each week, provide a summary of the key sessions to be completed.\n- For each day, suggest a workout (easy run, session, long run, rest, etc.), a mileage target, and a heart rate or RPE range.\n- The sum of daily mileages should match the weekly total.\n- Build progressively on the previous weeks' training if available.\n- Only respond with valid JSON. Do NOT include any explanations, comments, or markdown. Do NOT wrap your response in triple backticks or any other formatting.\n- Output a complete, valid JSON object for weeks ${nextStart} to ${nextEnd} only.\n- For each week in weekly_breakdown, always use the property 'week' (not 'week_number') for the week number.`;
          // Insert new pending chunk
          const { data: newChunk, error: insertError } = await supabase.from('training_plans').insert([
            {
              user_id: plan.user_id,
              intake_id: plan.intake_id,
              status: 'pending',
              prompt,
              week_range: `${nextStart}-${nextEnd}`,
              chunk_type: 'chunk',
              error_message: null
            }
          ]).select().single();
          
          if (insertError) {
            console.error(`[AUTO-CHUNK] Error creating next chunk:`, insertError);
          } else {
            console.log(`[AUTO-CHUNK] Auto-created next chunk: weeks ${nextStart}-${nextEnd}`);
            // Immediately process the newly created chunk
            console.log(`[AUTO-CHUNK] Immediately processing newly created chunk...`);
            await processPlan(newChunk);
          }
        } else {
          console.log(`[AUTO-CHUNK] Next chunk weeks ${nextStart}-${nextEnd} already exists or is pending.`);
        }
      } else if (totalWeeks) {
        console.log('[AUTO-CHUNK] No more weeks to generate. Plan is complete.');
      } else {
        console.log('[AUTO-CHUNK] Could not determine total weeks - stopping chunk generation.');
      }
    } catch (autoErr) {
      console.error('Error auto-creating next chunk:', autoErr);
      await supabase.from('training_plans').update({
        error_message: `Auto-chunk error: ${autoErr.message}`
      }).eq('id', plan.id);
    }
  } catch (err) {
    console.error('Unexpected error for plan', plan.id, err);
    await supabase.from('training_plans').update({
      status: 'error',
      error_message: err.message
    }).eq('id', plan.id);
  }
}

// Netlify Scheduled Function: run every 2 minutes
exports.schedule = "*/2 * * * *";

exports.handler = async function(event, context) {
  // This function can run for up to 15 minutes
  console.log('Background plan generation started');
  
  // Handle manual triggers (when called directly from frontend)
  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body);
      if (body.trigger === 'manual') {
        console.log('Manual trigger received for intake_id:', body.intake_id);
        // Process only the specific intake if provided
        if (body.intake_id) {
          const { data: pendingPlans, error: fetchError } = await supabase
            .from('training_plans')
            .select('*')
            .eq('intake_id', body.intake_id)
            .eq('status', 'pending');
          if (fetchError || !pendingPlans || pendingPlans.length === 0) {
            console.log('No pending plan found for intake_id:', body.intake_id);
            return {
              statusCode: 200,
              body: JSON.stringify({ message: 'No pending plan found' })
            };
          }
          // Process all pending plans for this intake
          for (const plan of pendingPlans) {
            await processPlan(plan);
          }
          return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Plan processing started for all pending chunks' })
          };
        }
      }
    } catch (error) {
      console.error('Error handling manual trigger:', error);
    }
  }

  // 1. Fetch all pending plans
  const { data: pendingPlans, error: fetchError } = await supabase
    .from('training_plans')
    .select('*')
    .eq('status', 'pending');

  if (fetchError) {
    console.error('Error fetching pending plans:', fetchError);
    return { statusCode: 500, body: 'Error fetching pending plans' };
  }

  if (!pendingPlans.length) {
    console.log('No pending plans found.');
    return { statusCode: 200, body: 'No pending plans.' };
  }

  // Process all pending plans
  for (const plan of pendingPlans) {
    await processPlan(plan);
  }

  return {
    statusCode: 200,
    body: 'Background plan generation complete.'
  };
}; 