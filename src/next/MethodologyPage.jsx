import { useState, useEffect } from "react";
import ErrorBoundary from "./ErrorBoundary.jsx";
import "./MethodologyPage.css";

/**
 * MethodologyPage — the M10 register.
 *
 * Contract: system-v1.1.md §5 (nine-section page), §6 laws (M family),
 * §7 rules 8/9, §8 rules. Roadmap M10 acceptance criteria in
 * docs/ref/2026-07-16_fable-roadmap.md.
 *
 * Two clocks per §5 note: sections 2/5/7 revise per model version;
 * sections 4/9 regenerate per pipeline run; section 8 backfills when
 * the research track runs. §1/3/6 revise per model version (semantics
 * of the shipped model). Each section carries its own stamp.
 */
export default function MethodologyPage() {
  const [token] = useState(() => sessionStorage.getItem("coned_token") || null);
  const [modelMeta, setModelMeta] = useState(null);
  const [modelMetaErr, setModelMetaErr] = useState(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetch("/api/model_meta", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((m) => { if (!cancelled) setModelMeta(m); })
      .catch((e) => { if (!cancelled) setModelMetaErr(e.message); });
    return () => { cancelled = true; };
  }, [token]);

  const modelStamp = modelMeta?.model_version ?? "model_meta pending";
  const runStamp = modelMeta?.run_date
    ? formatRunDate(modelMeta.run_date)
    : "pipeline run pending";
  const runStampShort = modelMeta?.run_date
    ? formatRunDate(modelMeta.run_date).slice(0, 10)
    : "pending";

  return (
    <ErrorBoundary
      label="MethodologyPage"
      fallback={<div className="mp-error">Methodology page failed to load. Check the browser console for details.</div>}
    >
      <div className="mp-scope sc-scope">
        {/* Local topbar retired 2026-08-19 — surface identity comes from
            the global ProvenanceStrip (D34/D37). */}

        {modelMetaErr && (
          <div className="mp-warn">
            model_meta fetch failed: {modelMetaErr}. Section stamps fall back to placeholders.
          </div>
        )}

        <h1 className="mp-title">Methodology</h1>
        <p className="mp-lede">
          The register for the ConEd steam attrition tool. Each section carries its own
          stamp: what revises when the model changes, what regenerates when the pipeline
          runs, and what backfills when the research track lands. If a surface elsewhere
          in the tool asserts a claim, the definition lives here and the surface links back.
        </p>

        <div className="mp-note">
          <p>
            <strong>Two dates on this page are not interchangeable.</strong> The
            validation run on 2026-07-01 fit the current XGBoost configuration to
            1,003 labeled buildings and produced the AUC reported in §9. The scoring
            refresh on 2026-07-15 reran the tiering pipeline against that same model
            configuration on the current enrichment, producing the tier and modifier
            assignments shown in the rankings and case files. Same model, later
            downstream computation.
          </p>
          <p>
            Label counts, positive counts, and AUC in this document trace to the 07-01
            validation run; population totals, prevalence counts, and per-building
            tiers trace to the 07-15 scoring refresh. Every run-clock sub-block on the
            page carries its own "as of" label so a reader can tell which snapshot a
            number came from. The 07-01 date itself appears only in this note; §9's
            run stamp is the 07-15 refresh.
          </p>
          <p>
            When the model configuration itself changes — a rerun of{" "}
            <code>train_xgboost.py</code> that yields a new <code>params_hash</code>{" "}
            — both clocks advance together and this note is retired.
          </p>
        </div>

        <Section
          n="1"
          title="What the tool claims, and what it doesn't"
          clock="model"
          stamp={modelStamp}
        >
          <p>
            This tool ranks buildings by steam-attrition risk and surfaces the reasons
            behind each ranking so an analyst can decide whether to engage. It does not
            forecast disconnect dates, allocate territory, or generate customer outreach
            on its own. Every ranking carries a provenance chip and a validation status;
            today that chip reads <code>UNVAL</code> because the classifier has not yet
            been back-tested against ConEd disconnect records (§7).
          </p>
          <p>
            The intended reader is a Steam Ops analyst preparing weekly triage. The
            intended cadence is a weekly review of the queue plus event-driven
            follow-ups when the delta feed names a change worth attention.
          </p>
          <p>
            The tool is a workbench, not an autopilot. The strongest defensibility
            feature is a human signature: reports and digests are drafted by the system
            and owned by the analyst who sends them (§8 rule 6).
          </p>
        </Section>

        <Section
          n="2"
          title="Signal taxonomy: the 12 features and their importances"
          clock="model"
          stamp={modelStamp}
        >
          <p>
            The XGBoost model consumes 12 features derived from public data: LL84
            energy disclosures, LL97 penalty arithmetic, DOB permit counts, NYCHA
            per-development weather regressions where they exist, NOAA Central Park
            weather normals. The full feature list and each feature's derivation live
            in <code>docs/model-technical-spec.md</code> §4. Feature importances render
            from <code>model_meta.feature_importances</code> so this section stays
            honest across model revisions.
          </p>
          <FeatureImportances importances={modelMeta?.feature_importances} />
          <p>
            The single-highest-importance feature is the log-scaled LL97 penalty
            (<code>ll97_penalty_2024_log</code>). The over-cap boolean carries 0.0000
            importance against it, which is why LL97 over-cap is excluded from the
            Critical modifier leg (canonical explanation in §5).
          </p>
          <p className="mp-todo">
            TODO(edwin): the pending item is <code>model_meta.feature_importances</code>
            {" "}(computed at <code>train_xgboost.py:194</code>, not yet written to the
            meta output at line 340). Once the write lands, add one-sentence
            plain-language glosses for the top three features.
          </p>
        </Section>

        <Section
          n="3"
          title="The tier chain (system-v1.1 §4.1 verbatim)"
          clock="model"
          stamp={modelStamp}
        >
          <p>
            The tier vocabulary is exactly: <strong>High / Medium / Low / Uncertain.</strong>
          </p>
          <p>
            The tier is a hybrid, and every surface says so. Assignment chain, per{" "}
            <code>compute_diagnostic_risk</code> in <code>update_enrichment_risk.py</code>:
          </p>
          <ol className="mp-chain">
            <li>
              <strong>Uncertain gates take priority.</strong> Fewer than 2 years of steam
              data, NYCHA development with regression R² below 0.3, or missing ml_risk.
            </li>
            <li>
              <strong>Base tier from ML probability cutoffs.</strong> Below 0.2 Low, 0.2
              to 0.6 Medium, 0.6 and above High.
            </li>
            <li>
              <strong>Modifiers, each shifting one tier level.</strong> IQR outlier in
              either delta period +1, accelerating decline +1, decelerating decline −1,
              LL97 over-cap (2024 or 2030) +1.
            </li>
            <li>
              <strong>Clamp to [Low, High].</strong>
            </li>
          </ol>
          <p>
            The system is model-seeded and modifier-driven.
          </p>
          <RunFacts stamp={runStampShort}>
            <p>
              70% of non-Uncertain rows are modifier-shifted; 78% of final High
              (182 of 233) is modifier-promoted, 176 of those from base Low.
            </p>
          </RunFacts>
          <p>
            The ledger column label is <strong>"Tier · ML base + trend/statute modifiers."</strong>
          </p>
        </Section>

        <Section
          n="4"
          title="Modifier prevalence and co-occurrence (per-run tables)"
          clock="run"
          stamp={runStamp}
        >
          <p>
            Modifier prevalence surfaces as counted filter chips on the queue and table.
            The count on a chip is the count of rows the chip opens; the two can never
            disagree because they are the same query. Every count in this section is
            named against its population — the natural denominator for modifier
            prevalence is the 956 non-Uncertain rows (modifiers don't apply to Uncertain);
            for cross-cutting counts (e.g., queue membership), the denominator is the
            1,210 ranked buildings. Each table below states its denominator once.
          </p>
          <p className="mp-todo">
            TODO(edwin): this section regenerates per pipeline run. Populate the prevalence
            table (Outlier Δ, Accelerating, Decelerating, LL97 over-cap 2024/2030,
            Modifier-promoted) with counts from the 2026-07-15 scoring refresh, named
            against the 956 non-Uncertain rows, plus the top three co-occurrence pairs.
            LL97 pressure at portfolio scale renders as penalty-magnitude bands (dollar
            ranges), never the over-cap boolean count (§8 rule 5).
          </p>
          <p className="mp-todo">
            TODO(edwin): per-run tables regenerate manually per pipeline run until
            automation exists. The run-date stamp above makes that honest.
          </p>
        </Section>

        <Section
          n="5"
          title="Critical: the composite queue state"
          clock="model"
          stamp={modelStamp}
        >
          <p>
            Critical is not a fifth tier. It is a composite queue state, defined as a
            conjunction:
          </p>
          <blockquote className="mp-quote">
            Critical = ml_risk ≥ 0.6 (the model's confident set, n=57) AND fresh '24
            normalized delta present AND at least one trend modifier (IQR outlier in
            either period OR accelerating decline).
          </blockquote>
          <RunFacts stamp={runStampShort}>
            <p>
              Current population: <strong>23 buildings</strong>. Top of queue: 660
              Madison Ave, 200 E 42nd St, 58 W 58th St.
            </p>
          </RunFacts>
          <p>
            LL97 over-cap is deliberately excluded from the modifier leg. The over-cap
            boolean carries 0.0000 feature importance while the log-scaled penalty is
            feature #1 at 0.2074, so the statute pressure is already encoded richly
            inside the model. The boolean would add double counting, not evidence.
            This is the canonical statement of the LL97 double-count decision; §2
            references it in one line and does not repeat the arithmetic.
          </p>
          <p>
            The defensible sentence: "the model puts it with past churners, its actual
            usage trend independently corroborates, and the signal is from this year."
            Lose any leg and the row demotes. Entering or leaving Critical is a nameable
            event on the delta feed.
          </p>
        </Section>

        <Section
          n="6"
          title="Reading the score: compression, quasi-tie, freshness"
          clock="model"
          stamp={modelStamp}
        >
          <p>
            <strong>ml_risk is a ranking, not a probability.</strong> Percentile display,
            no percent sign, no decimals, ties acknowledged. The distribution is strongly
            bimodal: below the ≥0.99 quasi-tie block, percentile gaps reflect very small
            score differences (§8 rule 1).
          </p>
          <p>
            <strong>Quasi-tie block.</strong> Rows with ml_risk ≥ 0.99 share a saturated
            score; within that block, ordering is noise. The score cell in the rankings
            table still shows the row's percentile because that cell is a table
            primitive; at case-file scale, however, the rank line renders block
            membership instead of ordinal position for rows inside the quasi-tie
            (§6 law L6, v1.1 refinement).
          </p>
          <RunFacts stamp={runStampShort} tag="Quasi-tie">
            <p>
              The quasi-tie block currently holds 52 rows. "Ranked #7 of 1,210"
              implies a precision the model does not have when 51 other rows sit
              within noise of that position.
            </p>
          </RunFacts>
          <p>
            <strong>Freshness states.</strong> Four named states, always naming the vintage
            of the newest normalized delta: fresh (Δ '24), Δ '23 only, no adjacent-year Δ,
            Uncertain (handled by the tier). Freshness is a state, not a decoration,
            because the ranking of a row against no-signal peers can be defensible while
            the same ranking against fresh-signal peers is not; the state tells the reader
            which comparison they are looking at. Absence of fresh signal is a designed
            state, never a bare dash. The data cause for the older states: many rows lack
            a '24 delta because <code>steam_2024</code> is null in LL84 for them
            (publication lag, not a pipeline failure), and the no-adjacent-year rows have
            non-consecutive reporting years so no adjacent-year delta is computable.
          </p>
          <RunFacts stamp={runStampShort} tag="Freshness">
            <p>
              Fresh (Δ '24): 422 rows. Δ '23 only: 321 rows. No adjacent-year Δ: 208
              rows. Uncertain: 254 rows. Roughly 5 rows sit in an unnamed edge state
              pending Ismael (ledger #22).
            </p>
          </RunFacts>
        </Section>

        <Section
          n="7"
          title="Model limitations (tech-spec §7)"
          clock="model"
          stamp={modelStamp}
        >
          <p>
            The four limitations below are the tech-spec §7 register (see{" "}
            <code>docs/model-technical-spec.md</code>). They describe what this model
            cannot yet answer, and why. Each limitation ships with the model version
            stamped above; when a limitation is closed by a future model, its retirement
            is recorded in §8's supersessions block.
          </p>
          <ol className="mp-chain">
            <li>
              <strong>Weather normalization gap (§7.1).</strong> ConEd's internal model
              uses per-building HDD/CDD linear regression with billing-day adjustment.
              Our labels use a single annual citywide HDD ratio. Some of the 54
              positive-labeled buildings may be partially weather-driven rather than
              behavioral. Best estimate: affects 5 to 15% of training labels.
            </li>
            <li>
              <strong>Causal validity gap (§7.2, partially addressed).</strong>{" "}
              <code>steam_ghg_share</code> addresses the "LL97 pressure ≠ steam
              conversion" gap but does not resolve two adjacent problems.
              Building-type feasibility: large hospitals and institutional buildings
              may not be able to convert (process steam for sterilization, scale of
              distribution systems) and may receive inflated risk scores. Alternative
              compliance pathways: envelope upgrades, controls, or RECs all satisfy
              LL97 without steam reduction, and the model cannot distinguish these
              pathways from actual attrition intent.
            </li>
            <li>
              <strong>No temporal holdout (§7.3).</strong> All labeled data comes from
              the same LL84 vintage as the features (CY2022/2023). A fully rigorous
              evaluation would train on pre-2022 behavior and predict 2023
              disconnections. We cannot do this until we have multiple years of ConEd
              billing history.
            </li>
            <li>
              <strong>Peer score contemporaneity (§7.4).</strong>{" "}
              <code>peer_score</code> reflects neighbors' attrition signals from the
              same reporting period, not a lagged leading indicator. It may capture
              simultaneous neighborhood-level decisions rather than predictive signal.
            </li>
          </ol>
          <h3 className="mp-h3">Data limitations</h3>
          <p>
            These are not tech-spec §7 items but are load-bearing enough to name here:
          </p>
          <ol className="mp-chain">
            <li>
              <strong>Small positive-label sample.</strong> The classifier is trained on
              54 positive-labeled buildings. Cross-validation AUC around 0.68 is a
              self-consistency check on the training universe, not a back-test against
              ConEd disconnect records. The provenance chip reads <code>UNVAL</code>{" "}
              until back-testing completes.
            </li>
            <li>
              <strong>Yearly resolution on the demand signal.</strong> LL84 publishes
              annual consumption. Per-building slope estimates on 3 to 4 years of data
              carry 2 to 3 degrees of freedom. Legitimate but statistically thin;
              billing-day resolution requires ConEd internal data.
            </li>
          </ol>
        </Section>

        <Section
          n="8"
          title="ConEd's framework and ours: complementary signals"
          clock="research"
          stamp="research track pending"
        >
          <p>
            These aren't two flavors of the same idea. They're two epistemic stances,
            and the shipped tool is honest about the blend it runs.
          </p>
          <h3 className="mp-h3">ConEd's approach: diagnostic / detective work</h3>
          <p>
            Build a model of how this specific customer normally uses steam under any
            weather. Watch for deviations from that customer's own baseline. When several
            diagnostic signals fire together, label as risk. Like medical diagnosis:
            not "how does this patient compare to other patients" but "how does this
            patient compare to their own normal."
          </p>
          <p>
            <em>Strengths:</em> customer-specific, transparent (labels carry the reason),
            handles "I don't know" naturally via low R². <em>Weaknesses:</em> needs long
            per-customer history, misses external drivers until they show up in usage,
            requires monthly billing data (yearly is statistically thin).
          </p>
          <h3 className="mp-h3">Our approach: classifier / pattern matcher</h3>
          <p>
            Take public signals about all buildings. Train on the buildings that
            historically left steam. For each current building, ask: how similar are
            this building's signals to the historical leavers? Like credit scoring:
            not "this borrower's own behavior" but "how this borrower compares to past
            defaulters."
          </p>
          <p>
            <em>Strengths:</em> works from day one without per-customer history, surfaces
            external pressure (LL97, DOB permits, peer behavior), model inspectable via
            SHAP per-building drivers. <em>Weaknesses:</em> small positive-label sample
            (54 buildings), can't say "this customer's usage is anomalous for them,"
            black box at the math layer.
          </p>
          <h3 className="mp-h3">Where they meet</h3>
          <p>
            ConEd's diagnostic approach surfaces customer-specific usage anomalies
            that are not yet externally visible, and customers whose own pattern is
            breaking down. Our classifier surfaces external pressure (LL97 fines, DOB
            permits) alongside customers in market conditions historically correlated
            with departure. These are <strong>complementary signals</strong>, not
            competing models. Target state: an early-warning system that runs both
            and triangulates. The shipped tool is one half of that pairing.
          </p>
          <p>
            <strong>The shipped chain is not a pure classifier.</strong> Path C in
            §4.1 blends the ML base with trend and statute modifiers: the tier that
            reaches a case file is XGBoost's ranking shifted by IQR outliers,
            acceleration/deceleration, and LL97 posture. That blend already borrows
            from the diagnostic tradition on the modifier leg. The "classifier vs
            diagnostic" framing above describes intellectual lineage; the running
            system is a hybrid.
          </p>
          <p>
            <strong>Uncertain, aligned.</strong> Our Uncertain tier already converges
            partially with Johan's fit-based definition. Where a per-building fit exists
            (the 24 NYCHA developments), we use its R² and gate Uncertain below 0.3.
            Where no per-building fit can exist on public data (fewer than 2 years,
            ml_risk missing), we use the coverage-based gate. Round 2 extends the
            fit-based gate portfolio-wide when per-building regressions land.
          </p>
          <h3 className="mp-h3">Supersessions</h3>
          <p>
            Framings and limitations retired from the shipped tool are recorded here.
            Two prior framings appear in older documents and should be read as retired,
            not applied to the shipped tool; limitations closed by future model versions
            will be added below as they land (per §7's cross-reference).
          </p>
          <ul className="mp-chain">
            <li>
              The alignment doc's dual-tier <strong>disagreement badge</strong> is not
              the shipped <code>DIVERGE</code> class. <code>DIVERGE</code> is
              intra-hybrid: base vs modifiers within one method. True two-method
              disagreement (classifier vs diagnostic fit) waits on the Round 2
              research engine.
            </li>
            <li>
              The <strong>"81% probability" display language</strong> from earlier
              spec drafts (§3d) is retired. Killed by law L1: ml_risk is a ranking,
              not a probability, and no surface presents it as one.
            </li>
          </ul>
          <p className="mp-todo">
            RESEARCH PENDING: pattern-mining approach for repeatable diagnostic labels.
            Johan's "repeatable pattern-based approach" is the Round 2 research engine
            behind the complementary-signals framing. This section backfills when that
            work runs. Placeholder per M10 acceptance criteria and §5 note on section 8's
            backfill clock.
          </p>
        </Section>

        <Section
          n="9"
          title="Version and provenance"
          clock="run"
          stamp={runStamp}
        >
          <ProvenanceBlock modelMeta={modelMeta} />
        </Section>

        <footer className="mp-footer">
          <p>
            Definitions on this page are the single source of truth for the surfaces
            that reference them. If a claim on a case file, report, digest, or queue
            surface disagrees with this page, the surface is wrong.
          </p>
        </footer>
      </div>
    </ErrorBoundary>
  );
}

function RunFacts({ stamp, tag, children }) {
  const label = tag
    ? `${tag} · as of the ${stamp} scoring refresh · run clock`
    : `as of the ${stamp} scoring refresh · run clock`;
  return (
    <div className="mp-runfacts">
      <span className="mp-runfacts-label">{label}</span>
      {children}
    </div>
  );
}

function Section({ n, title, clock, stamp, children }) {
  const clockLabel = {
    model: "revises per model version",
    run: "regenerates per pipeline run",
    research: "backfills when research track runs",
  }[clock] ?? clock;

  return (
    <section className="mp-section" id={`s${n}`}>
      <div className="mp-section-head">
        <h2 className="mp-h2">
          <span className="mp-n">{n}.</span> {title}
        </h2>
        <div className={`mp-stamp mp-stamp--${clock}`}>
          <span className="mp-stamp-val">{stamp}</span>
          <span className="mp-stamp-clock">{clockLabel}</span>
        </div>
      </div>
      <div className="mp-body">{children}</div>
    </section>
  );
}

function FeatureImportances({ importances }) {
  if (!Array.isArray(importances) || importances.length === 0) {
    return (
      <div className="mp-pending">
        Feature importances not yet emitted by <code>model_meta.json</code>. Table
        lands with the M2 AUC rerun (tracked as Q1 in QUESTIONS.md, owner Ismael).
      </div>
    );
  }
  return (
    <table className="mp-table">
      <thead>
        <tr>
          <th>Feature</th>
          <th className="num">Importance</th>
        </tr>
      </thead>
      <tbody>
        {importances.map((f) => (
          <tr key={f.name}>
            <td><code>{f.name}</code></td>
            <td className="num">{Number(f.importance).toFixed(4)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ProvenanceBlock({ modelMeta }) {
  if (!modelMeta) {
    return (
      <div className="mp-pending">
        Loading <code>model_meta</code>. If this persists, check the browser console
        for auth or network errors.
      </div>
    );
  }
  const aucLine = modelMeta.cv_auc == null
    ? "Validation rerun in progress."
    : `Ranks a true churner above a non-churner about ${Math.round(modelMeta.cv_auc * 100)}% of the time (${modelMeta.cv_kfold}-fold CV, ${modelMeta.n_positive} positive labels).`;
  const cvStdLine = modelMeta.cv_std == null
    ? null
    : `±${Number(modelMeta.cv_std).toFixed(4)} across the ${modelMeta.cv_kfold} folds.`;
  const validationLine = modelMeta.validation_status === "unvalidated"
    ? "unvalidated — cross-validated on the training universe only; no back-test against ConEd disconnect records yet. Provenance chip reads UNVAL until that back-test lands."
    : modelMeta.validation_status;

  return (
    <dl className="mp-dl">
      <dt>Model</dt>
      <dd><code>{modelMeta.model_name}</code></dd>
      <dt>Version</dt>
      <dd><code>{modelMeta.model_version}</code></dd>
      <dt>Validation status</dt>
      <dd>{validationLine}</dd>
      <dt>AUC</dt>
      <dd>{aucLine}</dd>
      {cvStdLine && (
        <>
          <dt>CV spread</dt>
          <dd>{cvStdLine}</dd>
        </>
      )}
      <dt>Label definition</dt>
      <dd>{modelMeta.label_definition}</dd>
      <dt>Training set</dt>
      <dd>{modelMeta.n_labeled} labeled buildings, {modelMeta.n_positive} positive.</dd>
      <dt>Params hash</dt>
      <dd><code>{modelMeta.params_hash}</code></dd>
      <dt>Commit</dt>
      <dd><code>{modelMeta.commit}</code></dd>
      <dt>Pipeline run</dt>
      <dd>{formatRunDate(modelMeta.run_date)}</dd>
      <dt>Built by</dt>
      <dd>Pursuit for Con Edison</dd>
    </dl>
  );
}

function formatRunDate(iso) {
  if (!iso) return "unknown";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const min = String(d.getUTCMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min} UTC`;
}
