function createAppleHealthSyncStateRepository(db) {
  function getSyncState(userId) {
    return {
      daily_summaries: one(
        `SELECT COUNT(*) AS record_count, MAX(summary_date) AS latest_record_at, MAX(updated_at) AS latest_updated_at
         FROM apple_health_daily_summaries WHERE user_id = ?`,
        userId
      ),
      workouts: one(
        `SELECT COUNT(*) AS record_count, MAX(COALESCE(ended_at, started_at)) AS latest_record_at, MAX(updated_at) AS latest_updated_at
         FROM apple_health_workouts WHERE user_id = ?`,
        userId
      ),
      sleep_records: one(
        `SELECT COUNT(*) AS record_count, MAX(COALESCE(sleep_end, sleep_start)) AS latest_record_at, MAX(updated_at) AS latest_updated_at
         FROM apple_health_sleep_records WHERE user_id = ?`,
        userId
      ),
      ecg_records: one(
        `SELECT COUNT(*) AS record_count, MAX(recorded_at) AS latest_record_at, MAX(updated_at) AS latest_updated_at
         FROM apple_health_ecg_records WHERE user_id = ?`,
        userId
      ),
      body_measurements: one(
        `SELECT COUNT(*) AS record_count, MAX(measured_at) AS latest_record_at, MAX(updated_at) AS latest_updated_at
         FROM body_measurements WHERE user_id = ? AND source_type = 'apple_health_body_measurements'`,
        userId
      ),
      vitals: one(
        `SELECT COUNT(*) AS record_count, MAX(measured_at) AS latest_record_at, MAX(updated_at) AS latest_updated_at
         FROM body_measurements WHERE user_id = ? AND source_type = 'apple_health_vitals'`,
        userId
      )
    };
  }

  function one(sql, userId) {
    const row = db.prepare(sql).get(userId);
    return {
      record_count: row.record_count || 0,
      latest_record_at: row.latest_record_at || null,
      latest_updated_at: row.latest_updated_at || null
    };
  }

  return { getSyncState };
}

module.exports = { createAppleHealthSyncStateRepository };
