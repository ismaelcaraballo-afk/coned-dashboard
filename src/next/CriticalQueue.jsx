import { useMemo, useState } from "react";
import ScoreCell from "./ScoreCell.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";
import { computePercentileMap, toScoreCellProps, normalizeBbl } from "./caseFileAdapter.jsx";
import { isCritical } from "../data/criticalFilter.js";
import { LL97_BANDS, bandOf } from "../data/ll97Bands.js";
import "./CriticalQueue.css";

function isOutlierDelta(b) {
  return !!(b.outlier_23_24 || b.outlier_22_23);
}

function isAccelerating(b) {
  return b.decline_trend_label === "accelerating";
}

// Modifier-promoted: ML base Low/Medium but rule tier High (the §4.1 DIVERGE population)
function isModifierPromoted(b) {
  return b.diagnostic_risk === "High" && typeof b.ml_risk === "number" && b.ml_risk < 0.6;
}

const CHIPS = [
  { key: "critical",          label: "Critical",          filter: isCritical,         expr: "ml_risk ≥ 0.6 · Δ23–24 present · (outlier OR accelerating)" },
  { key: "outlier",           label: "Outlier Δ",         filter: isOutlierDelta,     expr: "outlier_23_24 OR outlier_22_23" },
  { key: "accelerating",      label: "Accelerating",      filter: isAccelerating,     expr: "decline_trend_label = accelerating" },
  { key: "modifier-promoted", label: "Modifier-promoted", filter: isModifierPromoted, expr: "diagnostic_risk = High AND ml_risk < 0.6" },
];

// Modifiers used for aggregate co-occurrence (Critical is the frame, not a modifier axis)
const MODIFIERS = [
  { key: "outlier",           label: "Outlier Δ",         test: isOutlierDelta },
  { key: "accelerating",      label: "Accelerating",      test: isAccelerating },
  { key: "modifier-promoted", label: "Modifier-promoted", test: isModifierPromoted },
];

function formatMkBtu(steam) {
  if (!Number.isFinite(steam)) return "—";
  return (steam / 1_000_000).toFixed(1);
}

function formatMoney(n) {
  if (!Number.isFinite(n) || n === 0) return "$0";
  return `$${Math.round(n).toLocaleString()}`;
}

function formatRunStamp(iso) {
  if (!iso) return "run —";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "run —";
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `run ${yyyy}-${mm}-${dd}`;
}

function computeBandCounts(rows) {
  const counts = Object.fromEntries(LL97_BANDS.map((b) => [b.key, 0]));
  for (const b of rows) counts[bandOf(b.ll97_penalty_2030).key] += 1;
  return counts;
}

function computeCoOccurrence(rows) {
  const pairs = [];
  for (let i = 0; i < MODIFIERS.length; i++) {
    for (let j = i + 1; j < MODIFIERS.length; j++) {
      const a = MODIFIERS[i];
      const z = MODIFIERS[j];
      const n = rows.filter((b) => a.test(b) && z.test(b)).length;
      pairs.push({ key: `${a.key}+${z.key}`, label: `${a.label} + ${z.label}`, n });
    }
  }
  return pairs;
}

/**
 * M8: Queue + modifier filter chips + Critical membership.
 * M11: List | Aggregate toggle. Aggregate renders count tiles, modifier co-occurrence pairs,
 * and LL97 2030 penalty-magnitude bands — all derived from the currently filtered rowset.
 * Header states filter expression + row count + run stamp (W3 amended).
 */
