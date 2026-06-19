const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const PUBLIC_DIR = path.join(__dirname, "..", "..", "public");

test("Apple Health dashboard module renders sync status without duplicating native metrics", () => {
  const ids = ["appleHealthDate", "appleSyncStatus", "appleSyncDetail", "appleSyncTimes"];
  const elements = new Map(ids.map((id) => [id, { textContent: "" }]));
  const sandbox = {
    window: {},
    document: { getElementById: (id) => elements.get(id) }
  };
  vm.runInNewContext(fs.readFileSync(path.join(PUBLIC_DIR, "health-apple.js"), "utf8"), sandbox);

  sandbox.window.HealthApple.render({
    latestDaily: { summary_date: "2026-06-15", updated_at: "2026-06-17T08:20:00.000Z", step_count: 10200, active_energy_kcal: 510, exercise_minutes: 58, walking_running_distance_m: 7400 },
    latestSleep: { sleep_end: "2026-06-17T02:00:00.000Z", total_sleep_minutes: 435, updated_at: "2026-06-17T08:21:00.000Z" },
    latestEcg: { recorded_at: "2026-06-16T09:30:00.000Z", updated_at: "2026-06-17T08:22:00.000Z" },
    workouts: [{ apple_activity_type: "outdoor_walk", duration_seconds: 1800, ended_at: "2026-06-15T10:30:00.000Z", updated_at: "2026-06-17T08:23:00.000Z" }],
    syncState: {
      daily_summaries: { record_count: 7, latest_record_at: "2026-06-15", latest_updated_at: "2026-06-17T08:20:00.000Z" },
      workouts: { record_count: 3, latest_record_at: "2026-06-15T10:30:00.000Z", latest_updated_at: "2026-06-17T08:23:00.000Z" },
      sleep_records: { record_count: 2, latest_record_at: "2026-06-17T02:00:00.000Z", latest_updated_at: "2026-06-17T08:21:00.000Z" },
      ecg_records: { record_count: 1, latest_record_at: "2026-06-16T09:30:00.000Z", latest_updated_at: "2026-06-17T08:22:00.000Z" }
    }
  });

  assert.equal(elements.get("appleHealthDate").textContent, "数据源状态");
  assert.equal(elements.get("appleSyncStatus").textContent, "已同步");
  assert.match(elements.get("appleSyncDetail").textContent, /AI/);
  assert.match(elements.get("appleSyncTimes").textContent, /日汇总：同步/);
  assert.match(elements.get("appleSyncTimes").textContent, /Workout：同步/);
  assert.match(elements.get("appleSyncTimes").textContent, /睡眠：同步/);
  assert.match(elements.get("appleSyncTimes").textContent, /ECG：同步/);
  assert.match(elements.get("appleSyncTimes").textContent, /7 条/);
});
