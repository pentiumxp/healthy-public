const { newId } = require("../utils/ids");
const { nowIso } = require("../utils/time");

function createTrainingRepository(db, { clock } = {}) {
  function ensureExercise(userId, exercise) {
    const name = exercise.name.trim();
    const existing = db.prepare(
      "SELECT * FROM exercise_catalog WHERE user_id = ? AND name = ?"
    ).get(userId, name);
    if (existing) return existing;
    const id = newId("exr");
    db.prepare(
      `INSERT INTO exercise_catalog
       (id, user_id, name, category, primary_muscle_group, equipment, is_user_defined, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?)`
    ).run(
      id,
      userId,
      name,
      exercise.category || null,
      exercise.primaryMuscleGroup || null,
      exercise.equipment || null,
      nowIso(clock)
    );
    return db.prepare("SELECT * FROM exercise_catalog WHERE id = ?").get(id);
  }

  function createSession(userId, session) {
    const now = nowIso(clock);
    const id = newId("str");
    db.prepare(
      `INSERT INTO strength_sessions
       (id, user_id, started_at, ended_at, duration_minutes, session_rpe,
        location, notes, source_type, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      userId,
      session.startedAt,
      session.endedAt || null,
      session.durationMinutes ?? null,
      session.sessionRpe ?? null,
      session.location || null,
      session.notes || null,
      session.sourceType || "manual",
      now,
      now
    );
    return db.prepare("SELECT * FROM strength_sessions WHERE id = ?").get(id);
  }

  function addSet(sessionId, exerciseId, set) {
    const id = newId("set");
    db.prepare(
      `INSERT INTO strength_sets
       (id, session_id, exercise_id, set_index, weight_kg, reps, rpe, is_warmup,
        is_failure, rest_seconds, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      sessionId,
      exerciseId,
      set.setIndex,
      set.weightKg,
      set.reps,
      set.rpe ?? null,
      set.isWarmup ? 1 : 0,
      set.isFailure ? 1 : 0,
      set.restSeconds ?? null,
      set.notes || null,
      nowIso(clock)
    );
    return db.prepare("SELECT * FROM strength_sets WHERE id = ?").get(id);
  }

  function listSessions(userId) {
    return db.prepare(
      `SELECT * FROM strength_sessions
       WHERE user_id = ? ORDER BY started_at DESC`
    ).all(userId);
  }

  function listSetsForSession(sessionId) {
    return db.prepare(
      `SELECT ss.*, ec.name AS exercise_name
       FROM strength_sets ss
       JOIN exercise_catalog ec ON ec.id = ss.exercise_id
       WHERE ss.session_id = ?
       ORDER BY ec.name ASC, ss.set_index ASC`
    ).all(sessionId);
  }

  return { addSet, createSession, ensureExercise, listSessions, listSetsForSession };
}

module.exports = { createTrainingRepository };

