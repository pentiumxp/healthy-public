#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const { DatabaseSync } = require("node:sqlite");
const { applyMigrations } = require("../src/db/client");

const DEFAULT_SOURCE = "/Users/xuxin/HermesMobile/data/drive/users/owner/Hermes-徐欣/健身，健康/苹果健康";
const DEFAULT_DB = "/Users/hermes-host/HermesMobile/plugins/healthy/data/healthy.sqlite";

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const dbPath = args.db || DEFAULT_DB;
  const source = args.source || DEFAULT_SOURCE;
  const workspace = args.workspace || "health:owner";
  const db = new DatabaseSync(dbPath);
  applyMigrations(db);
  const user = db.prepare("SELECT id FROM users WHERE workspace_ref = ?").get(workspace);
  if (!user) throw new Error(`workspace not found: ${workspace}`);
  const context = { args, db, source, userId: user.id, now: new Date().toISOString(), stats: {} };
  db.exec("BEGIN");
  try {
    importDailySummaries(context);
    importBodyAndVitals(context);
    importSleep(context);
    importWorkouts(context);
    importEcg(context);
    importObservations(context);
    importFileInventory(context);
    importRoutePoints(context);
    if (args.dryRun) db.exec("ROLLBACK"); else db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  } finally {
    db.close();
  }
  const summary = { ok: true, dryRun: Boolean(args.dryRun), workspace, dbPath, source, stats: context.stats };
  console.log(JSON.stringify(summary, null, 2));
  return summary;
}

function importDailySummaries(context) {
  const rows = readCsv(file(context.source, "清洗输出/apple_health_daily_metrics.csv"));
  const stmt = context.db.prepare(
    `INSERT INTO apple_health_daily_summaries
     (id, user_id, external_id, summary_date, step_count, active_energy_kcal, basal_energy_kcal,
      total_energy_kcal, exercise_minutes, stand_hours, walking_running_distance_m, flights_climbed,
      resting_heart_rate_bpm, average_heart_rate_bpm, source_type, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, source_type, external_id) DO UPDATE SET
      step_count = excluded.step_count, active_energy_kcal = excluded.active_energy_kcal,
      basal_energy_kcal = excluded.basal_energy_kcal, total_energy_kcal = excluded.total_energy_kcal,
      exercise_minutes = excluded.exercise_minutes, stand_hours = excluded.stand_hours,
      walking_running_distance_m = excluded.walking_running_distance_m, flights_climbed = excluded.flights_climbed,
      resting_heart_rate_bpm = excluded.resting_heart_rate_bpm, average_heart_rate_bpm = excluded.average_heart_rate_bpm,
      updated_at = excluded.updated_at`
  );
  let count = 0;
  for (const row of rows) {
    if (!row.date) continue;
    stmt.run(id("ahd", `daily:${row.date}`), context.userId, `apple_health_export_daily:${row.date}`, row.date,
      int(row.steps), num(row.active_energy), num(row.basal_energy), sum(num(row.active_energy), num(row.basal_energy)),
      num(row.exercise_minutes), toHours(num(row.stand_minutes)), kmToM(num(row.distance_walking_running)),
      num(row.flights_climbed), num(row.resting_heart_rate), num(row.heart_rate),
      "apple_health_export_daily", context.now, context.now);
    count += 1;
  }
  context.stats.dailySummaries = count;
}

function importBodyAndVitals(context) {
  const rows = readCsv(file(context.source, "清洗输出/apple_health_daily_metrics.csv"));
  const metrics = {
    body_mass: ["weight", "kg"], body_fat_pct: ["body_fat_percentage", "fraction"], lean_body_mass: ["lean_body_mass", "kg"],
    heart_rate: ["heart_rate", "bpm"], hrv_sdnn: ["hrv_ms", "ms"], oxygen_saturation: ["oxygen_saturation", "fraction"],
    respiratory_rate: ["respiratory_rate", "breaths/min"], resting_heart_rate: ["resting_heart_rate", "bpm"],
    vo2max: ["vo2_max", "ml/kg/min"], walking_heart_rate: ["walking_average_heart_rate", "bpm"]
  };
  const stmt = context.db.prepare(
    `INSERT INTO body_measurements
     (id, user_id, measured_at, metric, value, unit, body_part, source_type, confirmation_status, confidence, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, NULL, 'apple_health_export_daily', 'confirmed', NULL, NULL, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
      value = excluded.value, unit = excluded.unit, updated_at = excluded.updated_at`
  );
  let count = 0;
  for (const row of rows) {
    for (const [column, [metric, unit]] of Object.entries(metrics)) {
      const value = num(row[column]);
      if (value == null || !row.date) continue;
      stmt.run(id("bm", `${row.date}:${metric}`), context.userId, `${row.date}T00:00:00.000Z`, metric, value, unit, context.now, context.now);
      count += 1;
    }
  }
  context.stats.bodyAndVitals = count;
}

