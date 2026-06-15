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
    ecg_records: [{ recordedAt: "2026-06-15T07:10:00+08:00", classification: "sinus rhythm", averageHeartRateBpm: 62, samplingFrequencyHz: 512, voltageMeasurementCount: 15360 }],
    body_measurements: [
      { measuredAt: "2026-06-15T07:00:00+08:00", metric: "weight", value: 72.5, unit: "kg" },
      { measuredAt: "2026-06-15T07:00:00+08:00", metric: "bodyFatPercentage", value: 18.2 },
      { measuredAt: "2026-06-15T07:00:00+08:00", metric: "leanBodyMass", value: 59.3, unit: "kg" },
      { measuredAt: "2026-06-15T07:00:00+08:00", metric: "waistCircumference", value: 82, unit: "cm" },
      { measuredAt: "2026-06-15T07:00:00+08:00", metric: "hipCircumference", value: 96, unit: "cm" },
      { measuredAt: "2026-06-15T07:00:00+08:00", metric: "bmi", value: 24.1 }
    ],
    vitals: [{ measuredAt: "2026-06-15T07:01:00+08:00", metric: "vo2_max", value: 41.5 }]
  });
  assert.deepEqual(synced.counts, { daily_summaries: 0, workouts: 0, sleep_records: 1, ecg_records: 1, body_measurements: 6, vitals: 1 });

  const dashboard = services.dashboardService.getDashboard({ workspaceRef: "health:weixin_test_1" });
  assert.equal(dashboard.appleHealth.latestDaily.step_count, 11000);
  assert.equal(dashboard.appleHealth.latestDaily.walking_running_distance_m, 7400);
  assert.equal(dashboard.appleHealth.daily.length, 2);
  assert.equal(dashboard.appleHealth.workouts.length, 2);
  assert.equal(dashboard.appleHealth.workouts[0].apple_activity_type, "outdoor_walk");
  assert.equal(dashboard.appleHealth.workouts[0].normalized_activity_type, "outdoor_walk");
  assert.equal(dashboard.appleHealth.latestSleep.total_sleep_minutes, 450);
  assert.equal(dashboard.appleHealth.latestEcg.classification, "sinus_rhythm");
  assert.equal(dashboard.appleHealth.latestEcg.average_heart_rate_bpm, 62);
  assert.equal(dashboard.body.latest.weight.value, 72.5);
  assert.equal(dashboard.body.latest.body_fat_percentage.value, 18.2);
  assert.equal(dashboard.body.latest.lean_body_mass.value, 59.3);
  assert.equal(dashboard.body.latest.waist_circumference.value, 82);
  assert.equal(dashboard.body.latest.hip_circumference.value, 96);
  assert.equal(dashboard.body.latest.bmi.value, 24.1);
  assert.equal(dashboard.body.latest.vo2_max.unit, "ml/kg/min");
});
