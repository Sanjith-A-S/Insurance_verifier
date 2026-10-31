# ClaimLens AI — Backend Specification v2 (aligned to the frontend handoff)

Supersedes v1. Built from the Product PRD, Backend PRD and the frontend developer's `BACKEND_HANDOFF` note (31 Oct 2026).

## 0. Order of authority (read this first)

1. **Frontend contract** — `packages/shared/src/types.ts`, `schemas.ts`, and the behaviour of `packages/shared/src/mock/handlers/*`. Wins on every field name, enum value, response shape and UI-visible behaviour.
2. **`docs/FRONTEND_HANDOFF.md`** — the frontend developer's note (endpoints, rules, seed data). Wins over everything below when it is explicit.
3. **This spec** — architecture, data model, AI pipeline, rules, security, tests, and every decision the contract is silent on.
4. The two PRDs.

If `packages/shared` is not in the workspace yet, build from the handoff note (§9 short shapes) and this spec, record every guessed shape in `docs/ASSUMPTIONS.md`, and run the conformance pass (Phase 4) as soon as the folder arrives. Enum values written below in plain words are **defaults**; `types.ts` overrides them.

Companion: `docs/API_IMPLEMENTATION_MAP.md` (endpoint-by-endpoint behaviour, side effects, errors).

---

## 1. Locked decisions

| Area | Decision |
|---|---|
| Runtime | Node 20+, JavaScript ES modules, Express 4 with an `asyncHandler` wrapper |
| DB | MongoDB via **Mongoose 8** only |
| Validation | **Zod** for requests, model output, config |
| Uploads | `multer` memory storage → server hashes the original bytes → writes to `UPLOAD_DIR` with generated key |
| File checks | `file-type` magic bytes + extension + MIME must agree. Allowed: JPG, PNG, WEBP, HEIC, PDF; max 15 MB |
| Metadata | `exifr` (EXIF incl. HEIC), `sharp` (dimensions, thumbnails, 64-bit dHash), `pdf-lib` (page count) |
| AI | `@google/genai`, `generateContent`, JSON mime type + `responseSchema`, then Zod validation |
| Model | `GEMINI_MODEL` default `gemini-3-flash-preview`, `GEMINI_FALLBACK_MODEL` default `gemini-3.1-flash-lite` (Gemini 2.5 was scheduled for shutdown on 16 Oct 2026). **Verify both in AI Studio before the sprint**; they are env vars so a wrong name is a one-line fix |
| Money | Integer minor units internally; API emits **rupee numbers** (`number`, 2 dp max) with `currency:'INR'` where the contract has a currency field |
| Auth | Demo header `X-Demo-User-Id` now; `Authorization: Bearer <JWT>` at final merge (bcrypt passwords). No cookies |
| Tests | `vitest` + `supertest` + `mongodb-memory-server` |
| Logging | `pino`, `pino-http`, `helmet`, `cors`, `express-rate-limit` |

HEIC caveat: sharp's prebuilt binaries usually cannot decode HEIC. Accept and store HEIC, read EXIF with `exifr`, skip dimensions/dHash/thumbnail (omit `urls.thumbnail`), and send the original bytes to Gemini (it accepts `image/heic`). Never fail an upload because a derivative couldn't be made.

No other dependencies without a one-line reason in `docs/ASSUMPTIONS.md`.

---

## 2. Repository layout (monorepo owned by the frontend developer; backend is added)

```
<repo root>
  apps/claimant/  apps/verifier/  packages/shared/      # frontend — DO NOT EDIT
  backend/
    src/
      app.js  server.js  routes.index.js
      config/env.js        db/connect.js
      middleware/          # requestId, identity, requireRole, validate, errorHandler, rateLimiters, upload
      lib/                 # errors.js ids.js money.js normalize.js pagination.js timeline.js access.js nextStep.js logRing.js
      models/              # §6
      modules/
        demo/ me/ claims/ checklist/ evidence/ analysis/ settlement/
        requests/ messages/ notes/ decisions/ recommendations/ dashboard/ timeline/ auth/
        # each: routes.js, controller.js (thin), service.js (logic+authz), schemas.js (zod), serializers.js (per role)
      ai/                  # gemini.client.js providers/{live,mock}.js prompts/ schemas/ pipeline.js safety.js
      rules/               # deterministic.js checklist.rules.js matrix.js settlement.js
    seed/                  # loader.js, fallback-generator.js
    scripts/smoke.mjs      # end-to-end lifecycle script over HTTP
    tests/                 # unit/ integration/ contract/
    uploads/               # gitignored
    .env.example  README.md
  docs/                    # FRONTEND_HANDOFF.md, BACKEND_SPEC.md, API_IMPLEMENTATION_MAP.md, ASSUMPTIONS.md, CHANGES.md, VERIFICATION.md
```
Layering: routes → controller → service → models. Controllers never touch models. Every service function takes `actor` first and enforces authorization (§4). `app.js` exports the app without listening.

---

## 3. Configuration (`.env.example`, placeholders only)

