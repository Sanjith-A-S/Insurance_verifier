# ClaimLens API — Implementation Map

Endpoint-by-endpoint behaviour for the backend. The frontend contract (`packages/shared/src/types.ts`, `schemas.ts`, `mock/handlers/*`, `docs/FRONTEND_HANDOFF.md`) defines request/response **shapes**; `BACKEND_SPEC.md` defines the rules. This file adds side effects, authorization and errors so each endpoint can be built and tested without guessing. All paths are under `/api/v1`. C = claimant, V = verifier. "404" means inaccessible or missing.

Envelope: `{ok:true,data,meta?}` / `{ok:false,error:{code,message,fields?}}`. Lists use `?page&pageSize` and return `meta{page,pageSize,total}`.

## Demo and identity
| Endpoint | Who | Behaviour |
|---|---|---|
| `GET /health` | any | `{status, db, ai:{mode,configured}, uptimeSec}`; no secrets; 503 if DB down |
| `GET /demo/users` | none (DEMO_MODE) | `[{id,name,role}]` for the six seeded users |
| `POST /demo/reset` | none (DEMO_MODE) | wipe + reseed; returns counts |
| `GET /demo/diagnostics` | none (DEMO_MODE) | counts, AI mode, DB state, recent redacted logs |
| `GET /me` | C V | profile of the resolved user |
| `PATCH /me` | C V | only `phone`, `notificationPrefs`; other keys → 400 |
| `POST /auth/register`, `POST /auth/login` | none | Phase 5: claimant registration; login returns `{token,user}`; demo header ignored when `DEMO_MODE=false` |

## Claims
| Endpoint | Who | Behaviour / side effects / errors |
|---|---|---|
| `GET /claims` | C V | Query `page,pageSize,status,search,priority,assignee(me),from,to,sort`. C: own incl. drafts. V: non-draft, assigned-to-me or unassigned. `search` matches claim id, registration, claimant name (V), make/model. Returns `ClaimSummary[]` with role-specific `claimantName`, `unreadMessageCount`, `nextStep`, `analysisState`, `checklistProgress`, `missingEvidenceCount`, `openRequestCount` |
| `POST /claims` | C | Create draft; builds checklist; `Idempotency-Key` optional; 201 `Claim`; validation errors with dotted `fields` (e.g. `incident.date`); incident date not in future |
| `GET /claims/:id` | C V | `Claim` role-projected |
| `PATCH /claims/:id` | C (draft only) | Editable fields only; rebuilds checklist preserving statuses; non-draft → 409 |
| `POST /claims/:id/submit` | C | Needs ≥1 photo and ≥1 document → else 400 with message; `draft→new`; timeline event; **idempotent** (already submitted → 200 unchanged) |
| `GET /claims/:id/checklist` | C V | `ChecklistItem[]` |
| `PATCH /claims/:id/checklist/:itemId` | C V | C: only `{status:'unavailable', reason}` (reason required). V: any valid status. Stores `statusChangedBy/At`; timeline event; unknown item → 404 |
| `POST /claims/:id/assign` | V | `{assigneeId|'me'}`; target must be a verifier; first write moves `new→in_review` |
| `PATCH /claims/:id/status` | V | Targets `in_review`/`decision_pending` only (spec §7.1); else 409; timeline event |

## Evidence
| Endpoint | Who | Behaviour |
|---|---|---|
| `POST /claims/:id/capture-sessions` | C | `{captureSessionId}`, expires in 2 h, bound to the claim |
| `POST /claims/:id/evidence` | C V | Multipart (spec §10). 201 `EvidenceFile`; 422 `UPLOAD_REJECTED` with a human reason; 409 on completed claim; links checklist/request/replacement; processing continues asynchronously; rate limited |
| `GET /claims/:id/evidence` | C V | Metadata only; claimant projection per spec §8 |
| `GET /claims/:id/evidence/:eid` | C V | Metadata detail |
| `GET /claims/:id/evidence/:eid/file` | C V | Original bytes after authz (headers per spec §10); verifier read logs an internal timeline event |
| `GET /claims/:id/evidence/:eid/thumbnail` | C V | ≤400 px JPEG for sharp-readable images, else 404 |
| `POST /claims/:id/evidence/:eid/review` | V | `{status:'reviewed'|'needs_replacement', note?}`; updates `reviewStatus` + checklist item; `needs_replacement` → claimant-visible timeline event without the note |

