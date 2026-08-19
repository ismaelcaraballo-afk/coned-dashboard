# CLAUDE.md — ConEd Steam Attrition Dashboard

**Purpose:** Engineering reference for anyone (human or AI-assisted) working in this repo. Companion to `system-v1.1.md` (design system, Fable) and `docs/ref/2026-07-16_fable-roadmap.md` + `roadmap-supplement-m0.md` (sequenced build plan). If a spec disagrees with this file about how to implement something, this file wins; if a spec disagrees with `system-v1.1.md` about *what* to implement, that file wins.

**Roadmap sources:** `docs/ref/2026-07-16_fable-roadmap.md` is Fable's narrative M0–M12 milestone plan (the "why + shape"). `ROADMAP.md` at the repo root is the derived dependency graph the build-ops skills consume (R-items reference their covering milestone as "covers M#"). Keep the two reconcilable; when a milestone changes, update both.

**Active design profile:** data-workbench.

**Vault pointer:** cross-project standing rules live at `~/vault/`. Before re-asking Ed about a preference, working style, identity framing, or design-language rule, `grep ~/vault` for it. Notes under `~/vault/design-language/` are standing instructions on this project, not suggestions; the `data-workbench` profile (above) applies on top of the core rules.

**Emitted:** 2026-07-14 · **Applies to:** the redesign integration cycle.

---

## Canonical references

- `system-v1.1.md` — voice, tokens, vocabulary, laws (L, H, R, W, D, C, M), copy rules, architecture notes the design depends on. Single source of truth for design.
- `docs/ref/2026-07-16_fable-roadmap.md` (Fable, 2026-07-13; intaken 2026-07-16) — M1–M12 sequenced build milestones. Narrative source of truth. Formerly `roadmap.md` at repo root.
- `roadmap-supplement-m0.md` — M0 (Legacy separation + routing), boundary rules, chatbot situation.
- `docs/ref/2026-07-13_ismael-q1-q10-response.md` — Q1–Q10 backend scopes.
- `docs/ref/2026-07-16_methodology-alignment.md` — Johan/Ildi methodology gap analysis, source for M10 section 8.

---

## Quick start

```bash
# Install
npm install

# Environment (copy template, fill values)
cp .env.example .env

# Run both frontend and backend
npm run dev
# → API on 3001, Vite dev server on 5173 (proxies /api → 3001)

# Run one at a time
npm run dev:api          # backend only
npm run dev:ui           # frontend only

# Build for production
npm run build            # writes dist/
npm start                # serves dist/ via api/server.js on 3001

# Tests
npm test                 # vitest run
npm run test:watch       # watch mode
```

Node 20 required (see `.node-version`).

### Local Postgres (M6 status events + W5 carry-over ages)

Postgres is optional in dev per D12 — the API logs a warning and continues if the DB is unreachable, but the Age column on `/this-week` and status-endpoint counts will be empty. Stand up a local instance to see the full W5 story.

```bash
# Start Postgres (postgres:16-alpine, port 5432, named volume for persistence)
docker compose up -d

# Ensure .env has DATABASE_URL + ACTOR_HMAC_SECRET (see .env.example)
# Then restart the API so it picks them up
npm run dev

# Seed a handful of status events against real Critical BBLs
# (21d/14d/7d/3d ages, actor="seed-script", idempotent)
node --env-file-if-exists=.env scripts/seed-status-events.js

# Wipe and rebuild
docker compose down -v && docker compose up -d
```

Dev scripts use `node --env-file-if-exists=.env` so `DATABASE_URL` is loaded before any imports run — necessary because ES-module import hoisting would otherwise run `db.js`'s `pg.Pool` constructor before `dotenv.config()`. `db.js` skips SSL for `localhost` connection strings; managed Postgres (Railway) still gets full TLS via `DATABASE_CA_CERT`.

---

## Repo layout

