const { inputError } = require("../../utils/errors");
const { assertCleanText } = require("../../utils/text-integrity");
const { requireIsoDateTime } = require("../../utils/time");
const { cardioActivityCatalog, normalizeCardioActivity } = require("./training-catalog");

const ACTIVITY_TYPES = new Set(cardioActivityCatalog().map((item) => item.key));

function createCardioService({ profileService, cardioRepository }) {
  function recordSession(input) {
    assertCleanText(input, "cardioSession");
    const user = profileService.getUserByWorkspace(input.workspaceRef);
    return cardioRepository.addSession(user.id, normalize(input));
  }

  function listSessions(input) {
    const user = profileService.getUserByWorkspace(input.workspaceRef);
    return cardioRepository.listSessions(user.id).map((session) => ({
      ...session,
      activity_type: normalizeCardioActivity(session.activity_type) || session.activity_type
    }));
  }

  function normalize(input) {
    const activityType = normalizeCardioActivity(input.activityType || input.activity_type);
    if (!activityType) throw inputError("unsupported cardio activity type", "unsupported_activity_type");
    const durationSeconds = numberOrNull(input.durationSeconds ?? input.duration_seconds);
    const heartRate = numberOrNull(input.averageHeartRateBpm ?? input.average_heart_rate_bpm);
    if (durationSeconds != null && durationSeconds <= 0) throw inputError("durationSeconds must be positive");
    if (heartRate != null && heartRate <= 0) throw inputError("averageHeartRateBpm must be positive");
    return {
      startedAt: requireIsoDateTime(input.startedAt ?? input.started_at, "startedAt"),
      endedAt: input.endedAt || input.ended_at ? requireIsoDateTime(input.endedAt ?? input.ended_at, "endedAt") : null,
      activityType,
      durationSeconds,
      distanceKm: distanceKm(input.distanceValue ?? input.distanceKm ?? input.distance_km, input.distanceUnit || "km"),
      activeEnergyKcal: numberOrNull(input.activeEnergyKcal ?? input.active_energy_kcal),
      totalEnergyKcal: numberOrNull(input.totalEnergyKcal ?? input.total_energy_kcal),
      elevationGainM: numberOrNull(input.elevationGainM ?? input.elevation_gain_m),
      averageHeartRateBpm: heartRate,
      averagePaceSecondsPerKm: numberOrNull(input.averagePaceSecondsPerKm ?? input.average_pace_seconds_per_km),
      perceivedExertion: numberOrNull(input.perceivedExertion ?? input.perceived_exertion),
      sourceType: input.sourceType || input.source_type || "manual",
      sourceDocumentId: input.sourceDocumentId || input.source_document_id,
      notes: input.notes
    };
  }

  function distanceKm(value, unit) {
    const number = numberOrNull(value);
    if (number == null) return null;
    if (number < 0) throw inputError("distance must be non-negative");
    if (unit === "m" || unit === "meter" || unit === "meters") return number / 1000;
    if (unit === "mi" || unit === "mile" || unit === "miles") return number * 1.609344;
    return number;
  }

  function numberOrNull(value) {
    if (value == null || value === "") return null;
    const number = Number(value);
    if (!Number.isFinite(number)) throw inputError("numeric field must be finite");
    return number;
  }

  return { listSessions, recordSession };
}

module.exports = { ACTIVITY_TYPES, createCardioService };
