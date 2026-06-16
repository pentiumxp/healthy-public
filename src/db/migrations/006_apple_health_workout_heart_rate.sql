CREATE TABLE IF NOT EXISTS apple_health_workout_heart_rate_summaries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workout_id TEXT NOT NULL REFERENCES apple_health_workouts(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL DEFAULT 'apple_health_workout_hr_summary',
  external_id TEXT NOT NULL,
  average_heart_rate_bpm REAL,
  min_heart_rate_bpm REAL,
  max_heart_rate_bpm REAL,
  zone1_seconds INTEGER,
  zone2_seconds INTEGER,
  zone3_seconds INTEGER,
  zone4_seconds INTEGER,
  zone5_seconds INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, source_type, external_id),
  UNIQUE(workout_id)
);

CREATE TABLE IF NOT EXISTS apple_health_workout_heart_rate_samples (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workout_id TEXT NOT NULL REFERENCES apple_health_workouts(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL DEFAULT 'apple_health_workout_hr',
  external_id TEXT NOT NULL,
  sampled_at TEXT NOT NULL,
  heart_rate_bpm REAL NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, source_type, external_id)
);

CREATE INDEX IF NOT EXISTS idx_apple_health_workout_hr_workout_time
ON apple_health_workout_heart_rate_samples(workout_id, sampled_at ASC);
