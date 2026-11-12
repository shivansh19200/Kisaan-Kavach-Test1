# Kisaan Kavach: Figma UI Design Prompt & Role-Based Screen Specification (v3)

This document is the UI design specification and master prompt for **Kisaan Kavach**, a rural micro-export platform where a buyer's money is paid out to the seller in steps, and only after the goods pass a quality check. It is built on Next.js, Tailwind CSS, shadcn/ui and PayPal Sandbox, and is grounded in the master blueprint (`Kisaan_Kavach_Blueprint_FINAL_v6.pdf`).

## What changed in v3

1. **Plain words only.** The legal-sounding term used for the payment hold in v2 is gone from the product description, role names, screen titles, button labels, colour names and checklist. Users now see "Payment reserved", "First payment", "Final payment", "Reviewer". Section 2 lists every plain label next to the internal name.
2. **Explain Simply (magic wand).** A wand button on every status card and every AI-written text re-explains it in very simple words, with a short story, a "what to do next" line and audio. Section 5.
3. **Two languages, built properly.** Hindi and Marathi (plus English), chosen from Census figures (Section 4). Tamil and Telugu are dropped from this build so the two that ship can be complete and checked. Every seller screen, every message and every audio clip exists in both. Section 4 also lists the safeguards that make it hard to break.
4. **Demo seller personas now match the language.** v2 had a Kerala co-op seller with Hindi audio. v3 has one Hindi seller and one Marathi seller, and the sample commodity is turmeric (demo numbers).

---

## 1. Master System Prompt for Figma & AI Wireframing Tools

Copy this block into Figma AI, Relume or any AI wireframing tool.

