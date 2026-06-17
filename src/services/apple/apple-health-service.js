const { inputError } = require("../../utils/errors");
const { assertCleanText } = require("../../utils/text-integrity");
const { requireIsoDateTime } = require("../../utils/time");
const { stringOrNull } = require("../../utils/sqlite-values");
const { normalizeCardioActivity } = require("../training/training-catalog");
const { createEcgNormalizer } = require("./ecg-normalizer");
const { createAppleListService } = require("./apple-list-service");
const { createWorkoutHeartRateNormalizer } = require("./workout-heart-rate-normalizer");
const ecgNormalizer = createEcgNormalizer({ boundedMetadata, externalId, inputError, integerOrNull, normalizeKey, numberOrNull, requireIsoDateTime });
const workoutHeartRate = createWorkoutHeartRateNormalizer({ inputError, integerOrNull, numberOrNull, requireIsoDateTime });
const METRIC_ALIASES = Object.freeze({
  bodyfatpercentage: "body_fat_percentage", bodymassindex: "bmi", leanbodymass: "lean_body_mass",
  waistcircumference: "waist_circumference", hipcircumference: "hip_circumference", walkingaverageheartrate: "walking_average_heart_rate",
  heartrate: "heart_rate", restingheartrate: "resting_heart_rate", oxygensaturation: "oxygen_saturation", respiratoryrate: "respiratory_rate", vo2max: "vo2_max", bloodglucose: "blood_glucose"
});
function createAppleHealthService({ profileService, appleHealthRepository, bodyService }) {
  const lists = createAppleListService({ profileService, appleHealthRepository, limit });
  function bulkSync(input) {
    assertCleanText(input, "appleHealthBulkSync");
    const user = profileService.getUserByWorkspace(input.workspaceRef);
    const daily = appleHealthRepository.upsertDailySummaries(user.id, array(input.daily_summaries ?? input.dailySummaries).map(normalizeDaily));
    const workouts = appleHealthRepository.upsertWorkouts(user.id, array(input.workouts).map(normalizeWorkout));
    const sleep = appleHealthRepository.upsertSleepRecords(user.id, array(input.sleep_records ?? input.sleepRecords).map(normalizeSleep));
    const ecg = appleHealthRepository.upsertEcgRecords(user.id, array(input.ecg_records ?? input.ecgRecords ?? input.electrocardiograms).map(normalizeEcg));
    const body = recordMeasurements(input.workspaceRef, array(input.body_measurements ?? input.bodyMeasurements), "body_measurements");
    const vitals = recordMeasurements(input.workspaceRef, array(input.vitals), "vitals");
    return { ok: true, source: input.source || "apple_health_ios", range: input.range || "", client_sync_id: input.client_sync_id || input.clientSyncId || "", counts: {
      daily_summaries: daily.length, workouts: workouts.length, sleep_records: sleep.length,
      ecg_records: ecg.length, body_measurements: body.length, vitals: vitals.length
    }, warnings: [] };
  }

  function recordDailySummary(input) {
    assertCleanText(input, "appleHealthDailySummary");
    const user = profileService.getUserByWorkspace(input.workspaceRef);
    return appleHealthRepository.upsertDailySummary(user.id, normalizeDaily(input));
  }

  function recordDailySummaries(input) {
    assertCleanText(input, "appleHealthDailySummaries");
    const user = profileService.getUserByWorkspace(input.workspaceRef);
    const saved = appleHealthRepository.upsertDailySummaries(user.id, requiredRecords(input).map(normalizeDaily));
    return bulkResult(saved);
  }

  function listDailySummaries(input) {
    const user = profileService.getUserByWorkspace(input.workspaceRef);
    return { records: appleHealthRepository.listDailySummaries(user.id, { limit: limit(input.limit, 30) }) };
  }

  function recordWorkout(input) {
    assertCleanText(input, "appleHealthWorkout");
    const user = profileService.getUserByWorkspace(input.workspaceRef);
    return appleHealthRepository.upsertWorkout(user.id, normalizeWorkout(input));
  }

  function recordWorkouts(input) {
    assertCleanText(input, "appleHealthWorkouts");
    const user = profileService.getUserByWorkspace(input.workspaceRef);
    const saved = appleHealthRepository.upsertWorkouts(user.id, requiredRecords(input).map(normalizeWorkout));
    return bulkResult(saved);
  }

  function listWorkouts(input) {
    const user = profileService.getUserByWorkspace(input.workspaceRef);
    return { records: appleHealthRepository.listWorkouts(user.id, { limit: limit(input.limit, 30), workoutType: input.workoutType || input.workout_type }) };
  }

  function getEcgRecord(input) {
    const user = profileService.getUserByWorkspace(input.workspaceRef);
    const recordId = input.recordId || input.record_id;
    const externalId = input.externalId || input.external_id;
    if (!recordId && !externalId) throw inputError("recordId or externalId is required");
    const record = appleHealthRepository.getEcgRecord(user.id, { recordId, externalId });
    if (!record) throw inputError("ecg_record_not_found");
    return { ok: true, record };
  }

  function getSnapshot(input) {
    const user = profileService.getUserByWorkspace(input.workspaceRef);
    const daily = appleHealthRepository.listDailySummaries(user.id, { limit: 14 });
    const workouts = appleHealthRepository.listWorkouts(user.id, { limit: 8 });
    const sleep = appleHealthRepository.listSleepRecords(user.id, { limit: 8 });
    const ecg = appleHealthRepository.listEcgRecords(user.id, { limit: 8 });
    return { latestDaily: daily[0] || null, daily, workouts, latestSleep: sleep[0] || null, sleep, latestEcg: ecg[0] || null, ecg };
  }

  function recordMeasurements(workspaceRef, records, kind) {
    if (!records.length) return [];
    if (!bodyService) throw inputError("body service is unavailable");
    return records.map((record) => upsertBodyMeasurement(workspaceRef, normalizeMeasurement(record, kind)));
  }

  function upsertBodyMeasurement(workspaceRef, measurement) {
    const existing = bodyService.listMeasurements({ workspaceRef, metric: measurement.metric }).find((row) => {
      return row.measured_at === measurement.measuredAt
        && row.source_type === measurement.sourceType
        && (row.body_part || "") === (measurement.bodyPart || "");
    });
    if (existing) return bodyService.updateMeasurement({ ...measurement, workspaceRef, measurementId: existing.id });
    return bodyService.recordMeasurement({ ...measurement, workspaceRef });
  }

  return {
    bulkSync, getEcgRecord, getSnapshot, listDailySummaries,
    listEcgRecords: lists.listEcgRecords, listImportFiles: lists.listImportFiles,
    listObservations: lists.listObservations, listRoutePoints: lists.listRoutePoints,
    listSleepRecords: lists.listSleepRecords,
    listWorkouts, recordDailySummaries, recordDailySummary, recordWorkouts, recordWorkout
  };
}

