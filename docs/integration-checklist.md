# ClaimLens AI — Integration Checklist

This document details the end-to-end integration and conformance status across all layers of the ClaimLens AI platform.

---

## 1. Environment & Network Configuration

- [x] **Root Monorepo**: Configured with npm workspaces (`apps/*`, `packages/*`).
- [x] **Claimant Portal**: Runs on port `5173`. Responsive at 360px, 390px, 768px, 1024px.
- [x] **Verifier Workbench**: Runs on port `5174`. Desktop-first layout, fully usable on tablet and phone.
- [x] **Backend API**: Runs on port `4000`, base path `/api/v1`.
- [x] **DevConsole**: Live at `http://localhost:4000/devconsole` with camera capture integration.
- [x] **Zero-Diff Mock Transport**: Both apps support seamless switching between `VITE_USE_MOCKS=true` (offline in-memory mock with localStorage + IDB) and `VITE_USE_MOCKS=false` (real Express/Mongo API).

---

## 2. Security & Guardrails Compliance

- [x] **No Forbidden Words**: Zero instances of forbidden accusatory or deterministic terminology in frontend UI:
  - Banned words avoided: *fraud*, *forgery*, *fake*, *tampered*, *suspicious*, *authentic* (as image classification), *AI-approved*, *risk score*.
- [x] **Fact Type Categorization**: Consistent `FactTypeTag` badges displayed across all screens:
  - `Observed in file`
  - `Claimant says`
  - `Document shows`
  - `Calculated`
  - `AI inference`
  - `Unknown`
- [x] **Private Notes Isolation**:
  - `PrivateNote` type and API methods exist exclusively within the Verifier application.
  - The Claimant application has zero references or imports for private notes.
  - Backend returns 403 / 404 for any claimant attempt to read or write private notes.
- [x] **Settlement Computation Integrity**:
  - Zero financial math or arithmetic calculation performed client-side.
  - All figures and formula evaluations are received directly from backend calculations or stored settlement fixtures.
- [x] **Source Attributions**:
  - Every finding links directly to primary evidence sources (`evidenceId`, page, region quote).
  - Findings without direct evidence are labeled as *Low Evidence Hypotheses* with dashed borders.

---

## 3. End-to-End Acceptance Flows

### Flow A: Claimant Filing & Submission
1. [x] **Browse Claims**: Claimant views list of personal claims with `ScallopProgress` completion meters.
2. [x] **Action Required Alerts**: Claims in `awaiting_claimant` status surface prominently in the "Needs You" banner.
3. [x] **4-Step Creation Wizard**: Step 1 Incident -> Step 2 Vehicle & Driver -> Step 3 Narrative & Policy -> Step 4 Confirmation.
4. [x] **Draft Saving**: New claims save as `draft`.
5. [x] **Evidence Checklist**: Categorized accordion list for mandatory damage photos, policy schedules, RC copies, and repair estimates.
6. [x] **In-App Camera Capture**: Live viewfinder stream via `getUserMedia`, shutter animation, shot strip, and immediate upload as `captured_in_app`.
7. [x] **Submission Gate**: Requires ≥1 photograph and ≥1 document before enabling final submission.

### Flow B: Verifier Workbench & Investigation
1. [x] **Executive Dashboard**: KPI tiles, lazy-loaded Recharts intake chart, completeness distribution, and immediate next-up queue.
2. [x] **Claim Queue**: Filterable by status and priority, with instant client-side search and Ctrl+K command palette.
3. [x] **Case Overview**: Incident declaration, vehicle specs, policy terms, and activity timeline.
4. [x] **Evidence Locker**: Interactive file grid, review status toggles (`Mark Reviewed`, `Needs Replacement`), and Source Drawer preview with SHA-256 hash validation.
5. [x] **Multimodal Investigation Analysis**:
   - Cross-Check Matrix view with color-coded agreement cells.
   - Categorized Findings view with AI inference explanations, alternatives, and uncertainty ratings.
   - Re-run analysis action generating append-only analysis versions.
6. [x] **Policy & Settlement Assessment**:
   - Detailed policy clause interpretations.
   - Computed settlement display with itemized lines breakdown (estimate total, IDV sublimits, compulsory deductible).
   - Unresolved blockers display for withheld settlements.
   - Manual override workflow with mandatory rationale recording.
7. [x] **Human Decision Recording**:
   - Structured recommendation recording (`recommend_approve`, `recommend_partial`, `recommend_reject`, `more_information_required`, `closed`).
   - Audit trail of previous investigator decisions.

### Flow C: Collaboration & Inquiries
1. [x] **Information Requests**: Verifier drafts formal evidence request -> Claimant receives alert and focus view -> Claimant submits attached files or unavailable justification -> Verifier marks resolved.
2. [x] **Bidirectional Messaging**: Real-time communication thread between claimant and assigned investigator.
3. [x] **Internal Private Notes**: Verifier-only note thread styled distinctly in warning amber.

---

## 4. Verification Suite Results

- **Backend Integration Tests**: 18 test suites, 88 tests passing (`npm --prefix backend test`).
- **Claimant Production Build**: 0 errors, 109 modules bundled (`npm run build:claimant`).
- **Verifier Production Build**: 0 errors, 733 modules bundled, Recharts cleanly code-split into `DashboardChart-*.js` (`npm run build:verifier`).
- **Monorepo Build**: 0 errors across all workspaces (`npm run build`).

