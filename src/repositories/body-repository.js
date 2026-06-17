const { newId } = require("../utils/ids");
const { nowIso } = require("../utils/time");

function createBodyRepository(db, { clock } = {}) {
  function addMeasurement(userId, measurement) {
    const id = newId("bdy");
    const now = nowIso(clock);
    db.prepare(
      `INSERT INTO body_measurements
       (id, user_id, measured_at, metric, value, unit, body_part, source_type,
        confirmation_status, confidence, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      userId,
      measurement.measuredAt,
      measurement.metric,
      measurement.value,
      measurement.unit,
      measurement.bodyPart || null,
      measurement.sourceType || "manual",
      measurement.confirmationStatus || "confirmed",
      measurement.confidence ?? null,
      measurement.notes || null,
      now,
      now
    );
    return db.prepare("SELECT * FROM body_measurements WHERE id = ?").get(id);
  }

  function listMeasurements(userId, metric) {
    const sql = metric
      ? `SELECT * FROM body_measurements WHERE user_id = ? AND metric = ? ORDER BY measured_at ASC`
      : `SELECT * FROM body_measurements WHERE user_id = ? ORDER BY measured_at ASC`;
    return metric ? db.prepare(sql).all(userId, metric) : db.prepare(sql).all(userId);
  }

  function updateMeasurement(userId, measurementId, measurement) {
    const existing = db.prepare(
      "SELECT * FROM body_measurements WHERE id = ? AND user_id = ?"
    ).get(measurementId, userId);
    if (!existing) return null;
    const next = { ...existing, ...measurement };
    const now = nowIso(clock);
    db.prepare(
      `UPDATE body_measurements SET measured_at = ?, metric = ?, value = ?,
       unit = ?, body_part = ?, source_type = ?, confirmation_status = ?,
       confidence = ?, notes = ?, updated_at = ? WHERE id = ? AND user_id = ?`
    ).run(
      next.measuredAt ?? next.measured_at,
      next.metric,
      next.value,
      next.unit,
      next.bodyPart ?? next.body_part ?? null,
      next.sourceType ?? next.source_type ?? "manual",
      next.confirmationStatus ?? next.confirmation_status ?? "confirmed",
      next.confidence ?? null,
      next.notes ?? null,
      now,
      measurementId,
      userId
    );
    return db.prepare("SELECT * FROM body_measurements WHERE id = ?").get(measurementId);
  }

  return { addMeasurement, listMeasurements, updateMeasurement };
}

module.exports = { createBodyRepository };