function importSleep(context) {
  const rows = readCsv(file(context.source, "全量清洗分类数据/04_sleep_recovery/04_sleep_recovery_daily_wide.csv"));
  const stmt = context.db.prepare(
    `INSERT INTO apple_health_sleep_records
     (id, user_id, external_id, sleep_start, sleep_end, total_sleep_minutes, rem_minutes, deep_sleep_minutes,
      core_minutes, awake_minutes, in_bed_minutes, hrv_ms, resting_heart_rate, source_type, metadata_json, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, NULL, ?, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'apple_health_export_sleep_daily', '{}', NULL, ?, ?)
     ON CONFLICT(user_id, source_type, external_id) DO UPDATE SET
      total_sleep_minutes = excluded.total_sleep_minutes, updated_at = excluded.updated_at`
  );
  let count = 0;
  for (const row of rows) {
    const minutes = num(row.SleepAnalysis_duration_min);
    if (!row.date || minutes == null) continue;
    stmt.run(id("ahs", `sleep:${row.date}`), context.userId, `apple_health_export_sleep:${row.date}`, `${row.date}T00:00:00.000Z`, minutes, context.now, context.now);
    count += 1;
  }
  context.stats.sleepRecords = count;
}

function importWorkouts(context) {
  const rows = readCsv(file(context.source, "全量清洗分类数据/05_workouts_routes/20_workouts_detail_enhanced.csv"));
  const stmt = context.db.prepare(
    `INSERT INTO apple_health_workouts
     (id, user_id, external_id, started_at, ended_at, apple_activity_type, normalized_activity_type, duration_seconds,
      distance_m, active_energy_kcal, total_energy_kcal, average_heart_rate_bpm, source_type, source_ref, metadata_json, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'apple_health_export_workout', ?, ?, NULL, ?, ?)
     ON CONFLICT(user_id, source_type, external_id) DO UPDATE SET
      started_at = excluded.started_at, ended_at = excluded.ended_at, duration_seconds = excluded.duration_seconds,
      distance_m = excluded.distance_m, active_energy_kcal = excluded.active_energy_kcal,
      total_energy_kcal = excluded.total_energy_kcal, metadata_json = excluded.metadata_json, updated_at = excluded.updated_at`
  );
  let count = 0;
  for (const row of rows) {
    const started = parseAppleDate(row.startDate);
    if (!started) continue;
    const ended = parseAppleDate(row.endDate);
    const external = `apple_health_export_workout:${row.startDate}:${row.workout_type || row.type || ""}`;
    const metadata = compactJson({ sourceName: row.sourceName, sourceVersion: row.sourceVersion, device: row.device, statistics: row.statistics_json, metadata: row.metadata });
    stmt.run(id("ahw", external), context.userId, external, started, ended, key(row.workout_type || row.type),
      normalizeActivity(row.workout_type || row.type), durationSeconds(row.duration, row.durationUnit),
      distanceMeters(row.totalDistance, row.totalDistanceUnit), num(row.totalEnergyBurned), num(row.totalEnergyBurned),
      row.filename || null, metadata, context.now, context.now);
    count += 1;
  }
  context.stats.workouts = count;
}

