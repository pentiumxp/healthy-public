const { randomUUID } = require("node:crypto");
const { inputError } = require("../../utils/errors");
const { safeEqual, sha256 } = require("../../utils/auth");

function createPluginService({ userRepository, registrationKey, clock }) {
  const launchTokens = new Map();
  const tokenTtlSeconds = 300;

  function manifest() {
    return {
      id: "health",
      title: "健康",
      kind: "embedded_app",
      entry: { url: "/health.html?embed=hermes", mode: "iframe" },
      launch: { supported: true, endpoint: "/api/v1/hermes/plugin/launch", method: "POST", token_ttl_seconds: tokenTtlSeconds },
      provisioning: { supported: true, mode: "workspace_binding", endpoint: "/api/v1/hermes/plugin/workspaces" },
      toolsets: ["health"],
      permissions: ["health:read", "health:write", "health:report"],
      embedding: { frameAncestors: ["hermes-origin"], postMessage: true, themeSync: true, sameOriginProxy: true, uploadProxy: true },
      workspace: { required: true, idFormat: "health:<hermes_workspace_id>" }
    };
  }

  function provision(input, bearer) {
    if (registrationKey && !safeEqual(sha256(bearer), sha256(registrationKey))) {
      throw inputError("invalid registration key", "invalid_registration_key");
    }
    const workspaceRef = normalizeWorkspaceRef(input.workspace_id, input.hermes_workspace_id);
    if (!input.access_key_hash) throw inputError("access_key_hash is required");
    const scopes = input.scopes || ["health:read", "health:write"];
    const user = userRepository.ensureUser({
      workspaceRef,
      hermesUserRef: input.hermes_workspace_id,
      displayName: input.display_name,
      accessKeyHash: input.access_key_hash,
      scopes
    });
    return {
      ok: true,
      workspace_id: user.workspace_ref,
      hermes_workspace_id: user.hermes_user_ref,
      status: "active",
      scopes
    };
  }

  function launch(input, bearer) {
    const workspaceRef = normalizeWorkspaceRef(input.workspace_id, input.hermes_workspace_id);
    const user = verifyWorkspaceKey(workspaceRef, bearer);
    const token = randomUUID();
    const expiresAt = Date.now() + tokenTtlSeconds * 1000;
    launchTokens.set(token, { userId: user.id, workspaceRef, expiresAt });
    return {
      entry_path: `/health.html?embed=hermes&workspace_id=${encodeURIComponent(workspaceRef)}&launch=${token}`,
      expires_in_seconds: tokenTtlSeconds
    };
  }

  function resolveLaunchToken(token, workspaceRef) {
    const record = launchTokens.get(token);
    if (!record || record.expiresAt < Date.now()) throw inputError("launch token expired", "launch_token_expired");
    if (record.workspaceRef !== workspaceRef) throw inputError("workspace mismatch", "permission_denied");
    return record;
  }

  function verifyWorkspaceKey(workspaceRef, bearer) {
    const user = userRepository.findByWorkspace(workspaceRef);
    if (!user) throw inputError("workspace is not registered", "workspace_not_registered");
    if (!user.workspace_access_key_hash) throw inputError("workspace key is not configured", "permission_denied");
    if (!safeEqual(sha256(bearer), user.workspace_access_key_hash)) {
      throw inputError("workspace key is invalid", "permission_denied");
    }
    return user;
  }

  function normalizeWorkspaceRef(workspaceId, hermesWorkspaceId) {
    const value = workspaceId || (hermesWorkspaceId ? `health:${hermesWorkspaceId}` : "");
    if (!value || !String(value).startsWith("health:")) throw inputError("workspace_id must use health:<workspaceId>", "invalid_workspace");
    return String(value);
  }

  return { launch, manifest, provision, resolveLaunchToken, verifyWorkspaceKey };
}

module.exports = { createPluginService };

