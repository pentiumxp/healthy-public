# Harness Rules

## Purpose

Harness rules decide when a change needs workflow/service/API validation beyond ordinary unit tests. Healthy handles sensitive health data, so persistence, user isolation, MCP access, imports, deletion, and export require explicit harness coverage.

## H1: Required Workflow/Service/API Harness

H1 applies when a change touches:

- Permissions or user/workspace isolation.
- Persistent health records.
- User data import, parsing, confirmation, deletion, or export.
- Async tasks, background sync, scheduled jobs, or retries.
- External systems, plugins, MCP tools, model/OCR calls, or file storage.
- Notification or report generation flows.
- Health-critical source data or analysis rules.

Healthy H1 flows:

- Health data import and parsing.
- User authorization and workspace isolation.
- Report generation and storage.
- Important raw health source preservation.
- Plugin/MCP read and write access to health data.
- Scheduled sync and background jobs.
- Data deletion and export.
- Profile provisioning from Hermes Mobile.
- Source-file hash deduplication and candidate confirmation.
- Confirmed-fact protection from low-confidence extraction.

Completion requirement:

- A workflow, service, API, MCP, or repository harness exists and passes.
- The harness covers success, invalid input, missing user context, duplicate/retry behavior, and privacy-safe errors.

## H2: Projection/UI Harness

H2 applies when a change touches:

- UI projection.
- Navigation.
- Visible status.
- Cross-page consistency.
- Chart payloads.
- Pending/confirmed/rejected display states.

Completion requirement:

- Projection or UI harness verifies the visible state.
- Empty, partial, and pending data states are covered.
- UI does not expose raw private health content or secret paths.

## H3: Focused Tests

H3 applies to:

- Pure style changes.
- Copy changes.
- Small deterministic helper functions.
- Documentation-only changes.

Completion requirement:

- Focused tests or syntax checks where applicable.
- `git diff --check`.

## Classification Rule

If a change touches multiple classes, use the highest class. A change that writes or deletes health data is H1 even if the code diff is small.

## Privacy Rule

Harness fixtures must use synthetic data. They must not include real reports, full OCR output, private file paths, tokens, cookies, personal identifiers, or full health attachments.

