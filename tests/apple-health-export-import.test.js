const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { execFileSync } = require("node:child_process");
const { createMigratedDatabase } = require("../src/db/client");
const { main, parseAppleDate, parseCsv } = require("../scripts/import-owner-apple-health-export");

test("Apple Health export importer stores daily observations and dedicated facts idempotently", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "healthy-apple-import-"));
  const dbPath = path.join(dir, "healthy.sqlite");
  const source = path.join(dir, "export");
  createFixture(source);
  const db = createMigratedDatabase(dbPath);
  db.prepare("INSERT INTO users (id, workspace_ref, scopes_json, created_at, updated_at) VALUES ('u1', 'health:owner', '[]', 'now', 'now')").run();
  db.close();

  main(["--db", dbPath, "--source", source, "--workspace", "health:owner", "--skip-ecg-waveforms"]);
  main(["--db", dbPath, "--source", source, "--workspace", "health:owner", "--skip-ecg-waveforms"]);

  const out = createMigratedDatabase(dbPath);
  assert.equal(out.prepare("SELECT COUNT(*) AS n FROM apple_health_daily_summaries").get().n, 1);
  assert.equal(out.prepare("SELECT COUNT(*) AS n FROM apple_health_workouts").get().n, 1);
  assert.equal(out.prepare("SELECT COUNT(*) AS n FROM apple_health_ecg_records").get().n, 1);
  assert.equal(out.prepare("SELECT classification FROM apple_health_ecg_records").get().classification, "atrial_fibrillation");
  assert.equal(out.prepare("SELECT COUNT(*) AS n FROM apple_health_observations").get().n, 2);
  assert.equal(out.prepare("SELECT COUNT(*) AS n FROM apple_health_import_files").get().n, 2);
  assert.equal(out.prepare("SELECT COUNT(*) AS n FROM apple_health_workout_route_points").get().n, 2);
  assert.equal(out.prepare("PRAGMA quick_check").get().quick_check, "ok");
  out.close();
});

test("CSV and Apple date helpers parse quoted fields and timezone offsets", () => {
  assert.deepEqual(parseCsv("a,b\n1,\"two, three\"\n"), [{ a: "1", b: "two, three" }]);
  assert.equal(parseAppleDate("2021-12-14 14:26:49 +0800"), "2021-12-14T06:26:49.000Z");
});

function createFixture(root) {
  write(root, "清洗输出/apple_health_daily_metrics.csv", [
    "date,active_energy,basal_energy,distance_walking_running,exercise_minutes,flights_climbed,stand_minutes,steps,body_mass,heart_rate",
    "2026-06-15,510,1500,7.4,58,3,600,10200,72.5,88"
  ].join("\n"));
  write(root, "全量清洗分类数据/04_sleep_recovery/04_sleep_recovery_daily_wide.csv", [
    "date,SleepAnalysis_duration_min",
    "2026-06-15,450"
  ].join("\n"));
  write(root, "全量清洗分类数据/05_workouts_routes/20_workouts_detail_enhanced.csv", [
    "date,workout_type,sourceName,sourceVersion,device,startDate,endDate,duration,durationUnit,totalDistance,totalDistanceUnit,totalEnergyBurned,statistics_json,metadata",
    "2026-06-15,Outdoor Walk,Watch,1,,2026-06-15 19:00:00 +0800,2026-06-15 19:30:00 +0800,30,min,2.4,km,130,,"
  ].join("\n"));
  write(root, "全量清洗分类数据/03_cardiorespiratory/42_ecg_manifest.csv", [
    "filename,record_date,classification,symptoms,software_version,device,sampling_rate_hz,sample_count,duration_sec,uv_min,uv_max,uv_avg",
    "apple_health_export/electrocardiograms/ecg_fixture.csv,2026-06-15 07:10:00 +0800,房颤,,1,Watch,512,2,30,-1,1,0"
  ].join("\n"));
  write(root, "全量清洗分类数据/00_record_type_dictionary.csv", [
    "category_id,category_name,record_type,metric_name,count,date_min,date_max,units,top_sources,example_values",
    "02_activity_energy,Activity,HKQuantityTypeIdentifierStepCount,StepCount,1,2026-06-15,2026-06-15,count,,"
  ].join("\n"));
  const observation = [
    "category_id,category_name,record_type,metric_name,sourceName,period,count,numeric_sum,numeric_avg,numeric_min,numeric_max,duration_min,non_numeric_count",
    "02_activity_energy,Activity,HKQuantityTypeIdentifierStepCount,StepCount,,2026-06-15,1,10200,10200,10200,10200,0,0"
  ].join("\n");
  write(root, "全量清洗分类数据/10_all_records_daily_long.csv", observation);
  write(root, "全量清洗分类数据/11_all_records_source_daily_long.csv", observation.replace("StepCount,,", "StepCount,Watch,"));
  write(root, "全量清洗分类数据/00_zip_inventory.csv", [
    "filename,file_size,compress_size",
    "apple_health_export/electrocardiograms/ecg_fixture.csv,20,10"
  ].join("\n"));
  write(root, "全量清洗分类数据/05_workouts_routes/43_workout_routes_manifest.csv", [
    "filename,trackpoint_count,time_min,time_max,distance_km_est,lat_min,lat_max,lon_min,lon_max",
    "apple_health_export/workout-routes/route_fixture.gpx,2,2026-06-15T00:00:00Z,2026-06-15T00:10:00Z,1,0,1,0,1"
  ].join("\n"));
  write(root, "apple_health_export/workout-routes/route_fixture.gpx", [
    "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
    "<gpx><trk><trkseg>",
    "<trkpt lat=\"31.1\" lon=\"121.1\"><ele>5.5</ele><time>2026-06-15T00:00:00Z</time></trkpt>",
    "<trkpt lat=\"31.2\" lon=\"121.2\"><ele>6.5</ele><time>2026-06-15T00:10:00Z</time></trkpt>",
    "</trkseg></trk></gpx>"
  ].join(""));
  execFileSync("zip", ["-qr", path.join(root, "导出.zip"), "apple_health_export"], { cwd: root });
}

function write(root, rel, text) {
  const full = path.join(root, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, text);
}