export default function CriticalQueue({ buildings, hasM6 = false, statusCounts = null, runDate = null, limit = null }) {
  const [activeChip, setActiveChip] = useState("critical");
  const [view, setView] = useState("list");
  const [expanded, setExpanded] = useState(false);
  const effectiveLimit = limit != null && !expanded ? limit : null;

  const pctByKey = useMemo(() => computePercentileMap(buildings), [buildings]);

  const counts = useMemo(() =>
    Object.fromEntries(CHIPS.map((c) => [c.key, buildings.filter(c.filter).length])),
    [buildings]
  );

  const activeChipObj = CHIPS.find((c) => c.key === activeChip);

  const rows = useMemo(() => {
    const filtered = activeChipObj ? buildings.filter(activeChipObj.filter) : buildings;
    return filtered
      .slice()
      .sort((a, z) => (z.ml_risk ?? -1) - (a.ml_risk ?? -1));
  }, [buildings, activeChip, activeChipObj]);

  const bandCounts    = useMemo(() => computeBandCounts(rows),    [rows]);
  const coOccurrence  = useMemo(() => computeCoOccurrence(rows),  [rows]);

  const criticalCount = counts["critical"];
  const queueLabel = activeChip === "critical"
    ? `${criticalCount} Critical`
    : `${rows.length} ${activeChipObj?.label ?? ""}`;

  return (
    <div className="cq-scope cq-root">
      <div className="cq-header">
        <div className="cq-title-row">
          <h2 className="cq-title">Queue</h2>
          <span className="cq-count">{queueLabel}</span>
          <div className="cq-view-toggle" role="group" aria-label="Queue view">
            <button
              className={`cq-view-btn${view === "list" ? " cq-view-btn--active" : ""}`}
              onClick={() => setView("list")}
              aria-pressed={view === "list"}
            >
              List
            </button>
            <button
              className={`cq-view-btn${view === "aggregate" ? " cq-view-btn--active" : ""}`}
              onClick={() => setView("aggregate")}
              aria-pressed={view === "aggregate"}
            >
              Aggregate
            </button>
          </div>
        </div>

        <div className="cq-chips" role="group" aria-label="Filter queue">
          {CHIPS.map((chip) => (
            <button
              key={chip.key}
              className={`cq-chip${activeChip === chip.key ? " cq-chip--active" : ""}`}
              onClick={() => setActiveChip(chip.key)}
              aria-pressed={activeChip === chip.key}
            >
              {chip.label}
              <span className="cq-chip-count">{counts[chip.key]}</span>
            </button>
          ))}
        </div>

        {hasM6 && statusCounts ? (
          <p className="cq-m6-math">
            <span className="cq-m6-total">{statusCounts.total} Critical</span>
            {" − "}
            <span>{statusCounts.contacted} contacted</span>
            {" − "}
            <span>{statusCounts.dismissed} dismissed</span>
            {" = "}
            <span className="cq-m6-toreview">{statusCounts.toReview} to review</span>
          </p>
        ) : !hasM6 && (
          <p className="cq-m6-note">
            Subtraction arithmetic and carry-over ages ship with M6.
          </p>
        )}

        {view === "aggregate" && (
          <p className="cq-agg-stamp">
            Filter: <span className="cq-agg-expr">{activeChipObj?.expr}</span>
            {" · "}n = {rows.length}
            {" · "}{formatRunStamp(runDate)}
          </p>
        )}
      </div>

      {view === "aggregate" ? (
        rows.length === 0 ? (
          <div className="cq-empty">No buildings match this filter.</div>
        ) : (
          <div className="cq-agg" aria-label="Aggregate view">
            <section className="cq-agg-section">
              <h3 className="cq-agg-h">Modifier tiles</h3>
              <div className="cq-agg-tiles">
                {MODIFIERS.map((m) => {
                  const n = rows.filter(m.test).length;
                  return (
                    <div key={m.key} className="cq-agg-tile">
                      <div className="cq-agg-tile-n">{n}</div>
                      <div className="cq-agg-tile-label">{m.label}</div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="cq-agg-section">
              <h3 className="cq-agg-h">Co-occurrence</h3>
              <ul className="cq-agg-pairs">
                {coOccurrence.map((p) => (
                  <li key={p.key} className="cq-agg-pair">
                    <span className="cq-agg-pair-label">{p.label}</span>
                    <span className="cq-agg-pair-n">{p.n}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="cq-agg-section">
              <h3 className="cq-agg-h">LL97 2030 penalty bands</h3>
              <ul className="cq-agg-bands">
                {LL97_BANDS.map((b) => (
                  <li key={b.key} className="cq-agg-band">
                    <span className="cq-agg-band-label">{b.label}</span>
                    <span className="cq-agg-band-n">{bandCounts[b.key]}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )
      ) : rows.length === 0 ? (
        <div className="cq-empty">No buildings match this filter.</div>
      ) : (
        <>
        <div className="cq-bench">
          <table className="cq-table">
            <thead>
              <tr>
                <th>Address</th>
                <th>Score</th>
                <th>Trend</th>
                <th className="num">Steam (M kBtu)</th>
                <th className="num">LL97 '30</th>
              </tr>
            </thead>
            <tbody>
              {(effectiveLimit ? rows.slice(0, effectiveLimit) : rows).map((b, i) => {
                const bbl  = normalizeBbl(b.bbl);
                const cell = toScoreCellProps(b, pctByKey, i + 1);
                return (
                  <tr key={bbl ?? b.address} className={isCritical(b) ? "cq-row--critical" : ""}>
                    <td className="cq-addr">
                      {bbl
                        ? <a href={`/case-file/${bbl}`} className="cq-addr-link">{b.address}</a>
                        : b.address}
                    </td>
                    <td>
                      <ErrorBoundary label={`CriticalQueue:ScoreCell:${b.address}`} fallback={<span className="cq-err">—</span>}>
                        <ScoreCell {...cell} />
                      </ErrorBoundary>
                    </td>
                    <td className="cq-trend" data-trend={b.decline_trend_label ?? ""}>
                      {b.decline_trend_label ?? "—"}
                    </td>
                    <td className="num">{formatMkBtu(b.steam)}</td>
                    <td className="num">{formatMoney(b.ll97_penalty_2030)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {limit && rows.length > limit && (
          <button
            type="button"
            className="cq-see-all"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            {expanded ? "Collapse" : `See all ${rows.length}`}
          </button>
        )}
        </>
      )}
    </div>
  );
}
