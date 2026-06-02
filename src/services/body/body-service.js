const { inputError } = require("../../utils/errors");
const { requireIsoDateTime } = require("../../utils/time");
const { normalizeLength, normalizeWeight } = require("../../utils/units");

const BODY_METRICS = new Set([
  "weight",
  "body_fat_percentage",
  "skeletal_muscle_mass",
  "waist_circumference",
  "hip_circumference",
  "chest_circumference",
  "resting_heart_rate",
  "systolic_blood_pressure",
  "diastolic_blood_pressure"
]);

function createBodyService({ profileService, bodyRepository }) {
  function recordMeasurement(input) {
    const user = profileService.getUserByWorkspace(input.workspaceRef);
    const metric = input.metric;
    if (!BODY_METRICS.has(metric)) throw inputError("unsupported body metric", "unsupported_metric");
    const normalized = normalizeMeasurement(input);
    return bodyRepository.addMeasurement(user.id, normalized);
  }

  function normalizeMeasurement(input) {
    const measuredAt = requireIsoDateTime(input.measuredAt, "measuredAt");
    if (input.value == null) throw inputError("value is required");
    if (input.metric === "weight" || input.metric === "skeletal_muscle_mass") {
      return base(input, measuredAt, normalizeWeight(input.value, input.unit || "kg"), "kg");
    }
    if (input.metric.endsWith("_circumference")) {
      const length = normalizeLength(input.value, input.unit || "cm");
      return base(input, measuredAt, length.value, length.unit);
    }
    return base(input, measuredAt, Number(input.value), input.unit || defaultUnit(input.metric));
  }

  function base(input, measuredAt, value, unit) {
    if (!Number.isFinite(value) || value < 0) throw inputError("value must be a non-negative number");
    return {
      measuredAt,
      metric: input.metric,
      value,
      unit,
      bodyPart: input.bodyPart,
      sourceType: input.sourceType || "manual",
      confirmationStatus: input.confirmationStatus || "confirmed",
      confidence: input.confidence,
      notes: input.notes
    };
  }

  function defaultUnit(metric) {
    if (metric === "body_fat_percentage") return "percent";
    if (metric.endsWith("_heart_rate")) return "bpm";
    if (metric.endsWith("_blood_pressure")) return "mmHg";
    return "unit";
  }

  function listMeasurements(input) {
    const user = profileService.getUserByWorkspace(input.workspaceRef);
    return bodyRepository.listMeasurements(user.id, input.metric);
  }

  return { listMeasurements, recordMeasurement };
}

module.exports = { BODY_METRICS, createBodyService };