`PORT=4000`, `MONGODB_URI`, `CLIENT_ORIGINS=http://localhost:5173,http://localhost:5174`, `UPLOAD_DIR=./uploads`, `MAX_UPLOAD_MB=15`, `MAX_FILES_PER_CLAIM=40`, `GEMINI_API_KEY=replace-me`, `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL`, `GEMINI_TIMEOUT_MS=60000`, `AI_CONCURRENCY=3`, `AI_MODE=auto` (`live` | `mock` | `auto` = live with fixture fallback for seeded claims), `DEMO_MODE=true`, `JWT_SECRET`, `SESSION_TTL_HOURS=12`, `RATE_LIMIT_GLOBAL_MAX=300`, `RATE_LIMIT_ANALYZE_MAX=6`, `RATE_LIMIT_UPLOAD_MAX=60`.
`config/env.js` validates with Zod and fails fast. Refuse to boot if `NODE_ENV=production` and `DEMO_MODE=true`.
CORS: allow-list from `CLIENT_ORIGINS`, `credentials: true`, allowed headers exactly `Authorization, X-Demo-User-Id, Content-Type` (+ `Idempotency-Key`, `X-Request-Id`), expose `X-Request-Id`. Never `*`.
Base path **`/api/v1`**. Health at `/api/v1/health`.

---

## 4. Identity and authorization

Two roles only: `claimant`, `verifier`. (No admin role; demo utilities are DEMO_MODE-only routes, §13.)

`resolveIdentity`:
- `DEMO_MODE=true`: header `X-Demo-User-Id` must be the id of a seeded user, else 401. Role always comes from the DB, never from the client.
- Final merge: `Authorization: Bearer <JWT>`; when `DEMO_MODE=false` the demo header is ignored.

Seeded users: claimants **Aarav Kumar, Rohan Das, Priya Raman, Karthik S**; verifiers **Meera Iyer, Vikram Shah**. Reuse the user ids in `packages/shared/src/mock/seed/` when present, otherwise `usr_aarav`, `usr_rohan`, `usr_priya`, `usr_karthik`, `usr_meera`, `usr_vikram`. `GET /api/v1/demo/users` returns `[{id,name,role}]` (DEMO_MODE only, no identity required).