function importEcg(context) {
  const manifest = readCsv(file(context.source, "全量清洗分类数据/03_cardiorespiratory/42_ecg_manifest.csv"));
  const zipPath = file(context.source, "导出.zip");
  const recordStmt = context.db.prepare(
    `INSERT INTO apple_health_ecg_records
     (id, user_id, external_id, recorded_at, ended_at, classification, average_heart_rate_bpm, sampling_frequency_hz,
      voltage_measurement_count, symptoms_status, source_type, source_ref, metadata_json, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, 'apple_health_export_ecg', ?, ?, NULL, ?, ?)
     ON CONFLICT(user_id, source_type, external_id) DO UPDATE SET
      recorded_at = excluded.recorded_at, classification = excluded.classification,
      sampling_frequency_hz = excluded.sampling_frequency_hz, voltage_measurement_count = excluded.voltage_measurement_count,
      symptoms_status = excluded.symptoms_status, source_ref = excluded.source_ref,
      metadata_json = excluded.metadata_json, updated_at = excluded.updated_at`
  );
  const sampleStmt = context.db.prepare(
    `INSERT INTO apple_health_ecg_voltage_samples
     (id, user_id, ecg_id, external_id, sample_index, offset_ms, voltage_microvolts, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(ecg_id, sample_index) DO UPDATE SET
      offset_ms = excluded.offset_ms, voltage_microvolts = excluded.voltage_microvolts, updated_at = excluded.updated_at`
  );
  let records = 0;
  let samples = 0;
  for (const row of manifest) {
    const recordedAt = parseAppleDate(row.record_date);
    if (!recordedAt || !row.filename) continue;
    const external = `apple_health_export_ecg:${row.filename}`;
    recordStmt.run(id("ahe", external), context.userId, external, recordedAt, key(row.classification),
      null, num(row.sampling_rate_hz), int(row.sample_count), key(row.symptoms), row.filename,
      compactJson({ softwareVersion: row.software_version, device: row.device, uvMin: row.uv_min, uvMax: row.uv_max, uvAvg: row.uv_avg }),
      context.now, context.now);
    const ecg = context.db.prepare("SELECT id FROM apple_health_ecg_records WHERE user_id = ? AND source_type = 'apple_health_export_ecg' AND external_id = ?").get(context.userId, external);
    if (ecg && !context.args.skipEcgWaveforms) {
      context.db.prepare("DELETE FROM apple_health_ecg_voltage_samples WHERE ecg_id = ?").run(ecg.id);
      const values = readEcgVoltages(zipPath, row.filename);
      const hz = num(row.sampling_rate_hz) || 512;
      values.forEach((value, index) => {
        sampleStmt.run(id("ahev", `${external}:${index}`), context.userId, ecg.id, `${external}:v:${index}`, index, (index * 1000) / hz, value, context.now, context.now);
      });
      samples += values.length;
    }
    records += 1;
  }
  context.stats.ecgRecords = records;
  context.stats.ecgVoltageSamples = samples;
}

function importObservations(context) {
  const dictionary = unitsByRecordType(context.source);
  const stmt = context.db.prepare(
    `INSERT INTO apple_health_observations
     (id, user_id, source_type, external_id, category_id, category_name, record_type, metric_name, source_name, period,
      granularity, count, numeric_sum, numeric_avg, numeric_min, numeric_max, duration_min, non_numeric_count, unit,
      metadata_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', ?, ?)
     ON CONFLICT(user_id, source_type, external_id) DO UPDATE SET
      count = excluded.count, numeric_sum = excluded.numeric_sum, numeric_avg = excluded.numeric_avg,
      numeric_min = excluded.numeric_min, numeric_max = excluded.numeric_max, duration_min = excluded.duration_min,
      non_numeric_count = excluded.non_numeric_count, unit = excluded.unit, updated_at = excluded.updated_at`
  );
  let total = 0;
  total += importObservationFile(context, stmt, dictionary, "全量清洗分类数据/10_all_records_daily_long.csv", "apple_health_export_daily_observation", "daily");
  total += importObservationFile(context, stmt, dictionary, "全量清洗分类数据/11_all_records_source_daily_long.csv", "apple_health_export_source_daily_observation", "source_daily");
  context.stats.observations = total;
}

function importObservationFile(context, stmt, dictionary, rel, sourceType, granularity) {
  let count = 0;
  for (const row of readCsv(file(context.source, rel))) {
    if (!row.period || !row.record_type || !row.metric_name) continue;
    const external = `${sourceType}:${row.period}:${row.record_type}:${row.metric_name}:${row.sourceName || ""}`;
    stmt.run(id("aho", external), context.userId, sourceType, external, row.category_id, row.category_name,
      row.record_type, row.metric_name, row.sourceName || null, row.period, granularity, int(row.count),
      num(row.numeric_sum), num(row.numeric_avg), num(row.numeric_min), num(row.numeric_max),
      num(row.duration_min), int(row.non_numeric_count), dictionary.get(row.record_type) || null,
      context.now, context.now);
    count += 1;
  }
  return count;
}

