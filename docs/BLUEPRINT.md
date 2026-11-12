# Kisaan Kavach

**Safe payments for rural micro-exports. Hackathon master blueprint (final, v6).**
Single-service Next.js, PayPal Sandbox, AI that proposes and code that decides. Revised 12 Nov 2026, 15:05 IST. Submission closes 12:00 pm Pacific, about 1:30 am IST on 13 Nov if the date is 12 Nov Pacific (November Pacific offset is UTC-8). Confirm the exact date on the Devpost page.

**Core principle.** AI proposes, deterministic code disposes, and a human approves money in the unsigned-document path and in disputes. The AI side of the codebase can never import PayPal code or credentials; a lint rule and a test enforce this (section 7).

**Plain words rule (new in v6).** Users never see payment or security jargon. Technical terms in sections 4 to 7, 11, 15 and 16 are for developers, code, logs and the audit table only. Everything on screen uses the plain labels in section 8.

## What changed from v5 (this edit)

- **Plain words.** The legal-sounding term for the payment hold is removed from all product text. Section 8 has a label table (English, Hindi, Marathi) mapping every internal term to a plain label. The reviewer role is shown as "Reviewer". A build test bans jargon in user-facing text.
- **Explain Simply (magic wand).** A wand button on every status card and AI text re-explains it in very simple words, with a story, a next step and audio. Pre-written for status cards so it always works; live AI only for free text, with code checks. Section 8.
- **Languages: Hindi and Marathi, plus English.** Chosen from Census figures (section 9). Tamil and Telugu are dropped from this build so two languages can be finished and checked properly. Section 9 lists the safeguards.
- **AI-3 redefined.** From live phrasing in four languages to a pre-written, number-free message catalog with prerecorded audio in two, plus the wand.
- **Demo personas fixed.** v5 had no language-matched sellers. v6 has one Hindi seller and one Marathi seller. The sample commodity changes from Malabar pepper to turmeric (demo numbers), so no Kerala-origin product is sold by a Hindi or Marathi speaker.
- **Audio is number-free.** Amounts and dates appear in an on-screen facts strip written by code, never in recorded audio or translated text.
- **Build order, tests, checklist and video script** updated for the above.
- **What was NOT re-checked.** PayPal behaviour, the Next.js advisory, Render limits and library claims are carried over from v5 (checked 12 Nov 2026) and were not re-verified in this edit. Only the language statistics are newly researched.

## 1. Executive summary

Kisaan Kavach connects small rural producers (spices, organic tea, Ayurvedic herbs) with overseas buyers. The buyer reserves the payment on PayPal. When a lab certificate passes an automatic quality check, the seller gets a first payment (30% by default) to cover costs. The final payment follows delivery. AI reads documents, drafts contracts and explains status in the farmer's language, but it never decides a payout. If the delivered goods do not match, the unused reservation is cancelled and the first payment is returned (section 6). Everything runs as one Next.js service with SQLite, so judges can open it without Docker or a second backend.

**Why buyers will buy from Indian producers.** Demand already exists; the platform removes the risk that keeps buyers away from small producers. It does not create the demand.

- **Origin-specific products.** Darjeeling and Assam tea, Malabar pepper, turmeric, cardamom and herbs such as ashwagandha are tied to where they grow, and customers ask for them by name.
- **Specialty and organic demand.** Small brands, cafes and wellness companies want traceable small-batch lots that large traders do not prioritise.
- **Margin and story.** Buying direct removes trader layers and lets a buyer market a named farm or co-op.

What blocks them today: doubt about quality (moisture, pesticide limits, swapped goods), costly payment methods for small orders, and compliance and shipping. Kisaan Kavach addresses the first two: money moves only after a verified quality check, and the final payment only after delivery. It does not solve import compliance or logistics, so do not claim it does. Avoid market-size or fee figures unless you can cite a source.

## 2. Architecture and responsibility isolation

*(Diagram: Browser -> Next.js server [Auth+RBAC, State machine, paypal.ts (only PayPal keys), verifier.ts + ai.ts (no payment code/keys), i18n catalogs, SQLite] -> PayPal Sandbox / LLM API. Red rule: AI side cannot import paypal.ts.)*

| Module | Technology | Responsibility | Rule |
| :--- | :--- | :--- | :--- |
| UI | Next.js 16.4.5 or newer (exact pin), Tailwind, shadcn/ui | Buyer, seller and reviewer views, order timeline, language switcher, audio controls and Explain Simply wand. On-screen text always shown. | UI always reflects the database state. No hard-coded text: every string goes through t(). |
| i18n (new) | Typed JSON catalogs (en, hi, mr), small t() helper, self-hosted Noto Sans Devanagari | Messages, labels, simple-mode texts, audio file map. | Identical keys in all catalogs; build fails otherwise (section 9). No i18n library needed for three languages. |
| Auth and RBAC | Cookie sessions, hashed passwords | Roles BUYER, SELLER and a demo-only ARBITER (shown as "Reviewer"). Session checked in every route handler, not only middleware. | All queries scoped by buyer_id or seller_id. Foreign orders return 404. |
| State machine | TypeScript module plus DB constraints | Single writer of order status; rejects illegal transitions. | Unique (order_id, stage) prevents double payout. |
| paypal.ts | Orders v2, Payments v2 over fetch | Create, authorize, capture, reauthorize, void, refund, status lookup, token cache. | ONLY module that reads PayPal credentials. |
| verifier.ts | unpdf, jose, jsQR, decimal.js | Text and QR extraction, JWS verification, deterministic quality check. | No payment code, no keys. |
| ai.ts | LLM API, zod schemas | Extraction, contract drafting, simple-language rewriting, dispute analysis, each with validators and a 20 s timeout. | Cannot import paypal.ts. Output validated before use. |

## 3. Meaningful, guard-railed AI use

AI appears at four points of the real workflow (plus an optional fifth), each visible in the demo. In every case the model produces a proposal in a fixed JSON schema, and code validates it before anything depends on it.

