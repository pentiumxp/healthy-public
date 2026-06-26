const assert = require("node:assert/strict");
const test = require("node:test");
const { createTestServices, provisionWorkspace } = require("../test-helpers");

test("strength sessions normalize pounds to kilograms and summarize volume", () => {
  const services = createTestServices();
  provisionWorkspace(services, "weixin_test_1", "key-test");

  const saved = services.strengthService.recordSession({
    workspaceRef: "health:weixin_test_1",
    startedAt: "2026-06-01T19:00:00+08:00",
    sets: [
      { exercise: { name: "Bench Press" }, weightValue: 100, weightUnit: "lb", reps: 5 },
      { exercise: { name: "Bench Press" }, weightValue: 60, weightUnit: "kg", reps: 5 }
    ]
  });

  assert.equal(saved.sets.length, 2);
  assert.equal(saved.sets[0].weight_kg, 45.359);
  const dashboard = services.dashboardService.getDashboard({ workspaceRef: "health:weixin_test_1" });
  assert.equal(dashboard.strength.weeklyVolumeKg, 527);
});

test("strength sessions normalize exercise aliases to canonical catalog keys", () => {
  const services = createTestServices();
  provisionWorkspace(services, "weixin_test_1", "key-test");

  services.strengthService.recordSession({
    workspaceRef: "health:weixin_test_1",
    startedAt: "2026-06-02T19:00:00+08:00",
    sets: [
      { exercise: { name: "杠铃深蹲" }, weightValue: 65, weightUnit: "kg", reps: 10 },
      { exercise: { key: "barbell_overhead_press" }, weightValue: 30, weightUnit: "kg", reps: 8 }
    ]
  });

  const sessions = services.strengthService.listSessions({ workspaceRef: "health:weixin_test_1" });
  assert.deepEqual(sessions[0].sets.map((set) => set.exercise_name), ["barbell_back_squat", "barbell_overhead_press"]);
});

test("strength sessions support bodyweight push-up aliases and reps-only sets", () => {
  const services = createTestServices();
  provisionWorkspace(services, "weixin_test_1", "key-test");

  services.strengthService.recordSession({
    workspaceRef: "health:weixin_test_1",
    startedAt: "2026-06-25T19:00:00+08:00",
    sets: [
      { exercise: { name: "俯卧撑" }, reps: 20 },
      { exercise: { name: "push-up" }, reps: 15 },
      { exercise: { name: "pushup" }, reps: 15 },
      { exercise: { name: "push up" }, reps: 15 }
    ]
  });

  const [session] = services.strengthService.listSessions({ workspaceRef: "health:weixin_test_1" });
  assert.deepEqual(session.sets.map((set) => set.exercise_name), ["push_up", "push_up", "push_up", "push_up"]);
  assert.deepEqual(session.sets.map((set) => set.reps), [20, 15, 15, 15]);
  assert.deepEqual(session.sets.map((set) => set.weight_kg), [0, 0, 0, 0]);
});

test("strength sessions reject unknown exercise labels", () => {
  const services = createTestServices();
  provisionWorkspace(services, "weixin_test_1", "key-test");

  assert.throws(() => services.strengthService.recordSession({
    workspaceRef: "health:weixin_test_1",
    startedAt: "2026-06-02T19:00:00+08:00",
    sets: [{ exercise: { name: "random machine from OCR" }, weightValue: 30, weightUnit: "kg", reps: 8 }]
  }), /unsupported strength exercise/);
  assert.equal(services.strengthService.listSessions({ workspaceRef: "health:weixin_test_1" }).length, 0);
});

test("body measurements keep pending candidates out of confirmed dashboard metrics", () => {
  const services = createTestServices();
  provisionWorkspace(services, "weixin_test_1", "key-test");

  services.bodyService.recordMeasurement({
    workspaceRef: "health:weixin_test_1",
    measuredAt: "2026-06-01T08:00:00+08:00",
    metric: "weight",
    value: 80,
    unit: "kg"
  });
  services.bodyService.recordMeasurement({
    workspaceRef: "health:weixin_test_1",
    measuredAt: "2026-06-02T08:00:00+08:00",
    metric: "weight",
    value: 70,
    unit: "kg",
    sourceType: "image_upload",
    confirmationStatus: "pending"
  });

  const dashboard = services.dashboardService.getDashboard({ workspaceRef: "health:weixin_test_1" });
  assert.equal(dashboard.body.latest.weight.value, 80);
  assert.equal(dashboard.pendingReview, 1);
});

test("cardio sessions normalize distance and appear in dashboard", () => {
  const services = createTestServices();
  provisionWorkspace(services, "weixin_test_1", "key-test");

  const saved = services.cardioService.recordSession({
    workspaceRef: "health:weixin_test_1",
    startedAt: "2026-06-04T19:52:00+08:00",
    activityType: "indoor_walk",
    durationSeconds: 1504,
    distanceValue: 2280,
    distanceUnit: "m",
    averageHeartRateBpm: 120
  });

  assert.equal(saved.distance_km, 2.28);
  const dashboard = services.dashboardService.getDashboard({ workspaceRef: "health:weixin_test_1" });
  assert.equal(dashboard.cardio.sessionCount, 1);
  assert.equal(dashboard.cardio.totalDistanceKm, 2.28);
  assert.equal(dashboard.cardio.latestSession.activity_type, "indoor_walk");
});

test("cardio sessions normalize activity aliases and reject unknown activities", () => {
  const services = createTestServices();
  provisionWorkspace(services, "weixin_test_1", "key-test");

  const saved = services.cardioService.recordSession({
    workspaceRef: "health:weixin_test_1",
    startedAt: "2026-06-04T19:52:00+08:00",
    activityType: "室内步行",
    durationSeconds: 1504,
    distanceValue: 2.28,
    distanceUnit: "km"
  });
  assert.equal(saved.activity_type, "indoor_walk");
  assert.throws(() => services.cardioService.recordSession({
    workspaceRef: "health:weixin_test_1",
    startedAt: "2026-06-05T19:52:00+08:00",
    activityType: "photo guessed activity",
    durationSeconds: 1504
  }), /unsupported cardio activity type/);
  assert.equal(services.cardioService.listSessions({ workspaceRef: "health:weixin_test_1" }).length, 1);
});
