/**
 * Adapts a merged building record + model_meta + current status event into
 * CaseFileHeader props.
 *
 * §7 rule 8: AUC copy templated from model_meta, single source of truth.
 * §7 rule 9: model_version sources from model_meta, never hardcoded.
 * §5 v1.1 amendments: three fresh-column variants; peer_score labeled non-causally.
 * L1: percentile rendered as string ("99th", "est."); L6: quasi-tie block per §5.
 * L3 v1.1: two-tier promotion detected (base Low from ml_risk cutoff → final High).
 */

const BASE_LOW_MAX = 0.2;
const BASE_HIGH_MIN = 0.6;
const MAX_DRIVER_CONTRIB = 4; // typical SHAP magnitude; bars saturate above this

// ── BBL normalization ────────────────────────────────────────────────────────
// Buildings.json BBLs come as "1-01111-0001", "1010680001", or
// "1010680001; 1010680003". The API accepts only 10-digit strings.
// Return the first 10-digit run, or null if none found.
export function normalizeBbl(raw) {
  if (typeof raw !== "string") return null;
  const digits = raw.replace(/[^0-9;]/g, "");
  const first = digits.split(";")[0];
  return /^[1-5]\d{9}$/.test(first) ? first : null;
}

// ── formatters ───────────────────────────────────────────────────────────────
function ordinal(n) {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  const s = n % 10;
  if (s === 1) return `${n}st`;
  if (s === 2) return `${n}nd`;
  if (s === 3) return `${n}rd`;
  return `${n}th`;
}

function fmtMoney(n) {
  if (!Number.isFinite(n)) return "—";
  return "$" + Math.round(n).toLocaleString();
}

function fmtInt(n) {
  if (!Number.isFinite(n)) return "—";
  return Math.round(n).toLocaleString();
}

function fmtSteam(kbtu) {
  if (!Number.isFinite(kbtu)) return "—";
  if (kbtu >= 1_000_000) return `${(kbtu / 1_000_000).toFixed(1)} M kBtu`;
  return `${fmtInt(kbtu)} kBtu`;
}

function fmtPct(x, decimals = 0) {
  if (!Number.isFinite(x)) return "—";
  return `${(x * 100).toFixed(decimals)}%`;
}

// ── percentile map ───────────────────────────────────────────────────────────
export function computePercentileMap(buildings) {
  const scored = buildings
    .filter((b) => Number.isFinite(b.ml_risk))
    .slice()
    .sort((a, b) => b.ml_risk - a.ml_risk);

  const n = scored.length;
  const pctByAddr = new Map();
  const rankByAddr = new Map();

  let i = 0;
  while (i < n) {
    let j = i;
    while (j < n && scored[j].ml_risk === scored[i].ml_risk) j++;
    const rank = i + 1;
    const pct = Math.max(1, Math.round(((n - rank + 1) / n) * 100));
    const tieCount = j - i;
    for (let k = i; k < j; k++) {
      pctByAddr.set(scored[k].address, { pct, rank, tieCount });
      rankByAddr.set(scored[k].address, rank);
    }
    i = j;
  }
  return { pctByAddr, total: n };
}

// ── ScoreCell adapter ────────────────────────────────────────────────────────
// Maps a building + pctMap → props ready to spread onto <ScoreCell />.
export function toScoreCellProps(building, pctMap) {
  const entry = pctMap.pctByAddr?.get(building.address);
  const percentile = entry ? ordinal(entry.pct) : "est.";

  const finalTier = building.diagnostic_risk ?? "Uncertain";
  const ml = building.ml_risk;
  const base = Number.isFinite(ml)
    ? ml < BASE_LOW_MAX ? "Low" : ml >= BASE_HIGH_MIN ? "High" : "Medium"
    : null;
  const diverged = base === "Low" && finalTier === "High";

  return {
    percentile,
    tier: finalTier,
    provenance: { label: "XGB v1 · UNVAL", verified: false },
    freshness: null,
    diverged,
  };
}

