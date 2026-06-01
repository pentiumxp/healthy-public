# Delivery Checklist

Run this checklist before every handoff, commit, deployment, or pull request.

## Workspace

```powershell
git status -sb --untracked-files=all
git diff --check
codegraph status
```

Confirm:

- No unrelated user changes are overwritten.
- `.agent-context/` remains local-only.
- `.codegraph/` remains local-only.
- Runtime data, databases, uploads, and logs are not staged.

## Code Validation

Run the focused checks for touched modules from `docs/TEST_MATRIX.md`.

When stack-specific commands exist, also run:

- Syntax checks.
- Focused service tests.
- Repository tests.
- MCP contract tests.
- Architecture boundary tests.
- Privacy scan.

## Harness

Classify the change using `docs/HARNESS_RULES.md`.

- H1 requires workflow/service/API/MCP/repository harness.
- H2 requires projection/UI/route contract harness.
- H3 requires focused tests or syntax checks.

Do not mark H1/H2 work complete on manual inspection alone.

## Documentation

Update the smallest durable doc in the same change:

- Requirements change -> `docs/PROJECT_REQUIREMENTS.md` or `docs/PRODUCT_REQUIREMENTS.md`
- Architecture boundary -> `docs/ARCHITECTURE.md` or `docs/ARCHITECTURE_BOUNDARY.md`
- Implementation phase -> `docs/IMPLEMENTATION_PLAN.md`
- Test/harness rule -> `docs/TEST_MATRIX.md` or `docs/HARNESS_RULES.md`
- Module behavior -> `docs/MODULES/<module>.md`
- Current status -> `.agent-context/HANDOFF.md`

## Privacy

Before delivery, confirm no staged or logged content includes:

- Raw health report images.
- Full report text or full OCR output.
- Real identifiers.
- Access tokens, cookies, API keys, passwords.
- Private attachment contents.
- Long raw logs.
- Absolute local paths to private uploads.

## GitHub

Do not push unless the user explicitly asks. If pushing is requested, confirm the branch, remote, and staged scope first.

