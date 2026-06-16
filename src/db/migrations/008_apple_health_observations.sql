CREATE TABLE IF NOT EXISTS apple_health_observations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL DEFAULT 'apple_health_export',
  external_id TEXT NOT NULL,
  category_id TEXT,
  category_name TEXT,
  record_type TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  source_name TEXT,
  period TEXT NOT NULL,
  granularity TEXT NOT NULL DEFAULT 'daily',
  count INTEGER,
  numeric_sum REAL,
  numeric_avg REAL,
  numeric_min REAL,
  numeric_max REAL,
  duration_min REAL,
  non_numeric_count INTEGER,
  unit TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, source_type, external_id)
);

CREATE INDEX IF NOT EXISTS idx_apple_health_observations_user_metric_period
ON apple_health_observations(user_id, metric_name, period DESC);

CREATE INDEX IF NOT EXISTS idx_apple_health_observations_user_category_period
ON apple_health_observations(user_id, category_id, period DESC);

CREATE TABLE IF NOT EXISTS apple_health_import_files (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL DEFAULT 'apple_health_export_file',
  external_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_kind TEXT,
  byte_size INTEGER,
  row_count INTEGER,
  sha256 TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, source_type, external_id)
);

CREATE INDEX IF NOT EXISTS idx_apple_health_import_files_user_kind
ON apple_health_import_files(user_id, file_kind);

CREATE TABLE IF NOT EXISTS apple_health_workout_route_points (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL DEFAULT 'apple_health_workout_route',
  external_id TEXT NOT NULL,
  route_file TEXT NOT NULL,
  point_index INTEGER NOT NULL,
  recorded_at TEXT,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  elevation_m REAL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, source_type, external_id)
);

CREATE INDEX IF NOT EXISTS idx_apple_health_route_points_user_route_index
ON apple_health_workout_route_points(user_id, route_file, point_index ASC);
