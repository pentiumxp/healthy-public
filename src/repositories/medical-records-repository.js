const { newId } = require("../utils/ids");

const TABLES = {
  sourceDocuments: "source_documents",
  labResults: "lab_results",
  clinicalEvents: "clinical_events",
  clinicalFindings: "clinical_findings",
  symptoms: "symptoms",
  recoverySleepRecords: "recovery_sleep_records",
  riskProfiles: "risk_profiles",
  followupTasks: "followup_tasks"
};

function createMedicalRecordsRepository(db, { clock } = {}) {
  const now = () => (clock ? clock() : new Date().toISOString());

  function insert(table, userId, data) {
    const row = { id: newId(table), user_id: userId, ...data, created_at: now(), updated_at: now() };
    const keys = Object.keys(row);
    db.prepare(`INSERT INTO ${table} (${keys.join(", ")}) VALUES (${keys.map(() => "?").join(", ")})`).run(...keys.map((key) => row[key]));
    return get(table, row.id);
  }

  function update(table, userId, id, data) {
    const existing = db.prepare(`SELECT * FROM ${table} WHERE id = ? AND user_id = ?`).get(id, userId);
    if (!existing) return null;
    const row = { ...data, updated_at: now() };
    const keys = Object.keys(row);
    db.prepare(`UPDATE ${table} SET ${keys.map((key) => `${key} = ?`).join(", ")} WHERE id = ? AND user_id = ?`)
      .run(...keys.map((key) => row[key]), id, userId);
    return get(table, id);
  }

  function list(table, userId, filters = {}) {
    const clauses = ["user_id = ?"];
    const params = [userId];
    for (const [key, value] of Object.entries(filters)) {
      if (value == null || value === "") continue;
      clauses.push(`${key} = ?`);
      params.push(value);
    }
    const order = table === "lab_results"
      ? "observed_at DESC, created_at DESC"
      : table === "recovery_sleep_records" ? "sleep_start DESC, created_at DESC" : "created_at DESC";
    return db.prepare(`SELECT * FROM ${table} WHERE ${clauses.join(" AND ")} ORDER BY ${order}`).all(...params);
  }

  function get(table, id) {
    return db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
  }

  return { insert, list, update, tables: TABLES };
}

module.exports = { createMedicalRecordsRepository };
