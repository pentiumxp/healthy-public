const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

function openDatabase(databasePath = ":memory:") {
  if (databasePath !== ":memory:") {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  }
  const db = new DatabaseSync(databasePath);
  db.exec("PRAGMA foreign_keys = ON");
  return db;
}

function applyMigrations(db) {
  const migrationsDir = path.join(__dirname, "migrations");
  for (const file of fs.readdirSync(migrationsDir).filter((name) => name.endsWith(".sql")).sort()) {
    db.exec(fs.readFileSync(path.join(migrationsDir, file), "utf8"));
  }
  ensureColumn(db, "apple_health_workouts", "elevation_gain_m", "REAL");
  ensureColumn(db, "apple_health_workouts", "elevation_loss_m", "REAL");
  ensureColumn(db, "apple_health_workouts", "source_name", "TEXT");
  ensureColumn(db, "apple_health_workouts", "source_bundle_identifier", "TEXT");
  ensureColumn(db, "apple_health_workouts", "device_name", "TEXT");
  ensureColumn(db, "apple_health_workouts", "device_manufacturer", "TEXT");
  ensureColumn(db, "apple_health_workouts", "device_model", "TEXT");
}

function createMigratedDatabase(databasePath = ":memory:") {
  const db = openDatabase(databasePath);
  applyMigrations(db);
  return db;
}

module.exports = { applyMigrations, createMigratedDatabase, openDatabase };

function ensureColumn(db, table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some((item) => item.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}
