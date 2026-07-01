CREATE TABLE IF NOT EXISTS apple_health_guardian_status (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enabled INTEGER,
  client_state TEXT,
  client_reported_at TEXT,
  last_successful_upload_at TEXT,
  last_failed_upload_at TEXT,
  last_failure_code TEXT,
  last_failure_message TEXT,
  last_client_sync_id TEXT,
  last_source TEXT,
  last_range TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id)
);
