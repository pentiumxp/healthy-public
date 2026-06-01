# Project Requirements

## Current Goal

Healthy is a personal health data application for structured storage, statistics, and MCP-accessible analysis through Hermes Mobile. The first stage is not a medical diagnosis product. It is a data system that records facts, preserves provenance, shows trends, and exposes controlled tools for Hermes Mobile.

## Users And Roles

- Owner/operator: configures the Healthy deployment, storage, MCP exposure, and privacy rules.
- Health user: owns a Healthy profile and health records linked from Hermes Mobile.
- Hermes Mobile: calls Healthy MCP tools to create users, write records, query trends, and request analysis summaries.
- Future reviewer role: confirms imported OCR/image candidates before they become trusted facts.

## Core Scenarios

- Hermes Mobile enables the health plugin for a user, and Healthy creates or reuses that user's profile.
- A user records strength training sessions with exercises, sets, weight, reps, and RPE.
- A user records cardio sessions with activity type, duration, distance, heart rate, and zones.
- A user uploads or imports body measurement and InBody-like reports.
- OCR/image/model extraction creates pending structured candidates, not confirmed facts.
- The UI shows trend/statistics projections from service-generated data.
- MCP tools let Hermes Mobile query summaries and write health data through explicit user context.

## Non-Goals

- No medical diagnosis.
- No automatic medication change advice.
- No full nutrition food database in the first stage.
- No sleep device integration in the first stage.
- No complete lab-report OCR pipeline in the first stage.
- No business-code implementation during initialization.

## Data Boundary

Structured first-stage data:

- User profile.
- Current medications.
- Strength sessions and sets.
- Cardio sessions and zone splits.
- Body measurements.
- Body composition reports.
- Source files and extraction candidates.
- Analysis run metadata and bounded result summaries.

Deferred data:

- Detailed nutrition logs.
- Sleep and recovery devices.
- Lab results.
- Symptom diary.
- Medical-risk scoring.

## Privacy Boundary

Do not write these into docs, handoff, tests, logs, Git history, or example fixtures:

- Real health report images.
- Full report text or full OCR output.
- Identity documents.
- Real name, phone number, address, or ID number.
- Access tokens, cookies, API keys, database credentials.
- Private attachment contents.
- Absolute local paths to private uploads.

Allowed in docs and tests:

- Structural field names.
- Synthetic examples.
- Bounded non-sensitive summaries.
- Validation command names.
- Non-secret configuration variable names.

## Success Standards

Initialization is complete when:

- Durable context exists locally and does not contain secrets.
- Docs have clear requirements, architecture, implementation plan, harness rules, test matrix, and delivery checklist.
- Git status is understood.
- CodeGraph is initialized or confirmed available.
- No business code is written before implementation scope is approved.
- First implementation slice and required harness are explicit.

## Related Docs

- `docs/PRODUCT_REQUIREMENTS.md` keeps durable product rules.
- `docs/DATABASE.md` defines schema direction.
- `docs/HARNESS_RULES.md` defines H1/H2/H3 validation policy.

