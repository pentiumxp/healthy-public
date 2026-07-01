const { nowIso, requireIsoDateTime } = require("../../utils/time");

const DOMAIN_RULES = Object.freeze({
  daily_summaries: { thresholdHours: 36, expectation: "expected_daily" },
  workouts: { thresholdHours: null, expectation: "opportunistic" },
  sleep_records: { thresholdHours: 36, expectation: "expected_after_sleep_window" },
  ecg_records: { thresholdHours: null, expectation: "opportunistic" },
  body_measurements: { thresholdHours: 168, expectation: "periodic" },
  vitals: { thresholdHours: 6, expectation: "expected_when_watch_worn" }
});

function createGuardianStatusService({ clock } = {}) {
  function buildStatus({ workspaceRef, syncState, storedStatus }) {
    const generatedAt = nowIso(clock);
    const domains = Object.fromEntries(Object.entries(syncState).map(([key, value]) => {
      return [key, domainStatus(key, value, generatedAt)];
    }));
    const latestHealthUploadAt = latestTimestamp([
      storedStatus && storedStatus.last_successful_upload_at,
      ...Object.values(domains).map((domain) => domain.last_upload_at)
    ]);
    const guardian = normalizeStoredStatus(storedStatus);
    const requiredDomains = Object.entries(domains)
      .filter(([, value]) => value.threshold_hours != null && value.expectation !== "periodic");
    const staleDomains = requiredDomains.filter(([, value]) => value.status === "stale").map(([key]) => key);
    const missingDomains = requiredDomains.filter(([, value]) => value.status === "no_data").map(([key]) => key);
    const overallStatus = guardian.enabled === false
      ? "disabled"
      : (staleDomains.length || missingDomains.length ? "stale" : (latestHealthUploadAt ? "fresh" : "no_data"));
    return {
      ok: true,
      mode: "guardian_freshness",
      workspace_id: workspaceRef,
      generated_at: generatedAt,
      latest_health_upload_at: latestHealthUploadAt,
      guardian,
      overall: {
        status: overallStatus,
        stale: overallStatus === "stale",
        stale_domains: staleDomains,
        missing_domains: missingDomains,
        warnings: [...staleDomains.map((key) => `${key}_stale`), ...missingDomains.map((key) => `${key}_missing`)]
      },
      domains,
      instructions: {
        client: "iOS background delivery is best-effort; use this response as freshness evidence, not continuous monitoring proof",
        write_endpoint: "/api/v1/apple-health/incremental-sync",
        status_endpoint: "/api/v1/apple-health/guardian-status"
      }
    };
  }

  function normalizePatch(input, { markSuccessfulUpload = false } = {}) {
    const guardian = normalizeGuardianInput(input);
    const patch = {
      enabled: guardian.enabled,
      clientState: bounded(guardian.clientState),
      clientReportedAt: isoOrNull(guardian.clientReportedAt),
      lastSuccessfulUploadAt: markSuccessfulUpload ? nowIso(clock) : isoOrNull(guardian.lastSuccessfulUploadAt),
      lastFailedUploadAt: isoOrNull(guardian.lastFailedUploadAt),
      lastFailureCode: bounded(guardian.lastFailureCode, 96),
      lastFailureMessage: bounded(guardian.lastFailureMessage, 160),
      lastClientSyncId: bounded(input.client_sync_id || input.clientSyncId || guardian.lastClientSyncId, 128),
      lastSource: bounded(input.source || guardian.lastSource, 80),
      lastRange: bounded(input.range || guardian.lastRange, 32)
    };
    return Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined));
  }

  return { buildStatus, normalizePatch };
}

