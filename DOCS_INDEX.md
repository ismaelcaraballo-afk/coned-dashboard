# Docs Index

One line per document in docs/. Written by /intake. This index is the retrieval surface: agents and humans grep here first, never browse the folders blind.

Line format:
```
- YYYY-MM-DD | origin | type | topic | path | orig: original_filename | One line on what it is and why it was kept.
```

Naming convention: see `docs/ref/CONVENTIONS.md`. Origin omitted when Ed authored; type omitted when folder implies it.

Length: entries are one line, typically ~200 chars in the summary field. Longer summaries are allowed when a doc is a grep target for multiple distinct concerns; those lines carry an inline "intentional grep double-duty" marker and cite the decision ID that forced them. Do not shorten these on cleanup passes without checking the referenced decision.

Folders: docs/ref, docs/briefs, docs/design, docs/decks, docs/research, docs/notes, docs/data, docs/archive

---

## ref/ — canonical references

- 2026-07-16 | ed | ref | project doc conventions | docs/ref/CONVENTIONS.md | orig: n/a | Canonical formatting, entry rules, and filename convention for all project docs.
- 2026-07-16 | fable | ref | fable roadmap | docs/ref/2026-07-16_fable-roadmap.md | orig: roadmap.md | Fable's M0–M12 milestone roadmap for the redesign; narrative source of truth. ROADMAP.md at repo root is the derived dependency graph.
- 2026-07-16 | fable | spec | case-file header (Spec 2) | docs/ref/2026-07-16_fable-case-file-header.html | orig: case-file-header.html | Fable's Spec 2 atom for M4/R5; replaces the BuildingPanel drawer with identity row, claim ledger, driver band, static narrative, read-only status segment.
- 2026-07-16 | ed | ref | methodology alignment | docs/ref/2026-07-16_methodology-alignment.md | orig: CONED_METHODOLOGY_ALIGNMENT.md | Johan/Ildi methodology gap analysis. Source for M10 section 8 (complementary signals positioning).
- 2026-07-13 | ismael | ref | q1-q10 response | docs/ref/2026-07-13_ismael-q1-q10-response.md | orig: ISMAEL-RESPONSE-2026-07-13.md | Ismael's Q1–Q10 backend scoping answers. Ground truth for model_meta schema, XGBoost config, snapshot diffing scope.
- 2026-07-06 | ed | ref | client notes | docs/ref/2026-07-06_client-notes.md | orig: coned-dashboard-CLIENT-NOTES.md | ConEd/David verbatim quotes plus contact map. Design anchor; used to constrain quote usage in decks. Sensitive — team-repo only, not for onward sharing.
- 2026-05-04 | coned | ref | steam customer drop-off predictor intake | docs/ref/2026-05-04_coned-intake-form.md | orig: ConEd_intake_form.md | ConEd's founding scope doc, narrowed from the original Gas & Steam brief to steam-only in David Caiafa's May 4 email. Anchors the ≥70% back-tested recall benchmark that model deepening will return to, and the client's "high-probability drop-off" phrasing that system-v1.1 reframed as ranking. Intentional grep double-duty; see D7.

## briefs/ — per-person Fable-cycle briefs