function normalizeDaily(input) {
  const summaryDate = String(input.summaryDate || input.summary_date || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(summaryDate)) throw inputError("summaryDate must be YYYY-MM-DD");
  const sourceType = normalizeKey(input.sourceType || input.source_type || "apple_health");
  return {
    externalId: externalId(input, `apple_health_daily:${summaryDate}`),
    summaryDate,
    stepCount: integerOrNull(input.stepCount ?? input.step_count ?? input.steps),
    activeEnergyKcal: numberOrNull(input.activeEnergyKcal ?? input.active_energy_kcal),
    basalEnergyKcal: numberOrNull(input.basalEnergyKcal ?? input.basal_energy_kcal ?? input.restingEnergyKcal ?? input.resting_energy_kcal),
    totalEnergyKcal: numberOrNull(input.totalEnergyKcal ?? input.total_energy_kcal),
    exerciseMinutes: numberOrNull(input.exerciseMinutes ?? input.exercise_minutes),
    standHours: standHours(input),
    walkingRunningDistanceM: distanceM(input.walkingRunningDistanceM ?? input.walking_running_distance_m ?? input.distanceValue ?? input.distanceM ?? input.distance_m ?? input.distanceKm ?? input.distance_km, input.distanceUnit || input.distance_unit || (input.distanceKm || input.distance_km ? "km" : "m")),
    flightsClimbed: numberOrNull(input.flightsClimbed ?? input.flights_climbed),
    restingHeartRateBpm: numberOrNull(input.restingHeartRateBpm ?? input.resting_heart_rate_bpm),
    averageHeartRateBpm: numberOrNull(input.averageHeartRateBpm ?? input.average_heart_rate_bpm),
    sourceType
  };
}

