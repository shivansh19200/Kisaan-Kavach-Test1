# Kisaan Kavach - Guidelines

## Critical Rules
- Token & time: Few, big turns. Write multiple files per turn. Never narrate.
- Never read specs whole: Grep headings (`grep -n "^## \|^### " docs/X.md`), then read section slices with line offsets.
- Never re-read files just written. Never list node_modules, .next, data/.
- Limit command output (`| tail -25`, `--silent`, `--reporter=dot`). Source files under 300 lines.
- One check per phase end: `npm run check`. Max 3 fix attempts per error before logging in BLOCKERS in `PROGRESS.md`.
- Git rules: Repo-local `Shivansh Sharma <shivroru@gmail.com>`. `TZ=Asia/Kolkata git commit`. Commit short, lowercase plain English (3-9 words, e.g., `add login page and demo roles`). No AI traces or trailers.
- Money: Always integer minor units (paise/cents). Never floats.
- PayPal: `src/lib/paypal.ts` ONLY reads `PAYPAL_*` env. Real PayPal sandbox if keys exist in `.env`, mock only when absent or in vitest.
- AI isolation: `src/lib/ai/` and `src/lib/verifier/` MUST NEVER import `paypal.ts`. ESLint enforced.
- UI & i18n: All text via `t('key')`. Copy strings/colors/layouts from UI_SPEC exactly. No banned words (BLUEPRINT s8).
- Secrets: Never print/log `.env`. Add `.env` to `.gitignore`. Run scripts with `tsx --env-file=.env`.

## Section Map
- BLUEPRINT.md: s2 arch · s3 AI-1..5 · s4 PayPal · s5 state machine · s6 disputes · s7 verifier/JWS/sec · s8 labels/banned words · s9 langs · s10 real vs sim · s11 stack/schema · s12 build order · s13 checklist · s14 video · s15 hardening · s16 preflight
- UI_SPEC.md: s1 palette/fonts · s2 labels · s3 roles · s4 lang plan · s5 wand & catalog · s6 screens 0-4 · s7 handoff

## Phase List (details in PROGRESS.md)
- P1: Foundation + design system + i18n
- P2: Money core + REAL PayPal + verifier
- P3: Buyer + Seller screens
- P4: Void, refund, disputes, reviewer
- P4b: Real PayPal proof run
- P5: AI features
- P6: Audio, hardening, docs, deploy
