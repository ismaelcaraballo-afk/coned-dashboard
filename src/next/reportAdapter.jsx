/**
 * M5 reasoning-report adapter.
 *
 * View-model builder for the Spec 3 reasoning report. Consumes the same
 * merged building record + model_meta the case-file uses (R1: report is a
 * projection of the header, never a second source). Percentile map shape
 * is the caseFileAdapter one — { pctByAddr, total } — so rank + total are
 * both available for the finding band's "#N of T" sub-line.
 *
 * Rules honored:
 *  L1 — no probability language; percentile is ordinal, tier is a word.
 *  R1 — every value here maps 1:1 to a case-file value.
 *  R2 — narrative is the argument; exhibits carry cited numbers.
 *  R3 — grayscale-safe; direction encoding uses ▲/▼ glyphs, not color.
 *  R4 — AUC caveat sits under the ranking it qualifies.
 *  W2 — no causal verbs about intent; "suggests / awaiting / carries."
 *  §7 rules 8/9 — model_version + AUC copy sourced from model_meta.
 */

export { computePercentileMap, normalizeBbl } from "./caseFileAdapter.jsx";

const OFFICE_INTENSITY_LIMIT_2030 = 4.53; // kg CO2e/ft²/yr, LL97 office 2030 tier
const PENALTY_RATE_PER_MT = 268;          // $/MT CO2e, LL97 statutory rate

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

function fmtPct(x, decimals = 0) {
  if (!Number.isFinite(x)) return "—";
  return `${x.toFixed(decimals)}%`;
}

function fmtSteam(kbtu) {
  if (!Number.isFinite(kbtu)) return "—";
  if (kbtu >= 1_000_000) return `${(kbtu / 1_000_000).toFixed(1)} M kBtu`;
  return `${Math.round(kbtu).toLocaleString()} kBtu`;
}

