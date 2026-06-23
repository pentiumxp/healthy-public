# Apple Health Export Import Runbook

## Purpose

`scripts/import-owner-apple-health-export.js` is an operator-only helper for
importing an already cleaned Apple Health export into an explicitly selected
Healthy workspace database. It is not an MCP path, not a Gateway path, and not
the normal iOS HealthKit sync path.

## Safety Contract

- The helper requires explicit `--db`, `--source`, and `--workspace`.
- It has no default Owner workspace, no default production database path, and no
  default private Apple Health export path.
- It defaults to dry-run. Writes require both `--execute` and
  `--confirm-write`.
- Normal JSON summary output reports only whether inputs were provided, the
  target workspace id, dry-run status, and bounded counts. It must not print raw
  database paths, source paths, secrets, launch tokens, raw health records, or
  long logs.

## Dry-Run

```bash
node scripts/import-owner-apple-health-export.js \
  --db <healthy-sqlite-path> \
  --source <cleaned-apple-health-export-dir> \
  --workspace health:<hermes-workspace-id> \
  --skip-ecg-waveforms \
  --skip-route-points
```

## Confirmed Write

Run only after reviewing the dry-run summary and selecting the intended
workspace:

```bash
node scripts/import-owner-apple-health-export.js \
  --db <healthy-sqlite-path> \
  --source <cleaned-apple-health-export-dir> \
  --workspace health:<hermes-workspace-id> \
  --execute \
  --confirm-write
```

## Validation

Use bounded counts and targeted readback through the Healthy service or MCP
wrapper. Do not dump raw Apple Health rows, ECG waveform payloads, private file
paths, medication details, symptom narratives, access keys, cookies, or launch
tokens into terminal transcripts, docs, handoffs, or task cards.
