# Home AI Platform Contract Pointer

Last updated: 2026-06-06.
Home AI platform contract version: `20260606-v1`.

## Scope

Health is a standard inserted Home AI plugin. It owns structured health facts,
health UI, and bounded MCP health tools. This file records only Health-local
facts and points back to the canonical Home AI platform contract.

## Canonical Home AI Docs

Read these Home AI docs before changing deployment, MCP tools, mobile visual
behavior, or cross-plugin reference behavior:

- `C:\Users\xuxin\Documents\Agent\docs\PLATFORM_CONTRACTS\plugin-workspace-platform-contract.md`
- `C:\Users\xuxin\Documents\Agent\docs\PLATFORM_CONTRACTS\plugin-mobile-ui-visual-contract.md`
- `C:\Users\xuxin\Documents\Agent\docs\RUNBOOKS\macos-production-access.md`
- `C:\Users\xuxin\Documents\Agent\docs\RUNBOOKS\mcp-tool-upgrade-closure.md`
- `C:\Users\xuxin\Documents\Agent\docs\RUNBOOKS\macos-ios-simulator-appium.md`
- `C:\Users\xuxin\Documents\Agent\docs\IMPLEMENTATION_NOTES\reference-memory-graph-v1.md`
- `C:\Users\xuxin\Documents\Agent\docs\IMPLEMENTATION_NOTES\reference-memory-graph-harness-plan.md`

## Plugin-Local Facts

| Field | Value |
| --- | --- |
| `plugin_id` | `health` |
| `workspace_path_windows` | `C:\Users\xuxin\Documents\healthy` |
| `current_branch_snapshot` | `main` at `3495ae8` when this pointer was added |
| `production_source_path_macos` | `/Users/hermes-host/HermesMobile/plugins/healthy` |
| `production_data_root_macos` | `/Users/hermes-host/HermesMobile/plugins/healthy/data` |
| `windows_dev_base_url` | `http://127.0.0.1:4877` |
| `macos_production_base_url` | `http://127.0.0.1:4877` |
| `launchd_label` | `system/com.hermesmobile.plugin.health` |
| `manifest_url` | `http://127.0.0.1:4877/api/v1/hermes/plugin/manifest` |
| `mcp_command` | `npm run mcp:health` |
| `mcp_schema_endpoint` | MCP `tools/list` through the wrapper and plugin manifest through HTTP |
| `deploy_command` | Use the Home AI Mac access runbook; verify the current Health deploy script/path before production sync. |
| `credential_locations` | Local ignored runtime config only by reference. Do not record raw tokens, health data payloads, uploaded files, or private user data here. |
| `reference_contract_status` | `planned`; Health should later expose Reference Contract methods for profile, medication, body, strength, cardio, lab, and medical-record objects. |
| `mobile_visual_harness_status` | Local static/theme/service tests exist; Home AI Appium/iOS Simulator evidence is required for embedded mobile UI, safe-area, tab layout, or PWA differences. |

## Required Local Validation

Run the smallest focused set for the changed surface:

```powershell
npm run check:utf8
npm run check:architecture
npm test
npm run check
```

For MCP wrapper changes:

```powershell
npm run mcp:health
```

Use a bounded `tools/list` or tool-call probe rather than dumping private
health records.

From the Home AI main workspace, run the cross-workspace platform contract
checker after changing this pointer or any Health deployment/MCP/mobile
contract:

```powershell
node scripts\plugin-workspace-platform-contract-check.js --plugin health --json
```

## Required Production Validation

Use the Home AI Mac access runbook. Do not print passwords, keys, cookies,
workspace tokens, raw health records, uploaded file contents, launch tokens, or
long logs.

Minimum closure for Health production changes:

1. verify Mac launchd `system/com.hermesmobile.plugin.health` is running;
2. verify Mac loopback plugin manifest and bounded health/version endpoint if
   available;
3. verify direct MCP `tools/list` includes expected Health tools;
4. when MCP tools changed, run the Home AI MCP tool upgrade closure harness so
   the selected Gateway profile and selected worker expose the callable
   `mcp_health_*` tool names;
5. for write features, perform a bounded readback smoke against the changed
   health object without dumping private data.

## Open Gaps

- Keep the exact Mac production source/data root names current after the next
  Health production deployment.
- Implement the Reference Contract V1 methods for stable Health object refs.
- Add Health-specific Appium/iOS Simulator coverage for embedded UI and mobile
  navigation behavior.
