# Project Context

Workspace: `C:\Users\xuxin\Documents\healthy`

Project label: Health app

GitHub repository: `https://github.com/pentiumxp/healthy`

Status:
- Workspace context was initialized manually because the expected initializer script was not present at `C:\Users\xuxin\Documents\Agent\scripts\powershell\initialize-workspace-context.ps1`.
- Git repository initialized on branch `main`.
- CodeGraph initialized under `.codegraph/`; local database files are ignored by `.codegraph/.gitignore`.
- GitHub private repository created at `https://github.com/pentiumxp/healthy` and configured as `origin`.
- Architecture docs exist under `docs/`.
- No application source files were present at initialization time.

Documentation entrypoint:
- Read `docs/DOCS_INDEX.md` first after `.agent-context`.
- Use `docs/PRODUCT_REQUIREMENTS.md` for durable product rules and first-release scope.
- Use `docs/ARCHITECTURE.md` for module/service boundaries.
- Use `docs/ARCHITECTURE_BOUNDARY.md` for Service-first architecture contracts and file budgets.
- Use `docs/DATABASE.md` for structured health data schema planning.
- Use `docs/HARNESS.md` for Service-first constraints, file-size limits, and architecture test requirements.
- Use `docs/TEST_MATRIX.md` and `docs/IMPLEMENTATION_NOTES/harness-required-matrix.md` to classify validation before implementation.

Operating rules:
- Prefer file-based shared context over thread-local assumptions.
- Read `.agent-context/PROJECT_CONTEXT.md` and `.agent-context/HANDOFF.md` before substantial work.
- Update `.agent-context/HANDOFF.md` before ending substantial work or when project state changes materially.
- Store only durable references here. Do not store raw secrets, passwords, access tokens, one-time approvals, hidden UI state, long logs, or temporary debug noise.
- Healthy follows Service-first architecture: entrypoints, routes, MCP handlers, and UI components must delegate business decisions to small domain services/providers.