- 2026-07-13 | ed | brief | edwin domain composition | docs/briefs/2026-07-13_edwin-domain-composition.md | orig: EDWIN-BRIEF-DOMAIN-COMPOSITION.md | Edwin's own milestone brief covering chatbot answer, report content, methodology page authoring, David packet.
- 2026-07-13 | ed | brief | ismael backend build | docs/briefs/2026-07-13_ismael-backend-build.md | orig: ISMAEL-BRIEF-BACKEND-BUILD.md | Milestone-by-milestone backend brief for Ismael (model_meta, AUC rerun, snapshot diffing, status events).
- 2026-07-13 | ed | brief | ismael path-c decisions | docs/briefs/2026-07-13_ismael-path-c-decisions.md | orig: ISMAEL-BRIEF-PATH-C-AND-BACKEND-DECISIONS-2026-07-13.md | Q1–Q10 questions and Path C framing sent to Ismael prior to the response.
- 2026-07-17 | ed | brief | pedro M3 kickoff | docs/briefs/2026-07-17_pedro-m3-kickoff.md | orig: n/a | Delta on top of the 2026-07-13 milestone brief for Pedro's M3 start. Reflects R1 landing (PR #13), the PR-9 → #10/#11/#12 split, model_meta not-yet-merged so mock it, interim chip copy, exact setup checklist. Supersedes the 2026-07-16 checkpoint (removed).
- 2026-07-13 | ed | brief | pedro frontend build | docs/briefs/2026-07-13_pedro-frontend-build.md | orig: PEDRO-BRIEF-FRONTEND-BUILD.md | Milestone-by-milestone frontend brief for Pedro (legacy separation, score cell, case-file header, report, queue, landing, digest).
- 2026-07-13 | ed | brief | model plan for fable | docs/briefs/2026-07-13_model-plan-for-fable.md | orig: coned-dashboard-MODEL-PLAN-FOR-FABLE.md | Self-contained model brief for Fable review; intake ask, current build, dual-layer plan, pattern-surfacing options, ten sharpened questions.
- 2026-07-06 | ed | brief | design brief | docs/briefs/2026-07-06_design-brief.md | orig: coned-dashboard-DESIGN-BRIEF.md | Voice + capability inventory sent into the Fable redesign; Bloomberg Terminal instinct applied to a decision-support tool.
- 2026-07-06 | ed | brief | fable context brief | docs/briefs/2026-07-06_fable-context-brief.md | orig: coned-dashboard-FABLE-BRIEF.md | Full context sent to Fable 5: assignment, ConEd analyst persona, three core product questions, secondary users.
- 2026-06-23 | ed | brief | deck brief | docs/briefs/2026-06-23_deck-brief.md | orig: coned-dashboard-DECK-BRIEF.md | Blackstone deck financial framing; 52 high-risk building composition, revenue-impact figures.

## research/ — outside research and spikes

- 2026-06-04 | web | research | boston berdo research | docs/research/2026-06-04_web_boston-berdo-research.md | orig: coned-dashboard-BOSTON-BERDO-RESEARCH.md | Boston BERDO carbon mandate as analog to LL97; source-tagged case for threshold-proximity mechanism. Low confidence against pure-mechanism story.
- 2026-06-04 | ed | research | threshold proximity analysis | docs/research/2026-06-04_threshold-proximity-analysis.md | orig: coned-dashboard-THRESHOLD-PROXIMITY-NOTES.md | Spike exploration for the threshold-proximity cohort concept and CPS (conversion pressure score) feasibility on 150 buildings.

## notes/ — internal working notes

