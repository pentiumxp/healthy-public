CREATE TABLE IF NOT EXISTS apple_health_ecg_voltage_samples (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ecg_id TEXT NOT NULL REFERENCES apple_health_ecg_records(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL DEFAULT 'apple_health_ecg_voltage',
  external_id TEXT NOT NULL,
  sample_index INTEGER NOT NULL,
  offset_ms REAL,
  voltage_microvolts REAL NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, source_type, external_id),
  UNIQUE(ecg_id, sample_index)
);

CREATE INDEX IF NOT EXISTS idx_apple_health_ecg_samples_ecg_index
ON apple_health_ecg_voltage_samples(ecg_id, sample_index ASC);
