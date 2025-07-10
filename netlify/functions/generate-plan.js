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

    if (!prompt) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Prompt is required' })
      };
    }

    // Test OpenAI API key
    console.log('OpenAI API Key exists:', !!process.env.OPENAI_API_KEY);
    console.log('OpenAI API Key length:', process.env.OPENAI_API_KEY?.length || 0);

    console.log('Calling OpenAI API...');
    
    // Set up a timeout Promise (25 seconds)
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 25000)
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
      console.log('OpenAI API call completed');

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

      console.log('Returning response...');
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
      console.error('Error generating plan:', error);
      
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
    console.error('Error generating plan:', error);
    
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