```
coned-dashboard/
├── api/                        Express backend
│   ├── server.js               Single entry, ~1,012 lines
│   ├── utils.js                Helpers (csvCell, validateSpec, sanitize)
│   ├── prompts/                LLM system prompts
│   └── smoke.test.js           Vitest smoke suite
├── src/                        React frontend
│   ├── main.jsx                Vite entry
│   ├── App.jsx                 Root; tab state; auth (~506 lines currently)
│   ├── components/             Feature components
│   ├── data/                   useBuildings hook + helpers
│   ├── hooks/                  useKeyboard, useUrlState
│   ├── lib/                    groqFilter helper for AIAgent
│   ├── test/                   Vitest setup + utils tests
│   └── index.css               Tailwind entry
├── public/                     Static JSONs served by API (NOT direct static exposure — all 403 unless via /api/data/*)
│   ├── buildings.json          Base building records
│   ├── buildingEnrichment.json Enrichment + ml_risk + diagnostic_risk + ml_drivers
│   ├── yearly.json             steam_2022/2023/2024 per address
│   ├── yoy_deltas.json         Normalized YoY deltas + outlier flags
│   ├── decline_trend_results.json
│   ├── noaa_degree_days.json
│   └── building_regression_results.json
├── docs/                       Project docs (PRD, model spec, schedule)
├── plans/                      Planning artifacts (phase1_noaa_pipeline, phase2_methodology_alignment)
├── fable-checkin-1-2026-07-12/ Fable Round 0 artifacts (v1.0 system.md, atom HTMLs)
├── fable-checkin-2-2026-07-13/ Fable Round 1 + Round 1.1 responses
├── fable-prompts-2026-07-13/   Prompts sent this cycle (00 execution plan, 02, 03, 04, 05)
├── *.py                        Data pipeline scripts (repo root; see §Pipeline)
├── Dockerfile
├── railway.json
├── vite.config.js
├── vitest.config.js
├── package.json
├── .env.example
└── .node-version
```

No `.github/workflows/` — CI/CD is not set up.

---

## Frontend architecture

- **Stack:** React 19 + Vite 8 + TailwindCSS 4. No CSS-in-JS.
- **Router:** React Router 7 (`react-router-dom`) mounted in `src/main.jsx`. `/` renders `src/App.jsx` (new-build stub during M0; workflow-focused build lands here M3+); `/legacy` renders `src/legacy/App.jsx` (frozen portfolio-view dashboard). Deep links resolve via an Express SPA fallback in `api/server.js` (any non-`/api/` GET returns `dist/index.html`).
- **State:** React hooks (`useState`, `useEffect`, `useCallback`, `useMemo`). `sessionStorage` for auth token. No Redux/Zustand.
- **Data flow:** `useBuildings(token)` in `src/data/useBuildings.js` fetches 4 endpoints (`/api/data/buildings`, `/enrichment`, `/yearly`, `/yoy-deltas`), merges by uppercased address, returns `{ buildings, loading, error }`. All components downstream consume this shape.
- **Auth flow:** password → `/api/auth/login` → session token → `Authorization: Bearer <token>` on every request → `/api/auth/check` for hydration.

### Key frontend files

| File | Role |
|---|---|
| `src/App.jsx` | New-build root. Stub until M3 (workflow-focused build lands here) |
| `src/main.jsx` | Vite mount point + React Router setup (`/` and `/legacy`) |
| `src/legacy/App.jsx` | Legacy portfolio-view root at `/legacy`. Frozen (no new features, no design updates) |
| `src/legacy/components/*` | Legacy runtime, self-contained. No cross-imports from new-build |
| `src/components/RiskTable.jsx` | (Legacy) sortable/filterable building table; M3 ships a new score-cell component under new-build |
| `src/components/BuildingPanel.jsx` | (Legacy) detail drawer; M4 ships the Spec 2 case-file header under new-build |
| `src/components/AIAgent.jsx` | Chatbot; **archived to `src/legacy/` in M0**, not in new build |
| `src/components/Watchlist.jsx` | Session watchlist (M6 migrates to Postgres) |
| `src/data/useBuildings.js` | Data hook, exports `riskTier`, `signalMeta`, `estimateScClass`, `isUncertain`, `recommendedAction` |
| `src/hooks/useKeyboard.js` | Keyboard nav (W6 command bar candidate) |
| `src/hooks/useUrlState.js` | URL query-string sync for filters |