| # | Feature | Input to output | Guardrail in code | Tier |
| :--- | :--- | :--- | :--- | :--- |
| AI-1 | Lab report reading (unsigned PDFs) | PDF text to JSON: lab, lot number, report date, parameters with value, unit and a verbatim source snippet. | Snippet must appear verbatim in the extracted text and contain the value, else "could not confirm". Injection flag plus deterministic pattern scan. Never auto-pays; the buyer approves. | Must |
| AI-2 | Contract drafting | Buyer types plain-language terms to a draft contract JSON with units. | Schema-validated, shown in an editable form; only buyer-confirmed values are stored. AI never sets limits unreviewed. | Should |
| AI-3 | Plain-language messages and Explain Simply (redefined) | Status cards: pre-written catalog messages (normal and simple) in English, Hindi and Marathi with prerecorded audio. Free text (contract preview, extracted values, dispute summary): live AI rewrite. | Catalog texts contain no numbers; code shows amounts and dates in a facts strip. Live rewrites must keep every number identical to the source, contain no banned words, stay under 60 words, else show the exact text with "Could not simplify right now". | Should |
| AI-5 | Dispute evidence analyst | Buyer's independent lab report and photos, plus the original certificate and contract, to a neutral summary for both parties. | Report values go through the same snippet check and quality check as AI-1. Photo findings are advisory text only. Notes and image text are data. A refund needs a signed breach or a reviewer click; AI alone never triggers one. | Should |
| AI-4 | Buyer review summary | Extracted values versus contract limits to a short discrepancy note. | Informational only. Quality-check result shown beside it. | Stretch |

- **Live AI in the demo.** The hosted build uses a server-side LLM key. Recorded outputs are only for local runs without a key and carry a visible "Recorded AI Output" badge. Show a live call in the video, ideally on a file the judges have not seen.
- **Reliability and cost.** Temperature 0 for extraction, one schema-repair retry, 20 s timeout, then "analysis pending". Upload size and type limits, per-session rate limits, caching by (file hash, prompt version).
- **Say it plainly in the pitch.** AI handles the messy, human parts (reading, drafting, explaining). Deterministic code handles money.

## 4. PayPal specification and milestone captures

Developer terms in this section are PayPal's own API words. Users see the labels in section 8.

| Step | API | Decision (verified details in section 15) |
| :--- | :--- | :--- |
| Create and authorize | Orders v2, intent AUTHORIZE, then authorize after buyer approval | Authorize the full amount in one request; PayPal does not allow authorizing a part now and the rest later. Put our order ID in custom_id. Read status and expiration_time from GET authorization and store both. Map CREATED to AUTHORIZED; PENDING (PENDING_REVIEW or DECLINED_BY_RISK_FRAUD_FILTERS) is not funded, so poll; DENIED asks the buyer to retry. Show the expiry date to both parties. |
| Stage 1 (30%) | Payments v2: capture authorization, final_capture false | Triggered by Path 1 PASS or buyer Approve in Path 2. Amount is integer minor units: floor(total x ADVANCE_PCT / 100). Unique invoice_id per capture. Mark COMPLETED only after GET capture confirms it (one community report describes a "successful" later partial capture that moved no money). |
| Stage 2 (70%) | Payments v2: capture, final_capture true | Amount is authorized total minus captured total, never computed independently, so rounding never leaves a remainder. Triggered after shipping paper upload and buyer delivery confirmation, or when the dispute window passes with no claim. Capturing more than the authorization returns MAX_CAPTURE_AMOUNT_EXCEEDED. |
| Expiry and reauthorize | Payments v2: reauthorize | Valid 29 days; 3-day honor period. Before Stage 2, if now is past the honor period of the current authorization, reauthorize first (allowed from day 4). Reauthorize accepts only amount, returns a new authorization ID, and restarts the honor period. Store the chain; capture on the current ID. Assume one reauthorization. Reauthorize for the remaining uncaptured amount; if PayPal rejects that, go to REAUTH_NEEDED (new buyer-approved order for the remainder). Checked on page load plus a manual button; no background worker. |
| Void | Payments v2: void authorization | Allowed before any capture, or after a partial capture only if final_capture was false; it cancels all future captures. Not possible after full capture. Used when the lab check never passes, the buyer cancels, or a dispute ends in refund. Void is preferred over refund for uncaptured money. |
| Refund | Payments v2: refund capture (full or partial) | Within 180 days of capture. Check the capture status first. Key order:refund:n. Handle REFUND_AMOUNT_EXCEEDED, CAPTURE_FULLY_REFUNDED (confirm via status, then treat as done), REFUND_NOT_ALLOWED_AFTER_180_DAYS and PERMISSION_DENIED (order stays DISPUTED, route to reviewer). Show PayPal's status verbatim; poll GET refund. Refund first, then void. |
| Idempotency | PayPal-Request-Id on every POST | Keys order:stage1, order:stage2, order:refund:n, order:reauth:n. Persist the key before sending. PayPal stores a request ID for up to 45 days (it varies by API), which covers a 29-day hold; after a long gap, look up status instead of resending. Unique (order_id, stage) in the database backs it up. |
| Timeouts | Status lookup, then retry | The capture, refund or void row becomes RECONCILING (shown to users as "Confirming with PayPal") and polls PayPal before any retry. Polling is the default; webhooks are optional and not needed. |
| Payee | Orders v2 payee | A seller payee needs the seller's permission through partner onboarding. The platform sandbox merchant stays the payee, USD only; seller payout is a ledger entry labelled demo. |

- **Phase 0 preflight (about 30 minutes).** Run the 8 tests in section 16. If two-stage capture fails, set CAPTURE_MODE=SINGLE (one capture on PASS) and say so in the README.
- **Wording.** Replace any "guaranteed payment" claim with "Payment reserved until [date]" because the reservation can expire. Never claim a bank deposit; say "paid to seller account (demo ledger)".

## 5. Order state machine

*(Diagram: CREATED -> AUTHORIZED -> VERIFY_PENDING -> LAB_PASSED -> PARTIALLY_CAPTURED -> DELIVERED -> FULLY_CAPTURED. Side paths: VERIFY_PENDING <-> AWAITING_APPROVAL -> LAB_PASSED; PARTIALLY_CAPTURED -> DISPUTED -> REFUNDED or back to DELIVERED; AUTHORIZED -> REAUTH_NEEDED -> AUTHORIZED/EXPIRED; EXPIRED/VOIDED terminal. Full table below is authoritative.)*

Green = happy path. Amber = side paths. DISPUTED resolves to REFUNDED or back to DELIVERED. Lab fail past deadline, buyer cancel or expiry end in VOIDED or EXPIRED.

