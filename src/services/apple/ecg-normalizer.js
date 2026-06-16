function createEcgNormalizer({ boundedMetadata, externalId, inputError, integerOrNull, normalizeKey, numberOrNull, requireIsoDateTime }) {
  function normalizeEcg(input) {
    const recordedAt = requireIsoDateTime(input.recordedAt ?? input.recorded_at ?? input.startDate ?? input.start_date, "recordedAt");
    const endedAt = input.endedAt || input.ended_at || input.endDate || input.end_date
      ? requireIsoDateTime(input.endedAt ?? input.ended_at ?? input.endDate ?? input.end_date, "endedAt")
      : null;
    const samples = normalizeSamples(input, numberOrNull(input.samplingFrequencyHz ?? input.sampling_frequency_hz));
    return {
      externalId: externalId(input, `apple_health_ecg:${endedAt || recordedAt}`),
      recordedAt,
      endedAt,
      classification: normalizeKey(input.classification ?? input.ecgClassification ?? input.ecg_classification),
      averageHeartRateBpm: numberOrNull(input.averageHeartRateBpm ?? input.average_heart_rate_bpm),
      samplingFrequencyHz: numberOrNull(input.samplingFrequencyHz ?? input.sampling_frequency_hz),
      voltageMeasurementCount: integerOrNull(input.voltageMeasurementCount ?? input.voltage_measurement_count ?? input.sampleCount ?? input.sample_count ?? samples.length),
      symptomsStatus: normalizeKey(input.symptomsStatus ?? input.symptoms_status),
      voltageSamples: samples,
      sourceType: normalizeKey(input.sourceType || input.source_type || "apple_health_ecg"),
      sourceRef: input.sourceRef || input.source_ref,
      metadata: boundedMetadata(input.metadata || input.metadata_json || input.sourceRevision || input.source_revision || input.device),
      notes: input.notes
    };
  }

  function normalizeSamples(input, hz) {
    const objectSamples = input.voltageSamples ?? input.voltage_samples ?? input.samples;
    if (Array.isArray(objectSamples)) return objectSamples.map((sample, index) => normalizeSample(sample, index, hz));
    const values = input.voltagesMicrovolts ?? input.voltages_microvolts ?? input.voltageMicrovolts ?? input.voltage_microvolts;
    if (Array.isArray(values)) return values.map((value, index) => normalizeSample({ voltageMicrovolts: value }, index, hz));
    return [];
  }

  function normalizeSample(sample, index, hz) {
    const voltage = numberOrNull(sample.voltageMicrovolts ?? sample.voltage_microvolts ?? sample.microvolts ?? sample.value);
    if (voltage == null) throw inputError("voltageMicrovolts is required");
    const sampleIndex = integerOrNull(sample.sampleIndex ?? sample.sample_index ?? index);
    return {
      externalId: sample.externalId || sample.external_id,
      sampleIndex,
      offsetMs: numberOrNull(sample.offsetMs ?? sample.offset_ms) ?? (hz ? (sampleIndex * 1000) / hz : null),
      voltageMicrovolts: voltage
    };
  }

  return { normalizeEcg };
}

module.exports = { createEcgNormalizer };
