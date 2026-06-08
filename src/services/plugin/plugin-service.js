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
      mcp: { server: "health-mcp", toolset: "health" },
      toolsets: ["health"],
      permissions: ["health:read", "health:write", "health:report"],
      embedding: { frameAncestors: ["hermes-origin"], postMessage: true, themeSync: true, sameOriginProxy: true, uploadProxy: true },
      workspace: { required: true, idFormat: "health:<hermes_workspace_id>" }
    };
  }

  function provision(input, bearer) {
    verifyRegistrationKey(bearer);
    try {
      const hermesWorkspaceId = normalizeHermesWorkspaceId(input);
      const workspaceRef = normalizeWorkspaceRef(input.workspace_id, hermesWorkspaceId);
      if (!input.access_key_hash) throw inputError("access_key_hash is required");
      const existing = userRepository.findByWorkspace(workspaceRef);
      const scopes = input.scopes || ["health:read", "health:write"];
      const user = userRepository.ensureUser({
        workspaceRef,
        hermesUserRef: hermesWorkspaceId,
        displayName: input.display_name,
        accessKeyHash: input.access_key_hash,
        scopes
      });
      userRepository.upsertProfile(user.id, {});
      return {
        ok: true,
        workspace_id: user.workspace_ref,
        hermes_workspace_id: user.hermes_user_ref,
        status: "active",
        provisioning_result: existing ? "updated" : "created",
        scopes
      };
    } catch (error) {
      if (error.code) throw error;
      throw inputError("workspace registration failed", "workspace_registration_failed");
    }
  }

  function launch(input, bearer) {
    const workspaceRef = normalizeWorkspaceRef(input.workspace_id, normalizeHermesWorkspaceId(input));
    const user = verifyWorkspaceKey(workspaceRef, bearer);
    const token = randomUUID();
    const expiresAt = Date.now() + tokenTtlSeconds * 1000;
    launchTokens.set(token, { userId: user.id, workspaceRef, expiresAt, appearance: sanitizeAppearance(input) });
    return {
      entry_path: `/health.html?embed=hermes&launch=${token}`,
      expires_in: tokenTtlSeconds,
      expires_in_seconds: tokenTtlSeconds
    };
  }

  function resolveLaunchToken(token, workspaceRef) {
    const record = launchTokens.get(token);
    if (!record || record.expiresAt < Date.now()) throw inputError("launch token expired", "launch_token_expired");
    if (workspaceRef && record.workspaceRef !== workspaceRef) throw inputError("workspace mismatch", "permission_denied");
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

  function verifyRegistrationKey(bearer) {
    if (!registrationKey) throw inputError("registration key is required", "registration_key_required");
    if (!bearer || !safeEqual(sha256(bearer), sha256(registrationKey))) {
      throw inputError("registration key is invalid", "registration_key_invalid");
    }
  }

  function normalizeHermesWorkspaceId(input) {
    const hermesWorkspaceId = cleanId(input.hermes_workspace_id);
    const targetWorkspaceId = cleanId(input.target_workspace_id);
    if (hermesWorkspaceId && targetWorkspaceId && hermesWorkspaceId !== targetWorkspaceId) {
      throw inputError("workspace ids do not match", "invalid_workspace");
    }
    if (hermesWorkspaceId || targetWorkspaceId) return hermesWorkspaceId || targetWorkspaceId;
    const workspaceId = cleanId(input.workspace_id);
    if (workspaceId.startsWith("health:")) return workspaceId.slice("health:".length);
    return workspaceId;
  }

  function normalizeWorkspaceRef(workspaceId, hermesWorkspaceId) {
    const explicitWorkspaceId = cleanId(workspaceId);
    const normalizedHermesId = cleanId(hermesWorkspaceId);
    if (explicitWorkspaceId.startsWith("health:")) {
      const canonicalHermesId = explicitWorkspaceId.slice("health:".length);
      if (!canonicalHermesId) throw inputError("workspace_id must include a workspace id", "invalid_workspace");
      if (normalizedHermesId && normalizedHermesId !== canonicalHermesId) {
        throw inputError("workspace ids do not match", "invalid_workspace");
      }
      return explicitWorkspaceId;
    }
    const bareWorkspaceId = explicitWorkspaceId || normalizedHermesId;
    if (!bareWorkspaceId || bareWorkspaceId.includes(":")) {
      throw inputError("workspace_id must use health:<workspaceId> or a bare Hermes workspace id", "invalid_workspace");
    }
    return `health:${bareWorkspaceId}`;
  }

  function cleanId(value) {
    return value == null ? "" : String(value).trim();
  }

  function sanitizeAppearance(input = {}) {
    const source = input.appearance && typeof input.appearance === "object" ? input.appearance : input;
    const theme = cleanId(source.theme || source.pluginTheme || source.plugin_theme);
    const fontSize = cleanId(source.fontSize || source.pluginFontSize || source.plugin_font_size);
    return {
      ...(theme === "system" || theme === "light" || theme === "dark" ? { theme } : {}),
      ...(normalizeFontSize(fontSize) ? { fontSize: normalizeFontSize(fontSize) } : {})
    };
  }

  function normalizeFontSize(value) {
    if (value === "default") return "normal";
    return ["compact", "normal", "large", "xlarge"].includes(value) ? value : "";
  }

  return { launch, manifest, provision, resolveLaunchToken, verifyWorkspaceKey };
}

module.exports = { createPluginService };