| State | Entered when | Next states | Shown to users as |
| :--- | :--- | :--- | :--- |
| CREATED | Buyer confirms the (AI-drafted or manual) contract. | AUTHORIZED, VOIDED | Contract confirmed |
| AUTHORIZED | PayPal authorization status is CREATED. | VERIFY_PENDING, REAUTH_NEEDED, VOIDED | Payment reserved until [date] |
| VERIFY_PENDING | Seller uploads a lab report. | LAB_PASSED (signed), AWAITING_APPROVAL (unsigned); stays here on FAIL or INCONCLUSIVE with a re-upload prompt; VOIDED if the lab deadline passes | We are checking your lab report / Could not confirm |
| AWAITING_APPROVAL | Unsigned report extracted; buyer reviews highlighted snippets. | LAB_PASSED (buyer approves and the quality check agrees), VERIFY_PENDING (buyer rejects) | Buyer is checking the report |
| LAB_PASSED | Quality check passed. | PARTIALLY_CAPTURED | Lab report passed |
| PARTIALLY_CAPTURED | Stage 1 capture confirmed COMPLETED. | DELIVERED, DISPUTED, EXPIRED | First payment paid |
| DELIVERED | Buyer confirms receipt after a shipping paper is uploaded, or the dispute window passes with no claim. | FULLY_CAPTURED | Delivered |
| DISPUTED | Buyer reports a quality problem after Stage 1. Stage 2 is blocked. | DELIVERED (claim rejected or settled), REFUNDED (refund plus void) | Quality problem reported |
| REFUNDED | Stage 1 refund accepted by PayPal and the remaining authorization voided. | Terminal | Money returned |
| FULLY_CAPTURED | Stage 2 capture confirmed COMPLETED. | Terminal | Final payment paid, order complete |
| REAUTH_NEEDED | Honor period passed and a capture is due, or expiry is near. | AUTHORIZED (reauthorize worked, or buyer approved a new order for the remainder) or EXPIRED | Renew the reservation |
| EXPIRED / VOIDED | Authorization lapsed or cancelled. Terminal. From PARTIALLY_CAPTURED, EXPIRED means Stage 1 stays captured and the balance is not collected; the buyer may start a new order for it. | Terminal | Reservation ended |

RECONCILING is a status of an individual capture, refund or void action, not an order state. Disputes after FULLY_CAPTURED are out of scope for this build. Say so in the README.

## 6. Quality disputes, void and refund

If the produce does not match the contract, the buyer must be made whole. Where the money sits decides the mechanism.

| Situation | Money position | Mechanism | Outcome |
| :--- | :--- | :--- | :--- |
| Lab report fails or never passes before the deadline | Nothing captured; funds only reserved | Void the authorization (or let it expire) | Buyer keeps the money. Order VOIDED. |
| Goods match; buyer confirms or the window passes | 30% captured, 70% reserved | Capture Stage 2 | Seller paid in full. |
| Goods do not match; claim upheld | 30% captured, 70% reserved | Refund the Stage 1 capture, then void the remaining authorization | Buyer made whole. Order REFUNDED. |
| Claim rejected (independent report within limits) | Same | Capture Stage 2 | Seller paid; buyer sees the evidence. |
| Partial settlement (stretch) | Same | Partial refund, reduced Stage 2 capture, void the remainder | Price adjustment. |

**Dispute flow**

1. Buyer taps "Report a quality problem" inside the dispute window (DISPUTE_WINDOW_DAYS in production, minutes in demo mode). Stage 2 is blocked and the order becomes DISPUTED. One dispute per order.
2. Buyer uploads evidence: an independent lab report (signed or unsigned), a few photos including the seal, the sample source and a short note. Evidence is hashed and frozen.
3. AI-5 runs. Report values go through the same snippet check and quality check as AI-1. The AI compares order and lot numbers, lab, dates and the original certificate, and writes a neutral summary for both sides in their languages. Photo findings are advisory only.
4. Code routes the case. A signed report from a registry lab, bound to this order, lot and seal number, drawn from the retained sealed duplicate sample, that breaches a limit makes the claim eligible for automatic refund. A signed report within limits rejects the claim. Anything unsigned, unbound, from a new sample or ambiguous goes to the reviewer with the AI summary.
5. The seller can reply with counter-evidence inside the window; the same pipeline runs on it. A silent buyer triggers auto-release.
6. Resolution runs only through paypal.ts: refund the capture, void the authorization, idempotent keys, RECONCILING on timeout, everything in the audit log.

AI never triggers a refund. A refund needs a signed breach or a reviewer decision. Photos alone never move money. Clock: the dispute deadline is the earlier of the window end and the hold expiry minus at least 3 days, so resolution always finishes inside the hold. Warn at order creation if expected delivery plus the window exceeds the hold.

## 7. Verification gate and security

**Quality check rules**

- Decimal comparison with explicit units (decimal.js). Exactly 8.0% passes an 8.0% limit; 8.01% fails. Allowed units per parameter are whitelisted; only whitelisted conversions are applied (for example ppm equals mg/kg). A missing, duplicate, unparseable, unit-mismatched or ambiguous value never passes; it is INCONCLUSIVE.
- Report lot number must equal the contract lot number; the lab must be in the registry; the report date must not be in the future and must be inside the contract's lab window.

**Path 1: signed payload (shown to users as "Certified lab file")**

- A compact JWS is verified with jose compactVerify, algorithm whitelist fixed (EdDSA), key chosen only by kid from the lab registry. Reject alg none, unknown kid, and any key embedded in the header.
- Claims validated with zod: lab ID, report ID, order ID, lot number, seal number when the contract has one, commodity, parameters with value and unit, issue time. A mismatch on order or lot number fails. A pass triggers Stage 1 automatically.
- Where the JWS is found, in order: (1) the PDF text layer, as a block of three base64url segments; (2) a QR image upload (PNG or JPEG) decoded with jsQR; (3) QR rendered from a PDF page (stretch; needs the canvas package and about 2x scale). Keep the payload under about 1 KB so the QR stays readable.

**Path 2: unsigned PDF (shown to users as "Scanned lab report")**

- AI-1 extracts values with snippets, code verifies each snippet verbatim against the extracted text, and the buyer must click Approve before any capture.

**Controls that apply to both**

- Replay protection. Decisions are immutable and keyed by order ID and file SHA-256. A file hash already used for a PASS cannot be reused on another order.
- Injection defence. Document text is passed as data. The contains_instructions_to_reader flag forces INCONCLUSIVE, backed by a deterministic scan. The flag is one layer; the real control is that unsigned documents never auto-capture.
- Isolation enforcement. ESLint no-restricted-imports blocks paypal.ts from ai/ and verifier/; paypal.ts starts with import "server-only"; a test fails the build if process.env.PAYPAL_ appears outside paypal.ts or if the import graph of ai.ts reaches it.
- App security. Hashed passwords; HTTP-only SameSite cookies plus an Origin check on every mutating route; session check in every route handler; scoped queries; per-session rate limits; uploads limited to PDF (5 MB), PNG and JPEG (3 MB) with magic-byte checks and no SVG; files stored as blobs, never by user-supplied path; no secrets in the repo (.env.example); money stored as integer minor units or TEXT, never floats.