// ── ledger columns ───────────────────────────────────────────────────────────
function buildQueueColumn(building, pctMap, modelMeta) {
  const entry = pctMap.pctByAddr.get(building.address);
  const provenance = buildProvenanceString(modelMeta);

  if (!entry) {
    return {
      percentile: "est.",
      sub: "no XGB score · legacy heuristic",
      provenance: "Legacy heuristic · no XGB score for this row.",
    };
  }

  const { pct, rank, tieCount } = entry;
  const tieSuffix = tieCount > 1 ? ` · tied w/ ${tieCount - 1}` : "";
  return {
    percentile: `${ordinal(pct)}`,
    sub: `#${rank} of ${pctMap.total.toLocaleString()}${tieSuffix}`,
    provenance,
  };
}

function buildProvenanceString(m) {
  if (!m || typeof m !== "object") return "Model provenance loading…";
  const version = m.model_version ?? "XGB v1 · UNVAL";
  const status = m.validation_status === "backtested" ? "back-tested" : "unvalidated";
  if (!Number.isFinite(m.cv_auc)) {
    return `${version} · ${status} · validation rerun in progress.`;
  }
  const aucPct = Math.round(m.cv_auc * 100);
  const aucStr = m.cv_auc.toFixed(2);
  const kfold = m.cv_kfold ?? 5;
  const pos = m.n_positive ?? "—";
  return `${version} · ${status} · AUC ${aucStr}: ranks a true churner above a non-churner about ${aucPct}% of the time (${kfold}-fold CV, ${pos} positive labels).`;
}

function buildTierColumn(building) {
  const finalTier = building.diagnostic_risk ?? "Uncertain";
  const ml = building.ml_risk;
  const base = Number.isFinite(ml)
    ? ml < BASE_LOW_MAX ? "Low" : ml >= BASE_HIGH_MIN ? "High" : "Medium"
    : null;
  const diverged = base === "Low" && finalTier === "High";

  let sub;
  if (finalTier === "Uncertain") {
    const reason = building.uncertain_reason || "insufficient reporting years for HDD-normalized delta";
    sub = <>{reason}. NYCHA R² gate {building.nycha_r2 == null ? "not applicable" : `= ${building.nycha_r2.toFixed(2)}`}.</>;
  } else if (diverged) {
    const penalty = fmtMoney(building.ll97_penalty_2030);
    sub = <>Base <b>Low</b> promoted by statute modifier: LL97 penalty <b>{penalty}</b>/yr at 2030 caps. Chain: ML(Low) + LL97 → {finalTier}.</>;
  } else {
    const d24 = building.norm_delta_23_24;
    const d23 = building.norm_delta_22_23;
    if (Number.isFinite(d24)) {
      const sign = d24 < 0 ? "−" : "+";
      const pct = Math.abs(Math.round(d24));
      sub = <>Δ '24 <b>{sign}{pct}%</b> HDD-normalized. Weather-normalized per the method ConEd's own team uses. Vintage: 2024.</>;
    } else if (Number.isFinite(d23)) {
      const sign = d23 < 0 ? "−" : "+";
      const pct = Math.abs(Math.round(d23));
      sub = <>Δ '23 <b>{sign}{pct}%</b> HDD-normalized. No '24 delta on file yet. Vintage: 2023.</>;
    } else {
      sub = <>No adjacent-year Δ on file. Tier from portfolio ML rank only.</>;
    }
  }

  return { tier: finalTier, sub };
}

function buildCoverageColumn(building) {
  const n = building.n_years_data;
  const d24 = Number.isFinite(building.norm_delta_23_24);
  const d23 = Number.isFinite(building.norm_delta_22_23);
  const eui = building.eui;
  const jobs = building.dob_jobs ?? 0;

  const bigVal = Number.isFinite(n) ? String(n) : "—";
  const unit = n === 1 ? "yr" : "yrs";

  let years;
  if (n >= 3) years = "2022–2024";
  else if (n === 2) years = d24 ? "2023–2024" : "2022–2023";
  else if (n === 1) years = "one year only";
  else years = "—";

  const freshBit = d24 ? "fresh Δ present" : d23 ? "'24 pending" : "no adjacent-yr Δ";
  const euiBit = Number.isFinite(eui) ? <>EUI <b>{eui.toFixed(1)} kBtu/ft²</b></> : "EUI unavailable";

  return {
    big: bigVal,
    unit,
    sub: <>History <b>{years}</b> · {freshBit} · {euiBit} · DOB permits <b>{jobs}</b> recent.</>,
  };
}

