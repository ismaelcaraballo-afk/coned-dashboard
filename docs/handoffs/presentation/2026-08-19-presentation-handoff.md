# Presentation Handoff — ConEd Leadership Walk

**Date:** 2026-08-19
**Presentation:** Wednesday 2026-08-19, ConEd leadership walk (qualifier for September technical session)
**Format:** 15–20 min total · 5 min deck + 10 min live demo + Q&A
**Presenters:** Edwin + Pedro (Ismael not attending)
**Companion to:** `docs/handoffs/presentation/2026-08-18-presentation-kickoff.md` (prior session), `docs/decks/2026-08-18_ed_deck_coned-leadership-walk-outline.md` (master outline)

---

## Where we are

The presentation is authored end to end. Five artifacts landed in `docs/decks/`:

1. `2026-08-18_ed_deck_coned-leadership-walk-outline.md` — master outline. Story arc, 7 slide list, demo beats A–G, omissions, gaps.
2. `2026-08-18_ed_deck_coned-leadership-walk-persona-script.md` — 10-min Maya demo script, beats A–G, (E)/(P) placeholders, forbidden phrases, contingencies.
3. `2026-08-18_ed_deck_coned-leadership-walk-tech-stack.md` — Slide 6 copy. Three-column composition, ~450-word speech targeting 2:30–2:48, priority cuts, anticipated Q&A.
4. `2026-08-18_ed_deck_coned-leadership-walk-qa-bank.md` — 22 questions, 6 categories, bold-short-answer + italic-backup format.
5. `2026-08-18_ed_deck_coned-leadership-walk-next-unlock.md` — Slide 7 closing. Solid/dashed diagram, ~110 words, credits Ildi by name.

The live deck is built:

- **`docs/decks/2026-08-19_coned-leadership-walk-deck.html`** — 7-slide zero-dependency HTML, fixed 1920×1080 stage, arrow-key nav, prints one slide per page. Style is **Signal** from the frontend-slides bold-template-pack: navy + cream + antique-gold editorial system, Source Serif 4 headlines with roman/italic mid-sentence, DM Sans body, IBM Plex Mono chrome.

All five prose docs are indexed in `DOCS_INDEX.md`. Deck HTML is not indexed yet (needs `/intake` next session).

---

## The key decisions we made, and why

### Framing: workflow anchor, not model demo
David's five sections landed as: (1) problem, (2) who we are + what we built, (3) persona lens, (4) demo, (5) tech stack. We merged (3) and (4) into a single persona-driven arc: Maya on Monday morning is the through-line. The model is present throughout — case-file drivers, tier logic, honest UNVAL label on the topbar — but model claims land through the workflow, not as standalone model slides. Model honesty is contained to one beat on the tech stack slide.

**Why:** Ed pushed back twice against "not a model demo" framing. The synthesis: model is the substrate, workflow is what moves. That is also the reconciliation-loop reframe from the presentation notes.

### External pressures: tactfully contained
LL97 exposure, permit activity, weather-normalized consumption are surfaced in the case-file, but only mentioned once in Beat B of the demo. Not a slide. Not a repeated frame.

**Why:** Ed's note — "we would need to be tactful about this so it doesn't become the whole 'point' of our build." Blackstone deck drifted toward LL97-forward; we don't want the repeat.

### AM-feedback loop as "next unlock" (Ildi's ask)
Slide 7 is a diagram: solid-line existing (queue → AM outreach → status events) above dashed-line proposed (status events → training labels → next model). One sentence: "Direction, not commitment. Ildi's ask. Scoped after the current milestone set."

**Why:** Positioning, not commitment. Ed does not want to overclaim. Naming Ildi on stage reinforces partnership with the team, not vendor pitch.

### Style choice: Signal (not Case File, not Cartesian)
Three previews generated at Phase 2 of `/frontend-slides`. Ed picked B (Signal). Institutional editorial voice — reads as "quarterly briefing from a serious magazine," not corporate polish. Navy + cream + antique gold. Fits ConEd leadership audience while staying design-considered rather than templated.