> **Copy-Pasteable AI Prompt for Figma Design Generation:**
>
> "Design a modern, high-trust web app UI for **Kisaan Kavach**, a platform that lets Indian smallholder farmers (spices, tea, herbs) sell to global buyers safely. The buyer reserves the payment through PayPal. The seller gets a first payment (30%) when the lab report passes, and the final payment (70%) after delivery. Money moves only after quality is checked.
>
> **Language rule for ALL text in the design:** use everyday words. Never show these words to a user: escrow, authorization, capture, void, arbiter, gate, JWS, signed payload, stage, ledger, clawback, reconcile, sandbox, injection. Use the plain labels in the label table instead.
>
> **Visual style:**
> - Tailwind + shadcn/ui look. Clean fintech layout with warm farm accents. Large type, big tap targets (min 48 px), generous spacing. Icon + text on every button so people who read slowly can follow the icons.
> - **Colour palette:** Deep Emerald `#065F46` (trust, farm), Warm Amber `#D97706` (money reserved / waiting), Slate `#1E293B` (text), Off-White `#F8FAFC` (background), Rose `#E11D48` (problems), AI Purple `#6D28D9` (written by AI, please check), Magic Gold `#F59E0B` with a soft sparkle gradient (Explain Simply wand).
> - **Fonts:** Inter for English, Noto Sans Devanagari for Hindi and Marathi (same font, same weight system). Devanagari body text at least 18 px with line-height 1.6 so vowel marks are never clipped. Allow every label to wrap to two lines; Hindi and Marathi run 20 to 30% longer than English. No fixed-width buttons.
> - **Always-visible demo ribbon** at the top: "Demo mode: test money only" (shown in the user's language).
> - **Top bar (sticky):** role badge (BUYER / SELLER / REVIEWER), language switcher showing native names (हिन्दी · मराठी · English, no flags), and a big Play/Pause audio button.
> - **Explain Simply button** (magic wand icon + label) on every status card and every AI-written text block.
>
> **Screens:** Login and language chooser; Buyer: write contract, order status; Seller: order status in Hindi or Marathi, upload lab report, shipping, payments list; Reviewer: quality-problem review.
>
> **Badges:** green outline = lab report passed; purple glow = read or written by AI, please check; amber/rose = could not confirm, suspicious text found, problem reported."

---

## 2. Plain-Language Label Table

Internal names stay in code, logs and the audit table. Users never see them. Designers use the **Shown to users** column.

| Internal name | Shown to users (English) | हिन्दी | मराठी |
| :--- | :--- | :--- | :--- |
| Authorization / hold | **Payment reserved** | पैसा सुरक्षित रखा गया | पैसे राखून ठेवले |
| Capture Stage 1 (advance) | **First payment (30%)** | पहला भुगतान (30%) | पहिले पेमेंट (30%) |
| Capture Stage 2 (balance) | **Final payment (70%)** | अंतिम भुगतान (70%) | अंतिम पेमेंट (70%) |
| Void | **Reservation cancelled, money stays with the buyer** | आरक्षण रद्द, पैसा ख़रीदार के पास रहेगा | राखून ठेवलेले रद्द, पैसे खरेदीदाराकडेच राहतील |
| Refund | **Money returned** | पैसा वापस | पैसे परत |
| Dispute | **Quality problem report** | गुणवत्ता की शिकायत | गुणवत्तेची तक्रार |
| ARBITER role | **Reviewer** | समीक्षक | परीक्षक |
| Verification gate | **Quality check** | गुणवत्ता जाँच | गुणवत्ता तपासणी |
| Path 1 signed JWS | **Certified lab file** | प्रमाणित लैब फ़ाइल | प्रमाणित लॅब फाइल |
| Path 2 unsigned PDF | **Scanned lab report (buyer must check)** | स्कैन की हुई लैब रिपोर्ट (ख़रीदार जाँचेगा) | स्कॅन केलेला लॅब रिपोर्ट (खरेदीदार तपासेल) |
| INCONCLUSIVE | **Could not confirm** | पुष्टि नहीं हो सकी | खात्री होऊ शकली नाही |
| contains_instructions flag | **Suspicious text found in the file** | फ़ाइल में संदिग्ध लिखावट मिली | फाइलमध्ये संशयास्पद मजकूर आढळला |
| RECONCILING | **Confirming with PayPal** | PayPal से पुष्टि हो रही है | PayPal कडून खात्री होत आहे |
| REAUTH_NEEDED | **Renew the reservation** | आरक्षण नवीनीकृत करें | राखीव रक्कम नूतनीकरण करा |
| Clawback | **Adjusted from future payments** | आगे के भुगतानों से समायोजित | पुढील पेमेंटमधून वळती |
| Batch ID | **Lot number** | लॉट नंबर | लॉट क्रमांक |
| Seal ID | **Sample seal number** | नमूना सील नंबर | नमुना सील क्रमांक |
| Sandbox | **Demo mode: test money only** | डेमो: केवल टेस्ट पैसा | डेमो: फक्त चाचणीचे पैसे |
| State `LAB_PASSED` | **Lab report passed** | लैब रिपोर्ट पास | लॅब रिपोर्ट पास |
| State `AWAITING_APPROVAL` | **Buyer is checking the report** | ख़रीदार रिपोर्ट जाँच रहा है | खरेदीदार रिपोर्ट तपासत आहे |

Rules: never say "guaranteed"; always show the date until which the money is reserved; amounts and dates come from code, never from AI text.

---

## 3. Authentication & Data Model Alignment

Role-based access (RBAC) on SQLite (`users`, `orders`). Every route and query is limited to the logged-in user. `users.language` stores `en`, `hi` or `mr`.

| Role | Who | What they do | Language |
| :--- | :--- | :--- | :--- |
| **BUYER** | Overseas importer, cafe, wellness brand | Writes the contract with AI, reserves payment, checks scanned reports, confirms delivery, reports quality problems | English (Explain Simply also in English) |
| **SELLER** | Farmer, co-op lead, exporter | Sees order status, uploads lab report, hears voice messages, uploads shipping paper, sees payments list | **हिन्दी, मराठी, English** |
| **REVIEWER** (internal role `ARBITER`, demo only) | Platform staff | Reviews a quality problem and decides: refund or pay seller | English |

---

## 4. Language Plan (Statistically Backed)

### Why Hindi and Marathi

Two sources, both from official Indian government data (Census 2011, the latest complete mother-tongue and occupation figures found):

| Language | Mother-tongue speakers | Share of India | Farm workers (cultivators + farm labourers) in its main state |
| :--- | ---: | ---: | :--- |
| **Hindi** | 528.3 M | 43.63% | **At least 64.5 M** in Uttar Pradesh (39.0 M) and Bihar (25.5 M) alone, 24.5% of India's 263.1 M farm workers |
| Bengali | 97.2 M | 8.03% | West Bengal 15.3 M (5.8%) |
| **Marathi** | 83.0 M | 6.86% | **Maharashtra 26.1 M (9.9%)** |
| Telugu | 81.1 M | 6.70% | Andhra Pradesh, undivided, 23.5 M (8.9%), includes Telangana |
| Tamil | 69.0 M | 5.70% | Tamil Nadu 13.9 M (5.3%) |

**Decision:** Hindi first, Marathi second, English for everyone. Hindi is far ahead on both measures. For second place, Marathi edges Telugu on both speakers (83.0 M vs 81.1 M) and farm workers (26.1 M vs 23.5 M), and beats Bengali on farm workers. Telugu, Bengali and Tamil are next in line. Malayalam matters for Kerala spice farmers but is outside the top five by speakers.

**Honest caveats (put in the README):**
- A state is not a language. State totals are a proxy for farm workers who speak the state language.
- The Census counts many related Hindi-belt tongues (for example Bhojpuri, Rajasthani) under "Hindi", so some farmers in Bihar and UP may prefer their home tongue. Hindi voice is understood by most of them, but not all.
- Marathi versus Telugu is a close call; the order could flip with newer data.
- Census 2011 is 15 years old.

### Safeguards that make it hard to break

1. **One catalog per language** (`messages/en.json`, `hi.json`, `mr.json`) with identical keys. A build test fails if any key is missing, empty or still equal to English in `hi` or `mr`.
2. **No hard-coded text.** Every visible string goes through `t("key")`. A lint rule bans string literals in JSX.
3. **Numbers and dates come from code.** Amounts and dates are shown in a **facts strip** (big, plain digits: `$1,800`, `until 11 Dec 2026`) that sits beside the message. Messages and audio contain no numbers, so a mistranslation cannot change an amount. Western digits (0 to 9) in all languages.
4. **Audio is number-free and prerecorded**, one MP3 per message key per language per mode (normal and simple), generated once from the catalog with a script and committed. Web Speech is only a labelled fallback. On-screen text is always visible.
5. **Language is remembered**: set on first visit by a full-screen chooser (three large buttons: हिन्दी, मराठी, English), saved on the user's account and in a cookie, switchable from the top bar on every screen. `<html lang>` follows it.
6. **Fonts self-hosted** (Noto Sans Devanagari via `next/font`), so nothing breaks if a CDN or the user's phone lacks Indic fonts.
7. **"Show in English" toggle** on every translated message, so buyers, judges and the arbiter can check the original.
8. **Native-speaker review.** All Hindi and Marathi drafts below are machine-drafted. Do not show a "reviewed" label until a native speaker has actually signed off.
9. **Real-device test:** Android Chrome on a mid-range phone, both languages, audio on and off, text at 200% size.

---

## 5. Explain Simply (Magic Wand)

**Goal:** anyone can understand any status or AI text without knowing finance or tech words.

**Where it appears:** a button on the order status card (all roles), the lab report result, the contract preview, the AI summary of a quality problem, and error messages.

**Button:** wand icon + label **"Explain simply"**, secondary line "like I'm 5". Hindi: "आसान भाषा में समझाएँ". Marathi: "सोप्या भाषेत समजावा". 48 px high, Magic Gold.

**Magic wand effect (about 1.2 s):**
1. Tap: the wand tilts and a small star burst plays.
2. The card text dissolves into sparkles and re-forms as the simple version.
3. A gold edge stays on the card, plus a chip **"Simple view"** with a link **"Show exact details"** that flips back.
4. If the user's device is set to reduce motion, skip the burst and cross-fade only.

**What the simple view contains (always the same 3 parts):**
- **What happened** (one short sentence)
- **What it means for you** (one short everyday comparison)
- **What to do next** (one action, with the matching button right below)
- The same **facts strip** with amounts and dates, and a big Play button for audio.

**Writing rules:** sentences of at most 12 words; no banned words (Section 1); no promises such as "guaranteed" or "safe forever"; nothing says money is "yours" before it has actually been paid out; ends with a next step.

**How it works (so it never fails):**
- **Status cards:** pre-written simple texts in the catalog (English, Hindi, Marathi) plus prerecorded audio. No AI needed, works with no internet to the AI service.
- **Free text** (contract preview, extracted lab values, quality-problem summary): live AI rewrites it simply, then code checks the result: numbers in the output must match the source, no banned words, at most 60 words. If any check fails, show "Could not simplify right now" and the exact text. AI never changes amounts.

### Starter message catalog (DRAFT, native review required)

Seller-facing. Numbers are not in the text; they appear in the facts strip.

**Normal wording**

| State | English | हिन्दी | मराठी |
| :--- | :--- | :--- | :--- |
| Payment reserved | The buyer has set aside the money for this order. Next, upload your lab report. | ख़रीदार ने इस ऑर्डर का पैसा अलग रख दिया है। अब अपनी लैब रिपोर्ट अपलोड करें। | खरेदीदाराने या ऑर्डरचे पैसे बाजूला ठेवले आहेत. आता तुमचा लॅब रिपोर्ट अपलोड करा. |
| Checking report | We are checking your lab report. | हम आपकी लैब रिपोर्ट जाँच रहे हैं। | आम्ही तुमचा लॅब रिपोर्ट तपासत आहोत. |
| Could not confirm | We could not confirm your report. Please upload a clear copy again. | हम आपकी रिपोर्ट की पुष्टि नहीं कर सके। कृपया साफ़ कॉपी दोबारा अपलोड करें। | आम्ही तुमच्या रिपोर्टची खात्री करू शकलो नाही. कृपया स्पष्ट प्रत पुन्हा अपलोड करा. |
| First payment paid | Your first payment has been paid. You can ship the goods now. | आपका पहला भुगतान हो गया है। अब आप माल भेज सकते हैं। | तुमचे पहिले पेमेंट झाले आहे. आता तुम्ही माल पाठवू शकता. |
| Final payment paid | Your final payment has been paid. This order is complete. | आपका अंतिम भुगतान हो गया है। यह ऑर्डर पूरा हुआ। | तुमचे अंतिम पेमेंट झाले आहे. हा ऑर्डर पूर्ण झाला. |
| Problem reported | The buyer reported a problem with the goods. A reviewer will look at both sides. The final payment is on hold. | ख़रीदार ने माल में समस्या बताई है। एक समीक्षक दोनों पक्षों को देखेगा। अंतिम भुगतान रुका हुआ है। | खरेदीदाराने मालात अडचण कळवली आहे. एक परीक्षक दोन्ही बाजू पाहील. अंतिम पेमेंट थांबवले आहे. |
| Money returned | The claim was accepted. The first payment goes back to the buyer. It will be adjusted from your future payments. This order is closed. | दावा स्वीकार किया गया। पहला भुगतान ख़रीदार को लौटाया जाएगा। यह आपके आगे के भुगतानों से समायोजित होगा। यह ऑर्डर बंद हुआ। | दावा मान्य झाला. पहिले पेमेंट खरेदीदाराला परत जाईल. ते तुमच्या पुढील पेमेंटमधून वळते केले जाईल. हा ऑर्डर बंद झाला. |

**Explain Simply wording**

| State | English | हिन्दी | मराठी |
| :--- | :--- | :--- | :--- |
| Payment reserved | The buyer has put the money in a safe box. It is not yours yet, but it is not going anywhere. Show us your lab report and the first part opens. | ख़रीदार ने पैसा एक सुरक्षित डिब्बे में रख दिया है। अभी यह आपका नहीं हुआ, पर कहीं जाएगा भी नहीं। अपनी लैब रिपोर्ट दिखाइए, तो पहला हिस्सा खुल जाएगा। | खरेदीदाराने पैसे एका सुरक्षित डब्यात ठेवले आहेत. ते अजून तुमचे झालेले नाहीत, पण कुठे जाणारही नाहीत. तुमचा लॅब रिपोर्ट दाखवा, म्हणजे पहिला हिस्सा उघडेल. |
| Checking report | Your lab report is like a school report card for your spice. We read the numbers and match them with what the buyer asked for. | आपकी लैब रिपोर्ट आपके मसाले का रिपोर्ट कार्ड है। हम उसके नंबर देखकर मिलाते हैं कि ख़रीदार ने जो माँगा था, वही है या नहीं। | तुमचा लॅब रिपोर्ट म्हणजे तुमच्या मसाल्याचे प्रगतीपुस्तक आहे. आम्ही त्यातले आकडे पाहून खरेदीदाराने जे मागितले त्याशी जुळवतो. |
| Could not confirm | We could not read it well, or a number did not match. Nothing is lost. Send a clearer photo or file and we will look again. | हम इसे ठीक से पढ़ नहीं पाए, या कोई नंबर मेल नहीं खाया। कुछ भी खोया नहीं है। साफ़ फ़ोटो या फ़ाइल भेजिए, हम फिर देखेंगे। | आम्हाला ते नीट वाचता आले नाही, किंवा एखादा आकडा जुळला नाही. काहीही गेलेले नाही. स्पष्ट फोटो किंवा फाइल पाठवा, आम्ही पुन्हा पाहू. |
| First payment paid | The first part of the money is now paid to you. Pack the goods and ship them. The rest comes when the buyer receives them. | पैसे का पहला हिस्सा अब आपको मिल गया है। माल पैक करके भेजिए। बाक़ी पैसा तब मिलेगा जब ख़रीदार को माल मिल जाएगा। | पैशांचा पहिला हिस्सा आता तुम्हाला मिळाला आहे. माल पॅक करून पाठवा. उरलेले पैसे खरेदीदाराला माल मिळाल्यावर मिळतील. |
| Final payment paid | The last part of the money has arrived. The order is finished. Well done! | पैसे का आख़िरी हिस्सा आ गया है। ऑर्डर पूरा हुआ। शाबाश! | पैशांचा शेवटचा हिस्सा आला आहे. ऑर्डर पूर्ण झाला. शाब्बास! |
| Problem reported | The buyer says the goods are not what was promised. A fair person will look at papers and photos from both of you. You can add your own papers too. | ख़रीदार का कहना है कि माल वैसा नहीं है जैसा तय हुआ था। एक निष्पक्ष व्यक्ति आप दोनों के काग़ज़ और फ़ोटो देखेगा। आप भी अपने काग़ज़ जोड़ सकते हैं। | खरेदीदार म्हणतो की माल ठरल्याप्रमाणे नाही. एक निःपक्षपाती व्यक्ती तुम्हा दोघांचे कागद आणि फोटो पाहील. तुम्हीही तुमचे कागद जोडू शकता. |
| Money returned | The papers showed the goods did not match, so the first part goes back to the buyer. Money already paid to you will be taken from your next payments. This order is closed. | काग़ज़ों से पता चला कि माल मेल नहीं खाता था, इसलिए पहला हिस्सा ख़रीदार को लौटेगा। आपको मिला पैसा आगे के भुगतानों से काटा जाएगा। यह ऑर्डर बंद हुआ। | कागदपत्रांवरून समजले की माल जुळत नव्हता, म्हणून पहिला हिस्सा खरेदीदाराला परत जाईल. तुम्हाला मिळालेले पैसे पुढील पेमेंटमधून वळते केले जातील. हा ऑर्डर बंद झाला. |

The remaining states (shipped, delivered, reservation expiring, reservation cancelled, buyer checking report) are written with the same pattern during the build. The key-parity test makes sure none is forgotten. Buyer and reviewer messages are English only, with the same normal and simple versions.

---

## 6. Detailed Screen Specification

### Screen 0: Login and Language Chooser (`/login`)

**Purpose:** sign in, pick a language, or jump into a demo role.

1. **Language chooser (first visit only, full screen):** three large cards, **हिन्दी**, **मराठी**, **English**, each with a speaker icon that says the language name aloud. Choice is saved.
2. **Hero:** green leaf inside a shield. Title **Kisaan Kavach**. Subtitle: *"Money moves only after quality is checked."* (also in Hindi and Marathi).
3. **Sign-in card:** tabs `Sign in` | `Demo quick login`. Email and password. Session cookie.
4. **Demo quick login (for judges), four buttons:**
   - Buyer: `buyer@globalimports.com`
   - Seller, Hindi: `seller.hindi@kisaankavach.demo`
   - Seller, Marathi: `seller.marathi@kisaankavach.demo`
   - Reviewer: `arbiter@kisaankavach.org`
5. **Footer:** *"Demo mode: test money only. Data resets automatically when the server restarts."* Demo names are fictional.

### Screen 1: Buyer, Write Contract (`/buyer/orders/new`)

1. **Top bar:** role BUYER, language switcher, order search.
2. **Left: plain-language terms.** Textarea example: *"500 kg organic turmeric at $12/kg, moisture max 10%, lab check within 14 days"* (demo numbers). Button **"Draft contract with AI"** (Purple).
3. **Right: contract preview (AI wrote this, please check).** Editable fields: Product, Quantity, Price per kg, Total (`$6,000`), First payment (30%, `$1,800`), Final payment (70%, `$4,200`), Quality limits table (name, limit, unit; e.g. Moisture `no more than 10.0%`).
4. **Explain Simply wand** beside the preview.
5. **Action:** **"Confirm contract and reserve payment"**. Under it: *"Your money stays in your PayPal account until quality is checked. Reserved until 11 Dec 2026."*

### Screen 2: Buyer, Order Status (`/buyer/orders/[id]`)

1. **Progress steps:** `Contract` → `Payment reserved` → `Lab report check` → `First payment paid` → `Delivered` → `Final payment paid`.
2. **Payment reserved banner (amber):** reserved amount, PayPal reference, and the date until which it is reserved. Facts strip: Reserved `$6,000`, First payment ready `$1,800`.
3. **Lab report card:** shows *Certified lab file* or *Scanned lab report (you must check it)*. For scanned reports, a **"Check the report"** button opens the highlighted lines and **Approve / Reject**.
4. **Wand button** on the banner and on the lab report card.
5. **Action bar:** **"I received the goods, pay the final 70%"** (green). **"Report a quality problem"** (rose outline).

### Screen 3: Seller, Order Status and Upload (`/seller/orders/[id]`)

Built for a rural phone first. All text in Hindi or Marathi, English one tap away.

1. **Top bar:** role SELLER, language switcher (हिन्दी · मराठी · English), audio button.
2. **Message card:** big text in the chosen language, a large **Play** button (prerecorded audio, badge "Computer voice (pre-made)"), the **facts strip** (`$1,800` first payment, `until 11 Dec 2026`), and the **Explain simply** wand.
3. **Upload card:** drag-and-drop or "Take photo / choose file" for the lab report (PDF up to 5 MB, PNG or JPEG up to 3 MB). Clear error messages in the chosen language.
4. **Shipping card:** upload the shipping paper once the first payment is paid.
5. **Payments list:** Date, Type (`First payment 30%`, `Final payment 70%`, `Adjusted from future payments`), Amount (`$`), Status. Banner: *"Demo: test money only."*

### Screen 4: Reviewer, Quality Problem (`/arbiter/disputes/[id]`)

1. **Banner:** order number, date reported, deadline clock (the reservation end date minus 3 days).
2. **AI summary (neutral):** table of Contract limit, Seller's lab result, Buyer's independent lab result (e.g. Moisture limit `10.0%`, seller `8.0%` pass, buyer `12.5%` over the limit). Wand button gives the simple version.
3. **Side-by-side viewer:** seller's lab file next to buyer's lab file; photos with AI notes ("advice only").
4. **Decision buttons:**
   - **"Accept the claim: return first payment ($1,800) and cancel the rest ($4,200)"** (rose)
   - **"Reject the claim: pay the final $4,200 to the seller"** (green)

---

## 7. Figma Handoff Checklist

- [ ] No banned words anywhere in the design (check against Section 1).
- [ ] Label table (Section 2) applied to every badge, button and status.
- [ ] Hindi and Marathi mock-ups for every seller screen, with real text, not placeholder.
- [ ] Longest-string test: every button and label still fits when wrapped to two lines.
- [ ] Explain Simply button, motion, and "Simple view" state designed for status cards and AI texts, including the reduced-motion version.
- [ ] Facts strip designed as one reusable component.
- [ ] Demo ribbon visible on every screen.
- [ ] First-visit language chooser designed.
- [ ] Order states styled: reserved, checking, passed, first payment paid, problem reported, money returned, final payment paid.
- [ ] Every button has an icon.

## 8. Sources for the language figures

Census of India 2011 (mother tongue) via published tables; Census 2011 workers by state, from the Government of India's *Agricultural Statistics at a Glance* (2020 and 2022 editions, state-wise cultivators and agricultural labourers); Lok Sabha and Rajya Sabha replies giving 118.8 M cultivators and 144.3 M agricultural labourers (263.1 M total); Census 2011 executive summary (Uttar Pradesh 19.1 M cultivators and 19.9 M labourers); Business Standard / PTI for Tamil Nadu. State sums are my arithmetic. Re-check any single figure before quoting it publicly.
