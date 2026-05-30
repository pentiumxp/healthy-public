# Project Context

Workspace: `C:\Users\xuxin\Documents\healthy`

Project label: Health app

GitHub repository: `https://github.com/pentiumxp/healthy`

Status:
- Workspace context was initialized manually because the expected initializer script was not present at `C:\Users\xuxin\Documents\Agent\scripts\powershell\initialize-workspace-context.ps1`.
- Git repository initialized on branch `main`.
- CodeGraph initialized under `.codegraph/`; local database files are ignored by `.codegraph/.gitignore`.
- GitHub private repository created at `https://github.com/pentiumxp/healthy` and configured as `origin`.
- No application source files were present at initialization time.

Operating rules:
- Prefer file-based shared context over thread-local assumptions.
- Read `.agent-context/PROJECT_CONTEXT.md` and `.agent-context/HANDOFF.md` before substantial work.
- Update `.agent-context/HANDOFF.md` before ending substantial work or when project state changes materially.
- Store only durable references here. Do not store raw secrets, passwords, access tokens, one-time approvals, hidden UI state, long logs, or temporary debug noise.
