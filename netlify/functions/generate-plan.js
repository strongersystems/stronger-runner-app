const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { prompt: userPrompt, userData } = JSON.parse(event.body);

    // Add strict JSON-only instruction to the prompt
    const prompt = `${userPrompt}

IMPORTANT: Long runs must NEVER exceed 35 km (or 22 miles for imperial units). This is a strict safety limit.

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

    if (!prompt) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Prompt is required' })
      };
    }

    // Removed all console.log statements from this file for production cleanliness.

    // Set up a timeout Promise (60 seconds)
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 60000)
    );

    try {
      // Race the OpenAI call against the timeout
      const completion = await Promise.race([
        openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are an expert running coach with deep knowledge of training methodologies, physiology, and race preparation. You create personalized, progressive training plans that are safe, effective, and tailored to individual runners' needs and goals. Always respond with valid JSON format as requested."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          max_tokens: 2048,
          temperature: 0.7
        }),
        timeoutPromise
      ]);
      // Removed all console.log statements from this file for production cleanliness.

      let planContent = completion.choices[0].message.content;

      // Remove markdown code block if present
      planContent = planContent.trim();
      if (planContent.startsWith('```json')) {
        planContent = planContent.replace(/^```json/, '').replace(/```$/, '').trim();
      } else if (planContent.startsWith('```')) {
        planContent = planContent.replace(/^```/, '').replace(/```$/, '').trim();
      }

      // Remove JS-style comments (lines starting with //)
      planContent = planContent.replace(/^[ \t]*\/\/.*$/gm, '').trim();

      // Try to parse the JSON response
      let structuredPlan;
      try {
        structuredPlan = JSON.parse(planContent);
      } catch (error) {
        // If JSON parsing fails, create a fallback structure
        structuredPlan = {
          plan_title: "Personalized Training Plan",
          introduction: "Your personalized training plan has been generated.",
          goals_summary: "Focus on consistent training and gradual progression.",
          weekly_breakdown: [],
          plan_content: planContent
        };
      }

      // Removed all console.log statements from this file for production cleanliness.
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          plan: structuredPlan,
          generated_at: new Date().toISOString()
        })
      };

    } catch (error) {
      // Handle timeout error gracefully
      if (error.message === "timeout") {
        return {
          statusCode: 504,
          headers,
          body: JSON.stringify({ error: "Sorry, generating your plan took too long. Please try again or reduce the plan length." })
        };
      }
      // Removed all console.log statements from this file for production cleanliness.
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to generate training plan',
          details: error.message 
        })
      };
    }

  } catch (error) {
    // Removed all console.log statements from this file for production cleanliness.
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to generate training plan',
        details: error.message 
      })
    };
  }
}; 