// ── drivers ──────────────────────────────────────────────────────────────────
const FEATURE_LABELS = {
  energy_star: { name: "Energy Star score", value: (v) => <><b>{Math.round(v)}</b> / 100</> },
  peer_score:  { name: "Cluster peer score",  value: (v) => <><b>{v.toFixed(2)}</b></> },
  log_ghg:     { name: "Total emissions",  value: (v) => <><b>{fmtInt(Math.exp(v))}</b> MT CO₂e</> },
  year_built:  { name: "Building age",  value: (v) => <><b>{Math.round(v)}</b> · {new Date().getFullYear() - Math.round(v)} yrs</> },
  ll97_penalty_2030_log: { name: "LL97 penalty at 2030 caps",  value: (v) => <><b>{fmtMoney(Math.exp(v))}</b> / yr est.</> },
  ll97_penalty_2024: { name: "LL97 penalty (current caps)",  value: (v) => <><b>{fmtMoney(v)}</b> / yr</> },
  steam_ghg_share: { name: "Steam share of building emissions",  value: (v) => <><b>{fmtPct(v)}</b> of GHG</> },
  log_dob_jobs: { name: "Recent DOB permits",  value: (v) => <><b>{Math.round(Math.exp(v) - 1)}</b> recent</> },
  eui:         { name: "Energy Use Intensity",  value: (v) => <><b>{v.toFixed(1)}</b> kBtu/ft²</> },
  floor_sqft:  { name: "Floor area",  value: (v) => <><b>{fmtInt(v)}</b> ft²</> },
};

function labelDriver(feature, value) {
  const entry = FEATURE_LABELS[feature];
  if (entry) return { name: entry.name, value: entry.value(value) };
  return { name: feature, value: <><b>{typeof value === "number" ? value.toFixed(2) : String(value)}</b></> };
}

function buildDrivers(mlDrivers) {
  if (!Array.isArray(mlDrivers) || mlDrivers.length === 0) return [];
  return mlDrivers.slice(0, 5).map((d, i) => {
    const { name, value } = labelDriver(d.feature, d.value);
    const direction = d.contribution > 0 ? "up" : "down";
    const magnitude = Math.abs(d.contribution);
    const barPct = Math.min(50, Math.round((magnitude / MAX_DRIVER_CONTRIB) * 50));
    const sign = d.contribution > 0 ? "+" : d.contribution < 0 ? "−" : "";
    const contrib = `${sign}${magnitude.toFixed(1)}`;
    return { rank: i + 1, name, value, direction, barPct, contrib };
  });
}

// ── identity row ─────────────────────────────────────────────────────────────
function buildIdentity(building) {
  const meta = [];
  const bbl = normalizeBbl(building.bbl) ?? building.bbl ?? "BBL unknown";
  meta.push(`BBL ${bbl}`);

  const usePart = [building.use, building.yr ? `Built ${building.yr}` : null, Number.isFinite(building.floor_sqft) ? `${fmtInt(building.floor_sqft)} ft²` : null].filter(Boolean).join(" · ");
  if (usePart) meta.push(usePart);
  if (building.sc_class) meta.push(building.sc_class);

  const cluster = building.cluster_name || null;

  const steamRight = Number.isFinite(building.steam) ? fmtSteam(building.steam) : "—";
  const ghgRight = Number.isFinite(building.ghg) ? `${fmtInt(building.ghg)} MT CO₂e` : "—";
  const shareRight = Number.isFinite(building.steam_ghg_share) ? fmtPct(building.steam_ghg_share) : "—";
  const esRight = Number.isFinite(building.energy_star) ? `${Math.round(building.energy_star)} / 100` : "—";

  const right = [
    <>Steam · <b>{steamRight}</b> · GHG <b>{ghgRight}</b></>,
    <>Steam share of GHG <b>{shareRight}</b> · Energy Star <b>{esRight}</b></>,
    <>Account owner <b>unmapped</b> · Data <b>LL84</b></>,
  ];

  return { address: building.address, meta, cluster, right };
}

// ── narrative slot (H5) ──────────────────────────────────────────────────────
// Deterministic composition — every underlined value traces to a ledger claim
// or driver row above. No LLM, no free prose. Editable slot lands with M6+.
function Cited({ children }) {
  return <span className="cf-cited">{children}</span>;
}

function fmtRunDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
  });
}

