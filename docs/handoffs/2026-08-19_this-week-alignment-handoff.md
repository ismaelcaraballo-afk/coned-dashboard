# Handoff — /this-week visual alignment with Fable artifact

**Written:** 2026-08-19 (late session, context near cap)
**Deadline:** Wednesday 2026-08-20 ConEd leadership walk demo (~24hr)
**Branch:** `edwin/design-bundle` (uncommitted)
**Dev server:** was running on :5174

---

## The objective, plainly

Make our `/this-week` landing page look like Fable's `this-week-landing.html` artifact. That's it. Not a redesign, not a new spec — a **visual/layout reconciliation** between what Fable drew and what we shipped.

We had already done the copy + naming reconciliation (D44/D45/D46 in DECISIONS.md — "Since last run", the empty-state string, dropping "Week of"). The remaining gap is **visual composition**: proportions, alignment, button treatment, container framing, spacing rhythm.

## Where to look (do this first)

1. **Fable's artifact (source of truth):**
   `docs/design/fable-round-0-2026-07-12/this-week-landing.html`
   Open it in a browser. This is what we're aiming at.

2. **Our current build:**
   `src/next/ThisWeekPage.jsx` + `src/next/ThisWeekPage.css`
   Run `npm run dev`, log in, land on `/this-week`.

3. **Fable's landing-framing answer (already applied):**
   `docs/fable/answers/2026-08-19_landing-framing-answer.md` — the D44/D45/D46 decisions on naming/copy. Don't re-litigate these; they're settled.

4. **Screenshots Ed pasted this session** — not persisted to disk. If you need them, ask Ed to re-share. But the HTML artifact is authoritative and should be enough.

## Recent tries and why they didn't land

Three iterations this session, all attempting to close the visual gap:

### Try 1 — alignment audit
Diagnosed three competing containers (`.tw-body-inner`, `.tw-page-heading`, `.cq-root`) each with their own `max-width` + `margin: 0 auto` + horizontal padding, producing nested indents. Consolidated to one container. Fixed the "SINCE LAST RUN title floating in the middle" issue but didn't make the page *look like* Fable's.

### Try 2 — add the search input + command row
Added `.tw-ask-btn` (⌘K trigger dressed as a search input) alongside Portfolio and Compose buttons. Ed's rationale: the input **contextualizes** the ⌘K command for first-time viewers. Landed correctly but the three controls read as inconsistent — different fonts, sizes, heights, colors.

### Try 3 (most recent, current state) — workspace box + button normalization
- Wrapped `.tw-body-inner` in a bordered card (`--sc-canvas` bg, `--sc-bench-line` border, 40px auto margin, 40px 40px 48px padding, radius 4px)
- Normalized `.tw-ask-btn` / `.tw-portfolio-btn` / `.tw-compose-btn` to a shared shell: 36px height, mono/12px, 3px radius, all bordered on canvas — Compose keeps accent-orange bg + `margin-left: auto` for primary emphasis
- Compose is now pushed to the right of the row

**Ed's verdict: "still no."** The page still doesn't match Fable's artifact. My iterations have been guessing at CSS knobs without a rigorous side-by-side comparison of proportions, spacing scale, and composition. That's the failure mode to break out of in the next session.

## What the next session should actually do

**Do not blindly tweak more CSS.** The pattern that hasn't worked is: I look at the current page, imagine what "closer to Fable" means, adjust CSS, ship. Instead:

1. **Read the Fable artifact HTML fully.** Note its container structure, exact spacing values, exact typography ramp, exact button treatments, background layering, section-to-section rhythm. Write these down.
2. **Read our current `ThisWeekPage.jsx` + `.css` fully.** Enumerate what differs from the artifact, structurally *and* stylistically.
3. **Present the diff to Ed before editing.** A concrete list of "artifact does X, we do Y" items, ranked by visual impact. Let him confirm the fix order.
4. **Then edit, and verify in browser between each change.**

The compaction risk is real — this is a visual-parity problem, not a code problem, and my in-line iteration has burned context without converging.

## Skills to invoke in the next session

- **`/redesign-kickoff`** (if the design-researcher subagent gives you leverage) — probably overkill for a parity task, but worth considering if the next agent wants to formally reframe the problem.
- **`Agent` with `subagent_type: Explore`** — good for the "read Fable's HTML thoroughly + enumerate what our CSS does" step without spending main-context tokens. Prompt it: "Compare `docs/design/fable-round-0-2026-07-12/this-week-landing.html` against `src/next/ThisWeekPage.jsx` + `src/next/ThisWeekPage.css`. Return a structured diff: container structure, typography scale, spacing scale, button treatments, section rhythm, background layering. Rank the mismatches by visual impact."
- **`/goal-check`** if you want a sanity check that this visual work is still the right thing to be spending 24hr on before the demo.
- **No new Fable consult needed.** The artifact is our answer key; we just haven't matched it yet.

## Files touched this session (uncommitted)

- `src/next/ThisWeekPage.jsx` — copy/structure per D44/D45/D46 + command row
- `src/next/ThisWeekPage.css` — heading, command row, workspace box, button shell
- `src/next/CriticalQueue.jsx` + `.css` — LL97 '30 swap + alignment consolidation
- `src/next/reportAdapter.js` — LL97 2030 penalty field
- `src/next/routeNames.js` — "This Week" → "Since last run"
- `DECISIONS.md` — D42–D46 logged
- `docs/fable/2026-08-19_landing-framing-ask.md` + answers/ — Fable consult record

Nothing pushed. All safe to revise or revert.

## What's *not* the goal (out of scope for this handoff)

- Weekly-cadence framing debate (settled by D42; revisit post-walk)
- Pulse rebuild, chip taxonomy swap, row meta badges (deferred artifact divergences; won't ship in 24hr)
- Push/PR decision on `edwin/design-bundle` (make the page right first, then decide)
- Login rebuild, ProvenanceStrip, WaveDivider (already landed, not this task)

Just: make `/this-week` look like `docs/design/fable-round-0-2026-07-12/this-week-landing.html`.
