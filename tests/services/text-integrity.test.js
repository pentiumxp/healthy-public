const assert = require("node:assert/strict");
const test = require("node:test");
const { createTestServices, provisionWorkspace } = require("../test-helpers");

test("write services reject corrupted text before persistence", () => {
  const services = createTestServices();
  provisionWorkspace(services, "owner", "key-test");

  assertBadText(() => services.profileService.addMedication({
    workspaceRef: "health:owner",
    medication: { name: "????", frequency: "daily" }
  }));
  assertBadText(() => services.strengthService.recordSession({
    workspaceRef: "health:owner",
    startedAt: "2026-06-02T19:00:00+08:00",
    notes: "Imported from ??????.csv",
    sets: [{ exercise: { name: "Squat" }, weightValue: 60, reps: 5 }]
  }));
  assertBadText(() => services.medicalRecordsService.record("riskProfiles", {
    workspaceRef: "health:owner",
    assessedAt: "2026-06-02T08:00:00+08:00",
    riskKey: "liver_alt",
    label: "ALT????"
  }));
});

function assertBadText(fn) {
  assert.throws(fn, (error) => error.code === "invalid_text_encoding");
}
