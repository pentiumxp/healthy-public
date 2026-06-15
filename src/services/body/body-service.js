const { inputError } = require("../../utils/errors");
const { assertCleanText } = require("../../utils/text-integrity");
const { requireIsoDateTime } = require("../../utils/time");
const { normalizeLength, normalizeWeight } = require("../../utils/units");

const BODY_METRICS = new Set([
  "weight",
  "body_fat_percentage",
  "bmi",
  "body_mass_index",
  "blood_glucose",
  "heart_rate",
  "hrv_ms",
  "lean_body_mass",
  "mindfulness_minutes",
  "oxygen_saturation",
  "respiratory_rate",
  "vo2_max",
  "walking_average_heart_rate",
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
    assertCleanText(input, "bodyMeasurement");
    const user = profileService.getUserByWorkspace(input.workspaceRef);
    const metric = input.metric;
    if (!BODY_METRICS.has(metric)) throw inputError("unsupported body metric", "unsupported_metric");
    const normalized = normalizeMeasurement(input);
    return bodyRepository.addMeasurement(user.id, normalized);
  }

  function normalizeMeasurement(input) {
    const measuredAt = requireIsoDateTime(input.measuredAt, "measuredAt");
    if (input.value == null) throw inputError("value is required");
    if (input.metric === "weight" || input.metric === "skeletal_muscle_mass" || input.metric === "lean_body_mass") {
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
    if (metric === "body_fat_percentage" || metric === "oxygen_saturation") return "percent";
    if (metric === "heart_rate" || metric.endsWith("_heart_rate")) return "bpm";
    if (metric.endsWith("_blood_pressure")) return "mmHg";
    if (metric === "blood_glucose") return "mg/dL";
    if (metric === "bmi" || metric === "body_mass_index") return "kg/m2";
    if (metric === "hrv_ms") return "ms";
    if (metric === "mindfulness_minutes") return "min";
    if (metric === "respiratory_rate") return "breaths/min";
    if (metric === "vo2_max") return "ml/kg/min";
    return "unit";
  }

  function listMeasurements(input) {
    const user = profileService.getUserByWorkspace(input.workspaceRef);
    return bodyRepository.listMeasurements(user.id, input.metric);
  }

  function updateMeasurement(input) {
    assertCleanText(input, "bodyMeasurement");
    const user = profileService.getUserByWorkspace(input.workspaceRef);
    if (!input.measurementId) throw inputError("measurementId is required");
    const existing = bodyRepository.listMeasurements(user.id).find((item) => item.id === input.measurementId);
    if (!existing) throw inputError("body measurement is not found", "record_not_found");
    const normalized = normalizeMeasurement({
      measuredAt: input.measuredAt ?? existing.measured_at,
      metric: input.metric ?? existing.metric,
      value: input.value ?? existing.value,
      unit: input.unit ?? existing.unit,
      bodyPart: Object.hasOwn(input, "bodyPart") ? input.bodyPart : existing.body_part,
      sourceType: input.sourceType ?? existing.source_type,
      confirmationStatus: input.confirmationStatus ?? existing.confirmation_status,
      confidence: Object.hasOwn(input, "confidence") ? input.confidence : existing.confidence,
      notes: Object.hasOwn(input, "notes") ? input.notes : existing.notes
    });
    const measurement = bodyRepository.updateMeasurement(user.id, input.measurementId, normalized);
    if (!measurement) throw inputError("body measurement is not found", "record_not_found");
    return measurement;
  }

  return { listMeasurements, recordMeasurement, updateMeasurement };
}

module.exports = { BODY_METRICS, createBodyService };
