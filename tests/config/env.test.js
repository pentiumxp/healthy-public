const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { readEnv } = require("../../src/config/env");

test("readEnv can load Healthy registration key from a file path", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "healthy-env-"));
  const keyPath = path.join(dir, "health-owner-key.txt");
  fs.writeFileSync(keyPath, "synthetic-registration-key\n", "utf8");
  const config = readEnv({ HEALTHY_REGISTRATION_KEY_PATH: keyPath, HEALTHY_DB_PATH: ":memory:" });
  assert.equal(config.registrationKey, "synthetic-registration-key");
});
