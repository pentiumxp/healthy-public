const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const PUBLIC_DIR = path.join(__dirname, "..", "..", "public");

test("Apple Health dashboard module renders long-term native metrics", () => {
  const ids = ["appleHealthDate", "appleSteps", "appleEnergy", "appleExercise", "appleDistance", "appleSleep", "appleWorkout"];
  const elements = new Map(ids.map((id) => [id, { textContent: "" }]));
  const sandbox = {
    window: {},
    document: { getElementById: (id) => elements.get(id) }
  };
  vm.runInNewContext(fs.readFileSync(path.join(PUBLIC_DIR, "health-apple.js"), "utf8"), sandbox);

  sandbox.window.HealthApple.render({
    latestDaily: { summary_date: "2026-06-15", step_count: 10200, active_energy_kcal: 510, exercise_minutes: 58, walking_running_distance_m: 7400 },
    latestSleep: { total_sleep_minutes: 435 },
    workouts: [{ apple_activity_type: "outdoor_walk", duration_seconds: 1800 }]
  });

  assert.equal(elements.get("appleHealthDate").textContent, "HealthKit 2026-06-15");
  assert.equal(elements.get("appleSteps").textContent, "10,200");
  assert.equal(elements.get("appleEnergy").textContent, "510 kcal");
  assert.equal(elements.get("appleExercise").textContent, "58 min");
  assert.equal(elements.get("appleDistance").textContent, "7.4 km");
  assert.equal(elements.get("appleSleep").textContent, "7.3 h");
  assert.equal(elements.get("appleWorkout").textContent, "Outdoor Walk 30 min");
});
