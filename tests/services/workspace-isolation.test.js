const assert = require("node:assert/strict");
const test = require("node:test");
const { createTestServices, provisionWorkspace } = require("../test-helpers");

test("workspace provisioning creates isolated Healthy users", () => {
  const services = createTestServices();
  const first = provisionWorkspace(services, "weixin_owner", "key-owner");
  const second = provisionWorkspace(services, "weixin_test_1", "key-test");

  assert.equal(first.status, "active");
  assert.equal(second.status, "active");
  assert.notEqual(first.workspace_id, second.workspace_id);
  assert.throws(
    () => services.profileService.getUserByWorkspace("health:missing"),
    /workspace is not registered/
  );
});

test("profile and body data do not cross workspace boundaries", () => {
  const services = createTestServices();
  provisionWorkspace(services, "weixin_owner", "key-owner");
  provisionWorkspace(services, "weixin_test_1", "key-test");

  services.profileService.saveProfile({
    workspaceRef: "health:weixin_owner",
    profile: { heightValue: 180, heightUnit: "cm", targetWeightValue: 78, targetWeightUnit: "kg" }
  });
  services.bodyService.recordMeasurement({
    workspaceRef: "health:weixin_owner",
    measuredAt: "2026-06-01T08:00:00+08:00",
    metric: "weight",
    value: 80,
    unit: "kg"
  });

  const owner = services.dashboardService.getDashboard({ workspaceRef: "health:weixin_owner" });
  const testWorkspace = services.dashboardService.getDashboard({ workspaceRef: "health:weixin_test_1" });

  assert.equal(owner.profile.height_cm, 180);
  assert.equal(owner.body.latest.weight.value, 80);
  assert.equal(testWorkspace.profile.height_cm, null);
  assert.equal(testWorkspace.body.latest.weight, undefined);
});