function normalizeWorkout(input) {
  const startedAt = requireIsoDateTime(input.startedAt ?? input.started_at, "startedAt");
  const endedAt = input.endedAt || input.ended_at ? requireIsoDateTime(input.endedAt ?? input.ended_at, "endedAt") : null;
  const appleActivityType = normalizeKey(input.appleActivityType || input.apple_activity_type || input.workoutType || input.workout_type);
  if (!appleActivityType) throw inputError("appleActivityType is required");
  const normalizedActivityType = normalizeCardioActivity(input.normalizedActivityType || input.normalized_activity_type || appleActivityType) || "other";
  const durationSeconds = integerOrNull(input.durationSeconds ?? input.duration_seconds);
  if (durationSeconds != null && durationSeconds <= 0) throw inputError("durationSeconds must be positive");
  return {
    externalId: externalId(input, `apple_health_workout:${endedAt || startedAt}`),
    startedAt,
    endedAt,
    appleActivityType,
    normalizedActivityType,
    durationSeconds,
    distanceM: distanceM(input.distanceM ?? input.distance_m ?? input.distanceValue ?? input.distanceKm ?? input.distance_km, input.distanceUnit || input.distance_unit || (input.distanceKm || input.distance_km ? "km" : "m")),
    activeEnergyKcal: numberOrNull(input.activeEnergyKcal ?? input.active_energy_kcal),
    totalEnergyKcal: numberOrNull(input.totalEnergyKcal ?? input.total_energy_kcal),
    averageHeartRateBpm: numberOrNull(input.averageHeartRateBpm ?? input.average_heart_rate_bpm),
    heartRateSummary: normalizeWorkoutHeartRateSummary(input),
    heartRateSamples: array(input.heartRateSamples ?? input.heart_rate_samples).map((sample) => normalizeWorkoutHeartRateSample(sample, startedAt)),
    sourceType: normalizeKey(input.sourceType || input.source_type || "apple_health_workout"),
    sourceRef: stringOrNull(input.sourceRef ?? input.source_ref),
    metadata: boundedMetadata(input.metadata || input.metadata_json || input.sourceRevision || input.source_revision),
    notes: stringOrNull(input.notes)
  };
}

function normalizeWorkoutHeartRateSummary(input) { return workoutHeartRate.normalizeWorkoutHeartRateSummary(input); }
function normalizeWorkoutHeartRateSample(input, startedAt) { return workoutHeartRate.normalizeWorkoutHeartRateSample(input, startedAt); }

