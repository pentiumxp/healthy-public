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

test("application boundary keeps explicit service and route ownership", () => {
  assertFileContains("src/app/services.js", "function createServices");
  assertFileContains("src/app/http-server.js", "function createServer");
  assertFileContains("src/routes/health-routes.js", "handleHealthRoute");
  assertFileContains("src/routes/medical-routes.js", "handleMedicalRoute");
  assertFileContains("src/routes/plugin-routes.js", "handlePluginRoute");
  assertFileContains("src/services/users/profile-service.js", "function createProfileService");
  assertFileContains("src/services/training/strength-service.js", "function createStrengthService");
  assertFileContains("src/services/training/cardio-service.js", "function createCardioService");
  assertFileContains("src/services/body/body-service.js", "function createBodyService");
  assertFileContains("src/services/apple/apple-health-service.js", "function createAppleHealthService");
});

test("entrypoint and routes do not regain domain persistence ownership", () => {
  const boundaryFiles = [
    "src/app/http-server.js",
    "src/routes/health-routes.js",
    "src/routes/medical-routes.js",
    "src/routes/plugin-routes.js"
  ];
  for (const file of boundaryFiles) {
    const text = readProjectFile(file);
    assert.equal(/DatabaseSync|createMigratedDatabase|create[A-Za-z]+Repository/.test(text), false, file);
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

function readProjectFile(file) {
  return fs.readFileSync(path.join(ROOT, file), "utf8");
}

function assertFileContains(file, snippet) {
  assert.match(readProjectFile(file), new RegExp(escapeRegExp(snippet)), file);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
