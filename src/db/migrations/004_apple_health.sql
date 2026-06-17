CREATE TABLE IF NOT EXISTS apple_health_daily_summaries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  summary_date TEXT NOT NULL,
  step_count INTEGER,
  active_energy_kcal REAL,
  basal_energy_kcal REAL,
  total_energy_kcal REAL,
  exercise_minutes REAL,
  stand_hours REAL,
  walking_running_distance_m REAL,
  flights_climbed REAL,
  resting_heart_rate_bpm REAL,
  average_heart_rate_bpm REAL,
  source_type TEXT NOT NULL DEFAULT 'apple_health',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, source_type, external_id),
  CHECK (summary_date LIKE '____-__-__')
);

CREATE TABLE IF NOT EXISTS apple_health_workouts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  apple_activity_type TEXT NOT NULL,
  normalized_activity_type TEXT NOT NULL DEFAULT 'other',
  duration_seconds INTEGER,
  distance_m REAL,
  elevation_gain_m REAL,
  elevation_loss_m REAL,
  active_energy_kcal REAL,
  total_energy_kcal REAL,
  average_heart_rate_bpm REAL,
  source_type TEXT NOT NULL DEFAULT 'apple_health_workout',
  source_name TEXT,
  source_bundle_identifier TEXT,
  device_name TEXT,
  device_manufacturer TEXT,
  device_model TEXT,
  source_ref TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, source_type, external_id)
);

CREATE TABLE IF NOT EXISTS apple_health_sleep_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  sleep_start TEXT NOT NULL,
  sleep_end TEXT,
  total_sleep_minutes REAL,
  rem_minutes REAL,
  deep_sleep_minutes REAL,
  core_minutes REAL,
  awake_minutes REAL,
  in_bed_minutes REAL,
  hrv_ms REAL,
  resting_heart_rate REAL,
  source_type TEXT NOT NULL DEFAULT 'apple_health_sleep',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, source_type, external_id)
);

CREATE INDEX IF NOT EXISTS idx_apple_health_sleep_user_start
ON apple_health_sleep_records(user_id, sleep_start DESC);

CREATE INDEX IF NOT EXISTS idx_apple_health_daily_user_date
ON apple_health_daily_summaries(user_id, summary_date DESC);

CREATE INDEX IF NOT EXISTS idx_apple_health_workouts_user_started
ON apple_health_workouts(user_id, started_at DESC);