Access rules (**404 when inaccessible**, never 403, so existence isn't leaked; 403 only for a wrong *role* on a role-specific route):
| Role | Claims | Everything under a claim |
|---|---|---|
| claimant | `claimantId === actor.id` (drafts included) | own claim's data, role-projected (§8) |
| verifier | non-draft claims where `assigneeId === actor.id` **or** unassigned | full, except they cannot see claims assigned to another verifier |

A verifier's first write action on an unassigned claim auto-assigns it to them and moves `new → in_review` (see §7.1). Helpers in `lib/access.js`: `loadClaimForActor`, `assertRole`, `assertWritable` (completed claims are read-only: writes → 409 CONFLICT). No controller returns a raw document.

---

## 5. Ids, envelope, errors

**Ids:** claims `CL-####` (string `_id`, counter continues after seed, i.e. new claims start at CL-2052); evidence `EV-<claimNumber>-<nn>` (per-claim counter on the claim); every other collection uses ObjectId, exposed as 24-hex `id`. Malformed or unknown ids → 404.
**Success:** `{ok:true, data, meta?}` with `meta {page,pageSize,total}` on lists only. **Error:** `{ok:false, error:{code,message,fields?[{field,message}]}}`; `fields` uses the same dotted paths as the request body (map Zod issues to these).

| Code | HTTP | Use |
|---|---|---|
| VALIDATION_ERROR | 400 | bad input (also failed submit preconditions) |
| UNAUTHENTICATED | 401 | |
| FORBIDDEN | 403 | wrong role for a role-specific route |
| NOT_FOUND | 404 | missing or inaccessible |
| CONFLICT | 409 | duplicate/stale/invalid transition/completed claim/analysis already running |
| UPLOAD_REJECTED | 422 | bad type, size, signature mismatch, file cap, invalid capture session |
| ANALYSIS_UNAVAILABLE | 503 | Gemini failed (**claim data stays intact**) |
| INTERNAL | 500 | generic message only |
| RATE_LIMITED | 429 | **additive** (not in the handoff); includes `Retry-After` |

Request id on every response (`X-Request-Id`). The handoff uses 422 for uploads, so the earlier 413/415 plan is dropped; oversize multer errors map to `UPLOAD_REJECTED`.

---

## 6. Data model (Mongoose)

All collections have timestamps. Field shapes that mirror a frontend type use `types.ts` names exactly.

- **users** — `name, email (unique), passwordHash?, role, phone?, notificationPrefs{}, status`.
- **counters** — `claimNumber` sequence.
- **claims** — `_id 'CL-####'`, `claimantId`, `assigneeId?`, `status`, `priority`, `stage` (derived), `incident{date,time?,timeUncertain,location,type,thirdPartyInvolved,policeReportFiled,visibleDamageAreas[]}`, `vehicle{registrationNumber,make,model,year,vin?}`, `driver{isPolicyholder,name?,relationship?,licenceNumber?}`, `narrative`, `policy{policyNumber,insurer?}`, `submittedAt?`, `evidenceSeq`, `latestAnalysisVersion?`, `idempotencyKey?`, `checklist[]` (embedded items, §9). Indexes: `{claimantId,updatedAt}`, `{status,updatedAt}`, `{assigneeId,status}`, unique sparse `{claimantId,idempotencyKey}`.
- **capture_sessions** — `claimId, createdBy, expiresAt (+2h)`.
- **evidence_files** — `_id 'EV-…'`, `claimId, checklistItemId?, category, fileName, mimeType, sizeBytes, sha256, pageCount?, source: captured_in_app|uploaded_file, captureSessionId?, receivedAt, uploadedBy{id,name,role}, processingStatus, reviewStatus, reviewNote?, requestId?, replacesEvidenceId?, replacedByEvidenceId?, storageKey, width?, height?, perceptualHash?, provenance{statuses[], duplicateOfIds[], similarToIds[], metadata{present,dateTaken?,cameraMake?,cameraModel?,gpsPresent?}}, fixtureKey?`. Store only a **GPS boolean**, never coordinates. Indexes `{claimId,receivedAt}`, `{claimId,sha256}`.
- **extracted_facts** — `claimId, analysisVersion, evidenceId|null, factType (§11.3), label, value, normalizedValue (server-computed), sources[SourceRef], originType: claimant_assertion|document_extraction|image_observation|deterministic|human_verified, confidence, extractionRunId, promptVersion`. Per-evidence extraction is cached by `(evidenceId, sha256, promptVersion)` and referenced by later versions.
- **analyses** (append-only) — `claimId, version (unique per claim), analysisId, state: running|ready|unavailable, model{name,promptVersion}, aiStatus: ok|degraded|unavailable|mock, createdAt, createdBy, evidenceSnapshot[{evidenceId,sha256}], stages[{name,status,error?}], summary, extractedFacts[], regions{[evidenceId]:Region[]}, matrix{columns,rows}, findings[], missingEvidence[], policy{clauses[],coverage[]}, settlement (snapshot), warnings[]`. Findings carry internal-only `blocksSettlement`/`ruleId`, never serialized to clients unless in `types.ts`.
- **finding_reviews** — `claimId, analysisVersion, findingId, status: useful|dismissed|clarification_requested, reason?, by, at` (dispositions live outside the immutable analysis and are merged at read time).
- **matrix_annotations** — `claimId, analysisVersion, rowId, text, by, at`.
- **settlement_calculations** (append) — `claimId, analysisVersion, status: calculated|withheld, currency, lines[], formula, assumptions[], unresolved[], resultAmount?, calculatedAt, calculatedBy`.
- **settlement_overrides** (append) — `claimId, amount, rationale, by, at`. Never edits a calculation.
- **evidence_requests** — `_id, claimId, title, reason, examples[], checklistItemId?, findingId?, status: draft|sent|response_submitted|resolved|not_applicable, dueDate?, createdBy, createdAt, sentAt?, resolvedAt?, notApplicableReason?, responses[{id,by,at,message?,evidenceIds[],unavailable?,reason?}], history[{status,by,at}]`.
- **claim_messages** — `claimId, sender{id,name,role}, body, attachmentEvidenceIds[], kind: message|request_notice, requestId?, readBy[userId]`. **Only claim-facing content lives here.**
- **private_notes** — `claimId, author{id,name}, body`. Separate collection; one route; verifier only.
- **timeline_events** — append-only: `claimId, kind, summary, actor{id,name,role}, visibility: claimant|verifier (default; types.ts overrides), metadata, at`. Written only via `lib/timeline.js#logEvent`.
- **decisions** (append-only) — `claimId, decision, rationale, recommendedAmount?, actor, at`.
- **recommendations** — `claimId, label:'general_education', catalogueStatus:'no_verified_catalogue', offeredToClaimant, requestedByClaimant, content{…}, assumptions[] (verifier only), createdBy, model`.

---

## 7. State machines

### 7.1 Claim status
`draft → new → in_review ⇄ awaiting_claimant ; in_review ⇄ decision_pending → completed`.

| Event | Result |
|---|---|
| `POST /claims` | `draft` |
| `POST /claims/:id/submit` (claimant; needs ≥1 photo **and** ≥1 document, else 400 with a field message) | `draft → new`, `submittedAt` set; already submitted → 200 unchanged (idempotent); timeline event |
| first verifier write on a `new` claim (assign, status, request, analysis, note, decision…) | `new → in_review`, self-assign if unassigned |
| request **sent** | `→ awaiting_claimant` |
| last open request (`sent` or `response_submitted`) **resolved / marked not applicable** | `awaiting_claimant → in_review` |
| `PATCH /claims/:id/status` (verifier) | allowed targets: `in_review`, `decision_pending` (and `new → in_review`); `awaiting_claimant` and `completed` only via side effects; anything else 409 |
| decision `recommend_approve/partial/reject` | `→ decision_pending` |
| decision `more_information_required` | stays/returns `in_review` (does not auto-send a request) |
| decision `pending` | no status change |
| decision `closed` | `→ completed` (terminal, writes → 409) |

Every change writes a timeline event with actor and time. Claimant-visible neutral wording only (e.g. "Your claim is now being reviewed").

### 7.2 Evidence request
`draft → sent → response_submitted → resolved`; `draft|sent|response_submitted → not_applicable` (reason). Claimants see only `sent`, `response_submitted`, `resolved`. Sending creates a `request_notice` message + claimant-visible timeline event and sets the linked checklist item to `requested`. A claimant response sets `response_submitted` (file(s) → item `received`; `unavailable` → item `unavailable`).

### 7.3 Checklist item status
`not_started, uploaded, processing, received, reviewed, needs_replacement, requested, unavailable, not_applicable`. Upload with `checklistItemId` → `uploaded`; local processing done → `received`; verifier review → `reviewed`/`needs_replacement`; claimant may set only `unavailable` (with reason). Always store `statusChangedBy`, `statusChangedAt`.

---

## 8. Role projections (what claimants may never receive)

Claimants receive: their claims, checklist, their own evidence metadata/files, claim-facing messages, requests with status ≠ draft, claimant-visible timeline, `nextStep`, and recommendation content only when `offeredToClaimant` or `requestedByClaimant`.
Claimants **never** receive: analysis, findings, matrix, policy interpretation, settlement, decisions, private notes, finding reviews, `assumptions`, evidence `reviewNote`, `duplicateOfIds`, `similarToIds`, verifier-only timeline events or metadata, other claims' existence.
Where a frontend field is *required* in the shared zod schema but forbidden for claimants (e.g. `reviewStatus`, `provenance`), return a **neutral safe value** (e.g. `reviewStatus` = the schema's default/"pending" value, `provenance.statuses` limited to `capture_workflow_recorded`/`metadata_present`, empty duplicate/similar arrays). Pick the minimum that passes the claimant app's schema and record it in `docs/ASSUMPTIONS.md`. Use per-role serializers + a test that deep-scans every claimant response for forbidden keys and for the text of any seeded private note.

`nextStep{kind,label,description}` (every ClaimSummary, per role, `lib/nextStep.js`, pure + unit tests; `kind` values per `types.ts`). Defaults: claimant — draft: "Finish and submit your claim"; new/in_review: "We're reviewing your claim"; awaiting_claimant with open `sent` request: "Provide the requested evidence"; needs_replacement item: "Replace a file"; decision_pending: "Final checks in progress"; completed: "Claim closed". Verifier — new: "Start review"; in_review with no analysis: "Run analysis"; analysis ready with open findings: "Review findings"; awaiting_claimant: "Waiting for claimant"; decision_pending: "Record decision"; completed: "Closed". `stage` is derived the same way (use the `types.ts` vocabulary).

---

## 9. Checklist generation (`rules/checklist.rules.js`, pure, unit-tested)

Built at claim creation, rebuilt on draft PATCH (preserving status/evidence links by item key), stable item ids (`<key>`, e.g. `policy_schedule`, `photo_front`). Items: `id, category (policy|vehicle_identity|driver|incident|photos_video|repair_loss|other), label, requirement, status, reason, acceptableExamples[], acceptedMimeTypes[], maxSizeMB, statusChangedBy, statusChangedAt, evidenceIds[]`.
- Policy schedule: required. RC/vehicle identity: required (MVP). Driving licence: required for the MVP (conditionally required if you prefer; either satisfies the handoff).
- Police report: `conditionally_required` if `policeReportFiled='yes'` or type theft, else `not_applicable`/`optional`.
- Photos: Front, Rear, Left, Right, Close-up of damage, Scene — views named in `visibleDamageAreas` plus Close-up are `required`; the rest `optional`.
- Repair estimate: `conditionally_required` (required unless already repaired); invoice only if already repaired. Third-party details: conditional on `thirdPartyInvolved`.
- Every item has a plain-language reason. `checklistProgress{done,applicable}` on summaries: applicable = items whose requirement ≠ `not_applicable` and status ≠ `not_applicable`; done = status ∈ uploaded/processing/received/reviewed/unavailable (match the mock handler if it differs). `missingEvidenceCount` = applicable required items not done.

---

## 10. Uploads and provenance

`POST /claims/:id/evidence` multipart: `file` (required), `source`, `captureSessionId` (required and valid for **this claim, unexpired** when `captured_in_app`), `checklistItemId`, `requestId`, `replacesEvidenceId`.
Flow: authorize → cap check → validate (extension, MIME, magic bytes agree; ≤ 15 MB; else 422) → SHA-256 on original bytes → write `claims/<claimId>/<uuid>.<ext>` (resolve under `UPLOAD_DIR`, traversal-safe) → create record (`processingStatus` starts at the "processing" value) → respond **201 `{ok,data:EvidenceFile}`** → local processing finishes asynchronously (≈ms): EXIF, dimensions, dHash, PDF page count, provenance statuses, `processingStatus` → done value, linked checklist item `uploaded → received`. Gemini extraction does **not** run on upload; it runs during analysis.
`category`: from the linked checklist item; else images → `photos_video`, other → `other`.
`replacesEvidenceId`: keep the old file, set `replacedByEvidenceId` on it and `replacesEvidenceId` on the new one; checklist item points to the new file.
Provenance statuses: `capture_workflow_recorded` (valid session), `metadata_present` (EXIF found), `duplicate_candidate` (identical SHA-256 **within the claim**; fills `duplicateOfIds`), `visually_similar_candidate` (dHash Hamming ≤ 6 within the claim; `similarToIds`; cut first if short on time), `provenance_unresolved` (neither workflow nor metadata). **No field, enum or label says authentic / fake / fraud**; hash duplicates and similarity are review signals.
`/file` serves original bytes only after authorization: `Content-Type` from DB, `X-Content-Type-Options: nosniff`, `Cache-Control: private, no-store`, sanitized `Content-Disposition`. `/thumbnail` (images that sharp can read): ≤ 400 px JPEG, small in-memory cache; otherwise 404. Never inline bytes in JSON; verifier file reads write an internal timeline event (`evidence_viewed`, verifier visibility).
`POST …/evidence/:id/review` (verifier): `reviewed|needs_replacement` + optional note → updates `reviewStatus` and the checklist item; `needs_replacement` also writes a claimant-visible timeline event (no note text).

---

## 11. AI and rules pipeline

`POST /claims/:id/analysis` (verifier) → **202 `{analysisId, status}`** immediately; the run continues in-process, updating `stages[]`; clients poll `GET /analysis/status`. One running analysis per claim (409). On boot, runs left `running` become `unavailable`. Each run creates `version = last + 1` and never touches earlier versions.

### 11.1 Stages
1. `claim_form_facts` — deterministic claimant-assertion facts from the claim form (date/time, location, registration, VIN, driver, narrative points, damage areas).
2. `extraction` — per evidence file (concurrency `AI_CONCURRENCY`), cached; Gemini with file bytes + category prompt + `responseSchema` → facts, each with page, locator, optional box. Server computes `normalizedValue`.
3. `policy_assembly` — deterministic: build `policy{clauses[],coverage[]}` and internal policy fields (period, limit/sum insured, deductible) from policy facts, with `unknowns[]`.
4. `rules` — deterministic checks (§11.5).
5. `comparison` — one text-only Gemini call over facts + rule findings (avoid duplicates) → AI findings, coverage observations, missing-evidence suggestions.
6. `validation` — §11.6.
7. `matrix` — deterministic evidence matrix (§11.7).
8. `missing_evidence` — merge checklist-derived gaps with validated AI suggestions into `missingEvidence[]` (each with reason and `suggestedRequestTitle`).
9. `settlement` — compute via `rules/settlement.js` (§12) and snapshot into the analysis.
10. `finalize` — summary, set `claim.latestAnalysisVersion`, mark `state: ready`, checklist items for analysed files `received`, timeline event (verifier visibility).

### 11.2 Output shapes
`Analysis` = `{version, createdAt, model{name,promptVersion}, summary, extractedFacts[], regions{[evidenceId]:Region[]}, matrix{columns,rows}, findings[], missingEvidence[], policy{clauses[],coverage[]}, settlement}` — **exactly as `types.ts`** (finding dispositions and matrix annotations merged in at read time). `GET /analysis` with no `?version` returns the latest **ready** version.
`Finding` = `{id, type, title, category, priority, status, observed[], claimantAssertions[], documentFacts[], calculations[], aiInference?, alternatives[], uncertainty, nextAction, sources[], lowEvidence}`; ids `F-<version>-<nn>`. Map rule outputs: arithmetic → `calculation_check`; unsupported → `type:'low_evidence_hypothesis'` + `lowEvidence:true`; others by nature using the `types.ts` enum. Keep the separation: `observed` (image observations), `claimantAssertions`, `documentFacts`, `calculations` (deterministic), `aiInference` (model only), `alternatives`, `uncertainty`. No fraud probability or score anywhere.
`SourceRef = {evidenceId, page?, regionId?, field?, quote?}`; `quote` ≤ 25 words and must appear (case-insensitive) in a stored fact value/locator for that evidence, otherwise drop the quote and keep the ref. Region boxes normalised 0–1 `{x,y,w,h}`: ask Gemini for `box_2d [ymin,xmin,ymax,xmax]` on a 0–1000 scale, convert, discard invalid; best effort, `regions` may be empty for live runs.

### 11.3 Fact vocabulary (fixed; unknown types dropped with a warning)
`policy_number, insured_name, insurer_name, policy_period_start, policy_period_end, sum_insured, coverage_item, exclusion, deductible, limit, add_on, clause, unresolved_reference, vehicle_registration, vin, make_model, licence_valid_to, incident_date, incident_time, incident_location, document_date, police_report_number, estimate_garage, estimate_line_item, estimate_total, invoice_total, damage_observation, image_view, visible_plate_text, scene_observation, claimant_narrative_point, other`. `unresolved_reference` = a clause that points to a document/annexure that wasn't supplied. Mask licence/policy numbers to last 4 before storing. Prompts forbid extracting unrelated personal data.

### 11.4 Prompt rules (versioned, e.g. `extraction@1`)
Report only what is visible/written with page + locator; for photos describe damage area, severity, visible plate text, view type; **never state or imply when, where or by whom damage occurred**; no commentary on authenticity or editing; unknown → omit.

### 11.5 Deterministic rules (pure functions, no Gemini)
| Rule | Check | Output |
|---|---|---|
| R01 | policy period contains incident date/time; `incident.timeUncertain` with incident within the same calendar day as period start/end → "boundary unresolved" | inconsistency / missing_information; **blocks settlement** |
| R02 | registration equal across claim form, policy, RC, estimate, invoice, visible plate (normalised) | potential inconsistency + alternatives (typo, OCR, plate replaced, other vehicle on policy); blocks |
| R03 | VIN equality (edit distance 1–2 → "possible transcription difference") | blocks |
| R04 | Σ estimate lines = stated total (±₹1) | `calculation_check`; blocks |
| R05 | estimate/invoice/police-report dates earlier than incident; incident in future | inconsistency; blocks (estimate date) |
| R06 | EXIF `dateTaken` earlier than incident by > 1 day | informational with alternatives (camera clock, older photo, re-saved file); does not block |
| R07 | identical SHA-256 in the claim | informational "identical file bytes" — never "reuse"; no block |
| R08 | dHash similarity ≤ 6 | informational |
| R09 | required claim-form fields missing | missing_information |
| R10 | deductible / limit / policy period not found in policy facts | missing_information; blocks |
| R11 | estimate total exceeds extracted limit/sum insured | informational |
| R12 | required checklist photo views missing | missing_information |
| R13 | `unresolved_reference` fact exists (e.g. annexure not supplied) | missing_information with `suggestedRequestTitle`; blocks |

Rule findings carry `calculations[]` with the numbers used and an internal `blocksSettlement`.

### 11.6 Validation (`ai/safety.js`) on every AI finding
1. Zod `.strict()`; unknown keys rejected.
2. Ref check: `evidenceId` belongs to the claim; invalid refs removed; a finding left with no valid ref → `lowEvidence:true`, `type:'low_evidence_hypothesis'`, priority capped at the lowest non-informational value.
3. Language screen (case-insensitive): `fraud, fraudulent, fake, forged, fabricated, doctored, tampered, scam, lying, liar, authentic, proves that`. One constrained retry naming the offending phrases; if still present drop the finding and add a warning.
4. AI-only findings cannot be the highest priority unless sources span ≥ 2 distinct evidence files.
5. Every finding has `alternatives` (≥1 for inconsistencies), `uncertainty`, `nextAction`.

### 11.7 Matrix (`rules/matrix.js`, deterministic)
Columns = sources present (claim form, policy, RC, photos, estimate, police report…). Rows = attributes: incident date/time, location, registration, VIN, policy period, deductible/limit, damage areas, estimate total vs line-item sum. Each cell holds value + sources + state (match / mismatch / missing / unclear) per the `types.ts` cell shape. Annotations (`POST /matrix/annotations`) are stored separately and merged into the row by `rowId`. Row ids must be stable across versions.

### 11.8 Gemini client and failure behaviour
Timeout `GEMINI_TIMEOUT_MS`; 2 retries on 429/5xx/timeout with backoff + jitter; last attempt on the fallback model; malformed JSON → **one** constrained retry; then fail the call. Never log prompts or document text; log durations and token counts.
- Some files fail → analysis `ready` with a `missing_information` finding naming the unanalysed file(s); retry by re-running (cache skips successes).
- **All** AI calls fail → run `state: unavailable`; `GET /analysis/status` → `{state:'unavailable', version?: last good}`; `GET /analysis` with no good version → 503 `ANALYSIS_UNAVAILABLE`; claim/evidence untouched. ClaimSummary `analysisState` reflects it.
- `AI_MODE=mock`, or `auto` after failure on a claim that has a stored seed analysis: create a **new version** copied from the seed analysis (`model.name = 'seed-fixture'`, `aiStatus: mock`), never mutating the original.
- Missing policy: analysis still runs; settlement withheld with the policy unresolved.
- New evidence after a version: the claim notes "analysis out of date" internally; a new run is a new version. Additive fields (e.g. `stale`) only if the shared zod schemas aren't `.strict()`.

---

## 12. Settlement (`rules/settlement.js`, pure, table-tested; deterministic, never an LLM)

`POST /settlement/recalculate` (no body) recomputes from non-superseded facts + current finding dispositions and returns `Settlement`:
`{status: 'calculated'|'withheld', currency:'INR', lines[{label,value,kind,source?,note?}], formula, assumptions[], unresolved[{id,message,suggestedRequestTitle?}], resultAmount?, overrides[], calculatedAt}`.

**Withheld** (no `resultAmount`, `unresolved[]` filled) when **any** blocker is open: no policy / policy period, limit or deductible unknown; incident outside or boundary-ambiguous against the policy period; no itemised estimate; any `blocksSettlement` finding (R01–R05, R10, R13) whose disposition is not `dismissed` (a verifier dismissal with a reason clears *that finding's* block; a `clarification_requested` keeps it open); own-damage coverage not found/unclear among extracted coverage for the incident type.
**Calculated** otherwise:
```
eligible = Σ itemised estimate lines           (all lines treated as eligible; no depreciation modelled)
capped   = min(eligible, limit or sum insured)
result   = max(0, capped − deductible)
```
Lines list every input with `source` (evidence/fact) and a `kind` from `types.ts`; `formula` is the literal text; `assumptions[]` include "All itemised estimate lines treated as eligible" and "Illustrative demo formula; not an insurer settlement formula; not a payment authorisation". Limit and deductible come from facts only — never from a request.
`POST /settlement/override {amount, rationale}` (verifier; rationale ≥ 10 chars) appends a `settlement_overrides` record shown in `overrides[]`; it **never** changes `resultAmount`. Each recalculation appends a `settlement_calculations` row and a verifier-visible timeline event. Old analysis versions keep their snapshot; the latest version shows the latest calculation.
Seed check: CL-2041 must compute **₹48,600 − ₹1,000 = ₹47,600**.

---

## 13. Collaboration modules and dashboard

- **Messages:** claim-facing only. `POST {body, attachmentEvidenceIds[]}` (ids must belong to the claim); response resolves attachments per the `Message` type. `POST /messages/read` marks the caller's unread messages read (per-user `readBy`); `unreadMessageCount` is per caller (messages by the other party not yet read). No pagination required (cap 500).
- **Private notes:** separate collection; `GET/POST /private-notes` verifier only (claimant → 403 on the route, and nothing anywhere else ever includes them). A note writes a verifier-visibility timeline event without the body.
- **Requests:** create draft or sent (`send` semantics per §7.2); `PATCH {action:'send'|'update'|'resolve'|'mark_not_applicable', …}`; claimant `POST …/responses {message?, evidenceIds[]}` or marks unavailable with a reason. Evidence ids must be this claim's. Evidence uploaded with `requestId` is auto-linked.
- **Timeline:** `GET /timeline` — claimants get `visibility:'claimant'` events only with sanitized metadata.
- **Decisions:** append-only; `rationale` required unless `decision='pending'`; `recommendedAmount` optional number ≥ 0. Claimants never see decisions; `closed` and `more_information_required` also write a **neutral claimant-visible timeline event** (no outcome detail). Anything more must be a verifier message.
- **Recommendation:** separate module; imports only its own model, the timeline logger and read access to policy facts; must not change claim status, findings, decisions or settlement (test with before/after snapshots). Gemini returns a constrained schema (cover options limited to `zero_depreciation, engine_protection, roadside_assistance, consumables_cover, other_general`); the server injects `label:'general_education'`, `catalogueStatus:'no_verified_catalogue'`, no prices/discounts/product names, and the fixed notice *"Cover bought in future cannot retroactively cover this incident and does not affect how the current claim is handled."* Verifier `POST /recommendation {offerToClaimant}` generates; claimant `POST /recommendation-requests` triggers generation with `requestedByClaimant=true` (visible to that claimant afterwards); verifiers also get `assumptions[]`. If the mock handler disagrees on this flow, follow the mock handler. Gemini failure → 503 `ANALYSIS_UNAVAILABLE`.
- **Assign:** `POST /assign {assigneeId|'me'}` — target must be a verifier.
- **Dashboard** `GET /investigator/dashboard` (verifier): over the verifier's authorized non-draft claims — `totals {total,new,in_review,awaiting_claimant,decision_pending,completed}`, `overTime [{date,count}]` by claim created date, `completenessBands {complete, partial, mostlyMissing}` from checklist progress (100% / 50–99% / <50%), `awaitingEvidenceCount` (claims with an open `sent` request), `recentActivity` (last 10 verifier-visible timeline events), `nextUp` (oldest 5 `new` claims as ClaimSummary). **Everything computed from persisted records**; no accuracy, fraud, time-saved or processing-time metrics.
- **`/me`:** GET profile; PATCH `phone`, `notificationPrefs` only.

---

## 14. Security checklist
Server-side role + claim checks on every route (files, thumbnails, attachments, analysis, recommendations included) · Zod on every body/query/param · never trust role, claimId, userId, amounts, limits or deductibles from the client · helmet + exact CORS allow-list · upload validation per §10, generated storage names · files never in a public static dir · logs redact `authorization`, prompts, document text · rate limits on global, analysis/recommendation (per actor) and upload · Gemini key only in backend env · bcrypt for passwords at merge · `DEMO_MODE` routes (`/demo/*`) absent when false.
Demo utilities (DEMO_MODE only): `GET /demo/users`, `POST /demo/reset` (wipe + reseed), `GET /demo/diagnostics` (counts, AI mode, DB state, recent redacted logs).

---

## 15. Tests (vitest + supertest + mongodb-memory-server)

1. **Unit:** checklist rules, `nextStep`, normalizers, money, rules R01–R13 (pass/fail each), matrix builder, settlement table (CL-2041 = 47,600; cap case; deductible > eligible → 0; each blocker → withheld with no `resultAmount`; dismissed finding clears only its block).
2. **Authorization:** claimant A vs B (404), verifier assigned elsewhere (404), claimant on verifier-only routes (403), no identity (401), unknown demo id (401), role never taken from client.
3. **No-leak test:** seed a private note with a unique string; deep-scan every claimant-reachable response (claim, summary lists, timeline, messages, requests, checklist, evidence, recommendation) for that string and for forbidden keys (§8).
4. **Uploads:** 422 for wrong type / signature mismatch / oversize / file cap / invalid or foreign capture session; stored `sha256` equals an independent hash; duplicate bytes → `duplicate_candidate`; replacement chain; `/file` 404 for non-members; thumbnail for PNG.
5. **Workflow:** submit idempotent and needs photo + document; request send → awaiting_claimant → claimant response → resolve → in_review; completed claim writes → 409; status transition table; decisions append-only with rationale rules.
6. **AI (stub provider):** valid output stored with refs; malformed JSON → one retry then failure; invalid refs → low-evidence; banned-language finding dropped; quote > 25 words / not found → quote dropped; Gemini timeout → `unavailable`, claim intact, `GET /analysis` 503; concurrent run → 409; versions never overwritten; mock fallback creates a new version.
7. **Dashboard:** totals equal seed (10: 2/3/2/1/2), drafts excluded, nextUp = oldest 5 `new`.
8. **Contract tests:** `tests/contract/` imports `packages/shared/src/schemas.ts` (skip with a clear message if absent) and parses **every** endpoint's success and error envelope for both roles against the shared zod schemas.
9. **429:** analysis limiter with `RATE_LIMIT_ANALYZE_MAX=1`.

`scripts/smoke.mjs` walks the full lifecycle over HTTP against a running server (create → upload → submit → analysis → request → respond → resolve → message → note → decision) and prints pass/fail per step.

---

## 16. Seed data (must match the frontend mock seed)

`npm run seed` and `POST /demo/reset`: the six users + **10 submitted claims + 1 draft**, reusing IDs, statuses, assignees, timelines, evidence records, messages and requests from `packages/shared/src/mock/seed/` and demo files from `apps/*/public/demo/` (copy bytes into `UPLOAD_DIR`; compute SHA-256 from the actual bytes; keep the seed's provenance metadata for seeded evidence so the UI matches the mock). If that folder is absent, generate fallbacks from the table below with `fallback-generator.js` (sharp-rendered placeholder images watermarked "SYNTHETIC DEMO IMAGE", minimal PDFs).
Dashboard totals: **10 total — 2 new, 3 in review, 2 awaiting claimant, 1 decision pending, 2 completed.**

| Claim | Scenario | Must demonstrate |
|---|---|---|
| CL-2041 | Consistent | No conflicts; settlement **calculated ₹47,600** (₹48,600 estimate − ₹1,000 deductible) |
| CL-2042 | Inconsistent | Photo metadata date 2 Oct vs incident 14 Oct; estimate dated 11 Oct; estimate total ₹65,200 vs items sum ₹62,300; one duplicate file. Potential inconsistencies only; settlement withheld |
| CL-2043 | Incomplete | Policy, RC, estimate missing; missing-evidence requests; withheld |
| CL-2044 | Ambiguous | Policy ended 15 Oct 11:59 pm; incident "around midnight" (`timeUncertain`); consumables clause references an annexure not supplied; withheld |
| CL-2045–2050 | Filler | Valid minimal records covering the remaining statuses |
| CL-2051 | Draft | Aarav Kumar's unfinished claim |

Pre-store analyses for CL-2041, CL-2042, CL-2044 (from the seed JSON) so the demo works if Gemini fails; also produce one for CL-2043 at seed time with `AI_MODE=mock` rules-only so all four scenarios work offline. Seeded claims must pass the shared schemas and the dashboard test.

---

## 17. Build plan (4-hour sprint; backend feature-complete ≈ T+2:45)

| Window | Phase | Agents |
|---|---|---|
| 0:00–0:15 | 0 Scaffold (config, `/api/v1`, envelope, errors, CORS, identity, `/demo/users`, health, pre-mounted routers) | 1 |
| 0:15–0:45 | 1 Foundation (models, ids, access, claims, checklist, `/me`, timeline logger, `nextStep`, dashboard, serializers) | 1 |
| 0:45–1:55 | 2 Streams in parallel: **A** evidence · **B** AI/rules/matrix/settlement/analysis · **C** messages/requests/notes/assign/status/decisions/recommendation/timeline | 3 |
| 1:55–2:25 | 3 Seed + contract tests + smoke script | 2 |
| 2:25–2:45 | 4 Conformance + run both frontends against the backend; fix backend | 1 |
| 2:45+ | 5 Auth (register/login/Bearer), CORS check, final demo rehearsal | 1 |

Cut order (cut from the top first): matrix annotations → regions/bounding boxes → dHash similarity → HEIC thumbnails → recommendation → settlement override → auth endpoints (demo header stays). **Never cut:** authorization and role projection, private-note isolation, hashing, validation, deterministic rules and settlement, seeded analyses + mock provider, envelope/error codes, contract tests.

---

## 18. Changes from v1
Base path `/api/v1`; envelope `{ok,…}`; 422 `UPLOAD_REJECTED` (not 413/415); `X-Demo-User-Id`; Bearer not cookie; no admin role; claim status vocabulary `new/completed`; string ids `CL-####`/`EV-…`; `timeline_events` replaces activity; `private_notes` collection replaces message visibility flag; Settlement uses `withheld`, `lines`, `unresolved`, parameter-less recalculation and an override record; findings/analysis follow the frontend `Analysis` shape; matrix and regions added; seed replaced by CL-2041…2051; dev console removed in favour of the real apps plus `scripts/smoke.mjs`; fact-verify and cross-claim duplicate detection dropped; recommendation fields per handoff.