function buildNarrative(building, modelMeta, pctMap) {
  if (!building) return null;

  const entry = pctMap?.pctByAddr?.get(building.address);
  const finalTier = building.diagnostic_risk ?? "Uncertain";
  const ml = building.ml_risk;
  const base = Number.isFinite(ml)
    ? ml < BASE_LOW_MAX ? "Low" : ml >= BASE_HIGH_MIN ? "High" : "Medium"
    : null;
  const diverged = base === "Low" && finalTier === "High";

  // Sentence 1 — portfolio position
  const positionSentence = entry
    ? <>Ranks <Cited>{ordinal(entry.pct)}</Cited> of <Cited>{pctMap.total.toLocaleString()}</Cited> in the current XGB-scored portfolio (#<Cited>{entry.rank}</Cited>).</>
    : <>No XGB score on file; ranked by legacy heuristic only.</>;

  // Sentence 2 — tier reasoning, mirrors the ledger's tier column
  let tierSentence;
  if (finalTier === "Uncertain") {
    tierSentence = <>Coverage is insufficient to place it on the delta scale, so the tier reads <Cited>Uncertain</Cited>.</>;
  } else if (diverged) {
    tierSentence = <>Base <Cited>Low</Cited> was promoted to <Cited>{finalTier}</Cited> by an LL97 penalty of <Cited>{fmtMoney(building.ll97_penalty_2030)}</Cited>/yr at 2030 caps.</>;
  } else {
    const d24 = building.norm_delta_23_24;
    const d23 = building.norm_delta_22_23;
    if (Number.isFinite(d24)) {
      const sign = d24 < 0 ? "−" : "+";
      const pct = Math.abs(Math.round(d24));
      tierSentence = <>Its weather-normalized steam load moved <Cited>{sign}{pct}%</Cited> in 2024, placing it in the <Cited>{finalTier}</Cited> tier.</>;
    } else if (Number.isFinite(d23)) {
      const sign = d23 < 0 ? "−" : "+";
      const pct = Math.abs(Math.round(d23));
      tierSentence = <>Its weather-normalized steam load moved <Cited>{sign}{pct}%</Cited> in 2023 (no 2024 Δ on file yet); tier reads <Cited>{finalTier}</Cited>.</>;
    } else {
      tierSentence = <>No adjacent-year Δ on file; tier <Cited>{finalTier}</Cited> reflects portfolio ML rank only.</>;
    }
  }

  // Sentence 3 — top driver
  let driverSentence = null;
  const drivers = Array.isArray(building.ml_drivers) ? building.ml_drivers : [];
  if (drivers.length > 0) {
    const top = drivers[0];
    const { name } = labelDriver(top.feature, top.value);
    const dir = top.contribution > 0 ? "up" : "down";
    driverSentence = <>Top SHAP driver is <Cited>{name}</Cited>, pushing the score <Cited>{dir}</Cited>.</>;
  }

  // Sentence 4 — method + provenance anchor
  const version = modelMeta?.model_version ?? "XGB v1 · UNVAL";
  const methodSentence = <>Chain per §4.1: <Cited>{version}</Cited> base + LL97/trend modifiers; full provenance in the ledger above.</>;

  return {
    source: "Deterministic composition",
    drafted: fmtRunDate(modelMeta?.run_date),
    status: "Draft",
    body: (
      <>
        {positionSentence} {tierSentence}
        {driverSentence && <> {driverSentence}</>}
        {" "}{methodSentence}
      </>
    ),
  };
}

// ── entrypoint ───────────────────────────────────────────────────────────────
const STATUSES = new Set([
  "Unreviewed", "In review", "Contacted", "Confirmed at-risk", "False positive", "Dismissed",
]);

export function buildCaseFileProps({ building, modelMeta, currentStatus, pctMap }) {
  if (!building) return null;
  const rawStatus = currentStatus?.status;
  const status = rawStatus && STATUSES.has(rawStatus) ? rawStatus : "Unreviewed";
  return {
    identity: buildIdentity(building),
    ledger: {
      queue: buildQueueColumn(building, pctMap, modelMeta),
      tier: buildTierColumn(building),
      coverage: buildCoverageColumn(building),
    },
    drivers: buildDrivers(building.ml_drivers),
    narrative: buildNarrative(building, modelMeta, pctMap),
    status,
  };
}
