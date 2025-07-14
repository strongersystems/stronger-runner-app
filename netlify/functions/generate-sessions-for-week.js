const { createClient } = require('@supabase/supabase-js');
const { OpenAI } = require('openai');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed',
    };
  }

  try {
    const { intake_id, week_number } = JSON.parse(event.body);
    if (!intake_id || !week_number) {
      return {
        statusCode: 400,
        body: 'Missing intake_id or week_number',
      };
    }

    // Fetch all plans for this intake
    const { data: plans, error: planError } = await supabase
      .from('training_plans')
      .select('*')
      .eq('intake_id', intake_id)
      .order('created_at', { ascending: true });
    if (planError || !plans || plans.length === 0) {
      return {
        statusCode: 404,
        body: 'Plan outline not found',
      };
    }

    // Find the main plan outline (the one with the most weeks in weekly_breakdown)
    // Prioritize plans that are not chunks and have the most weeks
    let mainPlan = null;
    let maxWeeks = 0;
    
    for (const p of plans) {
      if (p.plan_json && p.status === 'complete') {
        const planData = typeof p.plan_json === 'string' ? JSON.parse(p.plan_json) : p.plan_json;
        if (planData.weekly_breakdown && Array.isArray(planData.weekly_breakdown)) {
          const weekCount = planData.weekly_breakdown.length;
          // Prefer plans that are not chunks (week_range is null or doesn't contain '-')
          const isNotChunk = !p.week_range || !p.week_range.includes('-');
          
          if (isNotChunk && weekCount > maxWeeks) {
            mainPlan = p;
            maxWeeks = weekCount;
          }
        }
      }
    }

    // If no non-chunk plan found, fall back to the plan with the most weeks
    if (!mainPlan) {
      for (const p of plans) {
        if (p.plan_json && p.status === 'complete') {
          const planData = typeof p.plan_json === 'string' ? JSON.parse(p.plan_json) : p.plan_json;
          if (planData.weekly_breakdown && Array.isArray(planData.weekly_breakdown)) {
            const weekCount = planData.weekly_breakdown.length;
            if (weekCount > maxWeeks) {
              mainPlan = p;
              maxWeeks = weekCount;
            }
          }
        }
      }
    }

    if (!mainPlan) {
      return {
        statusCode: 404,
        body: 'Main plan outline not found',
      };
    }

    const planData = typeof mainPlan.plan_json === 'string' ? JSON.parse(mainPlan.plan_json) : mainPlan.plan_json;
    const week = planData.weekly_breakdown.find(w => Number(w.week) === Number(week_number));
    if (!week) {
      return {
        statusCode: 404,
        body: `Week ${week_number} not found in plan outline`,
      };
    }

    // Check if this week already has session details
    const hasSessionDetails = week.days && week.days.every(day => day.session_details);
    if (hasSessionDetails) {
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, week: week_number, message: 'Week already has session details' }),
      };
    }

    // Get user requests from the intake
    const { data: intake } = await supabase
      .from('training_intakes')
      .select('other_requests')
      .eq('id', intake_id)
      .single();
    
    const userRequests = intake?.other_requests || '';
    
    // Build the prompt for this week
    const prompt = `You are an expert running coach. For the following training week, generate detailed session_details for each day.

Week ${week_number} summary: ${week.summary}
Key sessions: ${week.key_sessions.join('; ')}
Total volume: ${week.total_volume}

Days:
${week.days.map(d => `${d.day}: ${d.workout} (${d.volume} km)`).join('\n')}

${userRequests ? `\n*** CRITICAL USER REQUIREMENTS - MUST BE FOLLOWED ***\nThe user has specified these non-negotiable requirements: ${userRequests}\nYou MUST incorporate these requirements into the session details where applicable.\n*** END CRITICAL REQUIREMENTS ***\n\n` : ''}For each day, provide a session_details object with:
- 'brief': 2-3 sentence description of the session purpose and approach
- 'warmup': Specific warmup instructions (e.g., "10 minutes easy jogging, 5 minutes dynamic stretches")
- 'main_set': Detailed main workout description with specific instructions
- 'cooldown': Cooldown instructions (e.g., "5 minutes easy jogging, static stretches")
- 'target_pace': Target pace range if applicable (e.g., "5:30-5:45 min/km" or "8:45-9:00 min/mile")
- 'effort_level': How hard this session should feel (e.g., "Easy conversational pace", "Moderate - can speak in short sentences")
- 'tips': 2-3 specific tips for this session
- 'equipment': Any equipment needed (e.g., ["Heart rate monitor", "Water bottle"])

Respond ONLY with a valid JSON array of days, each with the original day, workout, volume, and a session_details object as above. Do NOT include any explanations, comments, or markdown.

Example:
[{
  "day": "Monday",
  "workout": "Easy Run",
  "volume": 10,
  "session_details": { ... }
}, ...]`;

    // Call OpenAI
    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: 'gpt-4-1106-preview',
        messages: [
          { role: 'system', content: 'You are an expert running coach. Always respond with valid JSON.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 2048,
        temperature: 0.7,
      });
    } catch (err) {
      return {
        statusCode: 500,
        body: 'OpenAI error: ' + err.message,
      };
    }

    let daysWithDetails;
    try {
      let content = completion.choices[0].message.content.trim();
      content = content.replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();
      daysWithDetails = JSON.parse(content);
    } catch (err) {
      return {
        statusCode: 500,
        body: 'Invalid JSON from OpenAI: ' + err.message,
      };
    }

    // Merge session_details into the week in the plan JSON
    const updatedWeeklyBreakdown = planData.weekly_breakdown.map(w => {
      if (Number(w.week) === Number(week_number)) {
        return { ...w, days: daysWithDetails };
      }
      return w;
    });
    const updatedPlanData = { ...planData, weekly_breakdown: updatedWeeklyBreakdown };

    // Update the main plan in Supabase
    const { error: updateError } = await supabase
      .from('training_plans')
      .update({ plan_json: updatedPlanData, plan_content: JSON.stringify(updatedPlanData) })
      .eq('id', mainPlan.id);
    if (updateError) {
      return {
        statusCode: 500,
        body: 'Failed to update plan with session details: ' + updateError.message,
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, week: week_number }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: 'Server error: ' + err.message,
    };
  }
}; 