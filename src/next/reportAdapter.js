/**
 * M5 report adapter — temporary, scaffold only.
 *
 * Mirrors the shape of src/next/caseFileAdapter.jsx (M4 container, PR #21).
 * Swap to import { toCaseFileProps } from './caseFileAdapter.jsx' once
 * #21 merges; the report is a projection of the case file (R1) and must
 * not diverge in derivations.
 *
 * TODO(M4-merge): delete this file, import caseFileAdapter directly, and
 * add report-only projections (finding band, exhibit rows, method footer)
 * as a thin layer on top.
 *
 * §7 rules 8/9: model_version + AUC copy sourced from model_meta.
 * L1: percentile is a string; L6: quasi-tie block collapses ordinal.
 * R1: every value shown on the report must match the case-file header.
 */

const BASE_LOW_MAX = 0.2;
const BASE_HIGH_MIN = 0.6;

export function normalizeBbl(raw) {
  if (typeof raw !== "string") return null;
  const digits = raw.replace(/[^0-9;]/g, "");
  const first = digits.split(";")[0];
  return /^[1-5]\d{9}$/.test(first) ? first : null;
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

function fmtMoney(n) {
  if (!Number.isFinite(n)) return "—";
  return "$" + Math.round(n).toLocaleString();
}

function fmtSteam(kbtu) {
  if (!Number.isFinite(kbtu)) return "—";
  if (kbtu >= 1_000_000) return `${(kbtu / 1_000_000).toFixed(1)} M kBtu`;
  return `${Math.round(kbtu).toLocaleString()} kBtu`;
}

function baseTier(mlRisk) {
  if (!Number.isFinite(mlRisk)) return null;
  if (mlRisk < BASE_LOW_MAX) return "Low";
  if (mlRisk >= BASE_HIGH_MIN) return "High";
  return "Medium";
}

export function computePercentileMap(buildings) {
  const scored = buildings
    .filter((b) => Number.isFinite(b.ml_risk))
    .slice()
    .sort((a, b) => b.ml_risk - a.ml_risk);
  const n = scored.length;
  const pctByAddr = new Map();
  let i = 0;
  while (i < n) {
    let j = i;
    while (j < n && scored[j].ml_risk === scored[i].ml_risk) j++;
    const rank = i + 1;
    const pct = Math.max(1, Math.round(((n - rank + 1) / n) * 100));
    for (let k = i; k < j; k++) {
      pctByAddr.set(scored[k].address, { pct, rank, tieCount: j - i });
    }
    i = j + 1;
  }
  return pctByAddr;
}

// §7 rule 8: AUC copy template. Both cv_auc absent and present cases handled.
function aucLine(meta) {
  if (!meta) return "Model performance metadata unavailable.";
  const { model_version, validation_status, cv_auc, cv_kfold, n_positive } = meta;
  const version = model_version ?? "model version pending";
  const status = validation_status ?? "validation pending";
  if (!Number.isFinite(cv_auc)) {
    return `${version} · ${status} · cross-validated AUC pending.`;
  }
  const pct = Math.round(cv_auc * 100);
  return `${version} · ${status} · AUC ${cv_auc.toFixed(3)}: ranks a true churner above a non-churner about ${pct}% of the time (${cv_kfold}-fold CV, ${n_positive} positive labels).`;
}

/**
 * Build the report view model from merged building record + model_meta.
 *
 * Returns null-per-section on data absence rather than throwing — the
 * ReportPage renders explicit "unavailable" placeholders per M4/L5.
 */
export function toReportProps(building, modelMeta, pctByAddr) {
  if (!building) return null;

  const pctEntry = pctByAddr?.get?.(building.address);
  const percentile =
    pctEntry?.pct != null
      ? ordinal(pctEntry.pct)
      : building.has_ml_risk
      ? "est."
      : "est.";

  const tier = building.diagnostic_risk ?? "Uncertain";
  const base = baseTier(building.ml_risk);
  const diverged = base === "Low" && tier === "High";

  return {
    identity: {
      address: building.address,
      bbl: building.bbl ?? null,
      use: building.use ?? null,
      cluster: building.cluster ?? null,
    },
    finding: {
      // R1: matches case-file claim ledger.
      percentile,
      tier,
      diverged,
      coverageNote: coverageNote(building),
    },
    narrative: {
      // Deterministic grounded slots only (R2 argument section).
      // Free-form LLM prose is not permitted here — see roadmap §M5 AC.
      slots: buildNarrativeSlots(building),
      status: "DRAFT",
    },
    exhibits: {
      // A: score cell echo (queue position + tier chain)
      A: { title: "Score cell", value: `${percentile} · ${tier}` },
      // B: two lines only (building + cap-equivalent) per §Components v1.1.
      B: {
        title: "Steam demand vs LL97 cap-equivalent",
        buildingLine: fmtSteam(building.steam),
        capLine: capEquivalent(building),
      },
      // C: driver row echo (top 5 from ml_drivers).
      C: {
        title: "Model drivers",
        drivers: (building.ml_drivers ?? []).slice(0, 5),
      },
      // D: §4.1 hybrid chain verbatim, references ll97_penalty_2024_log
      // as the model-side encoding; boolean only as modifier.
      D: {
        title: "Method — §4.1 hybrid chain",
        chainRef: "system-v1.1.md §4.1",
      },
    },
    method: {
      // §7 rules 8/9: templated, never hardcoded.
      aucLine: aucLine(modelMeta),
      runDate: modelMeta?.run_date ?? null,
      methodologyLink: "/methodology",
      methodologyVersion: modelMeta?.model_version ?? null,
    },
    signature: {
      // R5: DRAFT watermark until review flow ships (deferred, depends on M6).
      preparedBy: null,
      reviewedBy: null,
      draft: true,
    },
  };
}

function coverageNote(b) {
  if (Number.isFinite(b.norm_delta_23_24)) return "fresh Δ '24";
  if (Number.isFinite(b.norm_delta_22_23)) return "latest Δ '23";
  return "no adjacent-yr Δ";
}

function capEquivalent(b) {
  // Placeholder derivation — real cap-equivalent computation lands with
  // M5 content pass. The scaffold surfaces the field so print CSS can
  // exercise the exhibit box.
  if (Number.isFinite(b.ll97_penalty_2030)) {
    return `${fmtMoney(b.ll97_penalty_2030)} 2030 penalty exposure`;
  }
  return "cap-equivalent pending";
}

function buildNarrativeSlots(b) {
  // Grounded template — every span traces to a value on the building record
  // or to an exhibit cell. No free-form prose. Content pass will expand.
  return [
    {
      key: "position",
      body: `Portfolio position: model score places this address in the ${
        b.diagnostic_risk ?? "Uncertain"
      } tier.`,
      cite: "A",
    },
    {
      key: "coverage",
      body: `Coverage: ${coverageNote(b)}.`,
      cite: "B",
    },
    {
      key: "drivers",
      body: `Top drivers listed in Exhibit C; contributions shown as signed magnitudes without unit claims per §Components v1.1.`,
      cite: "C",
    },
    {
      key: "method",
      body: `Method: hybrid chain per §4.1 (Exhibit D). Model-side encoding uses ll97_penalty_2024_log; the over-cap boolean is a modifier only.`,
      cite: "D",
    },
  ];
}
