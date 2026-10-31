# ClaimLens AI — Backend Service

Human-in-the-loop motor insurance claims investigation backend API. Built with Node 20+, Express 4, MongoDB (Mongoose 8), Zod, and Gemini AI.

---

## Quick Start

### 1. Environment Setup
```bash
cd backend
cp .env.example .env
npm install
```

### 2. Configure Environment (`.env`)
```ini
PORT=4000
NODE_ENV=development
CLIENT_ORIGINS=http://localhost:5173,http://localhost:5174
MONGODB_URI=mongodb+srv://sanjithasad24_db_user:sanjith2006@hacktcs.ovgi4fg.mongodb.net/claimlens?retryWrites=true&w=majority
UPLOAD_DIR=./uploads
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-3-flash-preview
GEMINI_FALLBACK_MODEL=gemini-3.1-flash-lite
AI_MODE=auto
DEMO_MODE=true
```

### 3. Seed Database
Seeds 6 users, 10 submitted claims + 1 draft with real byte fixtures and computed SHA-256 hashes:
```bash
npm run seed
```

### 4. Run Development Server
```bash
npm run dev
```

### 5. Run Test Suite & Smoke Verification
```bash
# Run Vitest unit, integration, and shared schema contract tests
npm test

# Run End-to-end HTTP Smoke Verification
npm run smoke
```

---

## Demo Users (`DEMO_MODE=true`)

Send the demo header `X-Demo-User-Id` on requests:

| User ID | Name | Role | Scenario / Description |
|---|---|---|---|
| `usr_aarav` | Aarav Kumar | `claimant` | Primary claimant (owns CL-2041, CL-2045, CL-2049, CL-2051 draft) |
| `usr_rohan` | Rohan Das | `claimant` | Claimant (owns CL-2042 inconsistent claim, CL-2046, CL-2050) |
| `usr_priya` | Priya Raman | `claimant` | Claimant (owns CL-2043 incomplete claim, CL-2047) |
| `usr_karthik` | Karthik S | `claimant` | Claimant (owns CL-2044 ambiguous boundary claim, CL-2048) |
| `usr_meera` | Meera Iyer | `verifier` | Lead investigator (assigned to CL-2041, CL-2042, CL-2047, CL-2048, CL-2050) |
| `usr_vikram` | Vikram Shah | `verifier` | Senior investigator (assigned to CL-2043, CL-2044, CL-2049) |

`GET /api/v1/demo/users` returns available demo users.

---

## AI Execution Modes (`AI_MODE`)

- `live`: Direct calls to Gemini with fallback model and exponential retry backoff.
- `mock`: Uses realistic in-memory test fixtures without hitting Gemini API.
- `auto`: Default mode. Attempts live Gemini analysis; automatically falls back to seeded fixtures if offline or API key is absent.

---

## Architecture & Guardrails

1. **Non-Negotiable AI Boundaries**: AI assists human investigation only. It never approves, denies, or outputs "fraud scores". Enums and prompts strictly avoid accusatory terms (`fraud`, `fake`, `forged`, `authentic`).
2. **Deterministic Settlement Engine**: Calculations (`max(0, min(eligible, limit) - deductible)`) are 100% deterministic code.
3. **Role-Based Isolation**: Private notes live in a separate collection and return `403 FORBIDDEN` to claimants. Claimants are never served internal findings, calculations, or verifier assumptions.
4. **Original File Integrity**: File bytes are hashed (SHA-256) server-side upon upload and stored untouched on disk.
5. **Contract Conformance**: API responses are validated against `@claimlens/shared` schemas using Zod.
