# ClaimLens Frontend — Decisions Log

All design and implementation decisions made during the build are recorded here.

---

## D-001 Monorepo workspace packages

**Decision**: npm workspaces with `apps/*` and `packages/*`. The shared package is consumed as TypeScript source via Vite aliases (no separate build step needed in dev).

**Reason**: Fastest DX for a hackathon; both apps share the same `node_modules`.

---

## D-002 Mock transport strategy

**Decision**: `MockTransport` is a class implementing the same `Transport` interface as `HttpTransport`. Selected at startup via `VITE_USE_MOCKS=true`. No code in components or hooks knows which transport is active.

**Reason**: Zero-diff integration — set the env var and point at the real API.

---

## D-003 Auth stub

**Decision**: No login page in this phase. The identity is set via `DemoIdentityMenu` when `VITE_USE_MOCKS=true`. `HttpTransport` sends `X-Demo-User-Id` header from `localStorage`. The `/login` route redirects to app root.

**Reason**: Spec §2 explicitly reserves login for the final merge.

---

## D-004 Private notes isolation

**Decision**: The `PrivateNote` type and all related API calls (`listPrivateNotes`, `addPrivateNote`) are defined exclusively in the verifier app's local types and the verifier-side mock handlers. They are not exported from `packages/shared` at all.

**Reason**: Spec §1 guardrail 8 and §4 note "MUST NOT exist in the claimant app's imports."

---

## D-005 Settlement computation

**Decision**: All settlement amounts come from the backend (or mock) envelope. No arithmetic is performed in any React component or utility. The `Settlement` type is displayed as-is.

**Reason**: Spec §1 guardrail 6 and §4 Settlement type.

---

## D-006 Recharts lazy loading

**Decision**: `recharts` is lazy-imported with `React.lazy` inside the dashboard route chunk. The rest of the app never imports it.

**Reason**: Spec §9 "Recharts only in the dashboard chunk."

---

## D-007 "Claims over time" render guard

**Decision**: The chart card is entirely omitted (not rendered as a placeholder) when there are fewer than 8 claims across fewer than 3 distinct dates.

**Reason**: Spec §6.3 V1 explicit instruction.

---

## D-008 Claimant-facing status labels

**Decision**: Status labels shown to claimants differ from verifier labels per the spec constants map. A `audience` prop on `StatusBadge` selects the correct label set.

**Reason**: Spec §3.3.

---

## D-009 Synthetic demo assets

**Decision**: `scripts/generate-demo-assets.mjs` generates SVG "photos" and PDF documents. The PDFs contain real text matching the seed data so source references (page/quote) are truthful.

**Reason**: Spec §7 demo asset requirements.

---

## D-010 Capture session uploads labeled correctly

**Decision**: Files uploaded via the `<video>` capture flow are sent with `source:'captured_in_app'` and a `captureSessionId`. Direct file-picker uploads are sent with `source:'uploaded_file'`. These are never mixed up in the UI labels.

**Reason**: Spec §5 C5 note "Never label a direct upload as captured."

---

## D-011 Breakpoint naming

**Decision**: Tailwind `screens` keys are `medium:600px`, `expanded:840px`, `large:1200px`, `xlarge:1600px` matching M3 window classes exactly. The `useBreakpoint` hook returns the string literal.

**Reason**: Spec §3.8.

---

## D-012 Shared components location

**Decision**: All shared UI components (`Button`, `StatusBadge`, etc.) live in `packages/shared/src/ui/`. Both apps import them via the `@claimlens/shared` alias. Verifier-only components (`FindingCard`, `ConsistencyMatrix`, `SourceDrawer`, `RequestCard`) live in `apps/verifier/src/components/`.

**Reason**: Clean separation; claimant app cannot accidentally import verifier-only views.

---

## D-013 IndexedDB blob storage

**Decision**: `idb-keyval` stores uploaded file blobs keyed by `evidenceId`. The mock transport stores metadata in `localStorage` and blobs in IndexedDB. "Reset demo data" clears both.

**Reason**: Spec §7 mock store requirement; avoids localStorage 5 MB cap for images.

---

## D-014 Image capture fallback

**Decision**: If `navigator.mediaDevices?.getUserMedia` is unavailable or permission is denied, C5 shows an `ErrorState` with a "Choose a file instead" button that treats the upload as `uploaded_file`. The capture route is only linked from checklist items in photo categories.

**Reason**: Spec §5 C5 fallback spec.

---

## D-015 nextStep object rendering

**Decision**: `ClaimSummary.nextStep` is always an object `{kind, label, description}`. Any component that previously rendered it as a raw value now reads `.label` or `.description` explicitly. This matches the backend's actual response shape.

**Reason**: CL-2041 blank-screen bug fix identified during DevConsole debugging.

