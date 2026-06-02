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

