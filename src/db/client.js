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
  const migrationPath = path.join(__dirname, "migrations", "001_initial.sql");
  db.exec(fs.readFileSync(migrationPath, "utf8"));
}

function createMigratedDatabase(databasePath = ":memory:") {
  const db = openDatabase(databasePath);
  applyMigrations(db);
  return db;
}

module.exports = { applyMigrations, createMigratedDatabase, openDatabase };

