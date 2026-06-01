# Hermes Plugin Provisioning Contract

## Rule

Healthy plugin enablement is a provisioning workflow, not only a UI authorization switch. Owner and non-Owner workspaces both go through provisioning.

## Endpoint

```http
POST /api/v1/hermes/plugin/workspaces
Content-Type: application/json
Authorization: Bearer <health-owner-or-registration-key>
```

The bearer value is a registration credential. It must not be stored in docs, logs, screenshots, frontend state, iframe URLs, or postMessage payloads.

## Request

```json
{
  "owner": "hermes",
  "workspace_id": "health:<hermes_workspace_id>",
  "hermes_workspace_id": "<workspaceId>",
  "display_name": "<workspace display name>",
  "access_key_hash": "<hash or one-time registration material>",
  "scopes": ["health:read", "health:write", "reports:read", "records:write"]
}
```

## Healthy-Side Effects

Healthy creates or confirms:

- Healthy plugin user.
- Healthy workspace binding.
- Empty profile/record space.
- Workspace-local access key hash.
- Initial scopes.
- Audit metadata: created/updated timestamps and non-secret source.

Healthy must not store a raw Hermes workspace key unless a later explicit design permits it. If a key is accepted, store only a hash or equivalent verifier.

## Response

```json
{
  "ok": true,
  "workspace_id": "health:<hermes_workspace_id>",
  "hermes_workspace_id": "<workspaceId>",
  "status": "active",
  "scopes": ["health:read", "health:write", "reports:read", "records:write"]
}
```

Error responses should use stable codes:

- `invalid_registration_key`
- `invalid_workspace`
- `scope_denied`
- `workspace_conflict`
- `provisioning_failed`

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