### Vite proxy

`vite.config.js` proxies `/api/*` → `http://localhost:3001` during dev. Production serves everything from Express (`api/server.js` mounts `express.static(dist)`).

---

## Backend architecture

- **Framework:** Express 5.2. Single entry at `api/server.js`.
- **Middleware:** Helmet (CSP, frameguard, HSTS), `express.json` (16 KB limit), `express-rate-limit` (100 req/min general, 20 req/min `aiLimiter` on LLM endpoints, custom `loginLimiter` / `exportLimiter`). `trust proxy=1` when `NODE_ENV=production` (Railway TLS termination).
- **Auth:** in-memory `sessions` Map, 32-byte random tokens, hourly expiry sweep, max 10k sessions. `requireAuth` middleware validates `Authorization: Bearer <token>`.
- **Data loading:** at startup, `DATA_PARSED = { buildings, enrichment, yearly, yoyDeltas }` reads the four `public/` JSONs once. Endpoints serve from this in-memory cache. **JSONs are container-baked until M8 data-decoupling ships** (deferred per Ismael Q8; workaround uses `model_meta.run_date` for freshness anchors).
- **In-memory stores that M6 migrates to Postgres:**
  - `sessions` Map — session tokens (stays in memory; short-lived, not persistence-critical)
  - `watchlistStore` Map (grep `const watchlistStore = new Map`) — per-session watchlists (**M6 migrates** to Postgres status events table; `/api/watchlist/save` and `/load` become endpoints on the new table)
  - `proactiveDismissed` Map — per-session dismissed alert IDs (stays for now)
- **LLM:** Anthropic → Groq → OpenRouter fallback chain in `callLLM()`. Placeholder detection drops known template keys. Providers driven by `ANTHROPIC_API_KEY` / `GROQ_API_KEY` / `OPENROUTER_API_KEY`.

