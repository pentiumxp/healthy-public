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
}

function createMigratedDatabase(databasePath = ":memory:") {
  const db = openDatabase(databasePath);
  applyMigrations(db);
  return db;
}

module.exports = { applyMigrations, createMigratedDatabase, openDatabase };