## 8. Plain-language layer and Explain Simply (new)

**Goal.** A farmer or a first-time buyer understands every screen without knowing payment or tech words.

**Label table.** Internal names stay in code, logs and the audit table. Users see only the plain label.

| Internal name | Shown to users (English) | हिन्दी | मराठी |
| :--- | :--- | :--- | :--- |
| Authorization / hold | Payment reserved | पैसा सुरक्षित रखा गया | पैसे राखून ठेवले |
| Capture Stage 1 (advance) | First payment (30%) | पहला भुगतान (30%) | पहिले पेमेंट (30%) |
| Capture Stage 2 (balance) | Final payment (70%) | अंतिम भुगतान (70%) | अंतिम पेमेंट (70%) |
| Void | Reservation cancelled, money stays with the buyer | आरक्षण रद्द, पैसा ख़रीदार के पास रहेगा | राखून ठेवलेले रद्द, पैसे खरेदीदाराकडेच राहतील |
| Refund | Money returned | पैसा वापस | पैसे परत |
| Dispute | Quality problem report | गुणवत्ता की शिकायत | गुणवत्तेची तक्रार |
| ARBITER role | Reviewer | समीक्षक | परीक्षक |
| Verification gate | Quality check | गुणवत्ता जाँच | गुणवत्ता तपासणी |
| Path 1 signed JWS | Certified lab file | प्रमाणित लैब फ़ाइल | प्रमाणित लॅब फाइल |
| Path 2 unsigned PDF | Scanned lab report (buyer must check) | स्कैन की हुई लैब रिपोर्ट (ख़रीदार जाँचेगा) | स्कॅन केलेला लॅब रिपोर्ट (खरेदीदार तपासेल) |
| INCONCLUSIVE | Could not confirm | पुष्टि नहीं हो सकी | खात्री होऊ शकली नाही |
| Injection flag | Suspicious text found in the file | फ़ाइल में संदिग्ध लिखावट मिली | फाइलमध्ये संशयास्पद मजकूर आढळला |
| RECONCILING | Confirming with PayPal | PayPal से पुष्टि हो रही है | PayPal कडून खात्री होत आहे |
| REAUTH_NEEDED | Renew the reservation | आरक्षण नवीनीकृत करें | राखीव रक्कम नूतनीकरण करा |
| Clawback | Adjusted from future payments | आगे के भुगतानों से समायोजित | पुढील पेमेंटमधून वळती |
| Batch ID | Lot number | लॉट नंबर | लॉट क्रमांक |
| Seal ID | Sample seal number | नमूना सील नंबर | नमुना सील क्रमांक |
| Sandbox | Demo mode: test money only | डेमो: केवल टेस्ट पैसा | डेमो: फक्त चाचणीचे पैसे |

**Banned words test.** A build test scans every user-facing English string (and the English fallback of every other language) for: escrow, authorization, authorize, capture, void, arbiter, gate, JWS, payload, stage, ledger, clawback, reconcile, sandbox, injection, guaranteed. The build fails on a match. Also: a persistent "Demo mode: test money only" ribbon; never "guaranteed"; always show the date until which money is reserved.

**Explain Simply (magic wand).**

- **Where.** A wand button ("Explain simply", "like I'm 5") on the order status card for every role, the lab result, the contract preview, the AI dispute summary and error messages.
- **Effect (about 1.2 s).** The wand tilts, a small star burst plays, the card text dissolves into sparkles and re-forms as the simple version. A gold edge and a "Simple view" chip stay on the card, with a "Show exact details" link to flip back. With reduced-motion set, cross-fade only.
- **Simple view always has three parts.** What happened (one short sentence). What it means for you (one everyday comparison). What to do next (one action, button right below). Plus the facts strip and a big Play button.
- **Writing rules.** Sentences of at most 12 words, no banned words, no promises, nothing says money is "yours" before it has actually been paid out, ends with a next step.
- **Status cards: pre-written.** Each state has a normal and a simple text in English, Hindi and Marathi, plus prerecorded audio. No AI call, so it works even if the AI service is down. The starter Hindi and Marathi catalog is in the UI specification v3, section 5 (machine-drafted; native review required).
- **Free text: live AI plus checks.** The model rewrites contract previews, extracted lab values and dispute summaries in simple words. Code then checks: every number in the output equals a number in the source, no banned words, at most 60 words. Any failure shows the exact text with "Could not simplify right now". AI never changes amounts.
- **Facts strip.** One reusable component shows amounts and dates in plain digits (for example `$1,800`, `until 11 Dec 2026`) next to every message. Messages and audio contain no numbers.

## 9. Languages: Hindi, Marathi, English (new)

**Evidence (Census of India 2011, the latest complete figures found).**

| Language | Mother-tongue speakers | Share of India | Farm workers (cultivators plus farm labourers) in its main state |
| :--- | ---: | ---: | :--- |
| Hindi | 528.3 M | 43.63% | At least 64.5 M in Uttar Pradesh (39.0 M) and Bihar (25.5 M), 24.5% of India's 263.1 M farm workers |
| Bengali | 97.2 M | 8.03% | West Bengal 15.3 M (5.8%) |
| Marathi | 83.0 M | 6.86% | Maharashtra 26.1 M (9.9%) |
| Telugu | 81.1 M | 6.70% | Andhra Pradesh, undivided, 23.5 M (8.9%), includes Telangana |
| Tamil | 69.0 M | 5.70% | Tamil Nadu 13.9 M (5.3%) |

India total: 118.8 M cultivators plus 144.3 M agricultural labourers equals 263.1 M farm workers, 54.6% of the workforce.

**Decision.** Hindi first, Marathi second, English for everyone. Hindi leads on both measures by a wide margin. For second place Marathi edges Telugu on speakers (83.0 M vs 81.1 M) and farm workers (26.1 M vs 23.5 M) and beats Bengali on farm workers. Telugu, Bengali and Tamil are next. Adding a language later means one catalog file and one audio set.

**Honest caveats (also in the README).**

- A state is not a language; state totals are a proxy, and the state sums are our own arithmetic.
- The Census groups many related Hindi-belt tongues (for example Bhojpuri and Rajasthani) under Hindi, so Hindi audio is understood by most but not all farmers in those states.
- Marathi versus Telugu is close and could flip with newer data. Census 2011 is 15 years old.
- Hindi and Marathi texts are machine-drafted. Do not show a "reviewed" label until a native speaker has signed off.

