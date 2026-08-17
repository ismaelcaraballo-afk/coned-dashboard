import "./ScoreCell.css";

/**
 * ScoreCell — the M3 atom.
 *
 * Contract: system-v1.1.md §Components (Score cell / Spec 1) + §4.4 provenance,
 * §4.5 freshness, §6 laws L1–L6, §7 rules 8–9, §8 rules 1–2.
 * Visual reference: docs/design/fable-round-0-2026-07-12/score-cell-anatomy.html.
 *
 * L1 is enforced: `percentile` is a formatted string ("96th", "est."), never a
 * number the caller can accidentally suffix with "%".
 */

const TIERS = new Set(["Low", "Medium", "High", "Critical", "Uncertain"]);
const tierClass = {
  Low: "sc-tier--low",
  Medium: "sc-tier--med",
  High: "sc-tier--high",
  Critical: "sc-tier--crit",
  Uncertain: "sc-tier--uncertain",
};
const tickClass = {
  Low: "sc-tick--low",
  Medium: "sc-tick--med",
  High: "sc-tick--high",
  Critical: "sc-tick--crit",
  Uncertain: "sc-tick--uncertain",
};

export default function ScoreCell({
  percentile,        // string, e.g. "96th" or "est."
  tier,              // "Low" | "Medium" | "High" | "Critical" | "Uncertain"
  provenance,        // { label: string, verified?: boolean }
  freshness,         // { label: string, stale?: boolean } | null
  diverged = false,  // L3: two-tier promotion only (base Low → final High)
}) {
  if (!TIERS.has(tier)) {
    throw new Error(`ScoreCell: unknown tier "${tier}"`);
  }
  const isEst = percentile === "est.";

  return (
    <div className="sc-cell">
      <span className={`sc-tick ${tickClass[tier]}`} />
      <div className="sc-body">
        <div className="sc-r1">
          <span className={`sc-pct ${isEst ? "sc-pct--est" : ""}`}>
            {percentile}
          </span>
          {diverged && <span className="sc-diverge" aria-label="diverged">◇</span>}
          <span className={`sc-tier ${tierClass[tier]}`}>{tier}</span>
        </div>
        {(provenance || freshness) && (
          <div className="sc-r2">
            {provenance && (
              <span className={`sc-chip ${provenance.verified ? "sc-chip--verified" : ""}`}>
                {provenance.label}
              </span>
            )}
            {freshness && (
              <span className={`sc-chip ${freshness.stale ? "sc-chip--stale" : ""}`}>
                {freshness.label}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
