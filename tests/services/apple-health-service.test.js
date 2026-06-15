const assert = require("node:assert/strict");
const test = require("node:test");
const { createTestServices, provisionWorkspace } = require("../test-helpers");

test("Apple Health daily summaries and workouts are long-term upserts in dashboard", () => {
  const services = createTestServices();
  provisionWorkspace(services, "weixin_test_1", "key-test");

  const daily = services.appleHealthService.recordDailySummaries({
    workspaceRef: "health:weixin_test_1",
    records: [
      { summaryDate: "2026-06-14", stepCount: 8800, activeEnergyKcal: 430, exerciseMinutes: 42, walkingRunningDistanceM: 6200 },
      { summaryDate: "2026-06-15", stepCount: 10200, activeEnergyKcal: 510, exerciseMinutes: 58, distanceKm: 7.1 }
    ]
  });
  assert.equal(daily.count, 2);

  services.appleHealthService.recordDailySummary({
    workspaceRef: "health:weixin_test_1",
    summaryDate: "2026-06-15",
    stepCount: 11000,
    activeEnergyKcal: 530,
    exerciseMinutes: 60,
    walkingRunningDistanceM: 7400
  });
  services.appleHealthService.recordWorkouts({
    workspaceRef: "health:weixin_test_1",
    records: [
      { startedAt: "2026-06-15T08:00:00+08:00", appleActivityType: "traditional strength training", durationSeconds: 2700, activeEnergyKcal: 210 },
      { startedAt: "2026-06-15T19:00:00+08:00", appleActivityType: "outdoor walk", durationSeconds: 1800, distanceKm: 2.4, activeEnergyKcal: 130 }
    ]
  });
  const synced = services.appleHealthService.bulkSync({
    workspaceRef: "health:weixin_test_1",
    source: "apple_health_ios",
    range: "last7",
    client_sync_id: "ios-run-1",
    sleep_records: [{ sleepStart: "2026-06-14T23:00:00+08:00", sleepEnd: "2026-06-15T06:30:00+08:00", totalSleepMinutes: 450, remMinutes: 80, deepSleepMinutes: 70 }],
    body_measurements: [{ measuredAt: "2026-06-15T07:00:00+08:00", metric: "bmi", value: 24.1 }],
    vitals: [{ measuredAt: "2026-06-15T07:01:00+08:00", metric: "vo2_max", value: 41.5 }]
  });
  assert.deepEqual(synced.counts, { daily_summaries: 0, workouts: 0, sleep_records: 1, body_measurements: 1, vitals: 1 });

  const dashboard = services.dashboardService.getDashboard({ workspaceRef: "health:weixin_test_1" });
  assert.equal(dashboard.appleHealth.latestDaily.step_count, 11000);
  assert.equal(dashboard.appleHealth.latestDaily.walking_running_distance_m, 7400);
  assert.equal(dashboard.appleHealth.daily.length, 2);
  assert.equal(dashboard.appleHealth.workouts.length, 2);
  assert.equal(dashboard.appleHealth.workouts[0].apple_activity_type, "outdoor_walk");
  assert.equal(dashboard.appleHealth.workouts[0].normalized_activity_type, "outdoor_walk");
  assert.equal(dashboard.appleHealth.latestSleep.total_sleep_minutes, 450);
  assert.equal(dashboard.body.latest.bmi.value, 24.1);
  assert.equal(dashboard.body.latest.vo2_max.unit, "ml/kg/min");
});
