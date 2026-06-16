function createWorkoutHeartRateNormalizer({ inputError, integerOrNull, numberOrNull, requireIsoDateTime }) {
  function normalizeWorkoutHeartRateSummary(input) {
    const source = input.heartRateSummary || input.heart_rate_summary || input;
    const summary = {
      averageHeartRateBpm: numberOrNull(source.averageHeartRateBpm ?? source.average_heart_rate_bpm),
      minHeartRateBpm: numberOrNull(source.minHeartRateBpm ?? source.min_heart_rate_bpm),
      maxHeartRateBpm: numberOrNull(source.maxHeartRateBpm ?? source.max_heart_rate_bpm),
      zone1Seconds: integerOrNull(source.zone1Seconds ?? source.zone1_seconds),
      zone2Seconds: integerOrNull(source.zone2Seconds ?? source.zone2_seconds),
      zone3Seconds: integerOrNull(source.zone3Seconds ?? source.zone3_seconds),
      zone4Seconds: integerOrNull(source.zone4Seconds ?? source.zone4_seconds),
      zone5Seconds: integerOrNull(source.zone5Seconds ?? source.zone5_seconds)
    };
    return Object.values(summary).some((value) => value != null) ? summary : null;
  }

  function normalizeWorkoutHeartRateSample(input, startedAt) {
    const sampledAt = requireIsoDateTime(input.sampledAt ?? input.sampled_at ?? input.time ?? startedAt, "sampledAt");
    const heartRateBpm = numberOrNull(input.heartRateBpm ?? input.heart_rate_bpm ?? input.bpm);
    if (heartRateBpm == null) throw inputError("heartRateBpm is required");
    return { externalId: input.externalId || input.external_id, sampledAt, heartRateBpm };
  }

  return { normalizeWorkoutHeartRateSample, normalizeWorkoutHeartRateSummary };
}

module.exports = { createWorkoutHeartRateNormalizer };
