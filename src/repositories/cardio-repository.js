const { newId } = require("../utils/ids");
const { nowIso } = require("../utils/time");

function createCardioRepository(db, { clock } = {}) {
  function addSession(userId, session) {
    const now = nowIso(clock);
    const id = newId("car");
    db.prepare(
      `INSERT INTO cardio_sessions
       (id, user_id, started_at, ended_at, activity_type, duration_seconds,
        distance_km, active_energy_kcal, total_energy_kcal, elevation_gain_m,
        average_heart_rate_bpm, average_pace_seconds_per_km, perceived_exertion,
        source_type, source_document_id, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      userId,
      session.startedAt,
      session.endedAt || null,
      session.activityType,
      session.durationSeconds ?? null,
      session.distanceKm ?? null,
      session.activeEnergyKcal ?? null,
      session.totalEnergyKcal ?? null,
      session.elevationGainM ?? null,
      session.averageHeartRateBpm ?? null,
      session.averagePaceSecondsPerKm ?? null,
      session.perceivedExertion ?? null,
      session.sourceType || "manual",
      session.sourceDocumentId || null,
      session.notes || null,
      now,
      now
    );
    return db.prepare("SELECT * FROM cardio_sessions WHERE id = ?").get(id);
  }

  function listSessions(userId) {
    return db.prepare(
      `SELECT * FROM cardio_sessions
       WHERE user_id = ? ORDER BY started_at DESC`
    ).all(userId);
  }

  return { addSession, listSessions };
}

module.exports = { createCardioRepository };