**What is localized.** All seller screens, all seller messages and audio, the label table, errors and the wand, in Hindi, Marathi and English. Buyer and reviewer screens are English, with Explain Simply in English. Demo logins: one Hindi seller, one Marathi seller, one buyer, one reviewer (fictional demo accounts).

**Safeguards (what makes it hard to break).**

1. One catalog per language (messages/en.json, hi.json, mr.json) with identical keys. A build test fails on a missing or empty key, or on a hi or mr value identical to English.
2. No hard-coded text: a lint rule bans string literals in JSX; every visible string uses t("key").
3. Numbers and dates come from code and appear in the facts strip, never inside translated text or audio. Western digits (0 to 9) in all languages. Dates use month names in the chosen language (Intl.DateTimeFormat).
4. Audio is prerecorded and number-free: one MP3 per message key, per language, per mode (normal and simple), generated once from the catalog by a script and committed. At most 72 clips (12 states x 2 modes x 3 languages); if time is short, record normal mode for Hindi and Marathi first (24 clips). Web Speech is only a labelled fallback. Label the audio honestly as a computer-generated voice. Use any text-to-speech service with hi-IN and mr-IN voices, and check its voice list and terms for redistributing the clips before committing them.
5. Language is chosen on first visit by a full-screen chooser (three large cards: हिन्दी, मराठी, English, native names, no flags), saved on the account (users.language) and in a cookie, and switchable from the top bar. The html lang attribute follows it.
6. Fonts self-hosted through next/font (Noto Sans Devanagari). Devanagari body text at least 18 px, line-height 1.6, no fixed-width buttons, labels may wrap to two lines (these languages run 20 to 30% longer).
7. A "Show in English" toggle on every translated message.
8. Every button has an icon; every message has audio and on-screen text.
9. Real-device test: Android Chrome on a mid-range phone, both languages, audio on and off, text at 200%.

## 10. What is real and what is simulated

State this table in the README and the Devpost text. Judges reward transparency, and the rules require the project to work as described.

| Area | Status | How to describe it |
| :--- | :--- | :--- |
| PayPal authorize, capture, reauthorize, void, refund | Real (sandbox), except reauthorize | Show the transactions in the sandbox dashboard. Reauthorize is tested with a mocked client (needs 4+ days). |
| Seller payout | Sandbox | Settles to the platform sandbox merchant plus a ledger entry. No real bank deposit. |
| Lab signatures | Mock registry | Demo keys and a generator script. Real labs may not publish signed payloads yet. |
| Carrier / shipping paper check | Simulated | Seller uploads a shipping paper; the buyer confirms delivery. |
| AI extraction, drafting, dispute analysis, free-text Explain Simply | Real (live API) | Recorded outputs only for local runs with no key, clearly badged. |
| Reauthorization and expiry | Mocked / simulated | Tested with a mocked client and a labelled simulate-expiry toggle. |
| Independent lab report and reviewer | Mock registry, demo role | A demo reviewer account resolves unsigned or ambiguous disputes. |
| Photo analysis in disputes | Real AI, advisory | Describes visible issues; never triggers a refund. |
| Hindi and Marathi texts | Machine-drafted | State the review status truthfully: reviewed by a native speaker, or not yet. |
| Status-card messages and Explain Simply on status cards | Pre-written catalog | Not live AI; works with no AI service. |
| Farmer voice message | Prerecorded, computer-generated voice; browser speech as fallback | Audio plus on-screen text. No SMS. |
| SMS to the farmer | Not built | Voice and on-screen message only. |
| Hosted data persistence | Ephemeral | The free host resets data on idle, restart or redeploy. Use the Reset button; seeded orders have no real PayPal IDs. |

## 11. Stack, data model and deployment decisions

**Library and platform decisions**

| Concern | Decision | Why (sources in section 17) |
| :--- | :--- | :--- |
| Framework | Next.js 16.4.5 or newer, exact pin, npm audit on submission day | The 3 Nov 2026 release patched seven issues in 16.4.5 and 15.5.29 (Cache Components and use cache, Edge runtime routes, image optimization, forwarded fetched responses). Earlier criticals (image optimization RCE) are fixed in 16.4.1 and later. Fallback line: 15.5.29. Vercel now ships security releases monthly. |
| Hardening config | images.unoptimized: true; no use cache, no Cache Components, no Edge runtime; never return a fetched response unchanged from a route handler | Removes the affected surfaces even if a later advisory lands. |
| PDF text | unpdf (MIT, PDF.js based, zero dependencies) | Described as an actively maintained replacement for the unmaintained pdf-parse. |
| QR | jsQR on decoded PNG or JPEG pixels | jsQR takes raw RGBA pixels, so an image decoder is needed. Confirm the license in the package before the README states it. |
| JWS | jose (MIT) | Compact JWS verify, EdDSA and ES256, no dependencies. |
| Database | SQLite via better-sqlite3, WAL mode | One service, no external dependency, little time left. Keep all SQL in one repository module so a Postgres swap stays a small job. |
| Hosting | Render free web service | Spins down after 15 idle minutes and takes about a minute to start; the filesystem is ephemeral across restart, redeploy and spin-down; no persistent disk on free. 750 free instance hours per month covers one always-on service, so keep it the only free service. |
| Persistence plan | Seed on boot, Reset button, external keep-alive ping every 10 minutes during judging, README notice, order IDs in PayPal custom_id | A free Render Postgres survives restarts but expires 30 days after creation (14-day grace, 1 GB), and Neon or Supabase add another account. Treat hosted Postgres as an upgrade only if time remains after phase 3. |
| Languages (new) | Typed JSON catalogs plus a small t() helper; Noto Sans Devanagari self-hosted | Three languages do not need a library; fewer moving parts. Key-parity test in CI. |
| Farmer audio | Prerecorded MP3 for each catalog message, language and mode, generated once and committed; Web Speech only as a labelled fallback, split into sentences under about 10 seconds | Android Chrome returns an unfiltered voice list, some voices stop after about 14 seconds, Edge on Android returns no voices, Safari hides downloadable voices, and Windows ships few voices. |

**Data model (minimum)**

