const { newId } = require("../utils/ids");
const { nowIso } = require("../utils/time");

function createUserRepository(db, { clock } = {}) {
  function findByWorkspace(workspaceRef) {
    return db.prepare("SELECT * FROM users WHERE workspace_ref = ?").get(workspaceRef);
  }

  function ensureUser({ workspaceRef, hermesUserRef, displayName, accessKeyHash, scopes }) {
    const existing = findByWorkspace(workspaceRef);
    const now = nowIso(clock);
    if (existing) {
      db.prepare(
        `UPDATE users SET hermes_user_ref = COALESCE(?, hermes_user_ref),
         display_name = COALESCE(?, display_name),
         workspace_access_key_hash = COALESCE(?, workspace_access_key_hash),
         scopes_json = COALESCE(?, scopes_json), updated_at = ? WHERE id = ?`
      ).run(
        hermesUserRef || null,
        displayName || null,
        accessKeyHash || null,
        scopes ? JSON.stringify(scopes) : null,
        now,
        existing.id
      );
      return findByWorkspace(workspaceRef);
    }
    const id = newId("usr");
    db.prepare(
      `INSERT INTO users
       (id, workspace_ref, hermes_user_ref, display_name, workspace_access_key_hash,
        scopes_json, plugin_enabled, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`
    ).run(
      id,
      workspaceRef,
      hermesUserRef || null,
      displayName || null,
      accessKeyHash || null,
      JSON.stringify(scopes || []),
      now,
      now
    );
    return findByWorkspace(workspaceRef);
  }

  function upsertProfile(userId, profile) {
    const existing = db.prepare("SELECT * FROM user_profiles WHERE user_id = ?").get(userId);
    const now = nowIso(clock);
    if (existing) {
      db.prepare(
        `UPDATE user_profiles SET birth_date = ?, sex = ?, height_cm = ?,
         target_weight_kg = ?, training_goal = ?, activity_level = ?, updated_at = ?
         WHERE user_id = ?`
      ).run(
        profile.birthDate || null,
        profile.sex || null,
        profile.heightCm ?? null,
        profile.targetWeightKg ?? null,
        profile.trainingGoal || null,
        profile.activityLevel || null,
        now,
        userId
      );
      return getProfile(userId);
    }
    const id = newId("pro");
    db.prepare(
      `INSERT INTO user_profiles
       (id, user_id, birth_date, sex, height_cm, target_weight_kg, training_goal,
        activity_level, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      userId,
      profile.birthDate || null,
      profile.sex || null,
      profile.heightCm ?? null,
      profile.targetWeightKg ?? null,
      profile.trainingGoal || null,
      profile.activityLevel || null,
      now,
      now
    );
    return getProfile(userId);
  }

  function getProfile(userId) {
    return db.prepare("SELECT * FROM user_profiles WHERE user_id = ?").get(userId);
  }

  function addMedication(userId, medication) {
    const now = nowIso(clock);
    const id = newId("med");
    db.prepare(
      `INSERT INTO medications
       (id, user_id, name, dose_value, dose_unit, frequency, started_at, ended_at,
        status, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      userId,
      medication.name,
      medication.doseValue ?? null,
      medication.doseUnit || null,
      medication.frequency || null,
      medication.startedAt || null,
      medication.endedAt || null,
      medication.status || "active",
      medication.notes || null,
      now,
      now
    );
    return db.prepare("SELECT * FROM medications WHERE id = ?").get(id);
  }

  function listActiveMedications(userId, atIso) {
    return db.prepare(
      `SELECT * FROM medications
       WHERE user_id = ? AND status = 'active' AND (ended_at IS NULL OR ended_at > ?)
       ORDER BY started_at ASC, created_at ASC`
    ).all(userId, atIso);
  }

  return { addMedication, ensureUser, findByWorkspace, getProfile, listActiveMedications, upsertProfile };
}

module.exports = { createUserRepository };
