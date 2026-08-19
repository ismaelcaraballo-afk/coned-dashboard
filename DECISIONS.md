# Decisions

<!-- distill-watermark: none | never -->

Append-only decision log. The why lives here, exactly once. STATE_LOG and ROADMAP reference decisions by ID, never repeat rationale.

Format:

## D1 | YYYY-MM-DD | <decision title>
Context: <what forced the choice, one to two lines>
Decided: <what was chosen>
Rejected: <what was not chosen and the one-line reason, if useful>
Affects: <roadmap IDs, modules>

---

## D1 | 2026-07-16 | Adopt build-ops state management for this repo
Context: Project had grown to 13+ milestone docs with no shared snapshot, no dependency graph, and state tracked only in user-level auto-memory (prone to staleness and not visible to teammates).
Decided: Install build-ops state management (PROJECT_STATE.md, ROADMAP.md, DECISIONS.md, DISTILLED_GOALS.md, STATE_LOG.md, SESSION_JOURNAL.md, HANDOFF.md, docs/ library). Canonical project state lives in these files, not in the auto-memory system. Auto-memory entries now point at repo docs as source of truth rather than duplicating content.
Rejected: Continuing with auto-memory as canonical (too fragile, not team-visible, drifts 41+ days between updates without enforcement).
Affects: All R-items (dependency graph source), PROJECT_STATE.md (team sync surface).

## D2 | 2026-07-16 | PR-9 split via Path A (9a/9b/9c) instead of bundled merge (Path B)
Context: PR-9 bundled R2 + R3 + R7-partial backend with W1/W4/W6 frontend on RiskTable.jsx and BuildingPanel.jsx, which R4/R5 will replace after Pedro's R1 lands. A bundled merge would freeze workflow features in src/legacy/ and force R9 to reimplement contact/dismiss + queue arithmetic from scratch.
Decided: Split into three PRs. PR-9a = R2+R3 backend (merges after Edwin FAQ copy pass). PR-9b = R7 status events backbone + security fixes (mergeable immediately, independent of R1). PR-9c = W1/W4/W6 frontend (parked until R1 lands, then Ismael rebases against new-build components).
Rejected: Path B bundled merge. Cheaper to merge now but pays the cost later in duplicated queue logic and legacy-freeze of demo-useful features.
Affects: R2, R3, R7, R9 (queue reuse of W4 arithmetic), PR-9 open on ismaelcaraballo-afk/coned-dashboard.

## D3 | 2026-07-16 | Edwin R1 contingency: absorb M0 legacy separation if Pedro has not started by end of 2026-07-16
Context: R1 (M0 legacy separation, Pedro) is unstarted and unblocks all Fable milestones R4 through R13 plus the PR-9c rebase. Confidence in Pedro delivering tonight is uncertain. Delaying R1 delays everything downstream and increases PR-9 boundary risk.
Decided: Wait for Pedro until end of 2026-07-16. If he has not started by then, Edwin absorbs R1 solo. Requires editing Pedro's checkpoint brief on GitHub + adjusting the Slack message already sent. Pedro remains owner of R4 through R13 either way.
Rejected: Immediately reassign R1 to Edwin (loses Pedro's onramp to the Fable arc). Reassign R1+R4+R5 wholesale (too much load on Edwin; Pedro's frontend depth needed for design implementation work).
Affects: R1, R4 through R13 downstream sequencing, PR-9c rebase timing.

## D4 | 2026-07-16 | Cross-project workflow-layer designs live in ~/vault/workflow/; ConEd case study stays untracked in coned repo
Context: Session produced a workflow-layer note capturing patterns that generated the PR-9 review and Pedro checkpoint. Content mixed cross-project design principles with ConEd-specific evidence. Filing everything to the coned repo would leak ambient design work into a client-facing team surface; filing to vault alone would lose the case-study context.
Decided: Split. Design notes go to ~/vault/workflow/ (choreography-layer, pr-review-skill, teammate-brief-skill, work-commitments-tracker) and snapshot to atelier for git preservation. ConEd-specific case study stays as docs/notes/2026-07-16_workflow-layer-ideas.md, untracked in the coned repo (local file only).
Rejected: Push case study to coned repo (unnecessary team-facing surface). Delete case study entirely (loses "organized files are only half the job" lesson anchored to the incident that produced it).
Affects: Future PR reviews and teammate briefs across projects; atelier vault snapshot.

