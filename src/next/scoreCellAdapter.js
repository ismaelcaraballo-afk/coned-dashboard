/**
 * Adapts a merged building record (from useBuildings) into ScoreCell props.
 *
 * Percentile: computed once per rowset from ml_risk, rendered as an ordinal
 * string per L1/L6. Ties render as the shared percentile (queue scale);
 * §5 v1.1's ">=0.99 quasi-tie block" copy applies at case-file scale, not
 * here — the queue still shows the percentile per row.
 *
 * Divergence: L3 v1.1 amendment — fires only on two-tier promotions
 * (base tier from ml_risk cutoffs = Low, final tier from diagnostic_risk = High).
 *
 * Freshness: derives from yoy_deltas fields (§4.5 chip states).
 */

const BASE_LOW_MAX = 0.2;   // §4.1: below 0.2 → base Low
const BASE_HIGH_MIN = 0.6;  // §4.1: 0.6 and above → base High

const TIER_MAP = {
  High: "High",
  Medium: "Medium",
  Low: "Low",
  Uncertain: "Uncertain",
};

function baseTier(mlRisk) {
  if (!Number.isFinite(mlRisk)) return null;
  if (mlRisk < BASE_LOW_MAX) return "Low";
  if (mlRisk >= BASE_HIGH_MIN) return "High";
  return "Medium";
}

function ordinal(n) {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  const s = n % 10;
  if (s === 1) return `${n}st`;
  if (s === 2) return `${n}nd`;
  if (s === 3) return `${n}rd`;
  return `${n}th`;
}

function freshnessChip(b) {
  // §4.5 four states: Δ '24 fresh, Δ '23 only stale, no adjacent-yr Δ stale,
  // (Uncertain handled by tier — no chip).
  if (b.diagnostic_risk === "Uncertain") return null;

  const d24 = b.norm_delta_23_24;
  if (Number.isFinite(d24)) {
    const sign = d24 < 0 ? "−" : "+";
    const pct = Math.round(Math.abs(d24));
    return { label: `Δ '24 ${sign}${pct}%` };
  }

  const d23 = b.norm_delta_22_23;
  if (Number.isFinite(d23)) {
    return { label: "Δ '23 only", stale: true };
  }

  return { label: "no adjacent-yr Δ", stale: true };
}

/**
 * Ranks buildings by ml_risk descending and assigns 1..N-based percentiles.
 * Ties get the same percentile.
 *
 * Buildings without ml_risk fall to the bottom, receive no percentile
 * (adapter emits "est." for them per S5).
 */
export function computePercentileMap(buildings) {
  const scored = buildings
    .filter((b) => Number.isFinite(b.ml_risk))
    .slice()
    .sort((a, b) => b.ml_risk - a.ml_risk);

  const n = scored.length;
  const pctByKey = new Map();

  let i = 0;
  while (i < n) {
    let j = i;
    while (j + 1 < n && scored[j + 1].ml_risk === scored[i].ml_risk) j++;
    // Shared percentile for the tie block; higher rank = higher percentile.
    const rank = i + 1;
    const pct = Math.max(1, Math.min(99, Math.round(((n - rank + 1) / n) * 100)));
    for (let k = i; k <= j; k++) {
      pctByKey.set(scored[k].address, pct);
    }
    i = j + 1;
  }

  return pctByKey;
}

const XGB_UNVAL_LABEL = "XGB v1 · UNVAL";
// TODO (post-#11): source from /api/model_meta.model_version instead of constant.

export function toScoreCellProps(building, pctByKey) {
  const tier = TIER_MAP[building.diagnostic_risk] ?? "Uncertain";

  // S5 legacy fallback: no ml_risk.
  if (!building.has_ml_risk) {
    return {
      percentile: "est.",
      tier,
      provenance: { label: "Legacy heuristic", stale: true },
      freshness: null,
    };
  }

  const pct = pctByKey.get(building.address);
  const percentile = pct != null ? ordinal(pct) : "est.";

  // L3 v1.1: divergence only on two-tier promotions (base Low → final High).
  const base = baseTier(building.ml_risk);
  const diverged = base === "Low" && tier === "High";

  return {
    percentile,
    tier,
    diverged,
    provenance: { label: XGB_UNVAL_LABEL },
    freshness: freshnessChip(building),
  };
}
