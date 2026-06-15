CREATE TABLE IF NOT EXISTS apple_health_ecg_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  ended_at TEXT,
  classification TEXT,
  average_heart_rate_bpm REAL,
  sampling_frequency_hz REAL,
  voltage_measurement_count INTEGER,
  symptoms_status TEXT,
  source_type TEXT NOT NULL DEFAULT 'apple_health_ecg',
  source_ref TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, source_type, external_id)
);

CREATE INDEX IF NOT EXISTS idx_apple_health_ecg_user_recorded
ON apple_health_ecg_records(user_id, recorded_at DESC);
