const { readEnv } = require("../src/config/env");
const { createMigratedDatabase } = require("../src/db/client");

const config = readEnv();
const db = createMigratedDatabase(config.databasePath);
db.close();
console.log(`Migrated Healthy database at ${config.databasePath}`);

