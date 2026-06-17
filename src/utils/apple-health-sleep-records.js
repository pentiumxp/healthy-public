const DAY_PATTERN = /^apple_health_sleep:(\d{4}-\d{2}-\d{2})(?::|$)/;

function normalizeSleepDurations(record) {
  const out = { ...record };
  if (out.inBedMinutes == null && out.sleepStart && out.sleepEnd) {
    out.inBedMinutes = minutesBetween(out.sleepStart, out.sleepEnd);
  }
  const maxSleepMinutes = maxSleepWithinWindow(out);
  let stageTotal = sumPresent(out.remMinutes, out.deepSleepMinutes, out.coreMinutes);
  if (stageTotal != null && maxSleepMinutes != null && stageTotal > maxSleepMinutes + 2) {
    out.remMinutes = null;
    out.deepSleepMinutes = null;
    out.coreMinutes = null;
    stageTotal = null;
  }
  if (stageTotal != null && (out.totalSleepMinutes == null || out.coreMinutes != null)) {
    out.totalSleepMinutes = stageTotal;
  }
  if (maxSleepMinutes != null && out.totalSleepMinutes != null) {
    out.totalSleepMinutes = Math.min(out.totalSleepMinutes, maxSleepMinutes);
  }
  return out;
}

function canonicalSleepRecord(record) {
  const out = normalizeSleepDurations(record);
  out.externalId = `apple_health_sleep:${sleepDayKey(out)}`;
  return out;
}

function collapseSleepRecords(records, limit) {
  const selected = [];
  const groups = new Map();
  for (const record of records) {
    const key = sleepDayKey(record);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  }
  for (const group of groups.values()) selected.push(bestSleepRecord(group));
  selected.sort((a, b) => String(b.sleep_start || "").localeCompare(String(a.sleep_start || "")));
  return selected.slice(0, limit);
}

function bestSleepRecord(records) {
  return records
    .map((record) => normalizeListedSleepRecord(record))
    .sort((a, b) => sleepQualityScore(b) - sleepQualityScore(a))[0];
}

function bestStoredSleepRecord(records) {
  return records
    .map((record) => canonicalSleepRecord(rowToCamel(record)))
    .sort((a, b) => sleepQualityScore(camelToRow(b)) - sleepQualityScore(camelToRow(a)))[0];
}

function normalizeListedSleepRecord(record) {
  const camel = normalizeSleepDurations(rowToCamel(record));
  return {
    ...record,
    total_sleep_minutes: camel.totalSleepMinutes,
    rem_minutes: camel.remMinutes,
    deep_sleep_minutes: camel.deepSleepMinutes,
    core_minutes: camel.coreMinutes,
    awake_minutes: camel.awakeMinutes,
    in_bed_minutes: camel.inBedMinutes
  };
}

function rowToCamel(record) {
  return {
    externalId: record.external_id || record.externalId,
    sleepStart: record.sleep_start || record.sleepStart,
    sleepEnd: record.sleep_end || record.sleepEnd,
    totalSleepMinutes: numberOrNull(record.total_sleep_minutes ?? record.totalSleepMinutes),
    remMinutes: numberOrNull(record.rem_minutes ?? record.remMinutes),
    deepSleepMinutes: numberOrNull(record.deep_sleep_minutes ?? record.deepSleepMinutes),
    coreMinutes: numberOrNull(record.core_minutes ?? record.coreMinutes),
    awakeMinutes: numberOrNull(record.awake_minutes ?? record.awakeMinutes),
    inBedMinutes: numberOrNull(record.in_bed_minutes ?? record.inBedMinutes),
    hrvMs: numberOrNull(record.hrv_ms ?? record.hrvMs),
    restingHeartRate: numberOrNull(record.resting_heart_rate ?? record.restingHeartRate),
    sourceType: record.source_type || record.sourceType,
    metadata: parseMetadata(record.metadata || record.metadata_json),
    notes: record.notes
  };
}

function camelToRow(record) {
  return {
    external_id: record.externalId,
    sleep_start: record.sleepStart,
    sleep_end: record.sleepEnd,
    total_sleep_minutes: record.totalSleepMinutes,
    rem_minutes: record.remMinutes,
    deep_sleep_minutes: record.deepSleepMinutes,
    core_minutes: record.coreMinutes,
    awake_minutes: record.awakeMinutes,
    in_bed_minutes: record.inBedMinutes
  };
}

function sleepQualityScore(record) {
  const total = numberOrNull(record.total_sleep_minutes);
  const inBed = numberOrNull(record.in_bed_minutes);
  const awake = numberOrNull(record.awake_minutes);
  let score = 0;
  if (total != null && total > 0) score += 1000;
  if (inBed != null && total != null && total <= inBed + 2) score += 500;
  if (inBed != null && total != null && awake != null && total + awake <= inBed + 2) score += 500;
  if (record.rem_minutes != null || record.deep_sleep_minutes != null || record.core_minutes != null) score += 100;
  score += Math.min(720, Math.max(0, total || 0));
  score -= Math.abs(Math.max(0, (inBed || 0) - 480)) / 10;
  return score;
}

function sleepDayKey(record) {
  const match = String(record.external_id || record.externalId || "").match(DAY_PATTERN);
  if (match) return match[1];
  const end = record.sleep_end || record.sleepEnd || record.sleep_start || record.sleepStart;
  return String(end || "").slice(0, 10);
}

function sumPresent(...values) {
  const numbers = values.map(numberOrNull).filter((value) => value != null);
  return numbers.length ? numbers.reduce((sum, value) => sum + value, 0) : null;
}

function minutesBetween(start, end) {
  const diff = Date.parse(end) - Date.parse(start);
  return Number.isFinite(diff) && diff > 0 ? Math.round(diff / 60000) : null;
}

function maxSleepWithinWindow(record) {
  if (record.inBedMinutes == null) return null;
  if (record.awakeMinutes != null) return Math.max(0, record.inBedMinutes - record.awakeMinutes);
  return record.inBedMinutes;
}

function numberOrNull(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function parseMetadata(value) {
  if (value == null || value === "") return {};
  if (typeof value === "object") return value;
  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

module.exports = {
  bestStoredSleepRecord,
  canonicalSleepRecord,
  collapseSleepRecords,
  normalizeSleepDurations,
  sleepDayKey
};
