# Handoff

Last updated: 2026-06-01

Current state:
- Workspace exists at `C:\Users\xuxin\Documents\healthy`.
- `.agent-context` was created manually.
- Git repository initialized on branch `main`.
- CodeGraph initialized. The local `codegraph.db` is ignored and should not be committed.
- GitHub private repository exists at `https://github.com/pentiumxp/healthy`.
- Git remote `origin` points to `https://github.com/pentiumxp/healthy.git`.
- No app framework, package manager, or deployment target has been selected yet.
- Initial product direction: structured health database plus statistics UI, with primary analysis exposed through MCP tools for Hermes Mobile.
- Architecture documentation has been added under `docs/`.
- Healthy docs now follow a Hermes Mobile-style layered structure: `DOCS_INDEX.md`, product requirements, architecture/boundary docs, module docs, implementation notes, runbooks, and test matrix.
- Service-first is now a project constraint: business logic belongs in small services/providers, not large entrypoints, route files, MCP handlers, or UI components.

Known issue:
- The configured initializer script path does not exist: `C:\Users\xuxin\Documents\Agent\scripts\powershell\initialize-workspace-context.ps1`.

Next decisions needed:
- Choose platform: web app, mobile app, desktop app, or backend/API first.
- Choose implementation stack if not already decided.
- Choose first implementation slice: user/profile plus strength training/body composition, or MCP ingestion first.
- Define exact schema and units for the initial health data domains.
- Convert `docs/HARNESS.md` constraints into actual architecture tests after a stack is selected.

Draft requirements from 2026-06-01 discussion:
- Hermes Mobile can enable a health plugin for a user; the health app creates/links a corresponding user profile and per-user health data space.
- Core user profile should include basic demographics and active medications.
- Primary structured domains currently identified: strength training data, cardio training data, body/body-composition data, and profile/medication data.
- Body data may come from manual upload, Mint Health/Boohee-style data, InBody-style reports, or MCP-assisted image analysis and ingestion.
- Database should preserve source/provenance for imported measurements and analysis outputs.
- Statistics UI should present stored structured data; deeper analysis should primarily be callable through MCP by Hermes Mobile.

Last completed setup:
- Initialized Git, CodeGraph, and GitHub.
- Prepared baseline `.gitignore`.
- Added architecture, database, and Harness constraint docs.
- Added doc index, module docs, product requirements, test matrix, harness-required matrix, and runbook entry.
- Pending: create actual application scaffold after product/platform decisions.