function importFileInventory(context) {
  const stmt = context.db.prepare(
    `INSERT INTO apple_health_import_files
     (id, user_id, source_type, external_id, file_path, file_kind, byte_size, row_count, sha256, metadata_json, created_at, updated_at)
     VALUES (?, ?, 'apple_health_export_file', ?, ?, ?, ?, ?, NULL, ?, ?, ?)
     ON CONFLICT(user_id, source_type, external_id) DO UPDATE SET
      byte_size = excluded.byte_size, row_count = excluded.row_count, metadata_json = excluded.metadata_json, updated_at = excluded.updated_at`
  );
  let count = 0;
  for (const row of readCsv(file(context.source, "全量清洗分类数据/00_zip_inventory.csv"))) {
    const kind = row.filename.includes("electrocardiograms/") ? "ecg_csv" : row.filename.includes("workout-routes/") ? "workout_route_gpx" : "zip_member";
    stmt.run(id("ahf", row.filename), context.userId, row.filename, row.filename, kind, int(row.file_size), null,
      compactJson({ compressSize: row.compress_size }), context.now, context.now);
    count += 1;
  }
  for (const row of readCsv(file(context.source, "全量清洗分类数据/05_workouts_routes/43_workout_routes_manifest.csv"))) {
    stmt.run(id("ahf", `route:${row.filename}`), context.userId, `route:${row.filename}`, row.filename, "workout_route_manifest",
      null, int(row.trackpoint_count), compactJson(row), context.now, context.now);
    count += 1;
  }
  context.stats.importFiles = count;
}

function importRoutePoints(context) {
  if (context.args.skipRoutePoints) {
    context.stats.workoutRoutePoints = 0;
    return;
  }
  const zipPath = file(context.source, "导出.zip");
  if (!fs.existsSync(zipPath)) {
    context.stats.workoutRoutePoints = 0;
    return;
  }
  const stmt = context.db.prepare(
    `INSERT INTO apple_health_workout_route_points
     (id, user_id, source_type, external_id, route_file, point_index, recorded_at, latitude, longitude, elevation_m, metadata_json, created_at, updated_at)
     VALUES (?, ?, 'apple_health_workout_route', ?, ?, ?, ?, ?, ?, ?, '{}', ?, ?)
     ON CONFLICT(user_id, source_type, external_id) DO UPDATE SET
      recorded_at = excluded.recorded_at, latitude = excluded.latitude, longitude = excluded.longitude,
      elevation_m = excluded.elevation_m, updated_at = excluded.updated_at`
  );
  let total = 0;
  for (const row of readCsv(file(context.source, "全量清洗分类数据/05_workouts_routes/43_workout_routes_manifest.csv"))) {
    if (!row.filename) continue;
    const points = readRoutePoints(zipPath, row.filename);
    for (const point of points) {
      const external = `apple_health_export_route:${row.filename}:${point.index}`;
      stmt.run(id("ahrp", external), context.userId, external, row.filename, point.index,
        point.recordedAt, point.latitude, point.longitude, point.elevationM, context.now, context.now);
    }
    total += points.length;
  }
  context.stats.workoutRoutePoints = total;
}

function readEcgVoltages(zipPath, filename) {
  const text = execFileSync("unzip", ["-p", zipPath, filename], { encoding: "utf8", maxBuffer: 1024 * 1024 * 8 });
  const lines = text.split(/\r?\n/);
  const unitLine = lines.findIndex((line) => /^单位,/.test(line));
  const start = unitLine >= 0 ? unitLine + 1 : 0;
  const values = [];
  for (let i = start; i < lines.length; i += 1) {
    const value = num(lines[i].trim());
    if (value != null) values.push(value);
  }
  return values;
}