### Content density: low / speaker-led
7 slides, one idea per slide, big type, generous negative space. Matches the Blackstone v6 form Ed pointed at: tight text per page, imagery-forward, generous space.

### Screenshots deferred to inline HTML mockups
Design bundle (nav topbar + motion) not landed. Rather than block on it, the deck uses text-driven layouts + a dashed-line SVG diagram on Slide 7. Live demo carries the visual product weight. Two-person split is fully swappable — (E)/(P) placeholders throughout the demo script.

---

## Load-bearing threads to preserve

- **Reconciliation-loop reframe.** "The model is stable by design. What moves week to week is the workflow." Beat E of the demo is where this lands live.
- **Model honesty, once.** cv_auc 0.6833, UNVAL, 54/1003 positives. Every surface reads XGB v1 · UNVAL live from `model_meta.json`. Slide 6 is the one place this beat lands.
- **Methodology gap = detective vs classifier.** Complementary to Johan's diagnostic framework. Ours ranks; his diagnoses. Different jobs, both needed. Never framed as competing.
- **Workflow signal.** What Maya's team does against the queue is what will train the next model.

### Words to use
flags · surfaces · reconciliation · workflow signal · stable · unvalidated · ranks · proxy

### Words to avoid
predicts · forecasts · AI-driven · "high likelihood of decline" · "the model retrains every week" · "state of the art" · "trained on ConEd data" · "real-time"

---

## Pre-demo prep (still open)

Time-ordered, most-critical first:

1. **Seed Railway demo status events (Tuesday afternoon of demo week).** 3–5 realistic status events on real BBLs from the Critical queue, distributed across the last 5 days. **Single most important item — without it Beat E of the demo falls flat visually.**
2. **Verify Railway build state (24–36 hrs before demo).** Full walk-through on the projector Ed will actually use. Hot-standby: Pedro's laptop pre-connected with the local build.
3. **Record screen capture as category-3 insurance (Tuesday night).** Play inline, narrate live over video. Only used if both Railway + local fail.
4. **Ed + Pedro pick presenter split.** Option 1 (owner-follows-hand) vs option 2 (clicker + narrator). Decide in rehearsal, not now. Script is fully swappable.
5. **Rehearse twice out loud, timed.** Total demo speech should land at ~8 min (2 min buffer inside the 10 min). If over 9, cut Beat D. If under 7, expand Beat B or E.

---

## What is deliberately NOT in the deck

Do not add these without a specific reason to reverse the decision:

- Screenshots of the product (using live demo instead; design bundle not landed).
- The chatbot / AI Agent (archived in `/legacy`, not in the walk).
- The methodology page (linked in footer text on Slide 6; not visited live).
- The report route + PDF (real feature; not shown; Q&A deflect).
- ⌘K command palette (real; not shown; dismiss if Pedro triggers by muscle memory).
- Aggregate view toggle (M11) — adds complexity for a leadership audience.
- Archetype/k-means labels (removed after M3, do not resurface).
- LL97-forward framing (contained to one sentence in Beat B; do not repeat).

---

## Next-session priorities (post-demo, in order)

1. `/intake` the deck HTML file into `DOCS_INDEX.md`.
2. Write a post-mortem: what landed, what did not, which Q&A questions came up, which forbidden phrases slipped in (Ed's honest self-audit).
3. If the September session is greenlit: turn Slide 7's dashed-line diagram into a scoping conversation. Ildi's ask becomes a real spec.
4. Fable review pass on the deck (deferred — was optional pre-Wednesday, more useful before September).

---

## Files to read on resume (in order)

1. This handoff.
2. `docs/decks/2026-08-18_ed_deck_coned-leadership-walk-outline.md` — the master.
3. `docs/decks/2026-08-19_coned-leadership-walk-deck.html` — what actually shipped to leadership.
4. If context needed on why: `docs/notes/presentation-notes.md`, `docs/handoffs/presentation/2026-08-18-presentation-kickoff.md`.

The five prose docs (persona script, tech stack, Q&A bank, next unlock, outline) are the source of truth for anything the deck compressed. If a slide reads thin, the answer is in one of them.
