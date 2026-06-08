const path = require("node:path");
const fs = require("node:fs");

function readEnv(env = process.env) {
  return {
    port: Number(env.HEALTHY_PORT || 4877),
    databasePath: env.HEALTHY_DB_PATH || path.join(process.cwd(), "data", "healthy.sqlite"),
    registrationKey: env.HEALTHY_REGISTRATION_KEY || readSecretFile(env.HEALTHY_REGISTRATION_KEY_PATH)
  };
}

function readSecretFile(filePath) {
  if (!filePath) return "";
  return fs.readFileSync(filePath, "utf8").trim();
}

module.exports = { readEnv };
