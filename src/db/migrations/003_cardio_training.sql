CREATE TABLE IF NOT EXISTS cardio_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  activity_type TEXT NOT NULL,
  duration_seconds INTEGER,
  distance_km REAL,
  active_energy_kcal REAL,
  total_energy_kcal REAL,
  elevation_gain_m REAL,
  average_heart_rate_bpm REAL,
  average_pace_seconds_per_km REAL,
  perceived_exertion REAL,
  source_type TEXT NOT NULL DEFAULT 'manual',
  source_document_id TEXT REFERENCES source_documents(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (duration_seconds IS NULL OR duration_seconds > 0),
  CHECK (distance_km IS NULL OR distance_km >= 0),
  CHECK (average_heart_rate_bpm IS NULL OR average_heart_rate_bpm > 0)
);

CREATE INDEX IF NOT EXISTS idx_cardio_sessions_user_started
ON cardio_sessions(user_id, started_at DESC);