- 2026-07-16 | ismael | notes | pr split update | docs/notes/2026-07-16_ismael_pr-split-update.md | orig: Slack #coned-dashboard | Ismael's follow-up to PR #9 close: PRs #10/#11/#12 announced with per-PR panel-review security fixes (trust proxy, HMAC actorTag, BBL regex, model_meta public→data path move, useEffect clobber fix, djb2-hash localStorage key, queue union arithmetic); references plans/ai_model_config.md (5-model panel, BullMQ, structured form v1).
- 2026-07-16 | ed | notes | pr #9 review | docs/notes/2026-07-16_pr-9-review.md | orig: n/a | Edwin's review of Ismael's PR #9 (monday-workflow bundle). Path A split analysis (D2 source), R2/R3/R7-partial/W-laws mapping, boundary concern on frontend files landing on RiskTable/App/BuildingPanel that R4/R5 replace, "Suggested comment" draft. PR #9 is now closed; review remains the source-of-record for D2.
- 2026-07-16 | ismael | notes | pr #9 announcement | docs/notes/2026-07-16_ismael-pr9-message.md | orig: Slack #coned-dashboard | Ismael's original PR #9 announcement (W1/W4/W6 + M1 model_meta + M6 status events + M2 AUC rerun bundled). Verbatim message anchoring the PR-9 review. Superseded operationally by 2026-07-16_ismael_pr-split-update.md after Path A split.
- 2026-07-13 | ed | notes | progress tracker | docs/notes/2026-07-13_progress-tracker.md | orig: coned-dashboard-PROGRESS-TRACKER.md | Rolling personal status snapshot; model perf, two-number problem, diagnostic risk, open work items.
- 2026-07-01 | ismael | notes | ismael build update | docs/notes/2026-07-01_ismael_build-update.md | orig: coned-dashboard-ISMAEL-UPDATE-2026-07-01.md | Ismael's pull recap, smoke test results against dev server, PR #7 rebase notes.
- 2026-06-23 | ed | notes | story timeline | docs/notes/2026-06-23_story-timeline.md | orig: coned-dashboard-STORY-TIMELINE.md | Slide-by-slide narrative arc audit for the Blackstone deck (v5 deck + Script v3).
- 2026-06-22 | ed | notes | pattern findings | docs/notes/2026-06-22_pattern-findings.md | orig: coned-dashboard-PATTERN-FINDINGS.md | Pre-presentation model score analysis; two-number problem, distribution anomalies, ml_risk vs risk divergence.
- 2026-06-09 | ed | notes | smoke test results | docs/notes/2026-06-09_smoke-test-results.md | orig: coned-dashboard-SMOKE-TEST-RESULTS.md | Auth, data loading, filters test-harness checklist from pre-Blackstone.
- 2026-06-03 | ed | notes | working notes | docs/notes/2026-06-03_working-notes.md | orig: coned-dashboard-NOTES.md | Early scratchpad on project state, shipped features, known gaps (YoY viz not weather-normalized).

## design/ — Fable redesign artifacts

- 2026-07-12 | fable | design | round 0 system.md v1.0 | docs/design/fable-round-0-2026-07-12/system.md | orig: system.md | Fable's initial design system v1.0. Superseded by system-v1.1.md at repo root; kept for lineage.
- 2026-07-12 | fable | design | score cell atom | docs/design/fable-round-0-2026-07-12/score-cell-anatomy.html | orig: score-cell-anatomy.html | Fable Spec 1 for M3/R4 (Rankings score cell).
- 2026-07-12 | fable | design | reasoning report atom | docs/design/fable-round-0-2026-07-12/reasoning-report.html | orig: reasoning-report.html | Fable Spec 3 for M5/R6 (printable reasoning report).
- 2026-07-12 | fable | design | this-week landing atom | docs/design/fable-round-0-2026-07-12/this-week-landing.html | orig: this-week-landing.html | Fable Spec 4 for M9/R10 (This Week landing composition).
- 2026-07-12 | fable | design | weekly digest email atom | docs/design/fable-round-0-2026-07-12/weekly-digest-email.html | orig: weekly-digest-email.html | Fable Spec 5 for M12/R13 (weekly digest compose flow).
- 2026-07-13 | fable | design | round 1 response | docs/design/fable-round-1-2026-07-13/integration-check-round-1-response.md | orig: same | Fable's Round 1 integration-check response.
- 2026-07-13 | fable | design | round 1.1 delta | docs/design/fable-round-1-2026-07-13/integration-check-round-1-1-delta-response.md | orig: same | Fable's Round 1.1 delta harden-or-correct on Round 1. Superseded system.md into system-v1.1.md.
- 2026-07-13 | ed | design | prompt 00 execution plan | docs/design/fable-prompts-2026-07-13/00-execution-plan.md | orig: same | Execution plan sent to Fable at start of Round 1.
- 2026-07-13 | ed | design | prompt 01 integration check | docs/design/fable-prompts-2026-07-13/01-integration-check-round-1.md | orig: same | Round 1 integration-check prompt sent to Fable.
- 2026-07-13 | ed | design | prompt 02 portfolio signals | docs/design/fable-prompts-2026-07-13/02-portfolio-signals-assessment.md | orig: same | Portfolio signals assessment prompt sent to Fable.
- 2026-07-13 | ed | design | prompt 03 build roadmap request | docs/design/fable-prompts-2026-07-13/03-build-roadmap-request.md | orig: same | Build roadmap request prompt sent to Fable (produced the M1–M12 roadmap).
- 2026-07-13 | ed | design | prompt 04 round 1.1 delta | docs/design/fable-prompts-2026-07-13/04-integration-check-round-1-1-delta.md | orig: same | Round 1.1 delta prompt sent to Fable.
- 2026-07-13 | ed | design | prompt 05 system reissue | docs/design/fable-prompts-2026-07-13/05-system-v1.1-reissue.md | orig: same | System-v1.1 reissue prompt sent to Fable.

