---
last_synced_sha: a1479f3
last_synced_at: 2026-08-18T21:16-0400
---

# Project State

Current snapshot only. Rewritten by /sync. History lives in STATE_LOG.md. Hard cap 150 lines.

## Built
- Auth: password → session token, hourly expiry, 10k session cap (api/server.js). SHA-256 hash-both-sides comparison + loginLimiter 5/15min. Themed login form on /this-week (D20) retires legacy hop for new-build demo path.
- Data pipeline: 13 Python scripts + Node runner. Outputs baked into public/*.json at deploy time. Snapshot diffing on the volume emits events.json in §4.3 grammar (R8/M7 via bfceafd). Pipeline runner + first enrichment with outlier fields landed (d9c9311). Atomic enrichment write + JSONB cast fixes (bc3e112).
- Risk engine: XGBoost + rule-based hybrid. AUC 0.683 · 57 High / 5 Med / 1148 Low ml_risk; 245 High / 600 Med / 290 Low / 75 Uncertain diagnostic. ml_drivers written per-building via SHAP top-5 in train_xgboost.py (cc62ace, closes Q1).
- model_meta.json live at data/model_meta.json. All AUC render sites read cv_auc, null-when-unavailable.
- API on main: auth, data, alerts, watchlist (Postgres — R7 second half shipped 2df5bf7), LLM fallback chain, CSV export, /api/predict/* (four endpoints), /api/model_meta, /api/buildings/:bbl/status POST+GET, /api/events feed with M6 status events merged in (PR #31 / cd9f5be).
- Postgres status-events backbone: api/db.js, initSchema in tx + CREATE INDEX CONCURRENTLY, ACTOR_HMAC_SECRET fail-fast in prod, statusReadLimiter, DISTINCT ON, DATABASE_CA_CERT for full TLS verification. Non-fatal in dev (D12).
- Frontend R4–R13 all shipped: ScoreCell atom + Rankings container (R4). CaseFileHeader + adapter + ErrorBoundary wrap (R5). Report route + print CSS + Puppeteer PDF (R6). Snapshot diff → events.json feed (R8). CriticalQueue + modifier chips (R9). ThisWeekPage assembly with topbar + queue + pulse (R10). Methodology page 9 sections (R11, PR #26). Queue aggregate view toggle (R12, PR #30). Weekly digest + compose flow (R13, PR #29). D20 themed login + D21 ⌘K palette shipped via PR #32.
- Security hardening (PR #34): mergeStatusEvents SSL/dedup/date guard, buildDigest escape + pulse encoding, ll97Bands null guard.
- Login polish follow-ups on edwin/login-polish (PR #35 open): drop surface lede (752f294) + hold loading through 420ms parting animation (7af6a95). Reconciles the local 6835d59 divergence.
- Handoff structure: docs/handoffs/ tracked with design + presentation subdirs (a1479f3). Root HANDOFF.md remains gitignored/hook-managed.
- Legacy UI (R1): frozen React 19 + Vite 8 + Tailwind under src/legacy/. Self-contained. AIAgent legacy-only.
- Build-ops scaffold: ROADMAP (R1–R14), DECISIONS (D1–D21), STATE_LOG, PROJECT_STATE, DISTILLED_GOALS, docs/ library.
- Fable design system: system-v1.1.1, five spec HTML atoms, per-person briefs, methodology round 1/2/3 copy passes applied.
- Prod deploy: Railway URL https://coned-attrition-prediction-model-production.up.railway.app on Pedro's paid account. Password coned-steam-2026. ACTOR_HMAC_SECRET set 2026-08-16. DATABASE_CA_CERT base64 CA bundle wired in db.js + mergeStatusEvents.mjs.

## In Flight
- PR #35 open (edwin/login-polish). Two-commit login polish. No reviewers requested yet; awaiting Ismael eyeball for parity with PR #32 review discipline.
- Login v2 rewrite WIP still unstaged in prior working tree (LoginForm.jsx, LoginForm.css, CommandPalette.css, ScoreCell.css, ThisWeekPage.jsx, ThisWeekPage.css) — belongs to Ed's parallel session. Folds into deferred design bundle.
- Deferred design bundle (per project_deferred_design_pass memory): login v2 rewrite + global nav topbar/logo + micro-animations, one PR, ahead of Wednesday ConEd leadership walk demo prep. Login polish (PR #35) carved off as separate small PR — bundle scope unchanged.

## PRs awaiting review
- PR #35 (Edwin) — login polish, drop lede + parting flash fix. No reviewer requested yet. Not blocking; polish on already-merged D20.

## Blocked
- Demo prep (tech stack slide, persona script, Q&A prep bank) blocks on deferred design bundle landing first — bundle changes the surfaces the demo walks through.
- R14 (David packet external sign-off) — Edwin, 34 days.

## Open Commitments
- 2026-08-18 | Edwin: deferred design bundle (login v2 rewrite + global nav topbar/logo + micro-animations under 200ms) as one PR before Wednesday demo prep. PR #35 carved off polish; bundle scope holds.
- 2026-08-18 | Edwin: after design bundle lands, produce demo prep artifacts (tech stack slide, persona demo script, Q&A prep bank).
- 2026-08-18 | Edwin: verify whether bfceafd closed Q4 (model_meta.feature_importances write at train_xgboost.py:340). Commit message claims it; QUESTIONS.md still lists open. Update Q4 status.
- 2026-08-18 | Edwin: Q5 Railway env eyeball via Pedro screen-share (DATABASE_URL, ANTHROPIC_API_KEY, DASHBOARD_PASSWORD, ACTOR_HMAC_SECRET, NODE_ENV=production, DATABASE_CA_CERT).
- 2026-08-14 | Edwin: answer Ismael's Zoom recording request. Committed 2026-08-16 to answer this week. 5 days elapsed.
- 2026-07-17 | Ismael: five D8 post-merge follow-ups for PR #10 (CHECK constraint drift, smoke tests /api/buildings/status/*, SERIAL → BIGSERIAL, bulk/single response-shape parity, DB_POOL_MAX ceiling). 32 days.
- 2026-07-16 | Edwin: R14 David packet item #5 external sign-off (Critical v1.1 with n=23). 34 days.

## Retired this sync
- 2026-08-18 | Edwin: reconcile local 6835d59 vs merged PR #32 — DONE. Lede drop ported to edwin/login-polish as 752f294, rolled into PR #35.
- 2026-08-18 | Edwin: docs/handoffs/ untracked (design + presentation subdirs) — DONE via a1479f3.

## Current Risks
1. **Q4 status ambiguity (unchanged).** bfceafd commit claims Q4 write shipped; QUESTIONS.md still lists open. Docs and code disagree. Verify before methodology §2 model-level table renders wrong.
2. **Deferred design bundle scope creep.** Login v2 + topbar/logo + motion is three surfaces. Handoff frames as one PR; discipline required. PR #35 correctly carves off polish (D20 already merged) but bundle itself still needs to hold as one PR.
3. **Ismael D8 post-merge follow-ups still open at 32 days.** Not blocking demo but accumulating drift on the M6 backbone.
4. **Wednesday ConEd leadership walk.** Design bundle must land in time; demo prep artifacts must not start early. Sequencing per handoff is load-bearing.
5. **PR #35 no reviewer.** Small polish PR shipped without requesting Ismael review; low risk but breaks the PR #32 review pattern.

## Team Updates (append here)
<!-- Ismael, Pedro: when you push, or when something happens off-git,
add an entry per docs/ref/CONVENTIONS.md. Agent-written entries welcome
in the same format. This section is folded into the log and cleared
during sync. -->
