# Hermes Plugin MCP Contract

## Toolset

Healthy exposes MCP toolset:

```text
health
```

The MCP runtime is owned by the Healthy project. Hermes Mobile exposes the `health` toolset through the selected Gateway/Hermes Agent profile and routes model-side actions to Healthy. Hermes Mobile must not vendor Healthy MCP business logic into host code.

NAS deployments must register Healthy MCP with the NAS-local Hermes Agent/Gateway profile, not only a Windows development machine.

## Workspace Binding

Every MCP call must resolve the current Hermes workspace.

Rules:

- No default Owner workspace.
- No cross-workspace reads or writes.
- Missing workspace context fails closed.
- Write, delete, overwrite, import, and report-generation operations require audit metadata.

## Suggested Tools

Read and summary:

- `health.records.list`
- `health.records.get_summary`
- `health.metrics.trends`

Import and write:

- `health.records.import`
- `health.records.record_strength_session`
- `health.records.record_body_measurement`

Reports and tasks:

- `health.reports.generate_summary`
- `health.tasks.create_followup`

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

## Permissions

Suggested scopes:

- `health:read`
- `health:write`
- `health:report`
- `records:write`
- `reports:read`
- `tasks:write`

Destructive operations should require a later explicit scope design before implementation.

