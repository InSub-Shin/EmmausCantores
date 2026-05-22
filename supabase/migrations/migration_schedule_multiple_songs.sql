-- Create schedule_songs junction table
CREATE TABLE IF NOT EXISTS schedule_songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  song_id uuid NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  "order" integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Add RLS
ALTER TABLE schedule_songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can select schedule_songs" ON schedule_songs FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert schedule_songs" ON schedule_songs FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update their schedule_songs" ON schedule_songs FOR UPDATE USING (true);
CREATE POLICY "Users can delete schedule_songs" ON schedule_songs FOR DELETE USING (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_schedule_songs_schedule_id ON schedule_songs(schedule_id);
CREATE INDEX IF NOT EXISTS idx_schedule_songs_song_id ON schedule_songs(song_id);