| Table | Key columns and constraints |
| :--- | :--- |
| users | id, email, password_hash, role (BUYER, SELLER, ARBITER), language (en, hi, mr) |
| orders | id, buyer_id, seller_id, status, contract_json, total_minor, currency USD, advance_pct, batch_id, seal_id, lab_deadline, delivery_expected, dispute_deadline, demo_mode |
| authorizations | order_id, paypal_authorization_id UNIQUE, parent_id (chain), status, create_time, expiration_time, honor_until, is_current |
| captures | order_id, stage, UNIQUE (order_id, stage), request_id, paypal_capture_id, amount_minor, final_capture, status (PENDING, COMPLETED, FAILED, RECONCILING, REFUNDED), raw_status |
| refunds | order_id, n, UNIQUE (order_id, n), request_id, paypal_refund_id, amount_minor, status, raw_status |
| decisions | order_id, file_sha256, UNIQUE (order_id, file_sha256), path (SIGNED or UNSIGNED), result (PASS, FAIL, INCONCLUSIVE), values_json, immutable. A PASS hash cannot be reused on another order. |
| evidence | order_id, kind, file_sha256, blob, frozen_at, submitted_by |
| seller_ledger | seller_id, order_id, kind (ADVANCE, BALANCE, CLAWBACK), amount_minor, note |
| audit_log | id, ts, actor, order_id, action, before, after, paypal_debug_id. Append only. |

Messages, labels and the audio file map live in the catalogs (files in the repo), not in the database.

**Environment variables (.env.example)**

PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_API_BASE (sandbox URL), LLM_API_KEY, LLM_MODEL, SESSION_SECRET, DEMO_MODE, CAPTURE_MODE (TWO_STAGE or SINGLE), ADVANCE_PCT (30), HOLD_DEFAULT_DAYS (29), HONOR_DAYS (3), DISPUTE_WINDOW_DAYS, DISPUTE_WINDOW_MINUTES_DEMO, LAB_REGISTRY_PUBLIC_KEYS (JSON), SUPPORTED_LANGS (en,hi,mr), DEFAULT_LANG (en).

## 12. Build order for today (IST time boxes)

New work from v6 is marked (v6). If you are already past Phase 1, add the t() skeleton before touching more UI strings: every string written without t() is rework later.

| Time (IST) | Phase | Scope | Done when |
| :--- | :--- | :--- | :--- |
| 12:30-13:00 | 0. Preflight | Sandbox buyer and business accounts; the 8 tests in section 16. In parallel, deploy an empty Next.js app with SQLite and env vars to Render. | Capture mode and payout wording known; a hosted URL exists. |
| 13:00-16:00 | 1. Money core | Schema, auth, state machine, paypal.ts, Path 1 with a sample signed certificate, Stage 1 and Stage 2, reconciliation, mocked client tests. (v6) t() helper, empty hi and mr catalogs, language switcher, facts strip component from the first screen (about 20 minutes). | Signed report to Stage 1 to Stage 2 works on the hosted URL, strings already behind t(). |
| 16:00-17:30 | 1b. Void and refund | Lab-fail deadline voids; Report-a-problem button; reviewer resolves to refund Stage 1 and void the rest. | A disputed order ends REFUNDED and the sandbox dashboard shows the refund and void. |
| 17:30-19:30 | 2. AI-1 and Path 2 | Extraction with snippet verification, approval screen, injection sample, tampered file. | An unsigned PDF reaches Approve; an injection file is INCONCLUSIVE. |
| 19:30-21:30 | 3. Docs, hardening and languages (v6, extended 30 min) | Seed data, reset button, keep-alive, README with credentials and license, sample files, isolation test, npm audit. (v6) Hindi and Marathi catalogs for every seller state, Explain Simply wand on status cards (static), banned-words test, key-parity test, audio generation script and clips, language chooser. | A stranger can log in, switch to Hindi or Marathi, hear audio, tap the wand and run the flow. |
| 21:30-23:00 | 4. AI-5, AI-2, live wand | Dispute evidence analyst; contract drafting form; (v6) live Explain Simply for free text with number check and fallback. Feature freeze at 23:00. | Each works live; fallbacks tested. |
| 23:00-00:00 | 5a. Video | Warm the host first. Create the second order for real before recording; do not rely on seeded orders for money steps. | Under 3 minutes, public on YouTube. |
| 00:00-00:30 | 5b. Devpost | Description, honesty table, links, submit. | Submission confirmed with about an hour to spare. |

**Minimum tests before the freeze**

- Quality check: 8.0 passes and 8.01 fails an 8.0 limit; missing, duplicate or unit-mismatched values are INCONCLUSIVE.
- Snippet check rejects a value whose snippet is not verbatim in the text. Injection sample forces INCONCLUSIVE and moves no money.
- State machine rejects illegal transitions; unique (order_id, stage) blocks a second Stage 1; a replayed request ID does not double-pay.
- JWS: tampered payload, wrong kid, alg none, HS256 confusion and wrong order ID are all rejected. File hash reuse on another order is rejected.
- Foreign order returns 404. Isolation test passes. Mocked PayPal: reauthorize, expiry, and a refund timeout landing in RECONCILING.
- (v6) Language: key parity across en, hi and mr; no empty or English-identical hi or mr value; no string literals in JSX; every message key has an audio file in each language and mode; no digits inside catalog messages (numbers only in the facts strip).
- (v6) Plain words: banned-words scan passes on all user-facing English.
- (v6) Explain Simply: a live rewrite with a changed number is rejected and falls back; a rewrite containing a banned word is rejected.
- (v6) Language choice persists after reload and after logout and login; html lang matches.

**Cut order if time runs short:** live Explain Simply on free text, AI-4, AI-2, then AI-5 (keep the manual reviewer refund). Keep the static wand and audio for the Hindi and Marathi seller status card. Never cut phases 1, 1b, 2 or 3.

## 13. Submission checklist (mapped to the official rules)

| Requirement | Action |
| :--- | :--- |
| [ ] Working demo judges can run or open | Hosted URL and run instructions, with test logins (including the Hindi and Marathi sellers) and sandbox buyer credentials in the README. Seed data on boot; explain that the free host resets data and show where the Reset button is. |
| [ ] Public repo with open-source license | MIT license file, visible in the repo About section. |
| [ ] Text description of features | Features, AI roles, languages and how they were chosen, simulated parts, and the table in section 10. |
| [ ] Demo video under 3 minutes | Public on YouTube, shows the app working, no copyrighted music or other brands' logos. |
| [ ] English materials | Narrate in English and subtitle the Hindi and Marathi audio. |
| [ ] New or significantly updated project | If any version predates 1 Oct 2026, state what was updated. |
| [ ] PayPal central, AI tool used | Name the sandbox APIs and the LLM in the description. |
| [ ] Third-party terms | Confirm you may use the LLM API, the text-to-speech service and the libraries under their licenses. |
| [ ] Optional: Render prizes | Host on Render and mention it in the submission. |

