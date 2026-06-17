const { newId } = require("../utils/ids");
const { nowIso } = require("../utils/time");
const { createAppleHealthEcgRepository } = require("./apple-health-ecg-repository");
const { createAppleHealthSyncStateRepository } = require("./apple-health-sync-state-repository");
const { createWorkoutHeartRateRepository } = require("./apple-health-workout-heart-rate-repository");
const { bestStoredSleepRecord, collapseSleepRecords, sleepDayKey } = require("../utils/apple-health-sleep-records");
function createAppleHealthRepository(db, { clock } = {}) {
  const ecgRepository = createAppleHealthEcgRepository(db, { clock });
  const syncStateRepository = createAppleHealthSyncStateRepository(db);
  const workoutHeartRate = createWorkoutHeartRateRepository(db, { clock });
  function upsertDailySummary(userId, record) {
    const now = nowIso(clock);
    const id = newId("ahd");
    db.prepare(
      `INSERT INTO apple_health_daily_summaries
       (id, user_id, external_id, summary_date, step_count, active_energy_kcal, basal_energy_kcal,
        total_energy_kcal, exercise_minutes, stand_hours, walking_running_distance_m, flights_climbed,
        resting_heart_rate_bpm, average_heart_rate_bpm, source_type, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, source_type, external_id) DO UPDATE SET
        summary_date = excluded.summary_date,
        step_count = excluded.step_count,
        active_energy_kcal = excluded.active_energy_kcal,
        basal_energy_kcal = excluded.basal_energy_kcal,
        total_energy_kcal = excluded.total_energy_kcal,
        exercise_minutes = excluded.exercise_minutes,
        stand_hours = excluded.stand_hours,
        walking_running_distance_m = excluded.walking_running_distance_m,
        flights_climbed = excluded.flights_climbed,
        resting_heart_rate_bpm = excluded.resting_heart_rate_bpm,
        average_heart_rate_bpm = excluded.average_heart_rate_bpm,
        updated_at = excluded.updated_at`
    ).run(id, userId, record.externalId, record.summaryDate, record.stepCount, record.activeEnergyKcal,
      record.basalEnergyKcal, record.totalEnergyKcal, record.exerciseMinutes,
      record.standHours, record.walkingRunningDistanceM, record.flightsClimbed,
      record.restingHeartRateBpm, record.averageHeartRateBpm,
      record.sourceType || "apple_health", now, now);
    return getByExternal("apple_health_daily_summaries", userId, record.sourceType || "apple_health", record.externalId);
  }
  function upsertDailySummaries(userId, records) {
    const out = [];
    db.exec("BEGIN");
    try {
      for (const record of records) out.push(upsertDailySummary(userId, record));
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
    return out;
  }
  function upsertWorkout(userId, record) {
    const now = nowIso(clock);
    const id = newId("ahw");
    db.prepare(
      `INSERT INTO apple_health_workouts
       (id, user_id, external_id, started_at, ended_at, apple_activity_type,
        normalized_activity_type, duration_seconds, distance_m, active_energy_kcal,
        total_energy_kcal, average_heart_rate_bpm, source_type, source_ref,
        metadata_json, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, source_type, external_id) DO UPDATE SET
        started_at = excluded.started_at,
        ended_at = excluded.ended_at,
        apple_activity_type = excluded.apple_activity_type,
        normalized_activity_type = excluded.normalized_activity_type,
        duration_seconds = excluded.duration_seconds,
        distance_m = excluded.distance_m,
        active_energy_kcal = excluded.active_energy_kcal,
        total_energy_kcal = excluded.total_energy_kcal,
        average_heart_rate_bpm = excluded.average_heart_rate_bpm,
        source_ref = excluded.source_ref,
        metadata_json = excluded.metadata_json,
        notes = excluded.notes,
        updated_at = excluded.updated_at`
    ).run(id, userId, record.externalId, record.startedAt, record.endedAt,
      record.appleActivityType, record.normalizedActivityType, record.durationSeconds,
      record.distanceM, record.activeEnergyKcal, record.totalEnergyKcal,
      record.averageHeartRateBpm, record.sourceType || "apple_health_workout",
      record.sourceRef || null, JSON.stringify(record.metadata || {}), record.notes || null, now, now);
    const workout = getByExternal("apple_health_workouts", userId, record.sourceType || "apple_health_workout", record.externalId);
    workoutHeartRate.upsertWorkoutHeartRate(userId, workout, record);
    return workoutHeartRate.attachWorkoutHeartRate(workout);
  }
  function upsertWorkouts(userId, records) {
    const out = [];
    db.exec("BEGIN");
    try {
      for (const record of records) out.push(upsertWorkout(userId, record));
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
    return out;
  }
  function upsertSleepRecords(userId, records) {
    const out = [];
    db.exec("BEGIN");
    try {
      for (const record of records) out.push(upsertSleepRecord(userId, record));
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
    return out;
  }

  function upsertSleepRecord(userId, record) {
    const now = nowIso(clock);
    const id = newId("ahs");
    const existing = getByExternal("apple_health_sleep_records", userId, record.sourceType || "apple_health_sleep", record.externalId);
    record = bestStoredSleepRecord([record, existing].filter(Boolean));
    deleteSleepDuplicatesForDay(userId, record.sourceType || "apple_health_sleep", sleepDayKey(record), record.externalId);
    db.prepare(
      `INSERT INTO apple_health_sleep_records
       (id, user_id, external_id, sleep_start, sleep_end, total_sleep_minutes,
        rem_minutes, deep_sleep_minutes, core_minutes, awake_minutes, in_bed_minutes,
        hrv_ms, resting_heart_rate, source_type, metadata_json, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, source_type, external_id) DO UPDATE SET
        sleep_start = excluded.sleep_start,
        sleep_end = excluded.sleep_end,
        total_sleep_minutes = excluded.total_sleep_minutes,
        rem_minutes = excluded.rem_minutes,
        deep_sleep_minutes = excluded.deep_sleep_minutes,
        core_minutes = excluded.core_minutes,
        awake_minutes = excluded.awake_minutes,
        in_bed_minutes = excluded.in_bed_minutes,
        hrv_ms = excluded.hrv_ms,
        resting_heart_rate = excluded.resting_heart_rate,
        metadata_json = excluded.metadata_json,
        notes = excluded.notes,
        updated_at = excluded.updated_at`
    ).run(id, userId, record.externalId, record.sleepStart, record.sleepEnd,
      record.totalSleepMinutes, record.remMinutes, record.deepSleepMinutes,
      record.coreMinutes, record.awakeMinutes, record.inBedMinutes, record.hrvMs,
      record.restingHeartRate, record.sourceType || "apple_health_sleep",
      JSON.stringify(record.metadata || {}), record.notes || null, now, now);
    return getByExternal("apple_health_sleep_records", userId, record.sourceType || "apple_health_sleep", record.externalId);
  }

  function listDailySummaries(userId, { limit = 14 } = {}) {
    return db.prepare(
      `SELECT * FROM apple_health_daily_summaries
       WHERE user_id = ? ORDER BY summary_date DESC LIMIT ?`
    ).all(userId, limit);
  }

  function listWorkouts(userId, { limit = 12, workoutType } = {}) {
    const filter = workoutType ? " AND normalized_activity_type = ?" : "";
    const params = workoutType ? [userId, workoutType, limit] : [userId, limit];
    return db.prepare(
      `SELECT * FROM apple_health_workouts
       WHERE user_id = ?${filter} ORDER BY started_at DESC LIMIT ?`
    ).all(...params).map(workoutHeartRate.attachWorkoutHeartRate);
  }

  function listSleepRecords(userId, { limit = 14 } = {}) {
    const boundedLimit = Math.max(1, Math.min(100, Number(limit) || 14));
    const rows = db.prepare(
      `SELECT * FROM apple_health_sleep_records
       WHERE user_id = ? ORDER BY sleep_start DESC LIMIT ?`
    ).all(userId, boundedLimit * 4);
    return collapseSleepRecords(rows, boundedLimit);
  }

  function listEcgRecords(userId, { limit = 14 } = {}) {
    return ecgRepository.listEcgRecords(userId, { limit });
  }

  function listObservations(userId, { limit = 50, categoryId, metricName, recordType } = {}) {
    const filters = [];
    const params = [userId];
    if (categoryId) { filters.push("category_id = ?"); params.push(categoryId); }
    if (metricName) { filters.push("metric_name = ?"); params.push(metricName); }
    if (recordType) { filters.push("record_type = ?"); params.push(recordType); }
    params.push(limit);
    return db.prepare(
      `SELECT * FROM apple_health_observations
       WHERE user_id = ?${filters.length ? ` AND ${filters.join(" AND ")}` : ""}
       ORDER BY period DESC, updated_at DESC LIMIT ?`
    ).all(...params);
  }

  function listImportFiles(userId, { limit = 50, fileKind } = {}) {
    const filter = fileKind ? " AND file_kind = ?" : "";
    const params = fileKind ? [userId, fileKind, limit] : [userId, limit];
    return db.prepare(
      `SELECT * FROM apple_health_import_files
       WHERE user_id = ?${filter} ORDER BY file_path ASC LIMIT ?`
    ).all(...params);
  }

  function listRoutePoints(userId, { limit = 1000, routeFile } = {}) {
    const filter = routeFile ? " AND route_file = ?" : "";
    const params = routeFile ? [userId, routeFile, limit] : [userId, limit];
    return db.prepare(
      `SELECT * FROM apple_health_workout_route_points
       WHERE user_id = ?${filter} ORDER BY route_file ASC, point_index ASC LIMIT ?`
    ).all(...params);
  }

  function getEcgRecord(userId, query) { return ecgRepository.getEcgRecord(userId, query); }

  function upsertEcgRecords(userId, records) { return ecgRepository.upsertEcgRecords(userId, records); }

  function getSyncState(userId) { return syncStateRepository.getSyncState(userId); }

  function getByExternal(table, userId, sourceType, externalId) {
    return db.prepare(`SELECT * FROM ${table} WHERE user_id = ? AND source_type = ? AND external_id = ?`)
      .get(userId, sourceType, externalId);
  }

  function deleteSleepDuplicatesForDay(userId, sourceType, sleepDay, keepExternalId) {
    db.prepare(
      `DELETE FROM apple_health_sleep_records
       WHERE user_id = ? AND source_type = ? AND external_id != ?
        AND (external_id = ? OR external_id LIKE ?)`
    ).run(userId, sourceType, keepExternalId, `apple_health_sleep:${sleepDay}`, `apple_health_sleep:${sleepDay}:%`);
  }

  return {
    getEcgRecord, getSyncState, listDailySummaries, listEcgRecords, listImportFiles,
    listObservations, listRoutePoints, listSleepRecords, listWorkouts,
    upsertDailySummaries, upsertDailySummary, upsertEcgRecords,
    upsertSleepRecords, upsertWorkouts, upsertWorkout
  };
}

module.exports = { createAppleHealthRepository };
