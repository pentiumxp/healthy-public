# Hermes Plugin Harness

Healthy plugin integration is H1/H2 mixed. Provisioning, launch, MCP, workspace isolation, and data import are H1. Iframe navigation and visual sync are H2.

## H1 Harness

### Fresh Install Discovery

Must verify:

- `GET /api/v1/hermes/plugin/manifest` works before any workspace has been provisioned.
- Manifest includes `mcp.toolset = health`, top-level `toolsets = ["health"]`, provisioning endpoint, launch endpoint, and `workspace.required = true`.
- Fresh install manifest does not create a Healthy user/profile and does not imply workspace `active`.

### Provisioning Success

Must verify:

- `HEALTHY_REGISTRATION_KEY` is configured.
- Hermes creates workspace-local key/config in the target workspace directory.
- Hermes calls Healthy workspace registration.
- Healthy creates or confirms workspace binding and empty data space.
- Repeated registration for the same `hermes_workspace_id` is idempotent and does not duplicate the Healthy profile.
- Owner self-provisioning with `owner` succeeds and stores canonical workspace id `health:owner`.
- Healthy stores only workspace key hash or equivalent verifier, not the raw workspace key.
- Manifest and launch smoke pass.
- Status becomes `active`.

### Provisioning Failure

Must verify:

- Missing `HEALTHY_REGISTRATION_KEY` returns `registration_key_required`.
- Wrong registration bearer returns `registration_key_invalid`.
- Failed registration, missing key/config, or failed launch smoke does not display `active`.
- UI exposes bounded diagnosis.
- Errors do not expose raw keys, tokens, cookies, file paths, or long logs.

### Workspace Switching Isolation

Must verify:

- Owner viewing non-Owner workspace sees the target workspace's Healthy empty state or data.
- Owner's Healthy session/data is not shown in the target workspace.
- Proxy URLs, launch calls, and iframe session state preserve effective workspace.

### Launch Token

Must verify:

- Launch endpoint returns short-lived entry path only.
- Launch response exposes `expires_in = 300`.
- Launch response may also expose `expires_in_seconds = 300`.
- Unregistered workspaces fail with `workspace_not_registered`.
- Long-lived workspace key is not returned.
- Owner workspace key cannot launch a non-Owner workspace.
- Launch entry path does not include raw key or `workspace_id`.
- Launch token is not written to docs, logs, postMessage, screenshots, or MCP output.

### MCP Workspace Isolation

Must verify:

- `tools/list` exposes at least one `mcp_health_*` callable.
- MCP wrapper fails closed when `.hermes-health/config.json` or `access-key.txt` is missing.
- `health` MCP calls bind to current Hermes workspace.
- Missing workspace context fails closed.
- Cross-workspace reads/writes are rejected.
- Write/import/delete operations produce bounded audit records.

### Health Material Import

Must verify:

- Raw source is stored through Healthy storage boundary.
- Summaries/projections do not expose full health content.
- OCR/model candidates default to pending review.
- Privacy scan fixtures use synthetic data only.

## H2 Harness

Must verify:

- Iframe enter/exit lifecycle.
- `hermes.plugin.back`.
- `health.plugin.navigation`.
- `health.plugin.refresh_required`.
- Theme/font sync.
- PWA/mobile iframe does not show double browser shell or duplicate Hermes navigation.

## Test Matrix

| Area | Class | Required harness |
| --- | --- | --- |
| Fresh install manifest | H1 | manifest contract/no-active-workspace harness |
| Provisioning success | H1 | workflow/API harness |
| Provisioning failure | H1 | workflow/API harness |
| Workspace switching isolation | H1 | host/proxy/session harness |
| Launch token | H1 | launch contract/privacy harness |
| MCP workspace isolation | H1 | MCP contract harness and wrapper fail-closed test |
| Health import privacy | H1 | import/privacy harness |
| Iframe navigation | H2 | postMessage/projection harness |
| Theme/font sync | H2 | UI projection harness |
| Mobile iframe shell | H2 | mobile/PWA visual harness |

## Privacy Fixture Rule

Fixtures must be synthetic. Do not use real reports, real images, full OCR output, raw tokens, cookies, launch tokens, database files, or private local paths.