This checklist reflects the rules as summarised in v4; the official rules text was not re-checked in this edit. Read the Devpost rules page once more before submitting.

## 14. Three-minute video script

| Time | Show | Scores on |
| :--- | :--- | :--- |
| 0:00-0:20 | Problem: letters of credit are slow and costly, and buyers fear paying before quality is proven. Say "typically" or cite a source for any figure. | Impact |
| 0:20-0:50 | Buyer types terms; AI drafts the contract; buyer confirms; PayPal sandbox payment reserved with the date shown. | AI, PayPal |
| 0:50-1:25 | Hindi seller uploads a signed certificate; quality check passes; first payment paid; Hindi voice message plays. Tap the wand: the simple version appears. Switch to the Marathi seller view for a few seconds. | Implementation, Design |
| 1:25-1:50 | Unsigned PDF: live extraction with highlighted snippets; buyer approves. A tampered and an injection file are rejected with no money moved. | AI, Implementation |
| 1:50-2:35 | Goods do not match: buyer reports a problem with an independent report and photos; AI evidence summary; signed breach routes to refund; first payment returned and the rest cancelled. Open the sandbox dashboard to show both. | AI, PayPal, Impact |
| 2:35-2:50 | Happy path on a second order created for real before recording: delivery confirmed, final payment paid (10 seconds). | Presentation |
| 2:50-3:00 | Impact, what is simulated, next step: more languages (Telugu, Bengali, Tamil) and a farmer-side buying module. | Impact, Innovation |

## 15. Hardening: verified PayPal behavior and final workarounds

Checked against current PayPal developer documentation on 12 Nov 2026 (in v5; not re-checked in v6). Verified means stated in an official PayPal page. Conflicting means PayPal pages disagree. Unverified means a single or non-official source. Every workaround sits inside the existing states and modules, so the flow in sections 4 to 7 does not change.

| Issue | Confidence | What the sources say | Final workaround |
| :--- | :--- | :--- | :--- |
| Hold length and honor period | Verified | Authorization valid 29 days; 3-day honor period when capture is most likely to succeed; later captures depend on funds and risk checks. Sandbox authorizations do not expire after 29 days. | Read expiration_time from GET authorization, fall back to HOLD_DEFAULT_DAYS. A failed capture never marks anything paid: the row is FAILED, the order stays put, buyer is asked to fix funding or reauthorize. Labelled simulate-expiry toggle in demo mode. |
| Reauthorization count | Conflicting | The reference says multiple reauthorizations are allowed in the 29-day window. The error reference (REAUTHORIZATION_TOO_SOON) and the Checkout extend-authorization guide say once, from day 4 to day 29. | Assume one. Store the authorization chain; capture on the current ID. If reauthorize fails or the hold lapses, REAUTH_NEEDED asks the buyer to approve a new order for the remaining amount. |
| Reauthorize amount | Unverified | The reference says only amount is supported. One Checkout guide mentions up to 115% of the original; it is a single page and region-dependent. | Reauthorize for the remaining uncaptured amount only. Do not depend on the 115% figure. Mocked tests cover this. |
| Authorize in parts | Verified | PayPal's help page: a partial authorization cannot be followed by authorizing the remainder later; authorize in full, then capture in several steps with final_capture false. | Authorize the full amount once (already the plan). |
| Partial capture and void | Verified | Void after a partial capture is allowed only if final_capture was false and it cancels future captures. Void requires intent AUTHORIZE. A fully captured authorization cannot be voided. | Stage 1 always uses final_capture false. Preflight tests 1 and 2 confirm it; CAPTURE_MODE=SINGLE remains the fallback. |
| Capture confirmation | Unverified | A community post reports a second partial capture returning success while no money moved. | Confirm each capture with GET capture and the sandbox dashboard before marking COMPLETED. |
| Refund behavior | Verified | Refunds are full or partial within 180 days. Documented errors include REFUND_AMOUNT_EXCEEDED, CAPTURE_FULLY_REFUNDED, REFUND_NOT_ALLOWED_AFTER_180_DAYS and PERMISSION_DENIED. Docs say void is preferred for uncaptured funds. Docs say sandbox refunds complete instantly; one community report says they can stay PENDING. | Check capture status first, idempotent key, show PayPal's status verbatim. REFUNDED means PayPal accepted the refund (COMPLETED or PENDING, reconciled by polling). Refund first, then void; if the void fails, retry it, since Stage 2 is already blocked by DISPUTED. Any other refund error keeps the order DISPUTED and routes to the reviewer. |
| Payee and payout | Verified | A seller must grant permission through partner onboarding before the platform can act for them. In sandbox the merchant ID is shown as Account ID. Third-party refunds may need the PayPal-Auth-Assertion header. | Platform sandbox merchant stays payee, USD only; payout is a ledger entry labelled demo. Not needing the assertion header is a side benefit. Production path: partner onboarding. |
| Advance clawback | Design note | Platform is payee in this build, so a refund does not need the farmer's funds here. In real life the advance may be spent. | Record the first payment in a seller ledger; a refund creates a clawback receivable netted against future payouts (shown as "Adjusted from future payments"). Keep ADVANCE_PCT configurable. A co-op guarantee pool is a production note, not built. |
| Idempotency keys | Verified | PayPal-Request-Id is stored for up to 45 days, and retention varies by API. | Persist the key before sending; one key per action; after a gap, look up status instead of resending. |
| Chain of custody | Design note | Spices Board sampling agencies draw, seal and tag samples; Export Inspection Council schemes use sealed duplicate samples so tampering is detectable. | Optional seal and sampling report numbers in the contract and signed payload. Buyer logs the observed seal number with a photo at delivery. Auto-refund only for a matching seal and a retained sealed duplicate; everything else goes to the reviewer. |
| Bad-faith claims and injection | Design note | Evidence can be fabricated; notes or text inside photos can carry instructions. | A claim needs uploaded evidence; one dispute per order; evidence hashed and frozen; seller counter-evidence window; silent buyer triggers auto-release. Notes and image text are data, with the same injection flag and pattern scan as AI-1. |
| AI outage or slowness | Design note | LLM calls can fail or time out. | 20 s timeout and "analysis pending". The reviewer can resolve without AI. AI never blocks a capture or refund. Status-card messages and the wand on them do not use AI at all. |
| Dispute clock versus hold | Design note | A long delivery plus dispute window can outlast the hold. | Dispute deadline is the earlier of the window end and the hold expiry minus at least 3 days. Warn at order creation and plan a reauthorization. |
| Free host resets data | Verified (Render docs) | Free web services lose local files on redeploy, restart and spin-down. Free Postgres expires after 30 days. | Seed on boot, Reset button, keep-alive, README notice; seeded orders carry no PayPal IDs; create real orders before recording. |
| Next.js advisories | Verified | Seven issues patched 3 Nov 2026 in 16.4.5 and 15.5.29; earlier critical image-optimizer RCE fixed in 16.4.1 and 15.5.28. | Pin 16.4.5 or newer, disable image optimization, avoid affected features, run npm audit on submission day. |
| Wrong or awkward Hindi and Marathi (v6) | Design note | Machine-drafted text can be wrong, stiff or too formal for rural readers. | Short sentences, no numbers in messages, "Show in English" toggle, native-speaker review before any "reviewed" claim, and tell the judges plainly which texts have been reviewed. |
| Simple wording misleads about money (v6) | Design note | Everyday comparisons can imply a guarantee or ownership that does not exist yet. | Writing rules in section 8, banned words including "guaranteed", number check on live rewrites, "Show exact details" always one tap away, facts strip always shows the reservation end date. |
| Devanagari rendering and font loading (v6) | Design note | Phones without Indic fonts show boxes; tight line-height clips vowel marks. | Self-host Noto Sans Devanagari, 18 px minimum, line-height 1.6, test on a real Android phone. |
| Hindi understood by most, not all (v6) | Design note | The Census groups related Hindi-belt tongues under Hindi. | Say so in the README; keep the catalog design ready for more languages; do not claim full coverage. |

