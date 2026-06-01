# Hermes Plugin Integration

Healthy is an independent Hermes Mobile embedded-app plugin. Hermes Mobile hosts, authorizes, provisions, launches, proxies, and routes the plugin. Healthy owns all health business behavior, data, UI, API, MCP runtime, deployment, and plugin-side harnesses.

## Boundary

Healthy owns:

- Health data model, database, migrations, and repositories.
- Health material import, parsing, archival, and source provenance.
- Reports, trends, reminders, and health follow-up tasks.
- Plugin UI and plugin API.
- MCP server and `health` toolset.
- Container/deployment scripts.
- Plugin-side harnesses and privacy scan.

Hermes Mobile owns:

- Plugin registration and manifest normalization.
- Workspace authorization and provisioning status.
- Same-origin proxy under `/api/hermes-plugins/health/proxy/...`.
- Iframe host and workspace switch lifecycle.
- Short launch-token exchange.
- PostMessage navigation, refresh, theme, and font sync.
- Gateway/Hermes Agent profile exposure of the `health` MCP toolset.

Hermes Mobile must not copy Healthy screens, database logic, reports, imports, or business workflows into host code.

## Workspace Isolation

Healthy must treat Hermes workspace identity as the primary external tenant boundary.

- Every provisioned Hermes workspace maps to one Healthy workspace binding.
- Owner also uses provisioning; Owner does not bypass binding.
- Non-Owner workspaces must see their own empty state or data, never Owner data.
- API, launch, MCP, and UI sessions must resolve `workspace_id` or `hermes_workspace_id`.
- Missing workspace context fails closed.

## Entry Points

Healthy should expose:

- `GET /api/v1/hermes/plugin/manifest`
- `POST /api/v1/hermes/plugin/workspaces`
- `POST /api/v1/hermes/plugin/launch`
- Plugin UI entry such as `/health.html?embed=hermes`
- Plugin API under Healthy-owned paths.
- MCP server/toolset named `health`.

## Same-Origin Proxy

Healthy must support being served through Hermes Mobile's same-origin proxy:

```text
/api/hermes-plugins/health/proxy/...
```

Healthy should emit relative or proxy-rewritable URLs for:

- Static assets.
- API calls.
- Report previews.
- Images/PDFs/attachments.
- Upload endpoints.

The phone/PWA iframe must not be forced to load `http://127.0.0.1:<port>` or LAN HTTP resources directly.

## PostMessage

Healthy accepts host messages:

```json
{ "type": "hermes.plugin.theme", "theme": "dark", "fontSize": "default" }
{ "type": "hermes.plugin.back" }
{ "type": "hermes.plugin.refresh" }
```

Healthy may send host messages:

```json
{ "type": "health.plugin.navigation", "canGoBack": true, "route": "/records/xxx" }
{ "type": "health.plugin.back_result", "handled": true }
{ "type": "health.plugin.refresh_required", "reason": "token_expired" }
{ "type": "health.plugin.open_file", "fileId": "..." }
```

PostMessage payloads must contain only route hints, ids, and bounded status summaries. They must never contain raw access keys, launch tokens, cookies, full health reports, full attachment content, or raw OCR output.

## Appearance

Healthy should accept appearance via launch body and postMessage:

- `theme`: `light`, `dark`, or host default.
- `fontSize`: `compact`, `default`, or `large`.
- Safe-area and mobile viewport constraints.
- Embedded iframe/PWA mode.

Embedded UI must not show a second browser shell, duplicate Hermes top navigation, or duplicate Hermes bottom tabs.

## Privacy

Do not store or emit through docs, handoff, logs, test fixtures, manifest, launch response, postMessage, or MCP output:

- Raw access key.
- OAuth token.
- Cookie.
- Launch token.
- Full health report text.
- Raw report/checklist images.
- ID card, insurance number, phone number, or other direct identifiers.
- Database file contents or database paths.
- Long logs.

