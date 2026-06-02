const path = require("node:path");

function readEnv(env = process.env) {
  return {
    port: Number(env.HEALTHY_PORT || 4877),
    databasePath: env.HEALTHY_DB_PATH || path.join(process.cwd(), "data", "healthy.sqlite"),
    registrationKey: env.HEALTHY_REGISTRATION_KEY || ""
  };
}

module.exports = { readEnv };