## 16. Phase 0 preflight tests

| # | Test | Expected | If it fails |
| :--- | :--- | :--- | :--- |
| 1 | Authorize the full amount; capture 30% with final_capture false; GET the capture; capture the remainder with final_capture true. | Both captures COMPLETED; dashboard shows both; amounts sum to the authorization. | CAPTURE_MODE=SINGLE |
| 2 | On a second order: capture 30%, then void. | Remaining hold released; authorization status afterwards recorded. | Let the hold lapse and label it |
| 3 | GET authorization at each stage. | Status, create_time and expiration_time present; note the status after a partial capture. | Config default expiry |
| 4 | Refund the Stage 1 capture, partial then the rest; GET the refund; refund again. | Refund accepted; note COMPLETED or PENDING; second refund gives CAPTURE_FULLY_REFUNDED or REFUND_AMOUNT_EXCEEDED. | Show status verbatim |
| 5 | Create an order with a second sandbox business account as payee. | Permission or invalid-payee error expected. | Platform merchant stays payee |
| 6 | Reauthorize immediately. | Too-soon error (REAUTHORIZATION_TOO_SOON or similar); map the exact code. | Mocked tests only |
| 7 | Capture more than the authorization; capture after void; replay the same PayPal-Request-Id. | MAX_CAPTURE_AMOUNT_EXCEEDED; an error after void; the replay returns the same result without a second capture. | Rely on the DB unique key and status lookup |
| 8 | Create an order, approve with the sandbox buyer, and time a full authorize-to-capture round trip. | Under a few seconds; buyer approval works with the hosted callback URL. | Fix return and cancel URLs for the hosted domain |

## 17. Known limits, open items and sources

- PayPal documentation is not fully consistent (section 15). Confirm each behavior in your sandbox before claiming it; the README should only state what the preflight proved.
- The sandbox reauthorization "time machine" mentioned on one PayPal guide page could not be confirmed from other sources, so reauthorization stays mocked.
- Real lab adoption of signed payloads is unverified. The mock registry demonstrates the design.
- Check Hindi and Marathi phrases with native speakers. Test the prerecorded audio and the Web Speech fallback on a real Android phone.
- Chain of custody is reduced, not eliminated: seal numbers and retained duplicate samples help, but nothing proves a sealed sample was untouched.
- A refunded first payment may already be spent by the farmer. The ledger records a clawback receivable, but real recovery needs a co-op guarantee or insurance, which this build does not implement.
- No SMS, no offline queue and no UPI buying module in this submission. Disputes after full capture are out of scope.
- Language data is Census 2011; see the caveats in section 9. Amounts in the demo are in USD only; do not show rupee amounts unless you add and cite an exchange rate.

**Sources checked 12 Nov 2026 (re-check any single detail before relying on it)**

PayPal: Authorization and honor period (developer.paypal.com/payment-methods/auth-honor); Authorize and delay capture (developer.paypal.com/checkout/delay-capture); Reauthorize authorized payment reference (developer.paypal.com/api/payments/v2/authorizations-reauthorize); REAUTHORIZATION_TOO_SOON error (developer.paypal.com/api/payments/v2/errors/reauthorization_too_soon); Extend an authorization (developer.paypal.com/checkout/extend-authorization); Void authorization (developer.paypal.com/beta/payments/void-authorization); Refund a payment (developer.paypal.com/checkout/refund-payment); Capture authorized payment reference (developer.paypal.com/api/payments/v2/authorizations-capture); Authorization status definitions (developer.paypal.com/api/orders/v2/definitions/authorization_status); Idempotency and request IDs (developer.paypal.com/api/rest/requests); PayPal help: Understanding Error, Unprocessable entity (paypal.com/pm/cshelp/article/understanding-error-unprocessable-entity-help1222); Platforms troubleshoot and seller onboarding (developer.paypal.com/platforms/troubleshoot).

Platform and libraries: Render, Deploy for Free (render.com/docs/free); Next.js, November 2026 Security Release (nextjs.org/blog/november-2026-security-release) and the Netlify and Hacktron advisory summaries; unpdf (github.com/unjs/unpdf); jsQR (github.com/cozmo/jsQR); jose (github.com/panva/jose); Web Speech voice behavior notes (readium.org/speech/docs/WebSpeech.html).

Domain: Spices Board sampling-agency tender; Export Inspection Council scheme documents (as cited in v4; not re-fetched).

Language and farm data (researched in v6): Census of India 2011 mother-tongue tables (as published on Wikipedia's list of languages by native speakers in India, and by Factly); Census 2011 workers by state in the Government of India's Agricultural Statistics at a Glance (desagri.gov.in, 2020 and 2022 editions); Lok Sabha reply of 22 Jul 2014 (118.8 M cultivators, 144.3 M agricultural labourers, 263.1 M total); Census 2011 executive summary (Uttar Pradesh 19.1 M cultivators and 19.9 M agricultural labourers); Business Standard / PTI on Tamil Nadu (4.25 M cultivators, 9.6 M agricultural labourers). State sums and shares are our own arithmetic.