function domainStatus(key, value, generatedAt) {
  const rule = DOMAIN_RULES[key] || { thresholdHours: null, expectation: "unknown" };
  const sampleAt = normalizeDomainSampleAt(key, value.latest_record_at);
  const uploadAt = value.latest_updated_at || null;
  const ageHours = sampleAt ? hoursBetween(sampleAt, generatedAt) : null;
  let status = "not_expected";
  if (rule.thresholdHours == null) {
    status = value.record_count ? "available" : "not_expected";
  } else if (!sampleAt) {
    status = "no_data";
  } else {
    status = ageHours > rule.thresholdHours ? "stale" : "fresh";
  }
  return {
    record_count: value.record_count || 0,
    last_sample_at: value.latest_record_at || null,
    last_upload_at: uploadAt,
    sample_age_hours: ageHours == null ? null : Number(ageHours.toFixed(2)),
    threshold_hours: rule.thresholdHours,
    expectation: rule.expectation,
    status,
    stale: status === "stale"
  };
}

function normalizeStoredStatus(row) {
  return {
    enabled: row && row.enabled != null ? row.enabled === 1 : null,
    client_state: row && row.client_state ? row.client_state : null,
    client_reported_at: row && row.client_reported_at ? row.client_reported_at : null,
    last_successful_upload_at: row && row.last_successful_upload_at ? row.last_successful_upload_at : null,
    last_failed_upload_at: row && row.last_failed_upload_at ? row.last_failed_upload_at : null,
    last_failure_code: row && row.last_failure_code ? row.last_failure_code : null,
    last_failure_message: row && row.last_failure_message ? row.last_failure_message : null,
    last_client_sync_id: row && row.last_client_sync_id ? row.last_client_sync_id : null,
    last_source: row && row.last_source ? row.last_source : null,
    last_range: row && row.last_range ? row.last_range : null
  };
}

function normalizeGuardianInput(input) {
  const nested = input.guardian || input.guardian_mode || input.guardianMode || {};
  const enabled = booleanOrUndefined(nested.enabled ?? input.guardian_mode_enabled ?? input.guardianModeEnabled);
  return {
    enabled,
    clientState: nested.client_state || nested.clientState || input.client_state || input.clientState || (enabled == null ? undefined : (enabled ? "enabled" : "disabled")),
    clientReportedAt: nested.client_reported_at || nested.clientReportedAt || input.client_reported_at || input.clientReportedAt,
    lastSuccessfulUploadAt: nested.last_successful_upload_at || nested.lastSuccessfulUploadAt || input.last_successful_upload_at || input.lastSuccessfulUploadAt,
    lastFailedUploadAt: nested.last_failed_upload_at || nested.lastFailedUploadAt || input.last_failed_upload_at || input.lastFailedUploadAt,
    lastFailureCode: nested.last_failure_code || nested.lastFailureCode || input.last_failure_code || input.lastFailureCode,
    lastFailureMessage: nested.last_failure_message || nested.lastFailureMessage || input.last_failure_message || input.lastFailureMessage,
    lastClientSyncId: nested.last_client_sync_id || nested.lastClientSyncId,
    lastSource: nested.last_source || nested.lastSource,
    lastRange: nested.last_range || nested.lastRange
  };
}

function normalizeDomainSampleAt(key, value) {
  if (!value) return null;
  if (key === "daily_summaries" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T23:59:59.999Z`;
  return value;
}

function hoursBetween(older, newer) {
  const a = Date.parse(older);
  const b = Date.parse(newer);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, (b - a) / 3600000);
}

function latestTimestamp(values) {
  return values.filter(Boolean).sort((a, b) => Date.parse(b) - Date.parse(a))[0] || null;
}

function booleanOrUndefined(value) {
  if (value === true || value === false) return value;
  if (value == null || value === "") return undefined;
  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "enabled", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "disabled", "off"].includes(normalized)) return false;
  return undefined;
}

function isoOrNull(value) {
  return value ? requireIsoDateTime(value, "guardian timestamp") : undefined;
}

function bounded(value, max = 128) {
  if (value == null || value === "") return undefined;
  return String(value).slice(0, max);
}

module.exports = { createGuardianStatusService };