## decks/

- 2026-07-16 | ed | deck | Blackstone presenter guide | docs/decks/2026-07-16_ed_deck_blackstone-presenter-guide.md | orig: BLACKSTONE_PRESENTER_GUIDE.md | Pre-Blackstone presenter script for the Driftwatch demo (2026-06-17); mental model walkthrough for anyone on stage.
- 2026-08-18 | ed | deck | ConEd leadership walk outline | docs/decks/2026-08-18_ed_deck_coned-leadership-walk-outline.md | orig: deck-outline-2026-08-18.md | /deck-draft output for the 2026-08-19 ConEd leadership walk (Wednesday, qualifier for September technical session). 7 slides in 5 min + 10 min persona demo. Persona-anchored, workflow-first, model honesty confined to tech-stack beat. Includes story arc, slide-by-slide with claim tiers, demo beats A-G, omissions list, and 6 flagged gaps. Feeds the /frontend-slides build session.
- 2026-08-18 | ed | deck | ConEd leadership walk persona demo script | docs/decks/2026-08-18_ed_deck_coned-leadership-walk-persona-script.md | orig: n/a | Speakable 10 min demo script for the 2026-08-19 walk. Persona: Maya Chen, ConEd steam AM. 7 beats (A-G): landing, top case file, status update, second case file, since-last-run feed, weekly digest, return. Includes (E)/(P) presenter placeholders for the Edwin+Pedro two-person split, forbidden phrases list, contingency plans (Railway degrade, empty feed), and explicit exclusion list.
- 2026-08-18 | ed | deck | ConEd leadership walk tech stack slide | docs/decks/2026-08-18_ed_deck_coned-leadership-walk-tech-stack.md | orig: n/a | Copy and composition for deck slide 6 (2-3 min per David's spec). Three-column layout: DATA (LL84/LL97/DOB/NOAA public sources), MODEL (XGBoost + rule-based tier, cv_auc 0.6833 UNVAL, proxy label acknowledged, complementary to Johan's diagnostic framework), WORKFLOW (Node+React+Postgres+Railway stack). ~450 word speech (~2:48 at 160wpm), priority cuts, cues, forbidden phrases, primes 7 anticipated Q&A questions.
- 2026-08-18 | ed | deck | ConEd leadership walk Q&A bank | docs/decks/2026-08-18_ed_deck_coned-leadership-walk-qa-bank.md | orig: n/a | 22 anticipated questions in 6 categories (data, model, methodology, business/use, reconciliation/next-unlock, pushback/tricky) with bold short answer + italic backup fact format. Deflection list for questions to punt to written follow-up. Rules for handling unanswerable questions. Presenter-only reference; nothing from this document lands on a deck slide.
- 2026-08-18 | ed | deck | ConEd leadership walk next-unlock slide | docs/decks/2026-08-18_ed_deck_coned-leadership-walk-next-unlock.md | orig: n/a | Copy and composition for deck slide 7 (closing slide, ~40 sec). One diagram: solid-line existing flow (queue → outreach → status events) above a dashed-line proposed flow (status events → training labels → next model). Credits Ildi by name. ~110 word speech, forbidden phrases (no "coming soon," no "active learning loop"), single-voice-through-close discipline. Positions September ask without committing timeline.

## archive/ — cycle-scoped historical material