## Collaboration
| Endpoint | Who | Behaviour |
|---|---|---|
| `GET /claims/:id/timeline` | C V | C: `visibility:'claimant'` only, sanitized metadata |
| `GET /claims/:id/messages` | C V | Claim-facing thread only; attachments resolved to the `Message` shape |
| `POST /claims/:id/messages` | C V | `{body, attachmentEvidenceIds[]}`; body 1–4000 chars; attachments must belong to the claim; timeline event (claimant-visible "message sent") |
| `POST /claims/:id/messages/read` | C V | Marks the caller's unread messages read (per user) |
| `GET /claims/:id/requests`, `/requests/:rid` | C V | C sees only `sent`, `response_submitted`, `resolved` |
| `POST /claims/:id/requests` | V | Create draft or sent; if sent → side effects of `send` |
| `PATCH /claims/:id/requests/:rid` | V | `send` (draft→sent: `request_notice` message, claimant timeline event, claim→`awaiting_claimant`, checklist item→`requested`); `update` (draft/sent only); `resolve` (needs `response_submitted`; last open request → claim `in_review`); `mark_not_applicable` (reason required; same last-open rule) |
| `POST /claims/:id/requests/:rid/responses` | C | `{message?, evidenceIds[]}` or `{unavailable:true, reason}`; only on `sent`/`response_submitted`; ≥1 of message/evidence/unavailable; request→`response_submitted`; item→`received`/`unavailable`; verifier-visible timeline event |
| `GET/POST /claims/:id/private-notes` | V (C → 403) | Separate collection; never in any other response |

## Analysis, findings, matrix, settlement, decisions
| Endpoint | Who | Behaviour |
|---|---|---|
| `POST /claims/:id/analysis` | V | **202** `{analysisId,status}`; 409 if one is running; claim must not be draft; rate limited (per actor) |
| `GET /claims/:id/analysis/status` | V | `{state:'running'|'ready'|'unavailable', version?}` (`version` = latest good); use the `types.ts` value for "none yet" if one exists |
| `GET /claims/:id/analysis/versions` | V | `[{version,createdAt}]` newest first |
| `GET /claims/:id/analysis?version=` | V | Full `Analysis` (latest ready if omitted) with finding dispositions and matrix annotations merged; 404 if none; 503 `ANALYSIS_UNAVAILABLE` if the only run failed |
| `PATCH /claims/:id/findings/:fid` | V | `{status:'useful'|'dismissed'|'clarification_requested', reason?}`; `reason` required for `dismissed`; stored in `finding_reviews`; timeline event (verifier visibility); affects settlement blockers on next recalculation |
| `POST /claims/:id/matrix/annotations` | V | `{rowId, text}`; unknown `rowId` → 400 |
| `POST /claims/:id/settlement/recalculate` | V | Deterministic; returns `Settlement` (spec §12); appends calculation + verifier timeline event |
| `POST /claims/:id/settlement/override` | V | `{amount≥0, rationale≥10 chars}`; appends override record; returns `Settlement` with `overrides[]`; never changes `resultAmount` |
| `GET /claims/:id/decisions` | V | Newest first |
| `POST /claims/:id/decisions` | V | `{decision, rationale, recommendedAmount?}`; rationale required unless `pending`; status effects per spec §7.1; `closed`/`more_information_required` add a neutral claimant-visible timeline event; append-only |

## Recommendation and dashboard
| Endpoint | Who | Behaviour |
|---|---|---|
| `GET /claims/:id/recommendation` | C V | C: only if `offeredToClaimant` or `requestedByClaimant`, else the empty/none state the mock returns; V also gets `assumptions[]` |
| `POST /claims/:id/recommendation-requests` | C | Records the request and generates general-education content (`requestedByClaimant=true`); never changes claim data; rate limited; Gemini failure → 503 |
| `POST /claims/:id/recommendation` | V | `{offerToClaimant:boolean}` generates/regenerates; never changes claim data |
| `GET /investigator/dashboard` | V | `DashboardData` from persisted records only (spec §13) |

## Cross-cutting checks every endpoint must pass
1. Identity resolved server-side; role from DB.
2. Claim loaded through `loadClaimForActor` (404 when inaccessible).
3. Completed claims reject writes (409) — except reads.
4. Request validated by Zod; errors mapped to dotted `fields`.
5. Response built by a role serializer and (in tests) parsed by the shared zod schema.
6. A timeline event is written for every state change, with the correct visibility.
