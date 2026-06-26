const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadLabels() {
  const code = fs.readFileSync(path.join(__dirname, "..", "..", "public", "health-labels.js"), "utf8");
  const sandbox = { window: {} };
  vm.runInNewContext(code, sandbox);
  return sandbox.window.HealthLabels;
}

test("health UI labels prefer Chinese names with English notes", () => {
  const labels = loadLabels();
  assert.equal(labels.lab("LDL-C"), "\u4f4e\u5bc6\u5ea6\u8102\u86cb\u767d\u80c6\u56fa\u9187 (LDL-C)");
  assert.equal(labels.lab("ALT"), "\u4e19\u6c28\u9178\u6c28\u57fa\u8f6c\u79fb\u9176 (ALT)");
  assert.equal(labels.lab("Cystatin C"), "\u80f1\u6291\u7d20C (Cystatin C)");
  assert.equal(labels.lab("eGFR EPIscr_cys"), "\u808c\u9150-\u80f1\u6291\u7d20C\u8054\u5408\u4f30\u7b97\u80be\u5c0f\u7403\u6ee4\u8fc7\u7387 (eGFR EPI scr-cys)");
  assert.equal(labels.medication("Atorvastatin"), "\u963f\u6258\u4f10\u4ed6\u6c40 (Atorvastatin)");
  assert.equal(labels.medication("Tirzepatide 5 mg weekly"), "\u66ff\u5c14\u6cca\u80bd (Tirzepatide)");
  assert.equal(labels.exercise("barbell_back_squat"), "\u6760\u94c3\u6df1\u8e72 (Barbell Back Squat)");
  assert.equal(labels.exercise("Barbell Overhead Press"), "\u6760\u94c3\u63a8\u80a9 (Barbell Overhead Press)");
  assert.equal(labels.exercise("push_up"), "\u4fef\u5367\u6491 (Push-up)");
  assert.equal(labels.exercise("push-up"), "\u4fef\u5367\u6491 (Push-up)");
  assert.equal(labels.activity("indoor_walk"), "\u5ba4\u5185\u6b65\u884c (Indoor Walk)");
  assert.equal(labels.status("active"), "\u4f7f\u7528\u4e2d");
  assert.equal(labels.frequency("weekly"), "\u6bcf\u5468 (weekly)");
});