- 2026-07-01 | ed | archive | demo cycle buildings log | docs/archive/demo-cycle-2026-07-01/DEMO_BUILDINGS_LOG_2026-07-01.md | orig: same | Building log from the 2026-07-01 demo cycle.
- 2026-07-01 | ed | archive | demo tactical | docs/archive/demo-cycle-2026-07-01/DEMO_TODAY_TACTICAL.md | orig: same | Tactical plan for the 2026-07-01 demo.
- 2026-07-01 | ed | archive | pivot strategic | docs/archive/demo-cycle-2026-07-01/PIVOT_NEXT_WEEK_STRATEGIC.md | orig: same | Strategic pivot memo from the 2026-07-01 demo cycle.
- 2026-06-22 | ed | archive | project context snapshot | docs/archive/demo-cycle-2026-07-01/PROJECT_CONTEXT_2026-06-22.md | orig: same | Project context snapshot from 2026-06-22; pre-Fable framing.
- 2026-06-13 | ed | archive | smoke test report | docs/archive/demo-cycle-2026-07-01/SMOKE_TEST_REPORT_2026-06-13.md | orig: same | Automated smoke test report from 2026-06-13.
- 2026-07-13 | ed | archive | blackstone prep asks | docs/archive/demo-cycle-2026-07-01/2026-07-13_blackstone-prep-asks.md | orig: coned-dashboard-BLACKSTONE-PREP-ASKS-FOR-TEAM.md | Reconstructed ConEd/David ask list for divide-and-conquer with Pedro/Ismael pre-Blackstone.
- 2026-06-23 | ed | archive | blackstone build state | docs/archive/demo-cycle-2026-07-01/2026-06-23_blackstone-build-state.md | orig: coned-dashboard-BLACKSTONE-BUILD-STATE.md | Model scoring system snapshot at Blackstone prep; two-number problem (risk vs ml_risk).
- 2026-06-23 | ed | archive | presentation final (v6 delivered) | docs/archive/demo-cycle-2026-07-01/2026-06-23_presentation-final.html | orig: coned-dashboard-PRESENTATION-v6.html | Final Blackstone deck HTML; light editorial + teal; the version actually presented.
- 2026-06-23 | ed | archive | presentation script v3 | docs/archive/demo-cycle-2026-07-01/2026-06-23_presentation-script-v3.md | orig: coned-dashboard-PRESENTATION-SCRIPT-v3.md | Final Blackstone script v3 (4:15 slides + 1:30 demo); tightened problem → data backbone flow.
- 2026-06-23 | ed | archive | presentation script v2 | docs/archive/demo-cycle-2026-07-01/2026-06-23_presentation-script-v2.md | orig: coned-dashboard-PRESENTATION-SCRIPT-v2.md | Blackstone script v2 (5:30 + 1:30 demo); reframed journey section. Superseded by v3.
- 2026-06-17 | ed | archive | presentation script (v0) | docs/archive/demo-cycle-2026-07-01/2026-06-17_presentation-script.md | orig: coned-dashboard-PRESENTATION-SCRIPT.md | Initial 5:15-runtime script; cover, team, problem, approach, demo, close.
- 2026-06-17 | ed | archive | presentation draft (v0 outline) | docs/archive/demo-cycle-2026-07-01/2026-06-17_presentation-draft.md | orig: coned-dashboard-PRESENTATION-DRAFT.md | June 17 5-min deck outline + timing budget; three-speaker rotation.
- 2026-06 | ed | archive | presentation drafts (HTML iterations) | docs/archive/demo-cycle-2026-07-01/presentation-drafts/ | orig: coned-dashboard-PRESENTATION*.html | v0 (Jun 17) through v5 (Jun 23) HTML iterations; final delivered version is 2026-06-23_presentation-final.html at parent level.
- 2026-07 | ed | archive | steam touchpoint page | docs/archive/touchpoint-cycle/steam-touchpoint.html | orig: same | Standalone steam touchpoint HTML from touchpoint cycle.
- 2026-07 | ed | archive | touchpoint deck | docs/archive/touchpoint-cycle/touchpoint-deck.html | orig: same | Touchpoint slide deck HTML.
- 2026-07 | ed | archive | touchpoint assets | docs/archive/touchpoint-cycle/touchpoint-assets/ | orig: same | Supporting images for the touchpoint deck.
