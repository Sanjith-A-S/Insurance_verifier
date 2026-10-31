# ClaimLens AI — Assumptions Log

This document records architectural, dependency, and contract assumptions made during backend development.

1. `jsonwebtoken` and `bcryptjs` added as dependencies for Phase 5 token generation and password verification.
2. `pino-http` added as dependency for structured request logging and redacting sensitive data.
3. In absence of pre-existing `packages/shared`, we generate shared types, zod schemas, mock seed data, and fixtures in `packages/shared/` to satisfy contract tests and monorepo contract standards.
4. Default MongoDB database name used is `claimlens` unless overridden by connection string URI.
5. In role projections for claimants, `reviewStatus` defaults to `"pending"` and `provenance.statuses` includes only safe public statuses (`["metadata_present"]` or `["capture_workflow_recorded"]`).
6. HEIC uploads are accepted and original bytes preserved, with derivatives omitted when sharp HEIC decode is unavailable on Windows.

