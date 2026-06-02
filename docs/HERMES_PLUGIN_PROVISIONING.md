# Hermes Plugin Provisioning Contract

## Rule

Healthy plugin enablement is a provisioning workflow, not only a UI authorization switch. Owner and non-Owner workspaces both go through provisioning.

## Endpoint

```http
POST /api/v1/hermes/plugin/workspaces
Content-Type: application/json
Authorization: Bearer <health-owner-or-registration-key>
```

The bearer value is the Healthy service-side registration credential. It must not be stored in docs, logs, screenshots, frontend state, iframe URLs, or postMessage payloads.

Configuration:

- `HEALTHY_REGISTRATION_KEY` is required for workspace registration.
- If `HEALTHY_REGISTRATION_KEY` is empty, registration fails with `registration_key_required`.
- If the bearer value does not match `HEALTHY_REGISTRATION_KEY`, registration fails with `registration_key_invalid`.
- Deployments must keep the raw value outside Git, docs, logs, screenshots, frontend state, and model prompts.
- Healthy never falls back to a Hermes Owner web key.
- Healthy never accepts an Owner workspace key as a substitute for the target workspace key.

## Request

```json
{
  "owner": "hermes",
  "workspace_id": "health:<hermes_workspace_id>",
  "hermes_workspace_id": "<workspaceId>",
  "target_workspace_id": "<workspaceId>",
  "display_name": "<workspace display name>",
  "access_key_hash": "<hash or one-time registration material>",
  "scopes": ["health:read", "health:write", "reports:read", "records:write"]
}
```

Workspace id compatibility:

- Preferred canonical Health id: `workspace_id = "health:<hermes_workspace_id>"`.
- Accepted host convenience form: `workspace_id = "<hermes_workspace_id>"`.
- Accepted Hermes target alias: `target_workspace_id = "<hermes_workspace_id>"`.
- Owner self-provisioning is accepted with `owner`, and Healthy stores it as `health:owner`.
- If multiple workspace id fields are provided, they must refer to the same Hermes workspace.

## Healthy-Side Effects

Healthy creates or confirms:

- Healthy plugin user.
- Healthy workspace binding.
- Empty profile/record space.
- Workspace-local access key hash.
- Initial scopes.
- Audit metadata: created/updated timestamps and non-secret source.

Healthy must not store a raw Hermes workspace key unless a later explicit design permits it. If a key is accepted, store only a hash or equivalent verifier.

Registration is idempotent. Re-registering the same `hermes_workspace_id` updates the existing Healthy user binding and profile instead of creating duplicates.

## Response

```json
{
  "ok": true,
  "workspace_id": "health:<hermes_workspace_id>",
  "hermes_workspace_id": "<workspaceId>",
  "status": "active",
  "provisioning_result": "created|updated",
  "scopes": ["health:read", "health:write", "reports:read", "records:write"]
}
```

Error responses should use stable codes:

- `registration_key_required`
- `registration_key_invalid`
- `invalid_workspace`
- `scope_denied`
- `workspace_conflict`
- `workspace_registration_failed`

Error bodies must not echo secrets or raw request credentials.

## Hermes Mobile Local Files

Hermes Mobile may store raw workspace credentials in the target workspace's private directory, for example:

```text
<HERMES_DATA_DIR>\drive\users\<workspaceId>\.hermes-health\access-key.txt
<HERMES_DATA_DIR>\drive\users\<workspaceId>\.hermes-health\config.json
```

Healthy must not require Hermes to place that raw key in:

- Iframe URL.
- Frontend state.
- PostMessage payload.
- Screenshots.
- Docs.
- Logs.

Implementation note:

- The current Healthy service stores `workspace_access_key_hash`.
- It does not store the raw workspace key.
- Launch verifies `sha256(Bearer)` against the target workspace hash.

## Provisioning States

- `pending`: provisioning is running; plugin must not be shown as usable.
- `active`: key/config, Healthy workspace binding, manifest, and launch smoke passed.
- `manual_required`: automatic provisioning is not available; user action is required.
- `provisioning_failed`: setup failed; UI shows diagnosis and must not pretend the plugin is available.

Allowed:

- Active plugin with empty health data.

Not allowed:

- Missing identity.
- Missing key/config.
- Missing Healthy binding.
- Missing MCP/toolset registration when the manifest declares it required.
- Owner session/key reused for non-Owner workspace.
