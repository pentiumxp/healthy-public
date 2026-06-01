# Healthy Docs

Healthy is a personal health data application for structured storage, statistics, and MCP-accessible analysis through Hermes Mobile.

Current stage: initialization and architecture planning. Business code should not be written until the first implementation slice and harness scope are approved.

Read order for new work:

1. `.agent-context/PROJECT_CONTEXT.md`
2. `.agent-context/HANDOFF.md`
3. `docs/DOCS_INDEX.md`
4. The smallest task-relevant docs

Main entry docs:

- Requirements: `docs/PROJECT_REQUIREMENTS.md` and `docs/PRODUCT_REQUIREMENTS.md`
- Architecture: `docs/ARCHITECTURE.md` and `docs/ARCHITECTURE_BOUNDARY.md`
- Implementation: `docs/IMPLEMENTATION_PLAN.md`
- Database: `docs/DATABASE.md`
- Harness: `docs/HARNESS_RULES.md` and `docs/HARNESS.md`
- Testing: `docs/TEST_MATRIX.md`
- Delivery: `docs/DELIVERY_CHECKLIST.md`
- Hermes plugin integration: `docs/HERMES_PLUGIN_INTEGRATION.md`
- Hermes plugin manifest: `docs/HERMES_PLUGIN_MANIFEST.md`
- Hermes plugin provisioning: `docs/HERMES_PLUGIN_PROVISIONING.md`
- Hermes plugin MCP/toolset: `docs/HERMES_PLUGIN_MCP.md`
- Hermes plugin harness: `docs/HERMES_PLUGIN_HARNESS.md`

Do not store raw health data, private reports, tokens, cookies, secrets, private attachments, full OCR output, or long logs in docs, handoff, tests, or Git.
