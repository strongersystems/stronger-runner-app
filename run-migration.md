# Supabase Migration Guide

## Run the Migration

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `supabase/migrations/20250115000000_add_chunked_plan_support.sql`
4. Click "Run" to execute the migration

## What This Migration Adds

- `status` field: Tracks plan generation status (pending/complete/error)
- `prompt` field: Stores the AI generation prompt
- `error_message` field: Stores error details if generation fails
- `plan_json` field: Stores structured JSON plan data
- `plan_content` field: Stores raw plan content (backward compatibility)
- `week_range` field: Tracks which weeks a chunk covers (e.g., "1-4", "5-8")
- `chunk_type` field: Identifies if this is a full plan or chunk
- `parent_plan_id` field: Links chunks to parent plans (future use)
- Indexes for better performance

## After Migration

Your chunked plan generation should now work properly:
- "Create Weeks 1-4" will create a new plan entry with `chunk_type: 'chunk'`
- "Create Weeks 5-8" will create another plan entry with `chunk_type: 'chunk'`
- The frontend will combine all completed chunks into a single view
- Each chunk can be generated independently

## Testing

1. Create a new training plan
2. Try the "Create Weeks 1-4" button
3. Check that a new plan entry is created in Supabase
4. Wait for the background function to process it
5. Try "Create Weeks 5-8" to generate the next chunk 