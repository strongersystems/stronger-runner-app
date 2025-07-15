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
    let userPrompt = plan.prompt || plan.user_prompt || 'Create a running plan.';

    // Add critical requirements if not already present
    const planLength = plan.plan_length || '12 Weeks';
    const startingVolume = plan.starting_volume || 'the user\'s current weekly volume';
    const maxVolume = plan.max_volume || 'the user\'s maximum weekly volume';
    const unitPref = plan.unit_preference === 'imperial' ? 'mi' : 'km';
    let requirements = `\nCRITICAL USER REQUIREMENTS:\n- The plan must be ${planLength}.\n- The first week's total_volume must be no more than ${startingVolume} (${unitPref}), and should start at or below the user's current or a safe starting volume.\n- The final week's total_volume must be no more than ${maxVolume} (${unitPref}).\n- Weekly total_volume should increase gradually, with no more than a 10% increase per week, ramping up from the starting volume to the max volume over the full plan length.\n- For each week, total_volume must always equal the sum of the daily volumes.\n- Long runs must never exceed 3 hours or 20-24 miles (32-38 km) for non-elite runners, and should build up gradually. In early weeks, the long run should be a safe, reasonable percentage of the weekly total (e.g., 20-30%), and only allow longer for elite athletes with a clear rationale.\n- All volumes and paces must use the user's selected units: ${unitPref}.\n- The plan should be progressive, safe, and tailored to the user's experience and goals.\n- Take into account the user's training history, goals, and available time per week.`;
    if (!userPrompt.includes('CRITICAL USER REQUIREMENTS')) {
      userPrompt += requirements;
    }
    
    // Extract user requests from the prompt if they exist
    const userRequestsMatch = userPrompt.match(/CRITICAL USER REQUIREMENTS: (.+?)(?:\n\n|$)/);
    const userRequests = userRequestsMatch ? userRequestsMatch[1] : '';
    
    // Make the prompt even stricter and specify the required schema
    const prompt = `${userPrompt}

    ${userRequests ? `\n*** CRITICAL REQUIREMENTS - MUST BE FOLLOWED ***\nThe user has specified these non-negotiable requirements: ${userRequests}\nYou MUST incorporate these requirements into the plan structure and weekly schedule.\n*** END CRITICAL REQUIREMENTS ***\n\n` : ''}*** CRITICAL SAFETY LIMITS - NEVER EXCEED ***\n- Long run distances must NEVER exceed 35 km (metric) or 22 miles (imperial). This is a strict safety limit.\n- If the user wants 7 days per week, you MUST include running every single day with NO rest days.\n- These limits are NON-NEGOTIABLE and must be followed exactly.\n*** END CRITICAL SAFETY LIMITS ***\n\nIMPORTANT: Long runs must NEVER exceed 35 km (or 22 miles for imperial units). This is a strict safety limit.

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
  - 'session_details' (object with detailed session information):
    - 'brief' (string): 2-3 sentence description of the session purpose and approach
    - 'warmup' (string): Specific warmup instructions (e.g., "10 minutes easy jogging, 5 minutes dynamic stretches")
    - 'main_set' (string): Detailed main workout description with specific instructions
    - 'cooldown' (string): Cooldown instructions (e.g., "5 minutes easy jogging, static stretches")
    - 'target_pace' (string): Target pace range if applicable (e.g., "5:30-5:45 min/km" or "8:45-9:00 min/mile")
    - 'effort_level' (string): How hard this session should feel (e.g., "Easy conversational pace", "Moderate - can speak in short sentences")
    - 'tips' (array of strings): 2-3 specific tips for this session
    - 'equipment' (array of strings): Any equipment needed (e.g., ["Heart rate monitor", "Water bottle"])
- Do NOT use any other summary fields (like 'key_sessions_summary').
- Do NOT use any extra fields.
- The output must be consistent for all weeks and all days.
- CRITICAL: Long run distances must NEVER exceed 35 km (metric) or 22 miles (imperial).

Example (HR-based week):
{
  "week": 1,
  "summary": "This week focuses on building aerobic base with a long run on Sunday.",
  "key_sessions": [
    "Long run of 25 km, mostly easy pace",
    "Tempo run of 12 km at moderate intensity"
  ],
  "total_volume": 110,
  "days": [
    { 
      "day": "Monday", 
      "workout": "Easy Run", 
      "volume": 10, 
      "heart_rate_range": [120, 140],
      "session_details": {
        "brief": "Recovery run to start the week. Focus on easy, conversational pace to promote recovery and build aerobic base.",
        "warmup": "5 minutes easy walking, 5 minutes easy jogging",
        "main_set": "10 km at easy pace. Keep heart rate in Zone 1-2 range. Should feel very comfortable and conversational.",
        "cooldown": "5 minutes easy walking, gentle stretching",
        "target_pace": "6:00-6:30 min/km",
        "effort_level": "Easy - can hold a conversation throughout",
        "tips": [
          "Focus on relaxed breathing and good form",
          "If you feel tired, slow down - this is a recovery session"
        ],
        "equipment": ["Heart rate monitor"]
      }
    },
    { 
      "day": "Tuesday", 
      "workout": "Rest", 
      "volume": 0, 
      "heart_rate_range": [0, 0],
      "session_details": {
        "brief": "Active recovery day. Light cross-training or complete rest.",
        "warmup": "None required",
        "main_set": "Complete rest or light cross-training (swimming, cycling, yoga)",
        "cooldown": "None required",
        "target_pace": "N/A",
        "effort_level": "Very light",
        "tips": [
          "Listen to your body - if you feel good, light activity is fine",
          "Focus on recovery and preparation for tomorrow's session"
        ],
        "equipment": []
      }
    },
    { 
      "day": "Wednesday", 
      "workout": "Tempo Run", 
      "volume": 12, 
      "heart_rate_range": [145, 165],
      "session_details": {
        "brief": "Tempo run to build lactate threshold. 20 minutes at moderate-hard pace in the middle of the run.",
        "warmup": "15 minutes easy jogging, 5 minutes dynamic stretches",
        "main_set": "12 km total: 3 km easy, 6 km at tempo pace (Zone 3-4), 3 km easy",
        "cooldown": "10 minutes easy jogging, static stretches",
        "target_pace": "5:15-5:30 min/km for tempo portion",
        "effort_level": "Moderate-hard - can speak in short sentences during tempo",
        "tips": [
          "Start the tempo portion conservatively and build into it",
          "Focus on maintaining consistent pace during the tempo section"
        ],
        "equipment": ["Heart rate monitor", "Water bottle"]
      }
    }
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
    { 
      "day": "Monday", 
      "workout": "Easy Run", 
      "volume": 10, 
      "rpe_range": [4, 6],
      "session_details": {
        "brief": "Recovery run following the long run. Focus on easy pace and good form.",
        "warmup": "5 minutes easy walking, 5 minutes easy jogging",
        "main_set": "10 km at RPE 4-6. Should feel very comfortable and conversational.",
        "cooldown": "5 minutes easy walking, gentle stretching",
        "target_pace": "6:00-6:30 min/km",
        "effort_level": "Easy - can hold a conversation throughout",
        "tips": [
          "Focus on relaxed breathing and good form",
          "If you feel tired, slow down - this is a recovery session"
        ],
        "equipment": []
      }
    },
    { 
      "day": "Tuesday", 
      "workout": "Intervals", 
      "volume": 12, 
      "rpe_range": [6, 8],
      "session_details": {
        "brief": "Interval session to build speed and lactate tolerance. 6x800m with 2-minute recovery.",
        "warmup": "15 minutes easy jogging, 5 minutes dynamic stretches, 4x100m strides",
        "main_set": "6x800m at RPE 7-8 with 2-minute easy jog recovery between intervals",
        "cooldown": "10 minutes easy jogging, static stretches",
        "target_pace": "3:20-3:30 per 800m",
        "effort_level": "Hard - can speak only a few words during intervals",
        "tips": [
          "Start conservatively and build into the session",
          "Focus on maintaining consistent pace across all intervals"
        ],
        "equipment": ["Stopwatch", "Water bottle"]
      }
    },
    { 
      "day": "Wednesday", 
      "workout": "Rest", 
      "volume": 0, 
      "rpe_range": [0, 0],
      "session_details": {
        "brief": "Active recovery day. Light cross-training or complete rest.",
        "warmup": "None required",
        "main_set": "Complete rest or light cross-training (swimming, cycling, yoga)",
        "cooldown": "None required",
        "target_pace": "N/A",
        "effort_level": "Very light",
        "tips": [
          "Listen to your body - if you feel good, light activity is fine",
          "Focus on recovery and preparation for tomorrow's session"
        ],
        "equipment": []
      }
    }
    // ...other days...
  ]
}

Do not use any other summary fields. Always use the 'summary' field for each week. Always use 'heart_rate_range' OR 'rpe_range' as an array of two numbers for every day, never both, and never as a string.`;

    // --- STATUS: Updating from OpenAPI ---
    await supabase.from('training_plans').update({
      status: 'updating',
      error_message: null
    }).eq('id', plan.id);

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
  } catch (err) {
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
  
  // Handle manual triggers (when called directly from frontend)
  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body);
      if (body.trigger === 'manual') {
        // Process only the specific intake if provided
        if (body.intake_id) {
          const { data: pendingPlans, error: fetchError } = await supabase
            .from('training_plans')
            .select('*')
            .eq('intake_id', body.intake_id)
            .eq('status', 'pending');
          if (fetchError || !pendingPlans || pendingPlans.length === 0) {
            return {
              statusCode: 200,
              body: JSON.stringify({ message: 'No pending plan found' })
            };
          }
          // Process all pending plans for this intake
          for (const plan of pendingPlans) {
            // If only_week_1 flag is set, modify the prompt to only request the correct week number
            if (body.only_week_1 && body.week_number) {
              plan.prompt = (plan.prompt || 'Create a running plan.') + `\n\nIMPORTANT: Only generate week ${body.week_number} in the weekly_breakdown. Do not include any other weeks.`;
            } else if (body.only_week_1) {
              plan.prompt = (plan.prompt || 'Create a running plan.') + '\n\nIMPORTANT: Only generate week 1 in the weekly_breakdown. Do not include any other weeks.';
            }
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