function normalizeSleep(input) {
  const sleepStart = requireIsoDateTime(input.sleepStart ?? input.sleep_start, "sleepStart");
  const sleepEnd = input.sleepEnd || input.sleep_end ? requireIsoDateTime(input.sleepEnd ?? input.sleep_end, "sleepEnd") : null;
  return {
    externalId: externalId(input, `apple_health_sleep:${sleepEnd || sleepStart}`),
    sleepStart,
    sleepEnd,
    totalSleepMinutes: numberOrNull(input.totalSleepMinutes ?? input.total_sleep_minutes),
    remMinutes: numberOrNull(input.remMinutes ?? input.rem_minutes),
    deepSleepMinutes: numberOrNull(input.deepSleepMinutes ?? input.deep_sleep_minutes),
    coreMinutes: numberOrNull(input.coreMinutes ?? input.core_minutes),
    awakeMinutes: numberOrNull(input.awakeMinutes ?? input.awake_minutes),
    inBedMinutes: numberOrNull(input.inBedMinutes ?? input.in_bed_minutes),
    hrvMs: numberOrNull(input.hrvMs ?? input.hrv_ms),
    restingHeartRate: numberOrNull(input.restingHeartRate ?? input.resting_heart_rate),
    sourceType: normalizeKey(input.sourceType || input.source_type || "apple_health_sleep"),
    metadata: boundedMetadata(input.metadata || input.metadata_json || input.sourceRevision || input.source_revision),
    notes: stringOrNull(input.notes)
  };
}

function normalizeEcg(input) { return ecgNormalizer.normalizeEcg(input); }

function normalizeMeasurement(input, kind) {
  return {
    measuredAt: requireIsoDateTime(input.measuredAt ?? input.measured_at ?? input.observedAt ?? input.observed_at, "measuredAt"),
    metric: normalizeMetric(input.metric),
    value: numberOrNull(input.value),
    unit: input.unit,
    bodyPart: stringOrNull(input.bodyPart ?? input.body_part),
    sourceType: normalizeKey(input.sourceType || input.source_type || `apple_health_${kind}`),
    confirmationStatus: input.confirmationStatus || input.confirmation_status || "confirmed",
    confidence: numberOrNull(input.confidence),
    notes: stringOrNull(input.notes)
  };
}

function boundedMetadata(value) {
  if (value == null || value === "") return {};
  if (typeof value === "string") return { value: value.slice(0, 512) };
  if (typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).slice(0, 16).map(([key, nested]) => [String(key).slice(0, 64), String(nested).slice(0, 512)]));
}

function bulkResult(saved) { return { ok: true, count: saved.length, latest: saved[0] || null }; }

function distanceM(value, unit) {
  const number = numberOrNull(value);
  if (number == null) return null;
  if (number < 0) throw inputError("distance must be non-negative");
  const normalized = normalizeKey(unit || "m");
  if (["km", "kilometer", "kilometers"].includes(normalized)) return number * 1000;
  if (["mi", "mile", "miles"].includes(normalized)) return number * 1609.344;
  return number;
}

function externalId(input, fallback) { return String(input.externalId || input.external_id || input.importKey || input.import_key || fallback).trim(); }

function integerOrNull(value) { const number = numberOrNull(value); return number == null ? null : Math.round(number); }

function standHours(input) {
  const hours = numberOrNull(input.standHours ?? input.stand_hours);
  if (hours != null) return hours;
  const minutes = numberOrNull(input.standMinutes ?? input.stand_minutes);
  return minutes == null ? null : minutes / 60;
}

function limit(value, fallback) {
  const number = Number(value || fallback);
  return Number.isFinite(number) ? Math.max(1, Math.min(100, Math.round(number))) : fallback;
}

function requiredRecords(input) {
  const list = array(input.records || input.items);
  if (!list.length) throw inputError("records must be a non-empty array");
  return list;
}

function array(value) { return Array.isArray(value) ? value : []; }

function numberOrNull(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number)) throw inputError("numeric field must be finite");
  return number;
}

function normalizeKey(value) { return String(value || "").trim().toLowerCase().replace(/[^a-z0-9+.-]+/g, "_").replace(/^_+|_+$/g, ""); }

function normalizeMetric(value) {
  const raw = String(value || "").trim();
  const compact = raw.replace(/[^a-z0-9]+/gi, "").toLowerCase();
  return METRIC_ALIASES[compact] || normalizeKey(raw);
}
module.exports = { createAppleHealthService };