function readRoutePoints(zipPath, filename) {
  const xml = execFileSync("unzip", ["-p", zipPath, filename], { encoding: "utf8", maxBuffer: 1024 * 1024 * 32 });
  const points = [];
  const pattern = /<trkpt\b([^>]*)>([\s\S]*?)<\/trkpt>/g;
  let match;
  while ((match = pattern.exec(xml)) !== null) {
    const attrs = match[1];
    const body = match[2];
    const latitude = num(attribute(attrs, "lat"));
    const longitude = num(attribute(attrs, "lon"));
    if (latitude == null || longitude == null) continue;
    const time = textElement(body, "time");
    points.push({
      index: points.length,
      recordedAt: time ? parseAppleDate(time) || time : null,
      latitude,
      longitude,
      elevationM: num(textElement(body, "ele"))
    });
  }
  return points;
}

function attribute(text, name) {
  const match = new RegExp(`${name}="([^"]*)"`).exec(text);
  return match ? match[1] : "";
}

function textElement(text, name) {
  const match = new RegExp(`<${name}[^>]*>([^<]*)</${name}>`).exec(text);
  return match ? match[1] : "";
}

function unitsByRecordType(source) {
  const map = new Map();
  for (const row of readCsv(file(source, "全量清洗分类数据/00_record_type_dictionary.csv"))) {
    if (row.record_type) map.set(row.record_type, row.units || "");
  }
  return map;
}

function readCsv(csvPath) {
  if (!fs.existsSync(csvPath)) return [];
  return parseCsv(fs.readFileSync(csvPath, "utf8").replace(/^\uFEFF/, ""));
}

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i], next = text[i + 1];
    if (quoted && char === "\"" && next === "\"") { field += "\""; i += 1; continue; }
    if (char === "\"") { quoted = !quoted; continue; }
    if (!quoted && char === ",") { row.push(field); field = ""; continue; }
    if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(field); rows.push(row); row = []; field = ""; continue;
    }
    field += char;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const header = rows.shift() || [];
  return rows.filter((item) => item.some((value) => value !== "")).map((item) => Object.fromEntries(header.map((key, index) => [key, item[index] || ""])));
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") out.dryRun = true;
    else if (arg === "--skip-ecg-waveforms") out.skipEcgWaveforms = true;
    else if (arg === "--skip-route-points") out.skipRoutePoints = true;
    else if (arg.startsWith("--")) out[arg.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = argv[++i];
  }
  return out;
}

function file(base, rel) { return path.join(base, rel); }
function id(prefix, value) { return `${prefix}_${crypto.createHash("sha256").update(String(value)).digest("hex").slice(0, 24)}`; }
function num(value) { if (value == null || value === "") return null; const n = Number(value); return Number.isFinite(n) ? n : null; }
function int(value) { const n = num(value); return n == null ? null : Math.round(n); }
function sum(a, b) { return a == null && b == null ? null : (a || 0) + (b || 0); }
function toHours(minutes) { return minutes == null ? null : minutes / 60; }
function kmToM(value) { return value == null ? null : value * 1000; }
function key(value) { return String(value || "").trim().toLowerCase().replace(/[^a-z0-9+.-]+/g, "_").replace(/^_+|_+$/g, ""); }
function compactJson(value) { return JSON.stringify(Object.fromEntries(Object.entries(value || {}).filter(([, v]) => v != null && v !== "").slice(0, 16))); }
function durationSeconds(value, unit) { const n = num(value); if (n == null) return null; return key(unit).startsWith("min") ? Math.round(n * 60) : Math.round(n); }
function distanceMeters(value, unit) { const n = num(value); if (n == null) return null; const u = key(unit); return u === "km" ? n * 1000 : n; }
function normalizeActivity(value) {
  const k = key(value);
  if (/walk/.test(k)) return k.includes("indoor") ? "indoor_walk" : "outdoor_walk";
  if (/run/.test(k)) return "run";
  if (/cycl/.test(k)) return "cycling";
  if (/elliptical/.test(k)) return "elliptical";
  if (/row/.test(k)) return "rowing";
  return "other";
}
function parseAppleDate(value) {
  if (!value) return null;
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return `${text}T00:00:00.000Z`;
  const normalized = text.replace(" ", "T").replace(/ ([+-]\d{2})(\d{2})$/, "$1:$2").replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

if (require.main === module) main();
module.exports = { main, parseCsv, parseAppleDate };
