const { newId } = require("../utils/ids");
const { nowIso } = require("../utils/time");

function createAppleHealthGuardianRepository(db, { clock } = {}) {
  function getGuardianStatus(userId) {
    return db.prepare("SELECT * FROM apple_health_guardian_status WHERE user_id = ?").get(userId) || null;
  }

  function upsertGuardianStatus(userId, patch) {
    const now = nowIso(clock);
    const id = newId("ahg");
    db.prepare(
      `INSERT INTO apple_health_guardian_status
       (id, user_id, enabled, client_state, client_reported_at,
        last_successful_upload_at, last_failed_upload_at, last_failure_code,
        last_failure_message, last_client_sync_id, last_source, last_range,
        created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
        enabled = COALESCE(excluded.enabled, enabled),
        client_state = COALESCE(excluded.client_state, client_state),
        client_reported_at = COALESCE(excluded.client_reported_at, client_reported_at),
        last_successful_upload_at = COALESCE(excluded.last_successful_upload_at, last_successful_upload_at),
        last_failed_upload_at = COALESCE(excluded.last_failed_upload_at, last_failed_upload_at),
        last_failure_code = COALESCE(excluded.last_failure_code, last_failure_code),
        last_failure_message = COALESCE(excluded.last_failure_message, last_failure_message),
        last_client_sync_id = COALESCE(excluded.last_client_sync_id, last_client_sync_id),
        last_source = COALESCE(excluded.last_source, last_source),
        last_range = COALESCE(excluded.last_range, last_range),
        updated_at = excluded.updated_at`
    ).run(
      id,
      userId,
      patch.enabled == null ? null : (patch.enabled ? 1 : 0),
      patch.clientState || null,
      patch.clientReportedAt || null,
      patch.lastSuccessfulUploadAt || null,
      patch.lastFailedUploadAt || null,
      patch.lastFailureCode || null,
      patch.lastFailureMessage || null,
      patch.lastClientSyncId || null,
      patch.lastSource || null,
      patch.lastRange || null,
      now,
      now
    );
    return getGuardianStatus(userId);
  }

  return { getGuardianStatus, upsertGuardianStatus };
}

module.exports = { createAppleHealthGuardianRepository };
