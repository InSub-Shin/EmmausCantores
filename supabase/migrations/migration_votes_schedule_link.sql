-- Add schedule_id to votes table to link votes to schedules
ALTER TABLE votes ADD COLUMN schedule_id uuid REFERENCES schedules(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_votes_schedule_id ON votes(schedule_id);
