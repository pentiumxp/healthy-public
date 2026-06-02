# Hermes Plugin MCP Contract

## Toolset

Healthy exposes MCP toolset:

```text
health
```

The MCP runtime is owned by the Healthy project. Hermes Mobile exposes the `health` toolset through the selected Gateway/Hermes Agent profile and routes model-side actions to Healthy. Hermes Mobile must not vendor Healthy MCP business logic into host code.

NAS deployments must register Healthy MCP with the NAS-local Hermes Agent/Gateway profile, not only a Windows development machine.

## Wrapper

Local wrapper path:

```text
C:\Users\xuxin\Documents\healthy\scripts\mcp-health-wrapper.js
```

Local startup example:

```powershell
node C:\Users\xuxin\Documents\healthy\scripts\mcp-health-wrapper.js --workspace <Hermes user root> --no-workspace-override
```

NAS startup example:

```bash
node /path/to/healthy/scripts/mcp-health-wrapper.js --workspace "$HERMES_USER_ROOT" --no-workspace-override
```

The wrapper reads:

```text
<Hermes user root>/.hermes-health/config.json
<Hermes user root>/.hermes-health/access-key.txt
```

`config.json` must contain bounded non-secret fields such as:

```json
{
  "base_url": "http://127.0.0.1:4877",
  "workspace_id": "health:<hermes_workspace_id>"
}
```

Rules:

- Supports `--workspace <Hermes user root>`.
- Supports `--no-workspace-override`.
- Fails closed when `.hermes-health/config.json` or `access-key.txt` is missing.
- Does not accept model-supplied workspace, key, token, or cookie overrides.
- Does not fall back to Owner.
- Reads raw workspace key only from the workspace-local file.
- Does not print the raw key.

`tools/list` exposes:

```text
mcp_health_records_get_summary
mcp_health_profile_get
mcp_health_profile_update
mcp_health_medications_list
mcp_health_medication_add
mcp_health_strength_sessions_list
mcp_health_strength_session_record
mcp_health_strength_session_update
mcp_health_body_measurements_list
mcp_health_body_measurement_record
mcp_health_body_measurement_update
mcp_health_metrics_trends
```

The wrapper supports standard JSON-RPC MCP messages over stdio:

- `initialize`
- `tools/list`
- `tools/call`

## Workspace Binding

Every MCP call must resolve the current Hermes workspace.

Rules:

- No default Owner workspace.
- No cross-workspace reads or writes.
- Missing workspace context fails closed.
- Tool arguments must not include workspace, key, bearer, token, cookie, launch token, or credential override fields.
- Write, delete, overwrite, import, and report-generation operations require audit metadata.

## Implemented Tools

Read and summary:

- `mcp_health_records_get_summary`
- `mcp_health_profile_get`
- `mcp_health_medications_list`
- `mcp_health_strength_sessions_list`
- `mcp_health_body_measurements_list`
- `mcp_health_metrics_trends`

Write and update:

- `mcp_health_profile_update`
- `mcp_health_medication_add`
- `mcp_health_strength_session_record`
- `mcp_health_strength_session_update`
- `mcp_health_body_measurement_record`
- `mcp_health_body_measurement_update`

Deferred tools:

- Source-file import and OCR review tools.
- Report generation tools.
- Follow-up task creation tools.
- Destructive delete tools.

## Output Contract

MCP output is summary-first:

```json
{
  "ok": true,
  "workspace_id": "health:<hermes_workspace_id>",
  "summary": {
    "record_count": 12,
    "date_range": {
      "from": "2026-05-01",
      "to": "2026-06-01"
    }
  },
  "warnings": []
}
```

Outputs may include:

- Canonical record ids.
- Bounded summaries.
- Metric names and aggregate values.
- Confirmation status.
- Source type.
- Data quality warnings.

Outputs must not include:

- Full report body.
- Full attachment content.
- Raw image content.
- Raw OCR output.
- ID card, insurance number, phone number, or equivalent identifier.
- Token, cookie, access key, launch token.
- Database path or private file path.

## Write Tool Audit

Write tools should record:

- Workspace id.
- Tool name.
- Operation type.
- Target record id.
- Source type.
- Confirmation status.
- Timestamp.

Do not log full private payloads.

Current first-version write tools persist through the Health HTTP API with workspace-local key authorization. They do not accept model-supplied workspace or credential overrides. Structured write results may include canonical record ids and bounded fields, but not raw keys, launch tokens, cookies, database paths, full report content, or attachment payloads.

## Permissions

Suggested scopes:

- `health:read`
- `health:write`
- `health:report`
- `records:write`
- `reports:read`
- `tasks:write`

Destructive operations should require a later explicit scope design before implementation.
