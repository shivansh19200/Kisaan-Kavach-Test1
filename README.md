# Kisaan Kavach

**Safe payments for rural micro-exports.** A platform where buyer money moves only after quality is verified.

## Overview

Kisaan Kavach connects small rural producers (spices, organic tea, Ayurvedic herbs) with overseas buyers. The buyer reserves payment on PayPal. When a lab certificate passes automatic quality checks, the seller gets a first payment (30% default) to cover costs. The final payment follows delivery confirmation. AI reads documents, drafts contracts, and explains status in the farmer's language — but it never decides a payout.

**PayPal Sandbox is the heart of this hackathon.** The app uses real PayPal sandbox whenever keys are present in `.env`.

## Features

- **Two-stage PayPal payments**: Authorization → 30% capture (Stage 1) → 70% capture (Stage 2)
- **Lab report verification**: Signed JWS (Path 1) or AI-extracted unsigned PDF with buyer approval (Path 2)
- **Quality disputes**: Buyer reports problems → AI evidence summary → Reviewer decides refund or pay seller
- **Three languages**: English, Hindi (हिन्दी), Marathi (मराठी) — seller UI fully localized
- **Explain Simply (magic wand)**: Every status card and AI text has a wand button that re-explains in simple words with audio
- **Demo mode**: Pre-seeded orders for every state, one-click demo logins

## Tech Stack

- Next.js 16.4.5 (App Router, Turbopack)
- Tailwind CSS v4 + shadcn/ui
- SQLite via better-sqlite3 (WAL mode)
- PayPal Orders v2 / Payments v2 APIs
- JOSE for JWS verification (EdDSA)
- unpdf for PDF text extraction
- jsQR for QR code decoding
- Zod for schema validation
- Vitest for testing
- Python 3 for the voice generation and language catalog checks

## Quick Start

### Prerequisites

- Node.js 22.12+
- PayPal Sandbox accounts (Business + Personal)
- LLM API key (OpenAI-compatible endpoint)

### Installation

```bash
git clone <repo>
cd kisaan-kavach
npm ci
python scripts/check-locales.py
cp .env.example .env
# Edit .env with your keys
npm run dev
```

Open http://localhost:3000

### Demo Logins

| Role | Email | Password |
|------|-------|----------|
| Buyer | buyer@globalimports.com | demo1234 |
| Seller (Hindi) | seller.hindi@kisaankavach.demo | demo1234 |
| Seller (Marathi) | seller.marathi@kisaankavach.demo | demo1234 |
| Reviewer | arbiter@kisaankavach.org | demo1234 |

### Reset Demo Data

```bash
curl -X POST http://localhost:3000/api/demo/reset
```

Or click "Reset" on the dashboard (visible in DEMO_MODE).

## Environment Variables

See `.env.example` for all variables. Key ones:

- `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_API_BASE` — **Required for real PayPal sandbox**
- `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL` — LLM endpoint (e.g., Google Gemini, OpenAI)
- `SESSION_SECRET` — 32+ char random string
- `DEMO_MODE=true` — Enables demo logins and seeded data
- `CAPTURE_MODE=TWO_STAGE` — or `SINGLE` if preflight shows two-stage fails
- `LAB_REGISTRY_PUBLIC_KEYS` — JSON object mapping `kid` to Ed25519 public key (PEM format)

## Real vs Simulated

| Area | Status | How to describe |
|------|--------|-----------------|
| PayPal authorize, capture, void, refund | **Real (sandbox)** | Shows in PayPal sandbox dashboard |
| Seller payout | Sandbox + demo ledger | No real bank deposit |
| Lab signatures | Mock registry | Demo keys via `scripts/make-samples.ts` |
| Shipping paper | Simulated | Seller uploads, buyer confirms |
| AI extraction, drafting, dispute summary | Real (live API) | Recorded outputs if no key |
| Reauthorization & expiry | Mocked | Tested with simulated time |
| Independent lab & reviewer | Mock registry + demo role | Demo reviewer resolves disputes |
| Hindi/Marathi texts | Machine-drafted | Native review pending |
| Farmer voice | Prerecorded (edge-tts) | Web Speech fallback labeled |

## Audio Generation

```bash
pip install edge-tts
python scripts/gen-audio.py
```

Generates MP3s in `public/audio/<lang>/<mode>/` for all status messages.

The language catalog check is also available as `npm run check:locales` when Python is on your PATH.

## Preflight Tests (PayPal)

```bash
npx tsx --env-file=.env scripts/preflight.ts
```

Runs 8 tests against real sandbox. Requires manual buyer approval on PayPal approval page. Results written to `PREFLIGHT.md`.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # Server routes (PayPal, AI, Lab, Auth)
│   ├── buyer/             # Buyer screens
│   ├── seller/            # Seller screens (hi/mr/en)
│   ├── arbiter/           # Reviewer screens
│   └── dashboard/         # Role-based landing
├── components/ui/         # Design system components
├── lib/
│   ├── i18n/             # Translation catalogs (en/hi/mr)
│   ├── db/               # SQLite schema, repo, seed
│   ├── auth/             # Signed cookie sessions
│   ├── paypal.ts         # ONLY file reading PAYPAL_* env
│   ├── verifier.ts       # JWS verify, quality check, injection detection
│   ├── ai.ts             # LLM calls (extraction, drafting, simplify)
│   ├── state.ts          # Order state machine
│   └── audit.ts          # Append-only audit log
└── scripts/              # make-samples.ts, preflight.ts, gen-audio.py
```

## Security

- PayPal credentials only in `src/lib/paypal.ts` (enforced by ESLint `no-restricted-imports`)
- AI modules (`src/lib/ai`, `src/lib/verifier`) cannot import paypal.ts
- HMAC-signed cookie sessions, HTTP-only SameSite=Lax
- Origin check on mutating routes
- Scoped DB queries (buyer_id / seller_id)
- File upload validation (magic bytes, size limits, no SVG)
- Money stored as integer minor units (cents/paise)

## License

MIT License — see `LICENSE` file.

## Deployment

### Render (Free Tier)

1. Connect repo to Render
2. Add environment variables from `.env.example`
3. Deploy — `render.yaml` handles build/start commands

**Note:** Free Render services spin down after 15 min idle. Data resets on restart. Use the Reset button and keep-alive pings during judging.

## Acknowledgments

- PayPal Sandbox for payment infrastructure
- Google Gemini / OpenAI-compatible LLMs for AI features
- edge-tts for Hindi/Marathi voice generation
- Census of India 2011 for language statistics
- Spices Board & Export Inspection Council for sampling concepts