### API contract (current state — M1/M6/M7 amend these)

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/login` | none | Password → session token |
| POST | `/api/auth/logout` | Bearer | Invalidate token |
| GET  | `/api/auth/check` | Bearer | Verify + hydrate |
| GET  | `/api/data/buildings` | Bearer | Base building records |
| GET  | `/api/data/enrichment` | Bearer | Enrichment map keyed by uppercased address |
| GET  | `/api/data/yearly` | Bearer | steam_2022/2023/2024 by address |
| GET  | `/api/data/yoy-deltas` | Bearer | Normalized YoY deltas + outlier flags |
| GET  | `/api/buildings` | Bearer | Filtered/sorted/paginated buildings |
| GET  | `/api/alerts/proactive` | Bearer | Severity-ranked alerts, recomputed every 5 min |
| GET  | `/api/alerts/proactive/summary` | Bearer | Alert count by severity |
| POST | `/api/alerts/proactive/dismiss` | Bearer | Per-session dismissal |
| POST | `/api/watchlist/save` | Bearer | Save watchlist (**M6: migrates to status-events table**) |
| GET  | `/api/watchlist/load` | Bearer | Load watchlist (**M6: same**) |
| POST | `/api/query` | Bearer + aiLimiter | LLM filter-spec generation (legacy AIAgent) |
| POST | `/api/summarize` | Bearer + aiLimiter | LLM multi-building summary (legacy) |
| POST | `/api/explain` | Bearer + aiLimiter | FAQ + LLM answer (legacy AIAgent; **M1 rewrites the `ml_risk` FAQ answer** — find via the FAQ entry keyed `keywords: ["what is", "ml_risk", ...]` in `api/server.js`) |
| GET  | `/api/export/csv` | Bearer + exportLimiter | Paginated CSV export |
| GET  | `/api/meta` | Bearer | Dataset metadata + model version (**M1: sources from `model_meta.model_version`, not hardcoded**) |
| GET  | `/api/health` | none | Readiness check |

### New endpoints introduced by upcoming milestones

- **M1:** `/api/meta` sources model info from `model_meta.json` (no new route, just re-wiring).
- **M6:** `POST /api/buildings/:bbl/status` (append status event); `GET /api/buildings/:bbl/status` (hydrate current state = latest event). Also absorbs `/api/watchlist/save` and `/load` into the same table.
- **M7:** `GET /api/events` reading `events.json` produced by snapshot diffing.

### Data protection

`public/*.json` files are **not** exposed via `express.static` — they return `403`. All data flows through `/api/data/*` behind `requireAuth`. This is intentional: raw JSONs contain per-building enrichment we don't want scraped.

---

## Data pipeline

All scripts live at repo root (Python). Outputs land in `public/`. No orchestrator today; scripts run in dependency order manually or via Railway build hooks.

| Script | Purpose | Writes to |
|---|---|---|
| `kmeans_model.py` | K-means clustering into 5 archetypes | enrichment fields |
| `ll97_model.py` | LL97 penalty calculator + supervised GBM baseline | enrichment + model meta |
| `train_xgboost.py` | Hyperparameter search XGBoost vs GBM (~320 lines) | enrichment + **M1: `model_meta.json`** |
| `update_enrichment_risk.py` | Rule-based diagnostic risk tiering; **`compute_diagnostic_risk()`** implements the Path C hybrid chain (`system-v1.1.md` §4.1); no code change per Q1 | `buildingEnrichment.json`; **M1: also writes `model_meta.json`** on params-unchanged runs (refreshes `run_date` only) |
| `yoy_analysis.py` | YoY steam decline analysis (citywide HDD multiplier) | `yoy_deltas.json` |
| `noaa_degree_days.py` | NOAA CDO API monthly HDD/CDD; hardcoded Central Park fallback if no `NOAA_TOKEN` | `noaa_degree_days.json` |
| `building_weather_regression.py` | OLS regression (steam ~ HDD + CDD) for NYCHA 24 developments | `building_regression_results.json` |
| `decline_trend_analysis.py` | Trend acceleration/deceleration labeling | `decline_trend_results.json` |
| `compute_projected_deltas.py` | Forecast deltas | enrichment fields |
| `update_dob_jobs.py` | Parse DOB NOW HVAC/boiler permit counts | enrichment fields |
| `ll33_grades.py` | LL33 letter-grade heuristic | enrichment fields |
| `smoke_test.py` | Integration test suite | stdout only |

### The `model_meta.json` object (M1 target, per Ismael Q5)

Written by both `train_xgboost.py` and `update_enrichment_risk.py` (unchanged params refresh `run_date` only). Snake_case per Ismael. Read by API and every UI surface via `system-v1.1.md` §7 rules 8 and 9.

```json
{
  "model_name": "xgboost",
  "model_version": "XGB v1 · UNVAL",
  "params_hash": "<sha256 of best params JSON>",
  "commit": "<git HEAD sha>",
  "cv_auc": null,
  "cv_std": null,
  "cv_kfold": 5,
  "n_labeled": 1003,
  "n_positive": 54,
  "label_definition": "≥50% weather-normalized steam demand decline in LL84 CY2022 or CY2023",
  "run_date": "2026-07-01T06:00:00Z",
  "validation_status": "unvalidated"
}
```

`cv_auc` and `cv_std` populate after M2 (AUC rerun on chosen XGBoost config: `colsample_bytree=1.0, learning_rate=0.1, max_depth=6, n_estimators=300, scale_pos_weight=18, subsample=0.8`, 5-fold stratified `cross_val_score`).

---

## Environment variables

| Var | Purpose | Required |
|---|---|---|
| `DASHBOARD_PASSWORD` | Login password | **Yes** |
| `ANTHROPIC_API_KEY` | Primary LLM provider | One of three |
| `GROQ_API_KEY` | Fallback LLM provider | Optional |
| `OPENROUTER_API_KEY` | Second fallback LLM | Optional |
| `NOAA_TOKEN` | Live NOAA CDO API access | Optional (hardcoded fallback) |
| `PORT` / `API_PORT` | Server port | Default 3001 |
| `NODE_ENV` | Sets `trust proxy=1` in production | Default `development` |
| `SKIP_ENRICHMENT` | Skip proactive alert compute on startup (dev speed) | Optional |

`.env.example` provides placeholders. Real `.env` is gitignored.

---

## Deployment

- **Platform:** Railway.
- **Dockerfile:** Node 20-slim → `npm install` → `npm run build` → `npm prune --production` → `CMD ["node", "api/server.js"]` on port 3001.
- **`railway.json`:** restart on failure, max 3 retries.
- **Redeploy invalidates the in-memory sessions Map** — all users log in again. Same for `watchlistStore` (until M6).
- **JSONs are container-baked.** Any data refresh requires redeploy until full data-decoupling ships (deferred per Ismael Q8; workaround: `model_meta.run_date` reads honestly per run).
- **No CI/CD.** `.github/workflows/` does not exist; deploys are Railway-native from `main`.

---

## Legacy dashboard discipline (from `roadmap-supplement-m0.md`)

The current build is preserved after M0 as an unlinked demo hedge. Durable rules:

- **New-build files never import from `src/legacy/`.**
- **Legacy files never import from the new-build root or `src/next/`.**
- **Legacy files are frozen.** No design updates, no new features, no dependency upgrades that force refactors. Bug fixes only when a break would embarrass a demo.
- **The `/legacy` route stays unlinked.** No nav entry, no footer link, no discovery affordance from the new build.
- **Shared backend endpoints are treated as new-build-owned.** If a legacy surface breaks because a shared endpoint's contract evolved under M1/M6/M7, patch legacy to match or retire the affected legacy surface — case-by-case judgment, not automatic preservation.

### Chatbot situation (durable notes)

- Frontend `src/components/AIAgent.jsx` copies to `src/legacy/components/AIAgent.jsx` in M0; new build does not import AIAgent.
- Backend `POST /api/explain` handler in `api/server.js` stays live. The FAQ fallback array (grep for `keywords: ["how many", "buildings"`) is shared between surfaces. **M1 rewrites the `ml_risk` FAQ answer** — the entry keyed `keywords: ["what is", "ml_risk", ...]` — to remove the stale "GBM" reference and the L1-violating probability phrasing (per `system-v1.1.md` §7 rule 9 and ledger #20).
- A future "ask about this building" contextual affordance inside Spec 2 is a Round 2 design conversation with Fable — not in this roadmap.

---

## Key files map (milestone anchor)

| Milestone | Files it touches |
|---|---|
| M0 | Router setup in `src/App.jsx` or new `src/routes.jsx`; file moves to `src/legacy/`; `vite.config.js` (SPA fallback if needed) |
| M1 | `train_xgboost.py`, `update_enrichment_risk.py` (both write `model_meta.json`); `/api/meta` handler in `api/server.js` (currently hardcodes `model_version: "GBM-v1+SHAP"` — rewire to `model_meta.model_version`); FAQ `ml_risk` answer rewrite (find via `keywords: ["what is", "ml_risk", ...]`) |
| M2 | `train_xgboost.py` (add `cross_val_score` runner); freshness residual named in `update_enrichment_risk.py` output |
| M3 | New score cell component under `src/components/` or `src/next/`; wired into `RiskTable.jsx` replacement |
| M4 | New case-file header component; replaces `src/components/BuildingPanel.jsx` in new-build routes |
| M5 | New report template + PDF plumbing (Puppeteer against print stylesheet per Fable M5) |
| M6 | New `api/db.js` (Postgres client); schema migration script; new endpoints in `api/server.js`; retire watchlist Map |
| M7 | New pipeline hook writing `public/events.json`; prev-file diff logic before each run |
| M8 | Queue component; modifier chip filter logic; Critical membership computed from existing fields |
| M9 | This Week landing composition; topbar with `model_meta.run_date` |
| M10 | Methodology page component or static MDX; nine-section content authored by Edwin |
| M11 | Queue aggregate view toggle inside M8's queue component |
| M12 | Digest template + compose UI; mailto/clipboard send |

---

## Testing conventions

- **Framework:** Vitest 4.1.9 with jsdom.
- **Test files:** `api/smoke.test.js`, `src/test/utils.test.js`. Coverage is thin — smoke tests for CSV escape, spec validation, injection prevention.
- **Setup:** `src/test/setup.js` (globals enabled).
- **Convention going forward:** every new milestone that adds an endpoint or a computed field should add a corresponding smoke test in `api/smoke.test.js`. Component tests are optional (no framework mandated yet; if adding, use `@testing-library/react`).
- **No CI running tests automatically.** Run `npm test` locally before pushing.

---

## Git conventions and PR flow

- **Base branch:** `main`. Deploys to Railway on push.
- **Branch naming:** `<owner>/M<n>-<slug>` for milestone work (`pedro/M3-score-cell`, `ismael/M1-model-meta`, `edwin/M10-methodology-page`).
- **One PR per milestone** where possible. If a milestone splits (e.g., M4 build vs M4 copy strings), the PRs should be tagged with the shared milestone number in titles.
- **PR description should list:**
  - Which acceptance criteria from `docs/ref/2026-07-16_fable-roadmap.md` are met (quote the criterion or ✓ each)
  - Which `system-v1.1.md` laws the change respects (L1, W3, M2, etc.)
  - Any deviations from the spec with justification
- **Do not skip hooks** (`--no-verify`). If a pre-commit hook fails, investigate and fix.
- **Superseded branches** (Edwin's): `edwin/ll33-and-steam-yoy-viz`, `edwin/ll97-gauge-and-shap-drivers` — do not merge; the Fable redesign supersedes them (see memory).
- **Active branches to be aware of:** `spike/threshold-proximity` — investigate before merging/discarding.

---

## Cross-references quick index

| Question | Look in |
|---|---|
| What copy goes in the case-file ledger's middle column? | `system-v1.1.md` §5 Components (Claim ledger row), §4.1 |
| What's the exact XGBoost config for M2? | `docs/ref/2026-07-13_ismael-q1-q10-response.md` Q4 |
| How is the tier computed? | `compute_diagnostic_risk()` in `update_enrichment_risk.py`, `system-v1.1.md` §4.1 |
| What fields are in `model_meta.json`? | This file §Pipeline; `docs/ref/2026-07-13_ismael-q1-q10-response.md` Q5; `system-v1.1.md` §9 |
| Where's the AUC copy template? | `system-v1.1.md` §7 rule 8 |
| Where's the legacy dashboard boundary rule? | `roadmap-supplement-m0.md`; this file §Legacy |
| What did Ismael scope for pipeline work? | `docs/ref/2026-07-13_ismael-q1-q10-response.md` Q6/Q7/Q8 |
| What methodology alignment content lands where? | `docs/ref/2026-07-16_fable-roadmap.md` §Methodology alignment; `docs/ref/2026-07-16_methodology-alignment.md` §3 |

---

## Maintenance

Update this file when:
- A new endpoint ships (add to API contract table)
- A milestone completes and the files-it-touches map is now real, not planned
- A new environment variable is required
- A dev command changes
- The deployment platform or process changes
- A durable convention gets established (branch naming, PR description shape, etc.)

If a milestone completes but this file doesn't reflect it, the miss belongs to whoever landed the milestone. Same discipline as `system-v1.1.md` §maintenance rule.
