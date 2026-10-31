# ClaimLens AI — Monorepo

ClaimLens AI is a human-in-the-loop motor-insurance claims investigation platform. It provides two purpose-built React applications and a high-performance Express backend, aligned against a unified TypeScript/Zod API contract.

---

## Architecture Overview

```
├── apps/
│   ├── claimant/          # Mobile-first claimant submission & tracking portal (port 5173)
│   └── verifier/          # Desktop-first verifier workbench & investigation tool (port 5174)
├── packages/
│   └── shared/            # Shared types, Zod schemas, mock transport, tokens & UI components
├── backend/               # Production Express API, Gemini multimodal pipeline, Mongo storage (port 4000)
│   └── devconsole/        # Internal verification test console (served at /devconsole)
└── docs/                  # Architectural specs, frontend handoff, integration checklist & decisions
```

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Applications

#### Development Mode (with Typed Mock Transport)
By default, both apps boot with `VITE_USE_MOCKS=true`, enabling an offline in-memory mock engine with persistent localStorage and IndexedDB blob storage:
```bash
# Run Claimant Portal (http://localhost:5173)
npm run dev:claimant

# Run Verifier Workbench (http://localhost:5174)
npm run dev:verifier

# Run Both in Parallel
npm run dev
```

#### Production Mode (with Real Backend API)
To switch to the live backend server at `http://localhost:4000/api/v1`, update `.env.local` in `apps/claimant` and `apps/verifier`:
```env
VITE_USE_MOCKS=false
VITE_API_BASE_URL=http://localhost:4000/api/v1
```
No frontend code changes are needed.

To start the backend server:
```bash
cd backend
npm run dev
```

---

## Demo Users

The platform supports seamless instant identity switching via the top navigation bar:

| Role | Name | User ID |
|---|---|---|
| **Claimant** | Aarav Kumar | `usr_aarav` |
| **Claimant** | Rohan Das | `usr_rohan` |
| **Claimant** | Priya Raman | `usr_priya` |
| **Claimant** | Karthik S | `usr_karthik` |
| **Verifier** | Meera Iyer | `usr_meera` |
| **Verifier** | Vikram Shah | `usr_vikram` |

---

## Test Scenarios Seeded

The seed includes 11 comprehensive motor claim scenarios:
- **CL-2041 (Consistent)**: Clear incident declaration matching workshop estimate. Settlement calculated at **₹47,600** (₹48,600 estimate minus ₹1,000 deductible).
- **CL-2042 (Inconsistent)**: Discrepancy between photo EXIF date (2 Oct) and declared date (14 Oct); arithmetic variance of ₹2,900 on workshop estimate; duplicate photo candidate. Settlement withheld.
- **CL-2043 (Incomplete)**: Missing policy certificate, registration card (RC), and estimate. Active evidence requests issued. Settlement withheld.
- **CL-2044 (Ambiguous)**: Incident declared around midnight (15/16 Oct); policy schedule expired at 23:59 hrs on 15 Oct. Settlement withheld.
- **CL-2045 to CL-2050**: Varied claims spanning new, in-review, decision-pending, and completed states.
- **CL-2051**: Draft claim for Aarav Kumar demonstrating draft saving and submission gating.

---

## Verification & Tests

```bash
# Run backend vitest suite (18 files, 88 tests)
npm --prefix backend test

# Build claimant app
npm run build:claimant

# Build verifier app
npm run build:verifier

# Build entire monorepo
npm run build
```

