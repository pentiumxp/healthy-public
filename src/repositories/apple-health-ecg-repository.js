const { newId } = require("../utils/ids");
const { nowIso } = require("../utils/time");

function createAppleHealthEcgRepository(db, { clock } = {}) {
  function upsertEcgRecords(userId, records) {
    const out = [];
    db.exec("BEGIN");
    try {
      for (const record of records) out.push(upsertEcgRecord(userId, record));
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
    return out;
  }

  function upsertEcgRecord(userId, record) {
    const now = nowIso(clock);
    db.prepare(
      `INSERT INTO apple_health_ecg_records
       (id, user_id, external_id, recorded_at, ended_at, classification,
        average_heart_rate_bpm, sampling_frequency_hz, voltage_measurement_count,
        symptoms_status, source_type, source_ref, metadata_json, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, source_type, external_id) DO UPDATE SET
        recorded_at = excluded.recorded_at, ended_at = excluded.ended_at, classification = excluded.classification,
        average_heart_rate_bpm = excluded.average_heart_rate_bpm, sampling_frequency_hz = excluded.sampling_frequency_hz,
        voltage_measurement_count = excluded.voltage_measurement_count, symptoms_status = excluded.symptoms_status,
        source_ref = excluded.source_ref, metadata_json = excluded.metadata_json, notes = excluded.notes, updated_at = excluded.updated_at`
    ).run(newId("ahe"), userId, record.externalId, record.recordedAt, record.endedAt,
      record.classification, record.averageHeartRateBpm, record.samplingFrequencyHz,
      record.voltageMeasurementCount, record.symptomsStatus, record.sourceType || "apple_health_ecg",
      record.sourceRef || null, JSON.stringify(record.metadata || {}), record.notes || null, now, now);
    const ecg = getByExternal(userId, record.sourceType || "apple_health_ecg", record.externalId);
    upsertVoltageSamples(userId, ecg, record.voltageSamples || [], now);
    return getByExternal(userId, record.sourceType || "apple_health_ecg", record.externalId);
  }

  function listEcgRecords(userId, { limit = 14 } = {}) {
    return db.prepare("SELECT * FROM apple_health_ecg_records WHERE user_id = ? ORDER BY recorded_at DESC LIMIT ?")
      .all(userId, limit);
  }

  function getEcgRecord(userId, { recordId, externalId, sourceType = "apple_health_ecg" } = {}) {
    const ecg = recordId
      ? db.prepare("SELECT * FROM apple_health_ecg_records WHERE user_id = ? AND id = ?").get(userId, recordId)
      : getByExternal(userId, sourceType, externalId);
    return attachSamples(ecg);
  }

  function upsertVoltageSamples(userId, ecg, samples, now) {
    if (!ecg || !samples.length) return;
    db.prepare("DELETE FROM apple_health_ecg_voltage_samples WHERE ecg_id = ?").run(ecg.id);
    const insert = db.prepare(
      `INSERT INTO apple_health_ecg_voltage_samples
       (id, user_id, ecg_id, external_id, sample_index, offset_ms, voltage_microvolts, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(ecg_id, sample_index) DO UPDATE SET
        external_id = excluded.external_id, offset_ms = excluded.offset_ms,
        voltage_microvolts = excluded.voltage_microvolts, updated_at = excluded.updated_at`
    );
    for (const sample of samples) {
      insert.run(newId("ahev"), userId, ecg.id, sample.externalId || `${ecg.external_id}:v:${sample.sampleIndex}`,
        sample.sampleIndex, sample.offsetMs, sample.voltageMicrovolts, now, now);
    }
  }

  function attachSamples(ecg) {
    if (!ecg) return null;
    const samples = db.prepare(
      "SELECT sample_index, offset_ms, voltage_microvolts FROM apple_health_ecg_voltage_samples WHERE ecg_id = ? ORDER BY sample_index ASC"
    ).all(ecg.id);
    return { ...ecg, voltage_samples: samples, sample_count: samples.length };
  }

  function getByExternal(userId, sourceType, externalId) {
    return db.prepare("SELECT * FROM apple_health_ecg_records WHERE user_id = ? AND source_type = ? AND external_id = ?")
      .get(userId, sourceType, externalId);
  }

  return { getEcgRecord, listEcgRecords, upsertEcgRecords };
}

module.exports = { createAppleHealthEcgRepository };
