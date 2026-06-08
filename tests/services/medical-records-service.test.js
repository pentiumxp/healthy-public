const assert = require("node:assert/strict");
const test = require("node:test");
const { createTestServices, provisionWorkspace } = require("../test-helpers");

test("lab results and risk profiles preserve timelines", () => {
  const services = createTestServices();
  provisionWorkspace(services, "owner", "key-test");

  services.medicalRecordsService.record("labResults", {
    workspaceRef: "health:owner",
    observedAt: "2025-05-01T08:00:00+08:00",
    testName: "LDL-C",
    value: 2.55,
    unit: "mmol/L"
  });
  services.medicalRecordsService.record("labResults", {
    workspaceRef: "health:owner",
    observedAt: "2026-05-01T08:00:00+08:00",
    testName: "LDL-C",
    value: 1.25,
    unit: "mmol/L"
  });
  services.medicalRecordsService.record("riskProfiles", {
    workspaceRef: "health:owner",
    assessedAt: "2025-05-01T08:00:00+08:00",
    riskKey: "atherosclerosis",
    label: "Carotid plaque risk",
    priority: 2
  });
  services.medicalRecordsService.record("riskProfiles", {
    workspaceRef: "health:owner",
    assessedAt: "2026-05-01T08:00:00+08:00",
    riskKey: "atherosclerosis",
    label: "Coronary and carotid atherosclerosis",
    priority: 1
  });

  const labs = services.medicalRecordsService.list("labResults", { workspaceRef: "health:owner", testName: "LDL-C" });
  const risks = services.medicalRecordsService.list("riskProfiles", { workspaceRef: "health:owner", riskKey: "atherosclerosis" });
  const launchFiltered = services.medicalRecordsService.list("labResults", { workspaceRef: "health:owner", testName: "LDL-C", launch: "synthetic" });
  assert.equal(labs.records.length, 2);
  assert.equal(launchFiltered.records.length, 2);
  assert.equal(risks.records.length, 2);
  assert.equal(labs.records[0].value, 1.25);
});

test("medical records stay isolated by workspace", () => {
  const services = createTestServices();
  provisionWorkspace(services, "owner", "owner-key");
  provisionWorkspace(services, "other", "other-key");

  services.medicalRecordsService.record("clinicalFindings", {
    workspaceRef: "health:owner",
    findingKey: "lad_moderate_stenosis",
    title: "LAD moderate stenosis",
    observedAt: "2026-05-08T08:00:00+08:00"
  });

  assert.equal(services.medicalRecordsService.list("clinicalFindings", { workspaceRef: "health:owner" }).records.length, 1);
  assert.equal(services.medicalRecordsService.list("clinicalFindings", { workspaceRef: "health:other" }).records.length, 0);
});

test("dashboard projects medical timeline counts", () => {
  const services = createTestServices();
  provisionWorkspace(services, "owner", "key-test");
  services.profileService.addMedication({ workspaceRef: "health:owner", medication: { name: "Synthetic medication" } });
  services.medicalRecordsService.record("labResults", {
    workspaceRef: "health:owner",
    observedAt: "2026-05-01T08:00:00+08:00",
    testName: "ALT",
    value: 59.2,
    unit: "U/L"
  });
  services.medicalRecordsService.record("riskProfiles", {
    workspaceRef: "health:owner",
    assessedAt: "2026-05-01T08:00:00+08:00",
    riskKey: "liver_alt",
    label: "ALT follow-up",
    priority: 3
  });

  const dashboard = services.dashboardService.getDashboard({ workspaceRef: "health:owner" });
  assert.equal(dashboard.medications.activeCount, 1);
  assert.equal(dashboard.medical.counts.labResults, 1);
  assert.equal(dashboard.medical.counts.riskProfiles, 1);
  assert.equal(dashboard.medical.latestLabs[0].testName, "ALT");
});