## D5 | 2026-07-16 | R1 contingency (D3) triggered — Edwin absorbs M0 legacy separation
Context: D3 set end-of-2026-07-16 as the deadline for Pedro to start R1. As of 21:49 sync, no Pedro branch exists on any remote and no commits since 2026-07-14. Waiting further compounds delay on every downstream Fable milestone (R4–R13) and on the PR-9c rebase. Pedro is not off the arc — he stays owner of R4 through R13, where his frontend depth is needed.
Decided: Fire D3. Edwin opens branch `edwin/M0-legacy-separation` and executes R1 per `roadmap-supplement-m0.md`. Pedro's checkpoint brief marked SUPERSEDED with a header note pointing him at R4 for his next entry point. Slack message to Pedro/team is Edwin's manual follow-up (not automated). Pedro remains owner of R4–R13.
Rejected: Extend Pedro's deadline (delays entire downstream Fable arc). Reassign R1+R4+R5 to Edwin wholesale (overload; loses Pedro's frontend depth on the design implementation milestones).
Affects: R1 (owner: Pedro → Edwin), R4–R13 (owner still Pedro, unblock timing now depends on Edwin's R1 pace), PR-9c rebase (still waits on R1, source now different).

## D6 | 2026-07-17 | Repurpose SUPERSEDED Pedro checkpoint as fresh M3 kickoff delta
Context: The 2026-07-16 Pedro checkpoint was marked SUPERSEDED after D5 fired, with a banner header telling Pedro to ignore the "start R1 now" line. Pedro is a fluency-sensitive audience; a read-with-warning doc creates a load he must actively remember to discount every read. Two paths considered: delete outright, or rewrite as a fresh delta targeting the actual next task (M3 score cell).
Decided: Delete `docs/briefs/2026-07-16_pedro-checkpoint.md`, write `docs/briefs/2026-07-17_pedro-m3-kickoff.md` as a clean delta on top of the 2026-07-13 milestone brief. Delta covers PR-9 split status, model_meta mock pattern to avoid PR-11 dependency, exact new-build vs legacy code boundaries, setup checklist, ping-Edwin trigger list. Same file swap in DOCS_INDEX.
Rejected: Keep the SUPERSEDED doc as-is (fluency trap). Delete without replacement (loses the delta scaffolding value; forces Pedro back into the full 2026-07-13 brief cold).
Affects: `docs/briefs/2026-07-17_pedro-m3-kickoff.md` (new), `DOCS_INDEX.md`, teammate-brief-skill pattern (evidence that delta docs need refresh not warning banners when facts shift).

## D7 | 2026-07-17 | ml_risk framed as "ranking" not "likelihood" in v1.1 copy, coupled to model-deepening deferral
Context: ConEd intake (docs/ref/2026-05-04_coned-intake-form.md) asked for "high-probability drop-off" flagging with ≥70% back-tested recall on major usage drops. What we shipped is XGBoost with CV AUC 0.68 on a ≥50%-LL84-decline label — pairwise ranking accuracy, not calibrated probability, and not against the intake's early-warning benchmark. The dual-layer model plan (docs/briefs/2026-07-13_model-plan-for-fable.md §4 + plans/phase2_*/phase3_ui_dual_tier.md) is deferred pending ConEd disconnect records (blocked on the data-sharing arrangement). This cycle lifts the workflow/UI first; model deepening returns after and unlocks the intake's original phrasing honestly. Filing note: the DOCS_INDEX summary line for the intake runs longer than the ref/ section average on purpose — it does grep double-duty as both the founding-scope-doc pointer and the source-of-reframed-phrasing pointer. Both are load-bearing for future model and copy work; a formulaic short line would force a separate note elsewhere to carry the reframing history. This is the reference case for the DOCS_INDEX "intentional grep double-duty" exception clause added the same session.
Decided: Every v1.1 surface reframes ml_risk as a ranking, not a probability. Vocabulary: "per-building ranking," "orders buildings by attrition signal," "base input to the diagnostic tier." Never "likelihood," "probability," "% chance." Quality claim uses §7 rule 8 template ("ranks a true churner above a non-churner {auc_pct}% of the time"). Client's intake-form phrasing is preserved as the return goal, not the current claim. Chip stays "XGB v1 · UNVAL" until back-testing lands ("XGB v2 · BT nn%" per §4.4). Applies to FAQ ml_risk answer, score cell, case-file ledger, methodology page, digest — every surface where ml_risk is asserted.
Rejected: Mirror client's intake vocabulary as-shipped (overpromises epistemic weight of 0.68 CV AUC on a ≥50%-decline label; L1 violation). Defer the redesign until model deepening lands (loses six weeks of workflow lift the client can use in the interim).
Affects: R2 (ml_risk FAQ), R4 (score cell), R5 (case-file header ledger), R6 (report), R10 (landing), R11 (methodology page), R13 (digest); system-v1.1.md §1/§7 rule 8-9/§8 rule 1-2/§10 ledger #20; PR #11 FAQ copy pass.

## D8 | 2026-07-17 | Post-Railway-redeploy verification split by ownership
Context: Railway auto-deploy has been silently failing since 2026-06-30 13:17 ET; three commits from two owners are stuck in the backlog (523597d + 36844c2 Ismael, 44dd42c Edwin). Default framing was Edwin runs a single verify pass against prod after redeploy, since Task #2 was already Edwin's. Alternative surfaced: verify by author, since the builder catches surface-behavior anomalies faster on their own code.
Decided: Split the post-redeploy verify by ownership. Ismael verifies his shipped features (XGBoost predict endpoints + diagnostic tier filter in RiskTable; Helmet CSP, rate-limit, input sanitization headers/behavior). Edwin verifies M0 (/ new-build stub, /legacy archived dashboard, deep-link refresh survives, login round-trip). Slack ping to Ismael includes this split explicitly. Task #2 stays with Edwin but scope narrows to M0 only.
Rejected: Edwin verifies everything (loses builder-side pattern recognition on the security and XGBoost surfaces; also compresses one person's plate for no reason). Skip verification of Ismael's features (they have been unshipped for 18 days; first hit against prod is high-signal, worth confirming).
Affects: Task #2 scope, Ismael Open Commitment (adds verify step to redeploy commitment), Slack ping shape.

## D9 | 2026-07-17 | Discard local branch spike/threshold-proximity
Context: Local-only branch (no remote counterpart) last touched 2026-06-03 by Ismael. Tip commit 222b89f "Add Uncertain tier, LL97 stats, signal filters, sparklines, SC segment CSV" predates the entire Fable design cycle and M0 legacy separation — 44 days stale, 67,898 lines behind main. Investigated whether any code was salvageable. Findings: (a) build_comparison_csv.py, docs/project-{scope,requirements,schedule}.md, signal filter, Uncertain tier / isUncertain, and ll97_model.py (now 420 lines on main vs spike's 330) all already landed on main via later commits or independent reimplementations; (b) two features never ported — SteamSparkline component (~48 lines, BuildingPanel.jsx) and LL97 stats bar (~30 lines, RiskTable.jsx). Both use pre-Fable Tailwind hex colors and inline styles; neither would drop into main cleanly and would need re-implementation against system-v1.1.md tokens if the pattern is next needed. Recovery: commit SHA 222b89f preserved in reflog for 90 days (until ~2026-10-15); recover via `git branch <name> 222b89f` or `git fsck --lost-found`.
Decided: Discard the branch (`git branch -D spike/threshold-proximity`). Design intent captured in this D-entry; code not worth carrying. Sparkline pattern is a candidate concept for M4 (case-file header) — future builder should reference this D-entry.
Rejected: Keep as reference branch (rots further, confuses future sessions, reflog preserves the commit anyway). Cherry-pick sparkline or stats bar to main (pre-Fable styling; would be rebuilt against system-v1.1.md tokens from scratch when the pattern is next needed).
Affects: Task #4 closed. M4 case-file header (Pedro) — sparkline pattern candidate; concept lives here rather than as a QUESTIONS entry.

## D10 | 2026-07-18 | Move prod deploys to Pedro's Railway account
Context: 13 deploys stuck at NEEDS_APPROVAL on the current Railway account since 2026-07-14 (deployment protection enabled at project level). Ismael manually approved via API but flagged the workflow as unsustainable. On 2026-07-18 Ismael executed a manual `railway redeploy --from-source --yes` → deploy 69f0a320 SUCCESS, unblocking the 18-day backlog (Pedro's M0, 523597d XGBoost predicts, 36844c2 security hardening). Prod is currently live and stable on the old account. Pedro's Railway account is a paid plan with no deployment protection, so merges to main would auto-deploy again without manual approval.
Decided: Migrate prod deploys to Pedro's Railway account. Pedro links coned-dashboard repo to a new Railway service and shares deploy URL. Mel migrates env vars (DASHBOARD_PASSWORD, GROQ_API_KEY, OPENROUTER_API_KEY, NODE_ENV, SKIP_ENRICHMENT) to the new service. Edwin holds PR #10 and PR #11 merges until the new Railway is live so the first merge deploys clean. Ismael adds ACTOR_HMAC_SECRET to the new Railway env before PR #10 can merge (random fallback silently destroys audit history across redeploys per f5bfd17 startup guard).
Rejected: Disable deployment protection on the old account (removes the immediate gate but keeps the manual-approval workflow as latent risk; the underlying reliability issue is the account's protection posture and manual friction, both structural). Continue manual redeploys per merge on the old account (unsustainable per Ismael 2026-07-17 23:51 Slack; every push carries NEEDS_APPROVAL friction).
Affects: Task #5 CLOSED (Ismael Railway diagnosis + manual redeploy done). PROJECT_STATE Risk #1 (Railway auto-deploy stall) supersedes to Risk #1' (migration in flight; deploy-clean discipline gates PR #10/#11). PR #10 merge blocked on new Railway env with ACTOR_HMAC_SECRET set. PR #11 merge blocked on new Railway service being live. D8 verify split still applies — Edwin verifies M0 on current live prod (Ismael's Slack assignment of M0 verify to Pedro overridden silently per D8; no ping-back).

## D11 | 2026-08-15 | Reject composite-risk-as-primary flip; keep composite as secondary field
Context: Commit aecde22 on ismael/pr-9c-frontend-workflow (2026-07-28) flipped the primary UI `risk` field from `ml_risk` (XGBoost) to a client-side composite weighted score across eight signals (ll97_penalty, steam_decline, energy_star_inv, eui, ll97_over, dob_jobs_inv, ml_risk, ghg), relabeled the primary display from "Attrition Risk" to "Composite Risk Score" across BuildingPanel / RiskTable / RiskHistogram, and mirrored the change into src/legacy/data/useBuildings.js. Commit message cites "panel consensus" with no D-entry, no spec update, and no cross-reference to system-v1.1.md or Pedro's M3 kickoff. Review pass against redesign docs found the framing question already resolved on the opposite side: M3 spec binds primary display to percentile-of-ml_risk + diagnostic_risk (fable-roadmap.md line 29, pedro-m3-kickoff.md lines 38-41); §7 rule 7 says the legacy `risk` heuristic "never renders as a headline number"; §8 rule 1 says ml_risk is a ranking with percentile display; D7 established every v1.1 surface reframes ml_risk as a ranking, not demotes it. Steelman for the flip (UNVAL defensibility, weak AUC 0.683, /api/predict/custom weight-tuning UX) is legitimate design input but was not filed as an alternative before the code shipped. Legacy modification also violates the frozen-legacy rule in CLAUDE.md and roadmap-supplement-m0.md.
Decided: Revert the primary-binding and labeling changes from aecde22 on PR #12. Restore `risk = ml_risk` (strict revert to pre-aecde22 binding; M3-spec percentile binding lands in M3 work, not smuggled into PR #12). Restore "Attrition Risk" language on BuildingPanel section header, RiskTable "Attrition Score" column, RiskHistogram subtitle. Fully revert src/legacy/data/useBuildings.js changes — legacy is frozen. Keep the composite compute infrastructure in src/data/useBuildings.js exposed as a secondary field `composite_risk` (not written into `risk`); it is real work with future use for filter/queue logic and the /api/predict/custom weight-tuning surface. The DECISIONS.md entry now exists so this question is not silently re-litigated in a future commit; any future proposal to promote composite to primary must file its own D-entry against this one.
Rejected: (a) Bless the flip and update docs (Option A) — would require rewriting M3 acceptance criteria, §7 rule 7, §8 rule 1, and D7 mid-cycle; the flip is a material redesign choice, not a polish, and the panel consensus was not documented at design time. (b) Revert the entire commit including composite compute (Option B strict) — throws away useful infrastructure the /api/predict/custom endpoint needs downstream. (c) Merge as-is with a follow-up D-entry (Option D) — normalizes shipping architecturally significant changes without decision anchors, and drift compounds across teammates.
Affects: PR #12 (needs surgical revert before merge). system-v1.1.md §7 rule 7 and §8 rule 1 (reaffirmed, no change). D7 (reaffirmed). M3 kickoff brief (unchanged). aecde22 (partial revert required). Composite score infrastructure preserved as `composite_risk` field for R11 methodology surfaces and future weight-tuning UX. Convention reinforced: architectural changes to primary display bindings require a filed D-entry before merging, not after.

## D12 | 2026-08-17 | Make db init non-fatal outside production (option C over Docker or eyeball-only)
Context: After PR #18 (regex fix) landed, `npm run dev` still crashed at `[db] FATAL: schema init failed:` because `initSchema()` in api/server.js calls `process.exit(1)` unconditionally. No local Postgres running. Blocks M4 container eyeball and any future frontend contributor without a DB. Three options considered: (A) eyeball M4 preview route only, defer container verification; (B) stand up Docker Postgres locally; (C) file a small PR gating the hard-fail on NODE_ENV=production so dev logs a warning and boots anyway.
Decided: Option C. Filed as PR #19. Production behavior unchanged (still exits 1). In dev, warns and starts the server; status endpoints 500 per-request, which CaseFileContainer already handles via its warn banner.
Rejected: (A) leaves the container unverified against real data and pushes the problem forward; (B) adds ops burden every frontend contributor pays forever to solve a dev-only problem.
Affects: api/server.js (initSchema call site, lines 1466-1479). Sets convention that dev-only environmental blockers should be gated on NODE_ENV rather than mandated as setup. Container eyeball unblocked once #19 merges (or via local branch checkout in the interim).

## D13 | 2026-08-17 | M4 container ships read-only against status endpoint; POST wiring deferred
Context: M4 container adapter (edwin/M4-case-file-container, b737df0) wires the case-file header to real data through `/api/data/*` + `/api/model_meta` + `GET /api/buildings/:bbl/status`. Question was whether to also wire the status segment as an interactive writer (POST /api/buildings/:bbl/status) inside this PR or defer.
Decided: Ship read-only. Status segment renders the 6 states from the latest event but does not accept input. POST wiring lands as a separate follow-up PR.
Rejected: Bundling POST into the M4 container PR — scope creep, would gate M4 review on a second surface (write UX + optimistic update behavior + toast/error patterns) that has no design anchor in Fable spec 2 yet.
Affects: edwin/M4-case-file-container. Follow-up PR to be filed after M4 lands. Does not affect the M6 backend contract, which is already Postgres-backed on main.

## D14 | 2026-08-17 | M5 puppeteer variant: full bundled chromium over @sparticuz/chromium
Context: /api/report/:bbl.pdf needs a browser to render /report/:bbl. Two candidates: full puppeteer (bundled chromium, zero config, ~170MB image add + system libs) vs puppeteer-core + @sparticuz/chromium (Lambda-oriented, mechanical wiring, smaller cold-start).
Decided: Ship full puppeteer as runtime dep. Isolated all Puppeteer usage in api/pdf.js so a future swap is one-file if Railway image size bites.
Rejected: puppeteer-core + @sparticuz/chromium — designed for serverless size limits that do not apply to Railway's long-running container; wiring overhead not justified without evidence of a problem.
Affects: api/pdf.js, Dockerfile (chromium system deps), package.json. Graceful degradation per roadmap §M5 covers the worst case (browser print-to-PDF of /report/:bbl).

## D15 | 2026-08-17 | M5 temp adapter to avoid stacking on M4
Context: R1 requires the report to be a projection of the M4 case-file header, ideally by consuming the same adapter. But M4 (#21) is still in review and stacking M5 on it would gate M5 review on M4 review, and force re-rebase on M4 iterations.
Decided: Ship src/next/reportAdapter.js as a temp local adapter mirroring caseFileAdapter.jsx shape. TODO(M4-merge) marker in place. Swap import + delete temp when #21 lands, at which point R1 becomes a code-level guarantee rather than a mirrored derivation.
Rejected: (a) stacking on M4 branches — review coupling; (b) waiting for M4 to merge before scaffolding M5 — burns the session, blocks parallelism.
Affects: src/next/reportAdapter.js (deletable), src/next/ReportPage.jsx (import swap). PR #24 body flags the deviation.

## D16 | 2026-08-17 | Defer R5 review-confirmed flow (removes DRAFT watermark) to after M6
Context: R5 requires "a human signs it" + DRAFT watermark until review confirmed. Ismael owns M6 (status events endpoint), which is the natural home for a "reviewed" state.
Decided: Ship DRAFT watermark hardcoded on. Review-confirmed flow deferred to a follow-up PR once M6 status vocabulary is live.
Rejected: Building an ad-hoc review flag now — would duplicate what M6 will provide and risk migration churn.
Affects: src/next/ReportPage.jsx (signature.draft = true always). Not blocking M5 acceptance; flagged in PR #24 body.

## D17 | 2026-08-17 | M10 §7 uses tech-spec §7.1–7.4 verbatim; my draft items become secondary "Data limitations" block
Context: Fable round 1 flagged that my four §7 limitations diverged from docs/model-technical-spec.md §7. Verified tech-spec §7.1 weather normalization gap, §7.2 causal validity (with building-type feasibility + alternative compliance pathway sub-bullets), §7.3 no temporal holdout, §7.4 peer score contemporaneity.
Decided: Rewrite §7 with the tech-spec four as primary content, verbatim in substance. Keep my old items 1 (small positive-label sample / UNVAL) and 2 (yearly LL84 resolution) as a secondary "Data limitations" block under an h3. Cut old item 3 (weather-normalization = duplicated §7.1) and old item 4 (LL97 boolean vs log-penalty = belongs in §5 modifier-leg discussion, not §7).
Rejected: Preserve my draft as-is (diverges from tech-spec, breaks the "definitions live in one place" rule). Rewrite entirely in tech-spec voice (loses the small-sample and yearly-resolution items which are load-bearing enough to name on the methodology page).
Affects: src/next/MethodologyPage.jsx §7 (landed a24bf5c).

## D18 | 2026-08-17 | Reconcile two-run split via leading note (option c), not full pipeline rerun or per-section separate stamps
Context: model_meta.json on main carries run_date 2026-07-15 alongside cv_auc 0.6833. The AUC came from a 07-01 train_xgboost.py run (M2 AUC rerun); the run_date bump came from a 07-15 update_enrichment_risk.py rescore on the same params_hash. Methodology page cites both. Three options: (a) rerun the whole pipeline today so meta + enrichment agree at one timestamp, (b) stamp each section's figures with their actual origin dates (mixed stamps within one section), (c) add one explicit reconciliation note near the top so a single run_date stamp per section stays honest.
Decided: Option c. One leading .mp-note block placed after the lede (before §1) explains the 07-01 validation vs 07-15 scoring-refresh split, states which numbers on the page trace to which run, and names the retirement condition (new params_hash = both clocks advance = note deleted). Section stamps stay single per M2. Reinforced in round 2 by adding RunFacts sub-blocks (D-not-a-decision, per M2's own "two stamps same section" rule) for the run-clock counts inside model-clock sections §3, §5, §6.
Rejected: (a) would need Ismael and does not fix future occurrences of the same skew. (b) creates a stamp thicket that reads as disorder rather than as honesty; M2's discipline is one stamp per section with sub-blocks when needed, not mixed stamps in the same sentence.
Affects: src/next/MethodologyPage.jsx reconciliation note + §3/§5/§6 RunFacts sub-blocks (landed a24bf5c, refined 7cbab0b, tagged c019888).

## D19 | 2026-08-17 | M10 ErrorBoundary wrap defers to a follow-up PR post-merge
Context: TODO(post-#25) at the top of MethodologyPage.jsx expects ErrorBoundary to wrap the page. ErrorBoundary landed on main via be97bd1, but the edwin/M10-methodology-page branch was cut from 982df37 (pre-ErrorBoundary), so src/next/ErrorBoundary.jsx does not exist on this branch. Two paths: (a) merge main into M10 branch now, do the wrap, ship together. (b) defer the wrap to a follow-up PR after M10 merges.
Decided: Option b. Wrap ships as its own tiny follow-up PR after M10 lands. Renamed the TODO to TODO(post-M10-merge) so the marker is durable across PR-number churn.
Rejected: Option a would add a merge commit to the branch Fable is actively reviewing (she has commit hashes in her review context), expand M10's diff footprint beyond methodology, and risk conflict noise on a page-only PR.
Affects: src/next/MethodologyPage.jsx TODO comment (landed c019888). Follow-up PR owed after M10 merges: import ErrorBoundary from ../components/ErrorBoundary (or src/next/ after the file lands on the merged branch), wrap the page with a caller-supplied fallback ("methodology page failed to render; check console for stack"), label="MethodologyPage".

## D20 | 2026-08-18 | Close /legacy login seam by adding themed login form to /this-week (not a `/` redirect)
Context: Build survey surfaced two seams making the new build feel like "loose parts on top of legacy." (1) `/` is a construction stub. (2) `ThisWeekPage` gates behind session token whose only issuer is `/legacy` (copy literally says "Sign in at /legacy first."). For the ConEd Wednesday demo, need a coherent entry story. Two candidates: (a) redirect `/` → `/this-week` / `/legacy` based on token; (b) put a login form directly on `/this-week`, retire the legacy hop.
Decided: Option b. Adds a themed login page consistent with the redesign vocabulary and eliminates legacy as a runtime dependency for the new-build demo path. Design + build to happen in a fresh session (Ed wants dedicated headspace for the login page design).
Rejected: Option a is smaller code but preserves legacy as a mandatory hop; the seam is still there, just hidden. Doesn't buy demo coherence, only demo hygiene.
Affects: new component under src/next/ (login form), replaces `tw-gate` block in src/next/ThisWeekPage.jsx (roughly lines 114-118). Auth flow reuses POST /api/auth/login → sessionStorage.coned_token, same as legacy. Legacy's form in src/legacy/App.jsx is functional reference only, not visual. Design laws from system-v1.1.md §Components apply.

## D21 | 2026-08-18 | ⌘K palette is command-first with an LLM fallback leg (not an AI chat surface)
Context: W6 spec calls for a command bar in the This Week topbar. Two design paths: (a) pure command palette (Linear/Raycast — deterministic actions, no LLM), (b) full AI chat entry (⌘K opens prompt bar wired to the LLM chain). Third option surfaced during the session: (c) hybrid — palette by default, LLM fallback when input doesn't match a local command. AI plumbing already exists backend-side (Anthropic → Groq → OpenRouter fallback via callLLM); frontend AIAgent was archived to /legacy in M0.
Decided: Option c (hybrid). Palette shell (fuzzy match over 8 static commands: nav + filter shortcuts) works standalone with no network calls — demo-safe. New /api/palette endpoint (auth-gated, aiLimiter) sends {query, commands} → LLM returns either {kind:"action", commandId} (route to existing button) or {kind:"answer", answer, suggest[]} (short reply + suggested commands). LLM output is validated against the sent registry — no invented commands or hallucinated buildings. Graceful degradation: 429/503/no-key/error each render a distinct message; palette stays usable without AI.
Rejected: (a) leaves the "why isn't AI doing anything" gap for a leadership demo without answering it. (b) reopens the "AI in the surface" design decision the team parked in M0 (AIAgent → legacy) and violates W6 (buttons first). Hybrid preserves W6 because every LLM-suggested action IS a button that already exists elsewhere on the surface.
Affects: new src/next/CommandPalette.jsx + CSS, mounted globally via AppShell wrapper in src/main.jsx; new /api/palette handler in api/server.js (~65 lines with PALETTE_SYSTEM prompt); ⌘K hint chip in /this-week topbar next to Compose button. Filter-command actions currently just navigate to /this-week — real filter application deferred (needs shared filter store or ?filter= URL param on Rankings/queue).

## D22 | 2026-08-19 | Local Postgres via docker-compose (postgres:16-alpine) over Homebrew
Context: W5 carry-over Age column renders "—" for every row locally because status-events table is empty (no local Postgres). Two setup paths: (a) docker-compose with postgres:16-alpine matching Railway prod; (b) Homebrew Postgres (whatever version is current on the machine).
Decided: Option a. Parity with the Railway-managed Postgres 16 image eliminates schema/behavior drift risk, and `docker compose down -v` wipes the volume cleanly when re-seeding is needed. Cost is one-time (start Docker Desktop) vs Homebrew's ongoing "which pg version am I on" tax across projects.
Rejected: Option b avoids launching Docker Desktop but ships whatever Postgres version Homebrew ships today (often ahead of prod), and Homebrew Postgres is a long-lived shared service across projects, not a per-repo disposable.
Affects: new docker-compose.yml at repo root (service `postgres`, container `coned-postgres`, port 5432, named volume `coned_pgdata`, healthcheck). CLAUDE.md Quick start now documents the docker path. Landed in PR #36 commit 185b932.

## D23 | 2026-08-19 | Fix ES-module env-load ordering via `node --env-file-if-exists=.env` in npm scripts, not dotenv import in db.js
Context: Local Postgres never worked in dev because `api/db.js` constructs `pg.Pool` at import time using `process.env.DATABASE_URL`, but ES-module imports are hoisted and run BEFORE `dotenv.config()` on line 25 of `api/server.js`. So DATABASE_URL from .env is never loaded and Pool falls back to a passwordless localhost string. Two fixes: (a) `import "dotenv/config"` at top of db.js; (b) `node --env-file-if-exists=.env` in npm scripts so Node loads env before any user code runs.
Decided: Option b. Node-native (>=20.12), zero app-code change, preserves the placeholder-restoration logic in server.js that swaps Claude-Code's inherited ANTHROPIC_API_KEY back after dotenv overrides it with the .env placeholder. Prod (Railway) unaffected: no .env file present, `--env-file-if-exists` no-ops, Railway-set env vars are already in process.env before Node starts.
Rejected: Option a would cause db.js to load .env at import time and set `originalAnthropicKey = process.env.ANTHROPIC_API_KEY` (line 20 of server.js) to the .env placeholder instead of the inherited shell value, breaking the LLM-key restoration path. Also uglier: leaks env-loading responsibility into a data-layer module.
Affects: package.json scripts `start`, `dev`, `dev:api` (all three prefixed with `node --env-file-if-exists=.env`); no code changes to api/db.js or api/server.js env-handling. Landed in PR #36 commit 185b932.

## D24 | 2026-08-19 | Add `--sc-motion-scene: 320ms` token for cross-surface transitions
Context: `--sc-motion-fast` (120ms) and `--sc-motion-med` (180ms) budgeted for interaction feedback. Scene transitions (login→workbench) under 250ms read as a hard cut, not a movement. Login parting's collapse leg and workbench fade-in both need a shared, deliberate duration.
Decided: Add `--sc-motion-scene: 320ms` alongside fast/med. One easing shared with the rest of the system. Total scene budget ~550ms for the whole login→workbench event.
Affects: `src/next/ScoreCell.css` `.sc-scope` block. Consumed by `LoginForm.css` parting collapse, `ThisWeekPage.css` `.tw-workbench--entering` fade-up.

## D25 | 2026-08-19 | `onLogin` fires at parting start; workbench mounts underneath as it fades up
Context: Previous flow was setParting(true), wait 420ms setTimeout, then onLogin. That left ~300ms of dead canvas after the cover collapse before the workbench cut in — visible as a hard cut.
Decided: LoginForm fires `onLogin(token)` immediately when parting starts (setPulses([]) → setParting(true) → onLogin). Parent (`ThisWeekPage`) tracks its own `parting` state and keeps LoginForm mounted as an overlay for PARTING_DURATION_MS (520ms) while the workbench renders underneath with `.tw-workbench--entering` (opacity 0→1 over --sc-motion-scene). New optional `onPartingEnd` prop signals when parent can drop the overlay.
Affects: `src/next/LoginForm.jsx` (parting flow, new PARTING_DURATION_MS constant, new prop), `src/next/ThisWeekPage.jsx` (parting state, overlay wrapper, --entering class), `src/next/ThisWeekPage.css` (`.tw-workbench--entering` animation, `.tw-login-overlay`).

## D26 | 2026-08-19 | Cancel live pulses at parting start (Fable diagnostic)
Context: Recording showed a stepped form fade (four visible ~90ms steps) during parting. Hypothesis: 16 concurrent SVG-path animations still running during the collapse caused main-thread contention.
Decided: Call `setPulses([])` before `setParting(true)`. Freezes the composition to the resting baseline before the transition begins.
Affects: `src/next/LoginForm.jsx` handleSubmit.

## D27 | 2026-08-19 | Prefetch effect via onLogin-at-parting-start
Context: Fable proposed prefetching ThisWeek data on login-input focus. Endpoints require Bearer auth, so a pre-token fetch would 401.
Decided: Skip the input-focus prefetch. onLogin-at-parting-start (D25) gives 520ms of effective prefetch time by moving setToken 420ms earlier, so useBuildings/useEvents fetches start during the parting animation instead of after it.
Affects: Behavioral, not code — realized as a side effect of D25.

## D28 | 2026-08-19 | Login form rebuilt as rules (no card, no border, no blur)
Context: The glass-blur card existed to solve legibility when the wave passed behind the input, but it made the form read as a widget hovering above the composition (Fable composition answer).
Decided: Strip `.lf-form` down to `display: flex; gap: 10px`. No background, no backdrop-filter, no border. Legibility solved in composition instead (D30 envelope notch).
Affects: `src/next/LoginForm.css` `.lf-form`.

## D29 | 2026-08-19 | Resting baseline — amplitude-zero flat line always present
Context: Before any keystroke the login was a bordered card floating in a void — the composition being evaluated existed only during typing.
Decided: Render a persistent `.lf-baseline` `<path>` at CENTER_Y across the full SVG width, stroke-1, opacity 0.85. Typing excites the composition on top of this line; parting dissolves the pulses and leaves the baseline as the horizon.
Affects: `src/next/LoginForm.jsx` (new RESTING_LINE_D constant, new `<path className="lf-baseline">`), `src/next/LoginForm.css` `.lf-baseline` styling.

## D30 | 2026-08-19 | Envelope notch over form x-range
Context: Wave and form share the same vertical center. Without a notch, the wave crosses through the input area and the card had to hide it.
Decided: Add `notchMultiplier(t)` — raised-cosine falloff (0 at center, 1 at edge) applied inside `harmonicPath()`. NOTCH_CENTER=0.5, NOTCH_HALF=0.16 of HARMONIC_W. The wave goes flat where the field sits; the field baseline sits in that flat segment.
Affects: `src/next/LoginForm.jsx` `harmonicPath` + new notchMultiplier + constants.

## D31 | 2026-08-19 | Eyebrow mark replaces cut lede
Context: The previous surface lede was a full sentence explaining the product, cut during login polish, leaving nothing that named the product on the sign-in door.
Decided: `<p className="lf-eyebrow">ConEd Steam Attrition · This Week</p>` — one mono line above the form. Product name only, no sentence. surfaceLede prop removed from LoginForm entirely.
Affects: `src/next/LoginForm.jsx` (prop removal + eyebrow), `src/next/LoginForm.css` `.lf-eyebrow`, `src/next/ThisWeekPage.jsx` (SURFACE_LEDE const removed, prop removed from LoginForm call).

## D32 | 2026-08-19 | Helper split: "Shared team password" at field, session expiry moves to ProvenanceStrip
Context: The helper line said "Shared password. Sessions expire hourly." Two facts, two audiences: "why no username" belongs at the field; "when does it expire" is a workbench fact needed at hour 0:55, not at sign-in.
Decided: Helper becomes "Shared team password" (no terminal period). Session expiry moves to ProvenanceStrip as "session HH:MM" (D34).
Affects: `src/next/LoginForm.jsx` `.lf-helper`, `src/next/ProvenanceStrip.jsx` useSessionExpiry hook + `.ps-session` slot.

## D33 | 2026-08-19 | Motif echoes at quiet volumes (topbar divider + empty-state, future)
Context: Login is a three-second surface used twice a day. The motif needs middle volumes elsewhere so it doesn't wear out.
Decided: Loud volume at the door (login pulses). Quiet volumes at the ProvenanceStrip divider (D35 WaveDivider) and eventually at ThisWeek's empty-state ("nothing crossed a threshold"). The empty-state echo is post-bundle work.
Affects: `src/next/WaveDivider.jsx` (this bundle). Empty-state echo tracked as follow-up.

## D34 | 2026-08-19 | Global `ProvenanceStrip` (~32px, one line, mono, provenance-heavy)
Context: Every surface consumed model outputs but only ThisWeek showed the freshness stamp (`model_meta.run_date`), and per-surface eyebrows drifted ("ConEd Steam Attrition · M9" vs "CONED STEAM ATTRITION · M10 · METHODOLOGY · REGISTER"). Five of seven surfaces were out of compliance with system-v1.1 W1 (every surface anchors time to the pipeline run).
Decided: One-line strip, ~32px, mono. Left→right: product mark → route-driven surface name → spacer → run stamp + model chip + session expiry → ⌘K button → Sign out. Sticky top, z-index 20. Hidden pre-auth, hidden on `/` and `/legacy`, suppressed via `@media print`.
Affects: New `src/next/ProvenanceStrip.jsx` + `.css`, mounted globally in `src/main.jsx` AppShell above Routes.

## D35 | 2026-08-19 | `WaveDivider` component; exposes `--sc-divider-y` and `--sc-divider-stroke` on `.sc-scope`
Context: The ThisWeek topbar's static wave divider was load-bearing motion (D26 chrome-answer dependency) — the login parting's horizon-line was going to hand off to it. Retiring per-surface topbars would break the handoff.
Decided: New `WaveDivider` component, owned by ProvenanceStrip. Static SVG sine, stroke 1. Exposes `--sc-divider-y: 34px` (the strip's bottom edge) and `--sc-divider-stroke: var(--sc-bench-line)` on `.sc-scope` so the login parting can target them from anywhere.
Affects: New `src/next/WaveDivider.jsx`, `ProvenanceStrip.css` `.sc-scope` custom props.

## D36 | 2026-08-19 | Route-name table as single source of surface names
Context: Per-surface eyebrows drifted into "CONED STEAM ATTRITION · M10 · METHODOLOGY · REGISTER" because every surface hardcoded its own string.
Decided: `src/next/routeNames.js` maps pathname → name. Static map plus a small dynamic-pattern list for `/case-file/:bbl` and `/report/:bbl`. Milestone tokens (M9, M10, R11) excluded per D40.
Affects: New `src/next/routeNames.js`, consumed by ProvenanceStrip.

## D37 | 2026-08-19 | Retire six local topbars — surface identity moves to ProvenanceStrip
Context: With D34/D35 landing, per-surface topbars became redundant with the strip. Two-tier headers were the worst outcome.
Decided:
  - `mp-topbar` (Methodology): deleted (was trivial caps eyebrow).
  - `tw-topbar` (ThisWeek): deleted. The "Compose weekly digest" Link relocated to a new `.tw-page-heading` block as the surface's first content, alongside the page title and run-date subtitle.
  - `dg-header` / `rankings-header` / `cfc-header`: preview-scaffold "Preview build · M#" meta strips deleted; page titles + ledes retained as the surface's first content.
  - `rp-header` (Report): NOT touched — it's the printed report's letterhead inside `.rp-sheet`, not app chrome.
Affects: `MethodologyPage.jsx`, `ThisWeekPage.jsx`, `ThisWeekPage.css` (new .tw-page-heading), `DigestPage.jsx`, `RankingsPage.jsx`, `CaseFileContainer.jsx`.

## D38 | 2026-08-19 | ProvenanceStrip suppressed via `@media print` on Report
Context: Report page is print-optimized (R2/R3) and its printed sheet carries its own provenance (signature block). A screen-only chrome strip has no place on paper.
Decided: `.ps-strip { display: none; }` inside `@media print` in ProvenanceStrip.css. Divider not needed on paper — the Report's own rules handle printed layout.
Affects: `src/next/ProvenanceStrip.css`.

## D39 | 2026-08-19 | No visible logos; provenance in Methodology version block + Report signature
Context: Neither ConEd's nor Pursuit's logo fits the workbench voice. But the fact "Pursuit-built for ConEd" belongs somewhere.
Decided: Two provenance homes, no logos.
  - Methodology model-version block gains "Built by / Pursuit for Con Edison" as a new <dt>/<dd> pair.
  - Report signature block gains a "Pursuit × ConEd Steam Ops" bureau line under the signatures (`.rp-sig-bureau`).
  - Login and strip carry the product name only. If ConEd asks for its mark later, strip's left slot can take a monochrome glyph without changing anything else.
Affects: `MethodologyPage.jsx` (new dt/dd), `ReportPage.jsx` (new .rp-sig-bureau div), `ReportPage.css` (styling).

## D40 | 2026-08-19 | Milestone tokens (M9, M10, R11) removed from user-visible UI
Context: Preview scaffolds shipped with "· M12" / "· M4" / etc. tokens next to product names. Client-facing readers see internal build bookkeeping.
Decided: Strip milestone tokens from all user-visible copy. Route-name table (D36) surface names carry no M-prefix. Retained inside code comments / commit messages / DECISIONS.md where they aid navigation.
Affects: Same six surfaces as D37; ProvenanceStrip carries no milestone token.

## D41 | 2026-08-19 | DRAFT_login-branding-ask.md moot; do not send
Context: Draft ask proposed either (a) logo-morph resolution to login parting or (b) paired neon-purple + ConEd-blue color flashes as branding-through-color. Both mechanisms depended on the answer to "does the login need a branding signal at all?"
Decided: Fable's Q4 chrome answer said no visible logos anywhere in the workbench, including login. D39 puts provenance in methodology + report signatures instead. Both draft options are rejected on principle. Archive the DRAFT for reference; do not send.
Affects: Renamed `docs/fable/2026-08-19_login-bundle/DRAFT_login-branding-ask.md` → `ARCHIVED_login-branding-ask.md`.

## D42 | 2026-08-19 | Landing surface reframed as reconciliation layer; weekly-cadence claim narrowed
Context: Ed pushed back that "This Week" bakes a weekly-cadence assumption about ConEd client interactions that may not match reality. Full retraction of weekly cadence would reopen W6, the digest artifact, and the M9 landing composition — too big for the 48hr pre-demo window.
Decided: Keep the weekly-cadence system claim (W6, digest, M9 landing) untouched for now. Reframe the landing surface itself as the reconciliation layer between client operations and ConEd — cadence-neutral in voice and name. Route stays `/this-week` to avoid link churn; the name in the route-name table changes. Specific replacement name deferred (candidates: Triage / Landing / Home).
Rejected: (a) Full weekly-cadence retraction — too much scope before Wednesday, reopens digest identity. (b) Ship as-is with "This Week" — the surface name would carry a claim we can't defend if cadence turns out different.
Affects: Route-name table (D36), ThisWeekPage.jsx copy/voice, downstream W6 revisit if cadence assumption fails. RETURN-TO: revisit weekly-cadence claim in W6/digest/M9 after ConEd walk yields real cadence signal.

## D43 | 2026-08-19 | LL97 display defaults to 2030 penalty, not 2024
Context: Display sites split between `ll97_penalty_2024` and `ll97_penalty_2030` inconsistently. `src/data/ll97Bands.js` had the reasoning as a code comment ("2024 caps are too loose to discriminate") but it was never logged as a decision, and three display sites still showed 2024 — producing "$0" on many buildings because 2024 caps rarely bind. Aggregate view, bands, case-file sub, RankingsTable all already used 2030.
Decided: LL97 penalty *displayed to users* defaults to the 2030 cap everywhere. Both display years may be shown side-by-side in surfaces that explicitly compare (case-file exhibit, methodology), but the default headline number is 2030. Model-side encoding (`ll97_penalty_2024_log` as an XGBoost feature) is unaffected — this is a display convention, not a feature-engineering change.
Rejected: (a) Keep 2024 as default — most buildings show $0, which reads as "no exposure" when the truth is "not exposed *yet*." (b) Show both years by default everywhere — noise on rows where one line already suffices.
Affects: CriticalQueue.jsx list-view column, reportAdapter.js capEquivalent driver line, any future top-driver copy. `src/data/useBuildings.js:12` composite-risk weight input NOT changed (scoring signal, not display; separate call).

## D44 | 2026-08-19 | Landing surface renamed "Since last run"; mono title register
Context: D42 reframed the landing as a cadence-neutral reconciliation layer but deferred the actual name. Empty state on `/this-week` in dev exposed the misfit (reads as "the week is empty," not "nothing to reconcile"). Ed also flagged the h1 "This Week" as reading toyish in Inter 22px above a mono subtitle. Asked Fable (docs/fable/2026-08-19_landing-framing-ask.md); answer at docs/fable/answers/2026-08-19_landing-framing-answer.md.
Decided: Surface name is "Since last run" — Fable's coinage. Reasons: cadence-neutral, is W1's second anchor stated as a title, stays true whether runs are weekly or daily, was already the delta-feed section label, reads like a place in the route-name table breadcrumb. Typographic treatment: mono register, caps, tracked, ~13px (one step above section labels' 12px), not Inter h1. "A title that looks like the data line it describes can't float."
Rejected: "Bench" (metaphor collision — rankings and case-file are already the workbench), "Attention" (names a feeling, not a state), dropping the h1 entirely (right about the claim, wrong about the walk — first screen shouldn't look unfinished).
Affects: `src/next/ThisWeekPage.jsx` title copy + subtitle, `src/next/ThisWeekPage.css` `.tw-page-title`, `src/next/routeNames.js` `/this-week` entry. Delta-feed section label dropped (title carries it); right-stat floats as `.tw-feed-meta`.

## D45 | 2026-08-19 | Empty-state copy for delta feed (workbench voice)
Context: Prior placeholder "Event feed begins with the first diffed pipeline run. Nothing to show yet." read like a bug report. Empty state now more visible under D44 rename.
Decided: Two-sentence cell-style copy per Fable — "Run [date] · no changes since the previous run. Queue and pulse below reflect the current run. First diffed run populates this feed." Names the run, states the absence, points reader at the two sections that DO have content. Second sentence covers both empty-day and first-run cases.
Rejected: "No new deltas since last run" (internal vocabulary), "Nothing crossed a threshold this run" (leaks M8 chip taxonomy).
Affects: `src/next/ThisWeekPage.jsx` firstRun / empty-feed placeholder.

## D46 | 2026-08-19 | Drop "Week of" from subtitle; queue label loses "this week"
Context: D44 landed but "Week of Aug 18" in subtitle and "Your queue this week" in section label continued to echo the weekly cadence claim D42 walked back for this surface.
Decided: Subtitle becomes "pipeline run [date]" alone (the "your last review [date]" second anchor lands once M6 last-review marker exists; until then, run alone is honest per W1). Queue section label becomes "Your queue" (loses "this week"). Digest naming and W6 system claim untouched per D42 — this only removes the landing's echo of weekly cadence.
Rejected: Keeping "Week of" as a soft anchor for user habit (Fable: the week anchor was the subtitle doing the title's job, and W1 has only two anchors — pipeline run and analyst's last review — neither of which is "Week of").
Affects: `src/next/ThisWeekPage.jsx` subtitle + queue section label. `fmtWeekOf()` helper now unused (leaving in place — small dead-code follow-up).

## D47 | 2026-08-19 | Landing h1 reverts to "This Week" in Space Grotesk 19px; supersedes D44 title register
Context: Ismael leadership walk (Wed 2026-08-20) needs `/this-week` to visually match Fable's `docs/design/fable-round-0-2026-07-12/this-week-landing.html` artifact. Structured diff against the artifact (Round 1+2 alignment pass this session, via Explore subagent) surfaced the h1 as the largest-impact break: artifact uses Space Grotesk 19px mixed-case "This Week"; D44 had specified mono/caps/tracked/~13px "Since last run." Applying D44 alongside the ProvenanceStrip (D34/D37) also produced a visible copy dupe — the strip carries "Since last run" as the surface anchor, and the h1 repeated it verbatim one row below.
Decided: h1 becomes "This Week" in Space Grotesk 19px, weight 600, letter-spacing −0.01em, mixed case — matching the artifact directly. ProvenanceStrip retains "Since last run" as the surface anchor (D44's coinage stands as the *route/surface name*; artifact-parity governs the *in-card title*). Dupe resolves naturally: strip says where you are ("Since last run"), card says what section you're in ("This Week"). Post-walk, revisit if the display h1 reads toyish in the leadership demo — Fable's "a title that looks like the data line it describes can't float" critique is noted, not dismissed.
Rejected: (a) Honor D44's mono/caps register and break the dupe from the strip side instead — would let artifact-parity slip on the highest-impact visual element for a walk that's specifically an artifact-parity demo. (b) Split the difference (mono register with "This Week" copy, or display register with "Since last run" copy) — half-honors both decisions, satisfies neither, and leaves a hybrid that neither the artifact nor D44 endorses.
Affects: `src/next/ThisWeekPage.jsx` h1 copy, `src/next/ThisWeekPage.css` `.tw-page-title`. Supersedes D44's typographic-treatment clause only; D44's coinage of "Since last run" as the surface-name anchor stands (now lives in ProvenanceStrip + `routeNames.js`, not the h1).
