const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..", "..");

test("routes do not import database client or repositories", () => {
  for (const file of listFiles(path.join(ROOT, "src", "routes"), ".js")) {
    const text = fs.readFileSync(file, "utf8");
    assert.equal(/require\(["']\.\.\/db|require\(["']\.\.\/repositories/.test(text), false, file);
  }
});

test("application files stay within first-version line budgets", () => {
  const budgets = [
    ["src/app", 120],
    ["src/routes", 180],
    ["src/services", 260],
    ["src/repositories", 220],
    ["public", 260],
    ["tests", 300]
  ];
  for (const [dir, maxLines] of budgets) {
    for (const file of listFiles(path.join(ROOT, dir), ".js")) {
      const lines = fs.readFileSync(file, "utf8").split(/\r?\n/).length;
      assert.ok(lines <= maxLines, `${path.relative(ROOT, file)} has ${lines} lines, max ${maxLines}`);
    }
  }
});

function listFiles(dir, extension) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(full, extension);
    return entry.name.endsWith(extension) ? [full] : [];
  });
}

