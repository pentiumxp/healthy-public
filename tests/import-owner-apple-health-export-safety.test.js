const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");
const { createMigratedDatabase } = require("../src/db/client");
const { main, parseArgs, resolveOptions } = require("../scripts/import-owner-apple-health-export");

test("Apple Health export import helper requires explicit target inputs", () => {
  assert.throws(() => resolveOptions(parseArgs([])), /missing required argument\(s\): --db, --source, --workspace/);
  assert.throws(() => resolveOptions(parseArgs(["--db", "db.sqlite", "--source", "source"])), /--workspace/);
  const options = resolveOptions(parseArgs(["--db", "db.sqlite", "--source", "source", "--workspace", "health:test"]));
  assert.equal(options.workspace, "health:test");
  assert.equal(options.dryRun, true);
});

test("Apple Health export import helper requires explicit confirmation for writes", () => {
  assert.throws(() => resolveOptions(parseArgs([
    "--db", "db.sqlite",
    "--source", "source",
    "--workspace", "health:test",
    "--dry-run",
    "--execute",
    "--confirm-write"
  ])), /--dry-run and --execute are mutually exclusive/);
  assert.throws(() => resolveOptions(parseArgs([
    "--db", "db.sqlite",
    "--source", "source",
    "--workspace", "health:test",
    "--execute"
  ])), /writes require --execute and --confirm-write/);
  const options = resolveOptions(parseArgs([
    "--db", "db.sqlite",
    "--source", "source",
    "--workspace", "health:test",
    "--execute",
    "--confirm-write"
  ]));
  assert.equal(options.dryRun, false);
});

test("Apple Health export import helper has no hard-coded private defaults", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "scripts", "import-owner-apple-health-export.js"), "utf8");
  assert.doesNotMatch(source, /DEFAULT_SOURCE|DEFAULT_DB/);
  assert.doesNotMatch(source, /Hermes-\u5f90\u6b23|HermesMobile\/plugins\/healthy\/data\/healthy\.sqlite/);
  assert.doesNotMatch(source, /workspace\s*=\s*args\.workspace\s*\|\|\s*"health:owner"/);
});

test("Apple Health export import helper redacts raw db and source paths in summary", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "healthy-import-helper-"));
  const dbPath = path.join(root, "db", "healthy.sqlite");
  const sourceDir = path.join(root, "private-source");
  fs.mkdirSync(sourceDir, { recursive: true });
  const db = createMigratedDatabase(dbPath);
  db.prepare(
    `INSERT INTO users (id, workspace_ref, hermes_user_ref, display_name, workspace_access_key_hash, scopes_json, created_at, updated_at)
     VALUES ('user_test', 'health:test', 'test', 'Test', NULL, '[]', 'now', 'now')`
  ).run();
  db.close();

  const originalLog = console.log;
  console.log = () => {};
  let summary;
  try {
    summary = main(["--db", dbPath, "--source", sourceDir, "--workspace", "health:test", "--skip-ecg-waveforms", "--skip-route-points"]);
  } finally {
    console.log = originalLog;
  }
  assert.equal(summary.ok, true);
  assert.equal(summary.dryRun, true);
  assert.deepEqual(summary.inputs, { db: "provided", source: "provided" });
  assert.equal(JSON.stringify(summary).includes(dbPath), false);
  assert.equal(JSON.stringify(summary).includes(sourceDir), false);

  const reopened = new DatabaseSync(dbPath);
  assert.equal(reopened.prepare("SELECT COUNT(*) AS n FROM apple_health_daily_summaries").get().n, 0);
  reopened.close();
});
