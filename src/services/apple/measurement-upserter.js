function createMeasurementUpserter({ bodyService, inputError }) {
  function recordMeasurements(workspaceRef, records, kind, normalizeMeasurement) {
    if (!records.length) return [];
    if (!bodyService) throw inputError("body service is unavailable");
    const normalized = records.map((record) => normalizeMeasurement(record, kind));
    const existingByMetric = new Map();
    const touched = [];
    for (const measurement of normalized) {
      let existing = existingByMetric.get(measurement.metric);
      if (!existing) {
        existing = new Map(bodyService.listMeasurements({ workspaceRef, metric: measurement.metric })
          .map((row) => [measurementKey(row.measured_at, row.source_type, row.body_part), row]));
        existingByMetric.set(measurement.metric, existing);
      }
      const key = measurementKey(measurement.measuredAt, measurement.sourceType, measurement.bodyPart);
      const row = existing.get(key);
      if (row) {
        const saved = sameMeasurement(row, measurement)
          ? row
          : bodyService.updateMeasurement({ ...measurement, workspaceRef, measurementId: row.id });
        existing.set(key, saved);
        touched.push(saved);
      } else {
        const saved = bodyService.recordMeasurement({ ...measurement, workspaceRef });
        existing.set(key, saved);
        touched.push(saved);
      }
    }
    return touched;
  }

  return { recordMeasurements };
}

function measurementKey(measuredAt, sourceType, bodyPart) {
  return `${measuredAt}\n${sourceType || ""}\n${bodyPart || ""}`;
}

function sameMeasurement(row, measurement) {
  return row.measured_at === measurement.measuredAt
    && row.metric === measurement.metric
    && Number(row.value) === Number(measurement.value)
    && row.unit === measurement.unit
    && (row.body_part || "") === (measurement.bodyPart || "")
    && row.source_type === measurement.sourceType
    && row.confirmation_status === measurement.confirmationStatus
    && nullableNumber(row.confidence) === nullableNumber(measurement.confidence)
    && (row.notes || "") === (measurement.notes || "");
}

function nullableNumber(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

module.exports = { createMeasurementUpserter };
