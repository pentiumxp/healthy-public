const { createServices } = require("../src/app/services");
const { createMigratedDatabase } = require("../src/db/client");
const { sha256 } = require("../src/utils/auth");

function createTestServices(options = {}) {
  const db = createMigratedDatabase(":memory:");
  return createServices({ db, registrationKey: options.registrationKey ?? "registration-key", clock: options.clock });
}

function provisionWorkspace(services, hermesWorkspaceId, rawKey) {
  return services.pluginService.provision(
    {
      owner: "hermes",
      workspace_id: `health:${hermesWorkspaceId}`,
      hermes_workspace_id: hermesWorkspaceId,
      display_name: hermesWorkspaceId,
      access_key_hash: sha256(rawKey),
      scopes: ["health:read", "health:write", "reports:read", "records:write"]
    },
    "registration-key"
  );
}

module.exports = { createTestServices, provisionWorkspace };
