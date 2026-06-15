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

test("strength session detail back returns to the selected exercise list", () => {
  const sandbox = loadPublicModules(["health-labels.js", "health-strength.js"], createDomSandbox(["strengthList", "detailView"]));
  const detail = sandbox.document.getElementById("detailView");
  let detailTitle = "";
  let detailBack = null;
  const tools = {
    labels: sandbox.window.HealthLabels,
    empty: "--",
    openDetail: (title, options = {}) => {
      detailTitle = title;
      detailBack = options.back || null;
      detail.innerHTML = "";
    },
    appendText: (parent, text) => parent.appendChild(textNode(text)),
    appendSection: appendSection
  };

  sandbox.window.HealthStrength.renderList([
    { id: "session-a", started_at: "2026-06-10T19:00:00+08:00", sets: [
      { exercise_name: "Barbell Squat", weight_kg: 65, reps: 10 },
      { exercise_name: "Barbell Overhead Press", weight_kg: 30, reps: 8 }
    ] }
  ], tools);

  click(sandbox.document.getElementById("strengthList").children[0]);
  assert.equal(detailTitle, "\u6760\u94c3\u6df1\u8e72 (Barbell Squat)");
  click(detail.children[1].children[1]);
  assert.equal(detailTitle, "2026-06-10");
  assert.equal(typeof detailBack, "function");
  detailBack();
  assert.equal(detailTitle, "\u6760\u94c3\u6df1\u8e72 (Barbell Squat)");
  assert.equal(detailBack, null);
});

test("cardio session detail back returns to the selected activity list", () => {
  const sandbox = loadPublicModules(["health-labels.js", "health-cardio.js"], createDomSandbox(["cardioList", "detailView"]));
  const detail = sandbox.document.getElementById("detailView");
  let detailTitle = "";
  let detailBack = null;
  const tools = {
    labels: sandbox.window.HealthLabels,
    empty: "--",
    openDetail: (title, options = {}) => {
      detailTitle = title;
      detailBack = options.back || null;
      detail.innerHTML = "";
    },
    appendText: (parent, text) => parent.appendChild(textNode(text)),
    appendSection: appendSection
  };

  sandbox.window.HealthCardio.renderList([
    { id: "cardio-a", started_at: "2026-06-10T20:00:00+08:00", activity_type: "indoor_walk", distance_km: 2.28, duration_seconds: 1504 }
  ], tools);

  click(sandbox.document.getElementById("cardioList").children[0]);
  assert.equal(detailTitle, "\u5ba4\u5185\u6b65\u884c (Indoor Walk)");
  click(detail.children[1].children[1]);
  assert.equal(detailTitle, "\u5ba4\u5185\u6b65\u884c (Indoor Walk)");
  assert.equal(typeof detailBack, "function");
  detailBack();
  assert.equal(detailTitle, "\u5ba4\u5185\u6b65\u884c (Indoor Walk)");
  assert.equal(detailBack, null);
});

function loadPublicModules(files, sandbox = { window: {} }) {
  for (const file of files) {
    vm.runInNewContext(fs.readFileSync(path.join(PUBLIC_DIR, file), "utf8"), sandbox);
  }
  return sandbox;
}

function createDomSandbox(ids) {
  const elements = new Map(ids.map((id) => [id, new FakeElement("div")]));
  return {
    window: {},
    document: {
      getElementById: (id) => elements.get(id),
      createElement: (tagName) => new FakeElement(tagName)
    }
  };
}

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.listeners = {};
    this.className = "";
    this.type = "";
    this.textContent = "";
  }

  set innerHTML(value) {
    this.children = [];
    this.textContent = value;
  }

  append(...nodes) {
    for (const node of nodes) this.appendChild(node);
  }

  appendChild(node) {
    this.children.push(node);
    return node;
  }

  addEventListener(name, handler) {
    this.listeners[name] = handler;
  }
}

function appendSection(parent, title, nodes) {
  const section = parent.ownerDocument?.createElement?.("section") || new FakeElement("section");
  section.appendChild(textNode(title));
  for (const node of nodes) section.appendChild(node);
  parent.appendChild(section);
}

function textNode(text) {
  const node = new FakeElement("span");
  node.textContent = text || "";
  return node;
}

function click(node) {
  node.listeners.click();
}
