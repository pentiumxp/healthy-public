# Hermes Plugin Manifest Contract

## Endpoint

```http
GET /api/v1/hermes/plugin/manifest
```

The manifest returns bounded non-secret metadata for Hermes Mobile registration and normalization. It must not include raw keys, bearer tokens, cookies, database paths, complete health data, report bodies, attachment content, or local private paths.

## Response Shape

```json
{
  "id": "health",
  "title": "健康",
  "kind": "embedded_app",
  "entry": {
    "url": "/health.html?embed=hermes",
    "mode": "iframe"
  },
  "launch": {
    "supported": true,
    "endpoint": "/api/v1/hermes/plugin/launch",
    "method": "POST",
    "token_ttl_seconds": 300
  },
  "provisioning": {
    "supported": true,
    "mode": "workspace_binding",
    "endpoint": "/api/v1/hermes/plugin/workspaces"
  },
  "mcp": {
    "server": "health-mcp",
    "toolset": "health"
  },
  "toolsets": ["health"],
  "permissions": ["health:read", "health:write", "health:report"],
  "embedding": {
    "frameAncestors": ["hermes-origin"],
    "postMessage": true,
    "themeSync": true,
    "sameOriginProxy": true,
    "uploadProxy": true
  },
  "workspace": {
    "required": true,
    "idFormat": "health:<hermes_workspace_id>"
  }
}
```

## Field Rules

- `id` must be stable: `health`.
- `kind` must be `embedded_app`.
- `entry.url` is browser-facing and must be safe for Hermes proxy rewriting.
- `launch.endpoint` returns only short-lived entry paths.
- Launch responses return `expires_in = 300`; `expires_in_seconds` may remain as a compatibility alias.
- `provisioning.mode` is `workspace_binding`; a UI toggle alone is insufficient.
- `mcp.toolset` is `health` and is intentionally duplicated with top-level `toolsets`.
- `permissions` are declarative metadata, not proof of authorization.
- `embedding.sameOriginProxy` signals that local/LAN HTTP upstreams are expected to be proxied by Hermes Mobile.

## Forbidden Manifest Data

The manifest must never expose:

- Raw registration key.
- Workspace-local access key.
- Launch token.
- Cookie/session token.
- Database path.
- Storage path.
- Full workspace inventory.
- Full health record, report, OCR payload, or attachment metadata list.

## Hermes Mobile Fields To Consume

Hermes Mobile should read:

- `id`
- `title`
- `kind`
- `entry.url`
- `launch.supported`
- `launch.endpoint`
- `provisioning.supported`
- `provisioning.endpoint`
- `mcp.server`
- `mcp.toolset`
- `toolsets`
- `permissions`
- `embedding.sameOriginProxy`
- `embedding.postMessage`
- `embedding.themeSync`
