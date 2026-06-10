const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const PUBLIC_DIR = path.join(__dirname, "..", "..", "public");

test("strength UI groups only exercises present in stored sessions", () => {
  const sandbox = loadPublicModules(["health-labels.js", "health-strength.js"]);
  const labels = sandbox.window.HealthLabels;
  const groups = sandbox.window.HealthStrength.groupSessions([
    { id: "session-a", started_at: "2026-06-04T19:00:00+08:00", sets: [
      { exercise_name: "Barbell Squat", weight_kg: 65, reps: 10 },
      { exercise_name: "Barbell Overhead Press", weight_kg: 30, reps: 8 }
    ] },
    { id: "session-b", started_at: "2026-06-03T19:00:00+08:00", sets: [
      { exercise_name: "Barbell Squat", weight_kg: 60, reps: 10 }
    ] }
  ], labels);
  assert.deepEqual(Array.from(groups, (group) => group.label), [
    "\u6760\u94c3\u6df1\u8e72 (Barbell Squat)",
    "\u6760\u94c3\u63a8\u80a9 (Barbell Overhead Press)"
  ]);
  assert.equal(groups[0].sessions.length, 2);
  assert.deepEqual(Array.from(groups[0].sessions[0].sets, (set) => set.exercise_name), ["Barbell Squat"]);
  assert.deepEqual(Array.from(groups[1].sessions[0].sets, (set) => set.exercise_name), ["Barbell Overhead Press"]);
  assert.equal(groups.some((group) => /Deadlift/.test(group.label)), false);
});

test("cardio UI groups only activity types present in stored sessions", () => {
  const sandbox = loadPublicModules(["health-labels.js", "health-cardio.js"]);
  const labels = sandbox.window.HealthLabels;
  const groups = sandbox.window.HealthCardio.groupSessions([
    { started_at: "2026-06-04T20:00:00+08:00", activity_type: "indoor_walk", distance_km: 2.28, duration_seconds: 1504 },
    { started_at: "2026-06-03T20:00:00+08:00", activity_type: "indoor_walk", distance_km: 2.1, duration_seconds: 1420 }
  ], labels);
  assert.deepEqual(Array.from(groups, (group) => group.label), ["\u5ba4\u5185\u6b65\u884c (Indoor Walk)"]);
  assert.equal(groups[0].sessions.length, 2);
  assert.equal(groups.some((group) => /Elliptical/.test(group.label)), false);
});

function loadPublicModules(files) {
  const sandbox = { window: {} };
  for (const file of files) {
    vm.runInNewContext(fs.readFileSync(path.join(PUBLIC_DIR, file), "utf8"), sandbox);
  }
  return sandbox;
}