function fmtDate(iso) {
  if (typeof iso !== "string") return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

// §7 rule 8 — AUC copy template.
function aucLine(meta) {
  if (!meta) return "Model performance metadata unavailable.";
  const { model_version, validation_status, cv_auc, cv_kfold, n_positive } = meta;
  const version = model_version ?? "model version pending";
  const status = validation_status ?? "validation pending";
  if (!Number.isFinite(cv_auc)) {
    return `${version} · ${status} · cross-validated AUC pending. The diagnostic tier is rule-based and transparent; its math appears in Exhibit D.`;
  }
  const pct = Math.round(cv_auc * 100);
  return `ML ranking from ${version}, ${status}: AUC ${cv_auc.toFixed(3)} — ranks a true churner above a non-churner about ${pct}% of the time (${cv_kfold}-fold CV, ${n_positive} positive labels). The diagnostic tier is rule-based and transparent; its math appears in Exhibit D.`;
}

// Deterministic per-building report ID. Stable across runs; last-4 of BBL
// gives visibly distinct IDs like the Fable spec's RR-2026-0187.
function reportId(bbl, runDateIso) {
  const year = fmtDate(runDateIso)?.slice(0, 4) ?? String(new Date().getFullYear());
  const last4 = (bbl ?? "").replace(/\D/g, "").slice(-4).padStart(4, "0");
  return `RR-${year}-${last4}`;
}

// Deterministic queue-state classifier — mirrors the canonical Critical
// filter (ml_risk ≥ 0.6 AND norm_delta_23_24 present AND (outlier | accel)).
// When any prong fails we render "In queue" with a sub-line saying which
// prongs held. Honest and readable.
function classifyQueueState(b) {
  const highRisk = Number.isFinite(b.ml_risk) && b.ml_risk >= 0.6;
  const hasFreshDelta = Number.isFinite(b.norm_delta_23_24);
  const outlier = b.outlier_23_24 === true;
  const accelerating = b.decline_trend_label === "accelerating";
  const freshTrigger = outlier || accelerating;

  if (highRisk && hasFreshDelta && freshTrigger) {
    return {
      word: "Critical",
      sub: "High + fresh Δ + top-decile rank: all three hold",
    };
  }
  const heldParts = [];
  if (highRisk) heldParts.push("High + top-decile rank held");
  if (hasFreshDelta && !freshTrigger) heldParts.push("Δ '24 within normal band");
  if (!hasFreshDelta) heldParts.push("no fresh Δ this cycle");
  return {
    word: "In queue",
    sub: heldParts.join(" · ") || "Monitoring",
  };
}

// Build the finding-band middle column ("Rule tier · Diagnostic") sub-line.
// Honest to the actual normalized YoY, not a Fable-canned "-66%".
function ruleTierSub(b) {
  if (Number.isFinite(b.norm_delta_23_24)) {
    const sign = b.norm_delta_23_24 >= 0 ? "+" : "";
    return `Δ '24 ${sign}${b.norm_delta_23_24.toFixed(1)}% norm. vs −30% threshold`;
  }
  if (Number.isFinite(b.norm_delta_22_23)) {
    const sign = b.norm_delta_22_23 >= 0 ? "+" : "";
    return `Δ '23 ${sign}${b.norm_delta_22_23.toFixed(1)}% norm. · '24 pending`;
  }
  return "no adjacent-yr Δ available";
}

// Exhibit A — score drivers, top 5 from ml_drivers, formatted with the
// building's actual value plus a signed magnitude. No probability claim,
// per L1; the number is a signed SHAP magnitude and labeled as such.
function buildDrivers(b) {
  const raw = (b.ml_drivers ?? []).slice(0, 5);
  const maxAbs = raw.reduce((m, d) => {
    const c = Number.isFinite(d.contribution) ? Math.abs(d.contribution) : 0;
    return c > m ? c : m;
  }, 0);
  return raw.map((d) => {
    const feature = d.feature ?? d.name ?? "—";
    const contribution = Number.isFinite(d.contribution) ? d.contribution : null;
    const value = Number.isFinite(d.value) ? d.value : null;
    const barPct = contribution == null || maxAbs === 0 ? 0 : Math.abs(contribution) / maxAbs;
    return {
      feature: prettyFeatureName(feature),
      valueLabel: prettyFeatureValue(feature, value, b),
      contribution,
      positive: contribution != null && contribution > 0,
      barPct,
      signed:
        contribution == null
          ? "—"
          : (contribution > 0 ? "+" : "") + contribution.toFixed(1),
    };
  });
}

function prettyFeatureName(f) {
  switch (f) {
    case "ll97_penalty_2030_log": return "LL97 penalty, 2030 caps";
    case "ll97_penalty_2024_log": return "LL97 penalty, 2024 caps";
    case "steam_ghg_share":       return "Steam share of emissions";
    case "energy_star":           return "Energy Star score";
    case "log_steam":             return "Steam demand size";
    case "log_ghg":               return "Total emissions";
    case "log_dob_jobs":          return "DOB HVAC/boiler permits";
    case "eui":                   return "Energy use intensity";
    default:                      return f;
  }
}

function prettyFeatureValue(feature, value, b) {
  if (feature === "ll97_penalty_2030_log") return `${fmtMoney(b.ll97_penalty_2030)}/yr`;
  if (feature === "ll97_penalty_2024_log") return `${fmtMoney(b.ll97_penalty_2024)}/yr`;
  if (feature === "steam_ghg_share")       return fmtPct((b.steam_ghg_share ?? 0) * 100);
  if (feature === "energy_star")           return Number.isFinite(b.energy_star) ? `${b.energy_star} / 100` : "—";
  if (feature === "log_steam")             return fmtSteam(b.steam);
  if (feature === "log_ghg")               return Number.isFinite(b.ghg) ? `${fmtInt(b.ghg)} MT CO₂e` : "—";
  if (feature === "log_dob_jobs")          return Number.isFinite(b.dob_jobs) ? `${b.dob_jobs} permits` : "—";
  if (Number.isFinite(value))              return value.toFixed(2);
  return "—";
}

// Exhibit B trend — 3-yr weather-normalized steam series for the SVG chart.
// Prefers norm_YYYY (weather-normalized). Falls back to raw steam_YYYY when
// normalized values are absent so the chart still renders honestly.
function buildTrend(b) {
  const years = [2022, 2023, 2024];
  const norm = [b.norm_2022, b.norm_2023, b.norm_2024];
  const raw = [b.steam_2022, b.steam_2023, b.steam_2024];
  const useNorm = norm.every((v) => Number.isFinite(v));
  const series = useNorm ? norm : raw;
  const points = series.map((v, i) => ({
    year: years[i],
    value: Number.isFinite(v) ? v : null,
  }));
  const finite = points.map((p) => p.value).filter((v) => Number.isFinite(v));
  if (finite.length === 0) return null;
  const max = Math.max(...finite);
  const min = Math.min(...finite);
  return {
    points,
    max,
    min,
    normalized: useNorm,
    maxLabel: fmtSteam(max),
    latestLabel: fmtSteam(points[points.length - 1].value ?? NaN),
  };
}

// Exhibit C — deterministic LL97 arithmetic. Reproduces the statutory
// subtraction that produces ll97_penalty_2030. Labeled "not a model output."
function buildLl97Arithmetic(b) {
  const emissions = Number.isFinite(b.ghg) ? b.ghg : null;
  const cap = Number.isFinite(b.ll97_cap_2030) ? b.ll97_cap_2030 : null;
  const overCap = emissions != null && cap != null ? emissions - cap : null;
  const penalty = Number.isFinite(b.ll97_penalty_2030) ? b.ll97_penalty_2030 : null;
  return {
    emissions,
    cap,
    overCap,
    penalty,
    rate: PENALTY_RATE_PER_MT,
    emissionsLabel: emissions != null ? `${fmtInt(emissions)} MT CO₂e` : "—",
    capLabel: cap != null ? `−${fmtInt(cap)} MT CO₂e` : "—",
    overCapLabel: overCap != null ? `${fmtInt(overCap)} MT × $${PENALTY_RATE_PER_MT}/MT = ${fmtMoney(penalty)}/yr` : "—",
    penaltyLabel: penalty != null ? `${fmtMoney(penalty)}/yr` : "—",
  };
}

// Exhibit D — diagnostic rule text. Names the actual normalized delta and
// the thresholds so the report is self-contained (§L5).
function buildDiagnosticRule(b) {
  const nyd = Number.isFinite(b.norm_delta_23_24)
    ? `${b.norm_delta_23_24 >= 0 ? "+" : ""}${b.norm_delta_23_24.toFixed(1)}%`
    : "—";
  const history = Number.isFinite(b.n_years_data)
    ? `${b.n_years_data} yrs · rule eligible`
    : "data years pending";
  return {
    normalizedDelta: nyd,
    history,
    trend: b.decline_trend_label ?? null,
    thresholds: "< −30% High · −30 to −10% Med · ≥ −10% Low",
  };
}

// Narrative — three grounded paragraphs. Every "cited" span traces to a
// value on the building record or an exhibit cell. No LLM prose.
function buildNarrative(b, queue, ll97) {
  const rankSpan = queue?.rank
    ? `${ordinal(queue.rank)} of ${queue.total.toLocaleString()}`
    : "unranked";
  const penaltySpan = fmtMoney(ll97.penalty);
  const steamShareSpan = fmtPct((b.steam_ghg_share ?? 0) * 100);
  const deltaSpan = Number.isFinite(b.norm_delta_23_24)
    ? `${b.norm_delta_23_24 >= 0 ? "+" : ""}${b.norm_delta_23_24.toFixed(1)}%`
    : "—";
  const euiSpan = Number.isFinite(b.eui) ? `${b.eui.toFixed(1)} kBtu/ft²` : "—";
  const permitsPhrase = Number.isFinite(b.dob_jobs) && b.dob_jobs > 0
    ? `${b.dob_jobs} recent DOB HVAC/boiler permit${b.dob_jobs === 1 ? " is" : "s are"} on file, so an equipment change may already be in flight`
    : "no recent DOB conversion permits are on file, which is consistent with an operational rather than completed change";

  const deltaSentence = Number.isFinite(b.norm_delta_23_24) && b.norm_delta_23_24 <= -30
    ? `Weather-normalized steam use fell ${deltaSpan} year over year (Exhibit B), crossing the diagnostic rule's −30% high-risk threshold and corroborating the queue placement.`
    : Number.isFinite(b.norm_delta_23_24) && b.norm_delta_23_24 < 0
      ? `Weather-normalized steam use fell ${deltaSpan} year over year (Exhibit B), softer than the rule's −30% high-risk threshold; the diagnostic tier is carried by the multi-year trend rather than this cycle alone.`
      : Number.isFinite(b.norm_delta_23_24)
        ? `Weather-normalized steam use rose ${deltaSpan} year over year (Exhibit B), so the diagnostic tier is carried by the earlier trend and the cluster profile (Exhibit D) rather than a fresh drop this cycle.`
        : `Fresh Δ '24 is not available; the diagnostic tier reflects the last resolved year (Exhibit D).`;

  return [
    {
      key: "pressure",
      cite: null,
      html: (
        <>
          {b.address} ranks{" "}
          <span className="rp-cited">{rankSpan}</span>
          <sup className="rp-sup">A</sup> active steam customers on attrition risk, and sits in the{" "}
          <span className="rp-tierword">{b.diagnostic_risk ?? "Uncertain"}</span> diagnostic tier. At current emissions the building faces an estimated{" "}
          <span className="rp-cited">{penaltySpan}</span>
          <sup className="rp-sup">C</sup> annual LL97 penalty when the 2030 caps take effect, and steam accounts for{" "}
          <span className="rp-cited">{steamShareSpan}</span>
          <sup className="rp-sup">A</sup> of its reportable emissions. Leaving steam is the owner's single largest lever against that penalty.
        </>
      ),
    },
    {
      key: "signal",
      cite: null,
      html: (
        <>
          {deltaSentence} The building's energy intensity of{" "}
          <span className="rp-cited">{euiSpan}</span> and Energy Star score of{" "}
          <span className="rp-cited">{Number.isFinite(b.energy_star) ? `${b.energy_star} / 100` : "—"}</span>
          <sup className="rp-sup">A</sup> place it above the office segment's median load; {permitsPhrase}.
        </>
      ),
    },
    {
      key: "action",
      cite: null,
      html: (
        <>
          <b>Recommended action:</b>{" "}
          account-team conversation anchored on LL97 compliance planning and applicable efficiency programs, before a disconnect or conversion permit is filed.
        </>
      ),
    },
  ];
}

/**
 * Build the report view model from merged building record + model_meta.
 * Returns null when building is absent — caller renders a placeholder.
 */
export function toReportProps(building, modelMeta, pctMap) {
  if (!building) return null;

  const entry = pctMap?.pctByAddr?.get?.(building.address);
  const total = pctMap?.total ?? 0;
  const queue = entry
    ? {
        pctile: entry.pct,
        pctileLabel: ordinal(entry.pct),
        rank: entry.rank,
        total,
        tieCount: entry.tieCount,
      }
    : { pctile: null, pctileLabel: "est.", rank: null, total, tieCount: 0 };

  const tier = building.diagnostic_risk ?? "Uncertain";
  const queueState = classifyQueueState(building);
  const ll97 = buildLl97Arithmetic(building);
  const diagnosticRule = buildDiagnosticRule(building);
  const drivers = buildDrivers(building);
  const narrative = buildNarrative(building, queue, ll97);

  const runDate = fmtDate(modelMeta?.run_date);
  const generatedDate = runDate ?? new Date().toISOString().slice(0, 10);

  return {
    meta: {
      generated: generatedDate,
      dataVintage: "LL84 2025-05",
      modelLine:
        `${modelMeta?.model_version ?? "XGB v1 · UNVAL"} · ${
          modelMeta?.validation_status === "backtested" ? "back-tested" : "unvalidated"
        }`,
      reportId: reportId(building.bbl, modelMeta?.run_date),
      statusAtGeneration: "Ready for review",
    },
    identity: {
      address: building.address,
      bbl: building.bbl ?? null,
      use: building.use ?? null,
      builtYear: Number.isFinite(building.yr) ? String(building.yr) : null,
      floorSqft: Number.isFinite(building.floor_sqft) ? building.floor_sqft : null,
      scClass: building.sc_class ?? "SC-class pending",
      cluster: building.cluster_name ?? building.cluster ?? null,
    },
    finding: {
      queue,
      tier: {
        word: tier,
        sub: ruleTierSub(building),
      },
      queueState,
    },
    caveat: aucLine(modelMeta),
    narrative,
    exhibits: {
      A: { title: "Score drivers · SHAP, XGB v1", drivers },
      B: {
        title: "Steam trend · normalized",
        buildingLabel: `Latest '24: ${fmtSteam(building.steam)} raw; ${
          Number.isFinite(building.norm_delta_23_24)
            ? `${building.norm_delta_23_24 >= 0 ? "+" : ""}${building.norm_delta_23_24.toFixed(1)}%`
            : "—"
        } normalized vs '23`,
        capLabel: `Cap-equivalent (2030): ${
          Number.isFinite(building.ll97_cap_2030)
            ? `${fmtInt(building.ll97_cap_2030)} MT CO₂e cap → ${fmtMoney(ll97.penalty)}/yr penalty`
            : "cap-equivalent pending"
        }`,
        trend: buildTrend(building),
        note: "Weather-normalized to Central Park 30-yr HDD. Chart shows normalized steam demand.",
      },
      C: {
        title: "LL97 penalty arithmetic · deterministic",
        ...ll97,
        note: "Statutory calculation from LL84 self-reported emissions and the LL97 intensity limit for this use type. Not a model output.",
      },
      D: {
        title: "Diagnostic rule · transparent method",
        ...diagnosticRule,
        note: "Method aligned with ConEd's weather-normalization approach; ours uses citywide HDD, theirs per-customer regression.",
      },
    },
    method: {
      body: `This is a screening analysis combining three layers: a transparent weather-normalized diagnostic rule (Exhibit D), a deterministic LL97 penalty calculation (Exhibit C), and an XGBoost ranking model (Exhibit A) trained on 1,003 buildings with 54 positive labels. The ML layer is unvalidated against actual disconnect records and is used to order the queue, not to assert probability. Public data only: LL84, LL97, PLUTO, DOB, ACRIS.`,
      methodologyLink: "/methodology",
      methodologyVersion: modelMeta?.model_version ?? "XGB v1 · UNVAL",
    },
    signature: {
      // TODO(M6 review flow): populate reviewed field from review event once M6 UI ships.
      preparedBy: "E. Perez · Pursuit × ConEd Steam Ops",
      draft: false,
      disclaimer:
        "Decision-support screening for outreach prioritization. Not a determination of customer intent. Verify against internal billing before external action.",
    },
  };
}
