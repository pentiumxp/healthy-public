PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS source_documents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  document_type TEXT NOT NULL,
  document_date TEXT,
  source_ref TEXT,
  source_hash TEXT,
  privacy_level TEXT NOT NULL DEFAULT 'bounded',
  summary TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lab_results (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  observed_at TEXT NOT NULL,
  panel TEXT,
  test_name TEXT NOT NULL,
  test_code TEXT,
  value REAL,
  unit TEXT,
  reference_low REAL,
  reference_high REAL,
  reference_text TEXT,
  flag TEXT,
  source_document_id TEXT REFERENCES source_documents(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS clinical_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_date TEXT NOT NULL,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  institution TEXT,
  summary TEXT,
  source_document_id TEXT REFERENCES source_documents(id) ON DELETE SET NULL,
  confidence REAL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS clinical_findings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  finding_key TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  severity TEXT,
  body_site TEXT,
  onset_date TEXT,
  observed_at TEXT,
  evidence TEXT,
  source_event_id TEXT REFERENCES clinical_events(id) ON DELETE SET NULL,
  source_document_id TEXT REFERENCES source_documents(id) ON DELETE SET NULL,
  confidence REAL,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS symptoms (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  observed_at TEXT NOT NULL,
  symptom_key TEXT NOT NULL,
  severity REAL,
  duration TEXT,
  frequency TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  source_document_id TEXT REFERENCES source_documents(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recovery_sleep_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sleep_start TEXT NOT NULL,
  sleep_end TEXT,
  total_sleep_minutes REAL,
  rem_minutes REAL,
  deep_sleep_minutes REAL,
  hrv_ms REAL,
  resting_heart_rate REAL,
  recovery_score REAL,
  source_type TEXT NOT NULL DEFAULT 'manual',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS risk_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assessed_at TEXT NOT NULL,
  risk_key TEXT NOT NULL,
  label TEXT NOT NULL,
  priority INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  confidence TEXT,
  summary TEXT,
  evidence TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_risk_profiles_user_key_time
  ON risk_profiles(user_id, risk_key, assessed_at);

CREATE TABLE IF NOT EXISTS followup_tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT,
  priority INTEGER,
  status TEXT NOT NULL DEFAULT 'open',
  due_date TEXT,
  notes TEXT,
  source_document_id TEXT REFERENCES source_documents(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lab_results_user_test_time
  ON lab_results(user_id, test_name, observed_at);

CREATE INDEX IF NOT EXISTS idx_clinical_findings_user_key
  ON clinical_findings(user_id, finding_key);

CREATE INDEX IF NOT EXISTS idx_followup_tasks_user_status
  ON followup_tasks(user_id, status);
