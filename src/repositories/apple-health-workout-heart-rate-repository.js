const { newId } = require("../utils/ids");
const { nowIso } = require("../utils/time");

function createWorkoutHeartRateRepository(db, { clock } = {}) {
  function upsertWorkoutHeartRate(userId, workout, record) {
    const samples = record.heartRateSamples || [];
    if (!workout || (!record.heartRateSummary && !samples.length)) return;
    const now = nowIso(clock);
    const summary = record.heartRateSummary || {};
    const rates = samples.map((sample) => sample.heartRateBpm).filter(Number.isFinite);
    db.prepare(
      `INSERT INTO apple_health_workout_heart_rate_summaries
       (id, user_id, workout_id, external_id, average_heart_rate_bpm, min_heart_rate_bpm, max_heart_rate_bpm,
        zone1_seconds, zone2_seconds, zone3_seconds, zone4_seconds, zone5_seconds, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(workout_id) DO UPDATE SET
        average_heart_rate_bpm = COALESCE(excluded.average_heart_rate_bpm, average_heart_rate_bpm),
        min_heart_rate_bpm = COALESCE(excluded.min_heart_rate_bpm, min_heart_rate_bpm),
        max_heart_rate_bpm = COALESCE(excluded.max_heart_rate_bpm, max_heart_rate_bpm),
        zone1_seconds = COALESCE(excluded.zone1_seconds, zone1_seconds),
        zone2_seconds = COALESCE(excluded.zone2_seconds, zone2_seconds),
        zone3_seconds = COALESCE(excluded.zone3_seconds, zone3_seconds),
        zone4_seconds = COALESCE(excluded.zone4_seconds, zone4_seconds),
        zone5_seconds = COALESCE(excluded.zone5_seconds, zone5_seconds),
        updated_at = excluded.updated_at`
    ).run(newId("ahh"), userId, workout.id, `${workout.external_id}:hr`,
      record.averageHeartRateBpm ?? summary.averageHeartRateBpm ?? null,
      summary.minHeartRateBpm ?? (rates.length ? Math.min(...rates) : null),
      summary.maxHeartRateBpm ?? (rates.length ? Math.max(...rates) : null),
      summary.zone1Seconds ?? null, summary.zone2Seconds ?? null, summary.zone3Seconds ?? null,
      summary.zone4Seconds ?? null, summary.zone5Seconds ?? null, now, now);
    samples.forEach((sample, index) => upsertHeartRateSample(userId, workout.id, workout.external_id, sample, index, now));
  }

  function attachWorkoutHeartRate(workout) {
    if (!workout) return workout;
    const heartRateSummary = db.prepare("SELECT * FROM apple_health_workout_heart_rate_summaries WHERE workout_id = ?").get(workout.id) || null;
    const heartRateSamples = db.prepare(
      "SELECT sampled_at, heart_rate_bpm FROM apple_health_workout_heart_rate_samples WHERE workout_id = ? ORDER BY sampled_at ASC LIMIT 2000"
    ).all(workout.id);
    return { ...workout, heart_rate_summary: heartRateSummary, heart_rate_samples: heartRateSamples };
  }

  function upsertHeartRateSample(userId, workoutId, workoutExternalId, sample, index, now) {
    db.prepare(
      `INSERT INTO apple_health_workout_heart_rate_samples
       (id, user_id, workout_id, external_id, sampled_at, heart_rate_bpm, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, source_type, external_id) DO UPDATE SET
        sampled_at = excluded.sampled_at,
        heart_rate_bpm = excluded.heart_rate_bpm,
        updated_at = excluded.updated_at`
    ).run(newId("ahr"), userId, workoutId, sample.externalId || `${workoutExternalId}:hr:${sample.sampledAt}:${index}`,
      sample.sampledAt, sample.heartRateBpm, now, now);
  }

  return { attachWorkoutHeartRate, upsertWorkoutHeartRate };
}

module.exports = { createWorkoutHeartRateRepository };
