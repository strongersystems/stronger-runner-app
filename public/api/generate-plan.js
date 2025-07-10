// Simple local API endpoint for testing
// This is a basic implementation - for production use the Netlify function

const { OpenAI } = require('openai');

// Mock response for local testing
const mockPlan = {
  plan_title: "Personalized Marathon Training Plan",
  introduction: "This is a 12-week progressive training plan designed specifically for your current fitness level and goals. The plan focuses on gradual mileage increases, key workouts, and proper recovery.",
  goals_summary: "Complete your first marathon with confidence, build endurance gradually, and establish consistent training habits.",
  weekly_breakdown: [
    {
      week: 1,
      title: "Week 1 - Introduction",
      volume: "25 miles",
      key_sessions: ["Easy 3-mile run", "Long run 6 miles"],
      suggested_schedule: {
        monday: "Rest",
        tuesday: "Easy 3 miles",
        wednesday: "Cross training or rest",
        thursday: "Easy 3 miles",
        friday: "Rest",
        saturday: "Long run 6 miles",
        sunday: "Easy 2 miles"
      },
      notes: "Focus on easy pace, don't worry about speed yet. Build consistency."
    },
    {
      week: 2,
      title: "Week 2 - Building Base",
      volume: "28 miles",
      key_sessions: ["Easy 4-mile run", "Long run 7 miles"],
      suggested_schedule: {
        monday: "Rest",
        tuesday: "Easy 4 miles",
        wednesday: "Cross training or rest",
        thursday: "Easy 4 miles",
        friday: "Rest",
        saturday: "Long run 7 miles",
        sunday: "Easy 3 miles"
      },
      notes: "Continue building mileage gradually. Listen to your body."
    }
  ]
};

// For local testing, return mock data
// In production, this would call OpenAI API
function generateLocalPlan(userData) {
  return {
    plan: mockPlan,
    generated_at: new Date().toISOString()
  };
}

// Handle the request
if (typeof window !== 'undefined') {
  // Client-side code
  window.generateLocalPlan = generateLocalPlan;
} else {
  // Server-side code (if needed)
  module.exports = { generateLocalPlan };
} 