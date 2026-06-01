# Implementation Plan

## Current Stage

The project is in initialization and architecture planning. No application framework or runtime stack has been selected. Do not write business code until the first implementation slice is approved.

## Phase 0: Project Groundwork

Deliverables:

- Local `.agent-context` files for durable context.
- `docs/` documentation system.
- Git repository on `main`.
- CodeGraph initialized or synced.
- Ignore rules for local context, CodeGraph state, runtime data, databases, uploads, and logs.

Validation:

```powershell
git status -sb --untracked-files=all
codegraph status
git diff --check
```

Rollback:

- Revert documentation commits if a doc structure decision changes.
- Do not delete local context files unless explicitly requested.

## Phase 1: Core Data Foundation

Recommended scope:

- User/profile service.
- Medication service.
- Source file service.
- Strength training service.
- Body measurement/body composition service.
- Database migrations for the above.
- Architecture boundary test skeleton.

Module ownership:

```text
src/services/users/
src/services/training/
src/services/body/
src/services/imports/
src/repositories/
tests/services/
tests/repositories/
tests/architecture/
```

Required harness:

- H1 user/profile provisioning harness.
- H1 health data write harness.
- H1 source import and confirmation harness.

## Phase 2: MCP Contract

Deliverables:

- MCP server entrypoint.
- MCP tool registry.
- User context resolver.
- Tools for profile, medications, strength, body measurements, source imports, and summaries.

Required harness:

- MCP contract tests for missing user context.
- Privacy tests for tool errors.
- Service-first architecture tests proving handlers delegate to services.

## Phase 3: Statistics UI

Deliverables:

- Read-only statistics UI.
- Profile overview.
- Strength trend view.
- Body trend view.
- Source review queue.

Required harness:

- H2 projection/UI tests.
- Empty-state and pending-vs-confirmed display tests.

## Phase 4: Extended Data Domains

Deferred until the core flow is stable:

- Cardio expansion beyond basic sessions.
- Nutrition daily summary.
- Sleep/recovery.
- Lab results.
- Report generation.
- Background sync.

## Data Migration Strategy

- Use explicit migrations once a database technology is selected.
- Never mutate real health data without a backup/export path.
- Imported data should keep source references and confirmation status.
- Analysis outputs are recomputable and should not be treated as source facts.

## Current Non-Work

Do not implement:

- UI before the service/repository contracts exist.
- OCR/model extraction without source-file and confirmation services.
- Medical diagnosis or medication recommendations.
- Long-running sync jobs before harness and retry policy exist.
- Real private health fixtures.

