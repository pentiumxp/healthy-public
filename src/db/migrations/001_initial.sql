PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  workspace_ref TEXT NOT NULL UNIQUE,
  hermes_user_ref TEXT,
  display_name TEXT,
  workspace_access_key_hash TEXT,
  scopes_json TEXT NOT NULL DEFAULT '[]',
  plugin_enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  birth_date TEXT,
  sex TEXT,
  height_cm REAL,
  target_weight_kg REAL,
  training_goal TEXT,
  activity_level TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (height_cm IS NULL OR height_cm > 0),
  CHECK (target_weight_kg IS NULL OR target_weight_kg > 0)
);

CREATE TABLE IF NOT EXISTS medications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dose_value REAL,
  dose_unit TEXT,
  frequency TEXT,
  started_at TEXT,
  ended_at TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (status IN ('active', 'paused', 'stopped'))
);

CREATE TABLE IF NOT EXISTS exercise_catalog (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  primary_muscle_group TEXT,
  equipment TEXT,
  is_user_defined INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS strength_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  duration_minutes INTEGER,
  session_rpe REAL,
  location TEXT,
  notes TEXT,
  source_type TEXT NOT NULL DEFAULT 'manual',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS strength_sets (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES strength_sessions(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL REFERENCES exercise_catalog(id),
  set_index INTEGER NOT NULL,
  weight_kg REAL NOT NULL,
  reps INTEGER NOT NULL,
  rpe REAL,
  is_warmup INTEGER NOT NULL DEFAULT 0,
  is_failure INTEGER NOT NULL DEFAULT 0,
  rest_seconds INTEGER,
  notes TEXT,
  created_at TEXT NOT NULL,
  CHECK (set_index > 0),
  CHECK (weight_kg >= 0),
  CHECK (reps > 0),
  UNIQUE(session_id, exercise_id, set_index)
);

CREATE TABLE IF NOT EXISTS body_measurements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  measured_at TEXT NOT NULL,
  metric TEXT NOT NULL,
  value REAL NOT NULL,
  unit TEXT NOT NULL,
  body_part TEXT,
  source_type TEXT NOT NULL DEFAULT 'manual',
  confirmation_status TEXT NOT NULL DEFAULT 'confirmed',
  confidence REAL,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (confirmation_status IN ('pending', 'confirmed', 'rejected', 'superseded')),
  UNIQUE(user_id, measured_at, metric, body_part, source_type)
);

CREATE INDEX IF NOT EXISTS idx_strength_sessions_user_started
  ON strength_sessions(user_id, started_at);

CREATE INDEX IF NOT EXISTS idx_body_measurements_user_metric_time
  ON body_measurements(user_id, metric, measured_at);
