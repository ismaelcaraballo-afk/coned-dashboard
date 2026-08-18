/**
 * M12 — Weekly digest template (Fable Spec 5).
 *
 * Pure, deterministic templating. Numbers are injected from data, never
 * generated. Produces an Outlook-legal HTML body (Arial + Courier New,
 * single column, inline styles, no images) and an identical plain-text
 * twin per law D6. The finding paragraph's optional LLM pass (C1) is
 * intentionally NOT here — v1 uses a deterministic finding string; a
 * later increment can swap in an LLM pass after the analyst-edit step.
 *
 * Inputs:
 *   buildings  — merged records from useBuildings (address, bbl, ml_risk,
 *                diagnostic_risk, ll97_penalty_2024, decline_2024_pct, ...)
 *   modelMeta  — from /api/model_meta (model_version, cv_auc, run_date)
 *   events     — optional array from public/events.json (M7). When absent,
 *                the digest degrades to a "quiet week" section per D2.
 *   contactedCount — count of Critical buildings currently in outreach
 *                    (Contacted / In review / Confirmed at-risk). Sourced
 *                    from useStatusCounts (M6 /api/buildings/status/bulk).
 *   dismissedCount — count of Critical buildings dismissed with reasons
 *                    (Dismissed / False positive). Same source.
 *   sender     — { name, title, email } for the signature and mailto From:
 */

import { isCritical } from "../data/criticalFilter.js";

// Re-export so existing callers that import isCritical from buildDigest.js
// keep working, but the definition lives in the shared filter module.
export { isCritical };

/**
 * Mutually exclusive buckets — matches ThisWeekPage.computePulse so the two
 * surfaces show the same portfolio math. Critical is checked first; a Critical
 * building is NOT also counted in its diagnostic_risk tier bucket. Invariant:
 * critical + high + medium + low + uncertain === total.
 */
export function computePulseFromBuildings(buildings) {
  let critical = 0, high = 0, medium = 0, low = 0, uncertain = 0;
  for (const b of buildings) {
    const dr = b.diagnostic_risk;
    if (isCritical(b))                         critical++;
    else if (dr === "High")                    high++;
    else if (dr === "Medium")                  medium++;
    else if (dr === "Low")                     low++;
    else if (dr === "Uncertain" || dr == null) uncertain++;
  }
  return { total: buildings.length, high, medium, low, uncertain, critical };
}

export function topOfQueue(buildings, limit = 3) {
  return buildings
    .filter(isCritical)
    .sort((a, b) => (b.ml_risk ?? 0) - (a.ml_risk ?? 0))
    .slice(0, limit);
}

/**
 * Rank-based percentile: what fraction of the portfolio the building
 * outranks by ml_risk. Matches the "99th pctile" copy in the Fable spec.
 */
function rankPercentile(building, buildings) {
  const ml = building.ml_risk;
  if (ml == null || !Array.isArray(buildings) || buildings.length === 0) return null;
  let below = 0;
  let counted = 0;
  for (const b of buildings) {
    if (b.ml_risk == null) continue;
    counted++;
    if (b.ml_risk < ml) below++;
  }
  if (counted === 0) return null;
  return Math.round((100 * below) / counted);
}

function formatWeekOf(iso) {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return "this week";
  return d.toLocaleString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function formatRunAnchor(iso) {
  if (!iso) return "pending";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "pending";
  const month = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  const day = d.getUTCDate();
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${month} ${day}, ${hh}:${mm}`;
}

function aucSentence(modelMeta) {
  const v = modelMeta?.model_version || "XGB v1 · UNVAL";
  const auc = modelMeta?.cv_auc;
  const status = modelMeta?.validation_status || "unvalidated";
  if (auc == null) {
    return `Ranking from ${v} (${status}, AUC pending).`;
  }
  const pct = Math.round(auc * 100);
  return `Ranking from ${v} (${status}, AUC ${auc.toFixed(3)}: orders a true churner above a non-churner about ${pct}% of the time).`;
}

function driverLine(b) {
  const bits = [];
  const pen = Number(b.ll97_penalty_2024);
  if (Number.isFinite(pen) && pen > 0) {
    bits.push(`LL97 2024 penalty $${Math.round(pen).toLocaleString()}/yr`);
  }
  const dec = Number(b.norm_delta_23_24);
  if (Number.isFinite(dec) && dec !== 0) {
    const sign = dec < 0 ? "−" : "+";
    bits.push(`weather-normalized demand ${sign}${Math.abs(dec).toFixed(1)}% '23→'24`);
  }
  if (b.outlier_23_24 === true) bits.push("flagged outlier");
  else if (b.decline_trend_label === "accelerating") bits.push("accelerating decline");
  if (bits.length === 0) return "See case file for driver detail.";
  return `Driver: ${bits.join("; ")}.`;
}

export function buildSubject({ weekOf, criticalNew, toReview }) {
  return `Steam attrition · Week of ${weekOf} · ${criticalNew} new Critical · ${toReview} to review`;
}

export function buildDigest({
  buildings = [],
  modelMeta = null,
  events = null,
  contactedCount = 0,
  dismissedCount = 0,
  sender = { name: "Ed Perez", title: "ML Research and Domain Lead · Steam Attrition · Pursuit x Con Edison", email: "edwin.perez@pursuit.org" },
} = {}) {
  const pulse = computePulseFromBuildings(buildings);
  const top = topOfQueue(buildings, 3);
  const toReview = Math.max(0, pulse.critical - contactedCount - dismissedCount);

  // Count of events tagged NEW-into-Critical this week. Without M7 events, 0.
  const criticalNewEvents = Array.isArray(events)
    ? events.filter((e) => e?.kind === "TIER" && e?.to === "Critical").length
    : 0;

  const weekOf = formatWeekOf(modelMeta?.run_date);
  const runAnchor = formatRunAnchor(modelMeta?.run_date);
  const subject = buildSubject({ weekOf, criticalNew: criticalNewEvents, toReview });

  const criticalRestatement = "ml_risk ≥ 0.6, weather-normalized '23→'24 delta present, and either flagged outlier or accelerating trend";
  const finding = criticalNewEvents > 0
    ? `${toReview} buildings need review this week. ${pulse.critical} meet the Critical definition (${criticalRestatement}); ${contactedCount} are in active outreach and ${dismissedCount} were dismissed with documented reasons. ${criticalNewEvents} of the ${pulse.critical} are new since last Monday.`
    : `${toReview} buildings need review this week. ${pulse.critical} meet the Critical definition (${criticalRestatement}); ${contactedCount} are in active outreach and ${dismissedCount} were dismissed with documented reasons.`;

  const quietWeek = !Array.isArray(events) || events.length === 0;
  const changedItems = quietWeek
    ? [{ line: "Nothing crossed a threshold since your last review. A quiet week is a real result." }]
    : events.slice(0, 6).map((e) => ({ line: e.summary || `[${e.kind}] ${e.address || e.bbl || ""}` }));

  const method = `Screening analysis for outreach prioritization, not a determination of customer intent. ${aucSentence(modelMeta)} Tier from a transparent weather-normalized rule. Public data only: LL84, steam demand, DOB, PLUTO. Full methodology at /methodology.`;

  const topWithRank = top.map((b) => ({ ...b, _pctile: rankPercentile(b, buildings) }));
  const html = renderHtml({ subject, runAnchor, finding, top: topWithRank, changedItems, pulse, method, sender });
  const text = renderText({ subject, runAnchor, finding, top: topWithRank, changedItems, pulse, method, sender });

  return { subject, html, text, pulse, toReview, criticalNewEvents };
}

function renderHtml({ subject, runAnchor, finding, top, changedItems, pulse, method, sender }) {
  const kicker = `Steam Attrition Weekly · data through run ${runAnchor}`;
  const items = top.map((b) => {
    const tag = "CRITICAL";
    const p = b._pctile;
    const line1 = `<b>${escape(b.address || b.bbl || "unknown")}</b> &nbsp;<span style="font-family:'Courier New',Courier,monospace;font-size:11px;color:#B3261E;font-weight:700;">${tag}</span>${p != null ? ` &nbsp;${p}th pctile ml_risk` : ""}`;
    const line2 = escape(driverLine(b));
    return `<div style="padding:8px 0;border-bottom:1px solid #F0F0EB;"><div style="font-size:13px;">${line1}</div><div style="font-family:'Courier New',Courier,monospace;font-size:11px;color:#55585E;margin-top:2px;">${line2}</div></div>`;
  }).join("");

  const changed = changedItems.map((c) =>
    `<div style="padding:8px 0;border-bottom:1px solid #F0F0EB;"><div style="font-size:13px;">${escape(c.line)}</div></div>`
  ).join("");

  const pulseLine = `High <b>${escape(String(pulse.high))}</b> · Med <b>${escape(String(pulse.medium))}</b> · Low <b>${escape(String(pulse.low))}</b> · Uncertain <b>${escape(String(pulse.uncertain))}</b><br>Critical <b>${escape(String(pulse.critical))}</b> · portfolio <b>${escape(String(pulse.total))}</b>`;

  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#1A1B1E;max-width:640px;margin:0 auto;padding:26px 22px 30px;background:#FFFFFF;">
  <div style="font-family:'Courier New',Courier,monospace;font-size:11px;letter-spacing:1px;color:#75787E;text-transform:uppercase;margin-bottom:14px;">${escape(kicker)}</div>
  <div style="font-size:14px;line-height:1.65;margin-bottom:20px;max-width:60ch;">${escape(finding)}</div>
  <div style="font-family:'Courier New',Courier,monospace;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#75787E;border-top:1px solid #E0E0DB;padding-top:14px;margin:20px 0 10px;">Top of the queue</div>
  ${items || '<div style="font-size:13px;color:#55585E;">No buildings meet the Critical definition this week.</div>'}
  <div style="font-family:'Courier New',Courier,monospace;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#75787E;border-top:1px solid #E0E0DB;padding-top:14px;margin:20px 0 10px;">What changed since last Monday</div>
  ${changed}
  <div style="font-family:'Courier New',Courier,monospace;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#75787E;border-top:1px solid #E0E0DB;padding-top:14px;margin:20px 0 10px;">Portfolio</div>
  <div style="font-family:'Courier New',Courier,monospace;font-size:11px;color:#55585E;line-height:1.9;">${pulseLine}</div>
  <div style="margin-top:22px;border-top:1px solid #E0E0DB;padding-top:12px;font-size:10.5px;color:#75787E;line-height:1.7;max-width:64ch;">${escape(method)}</div>
  <div style="font-size:12px;color:#1A1B1E;margin-top:14px;">${escape(sender.name)}<br><span style="color:#75787E;font-size:11px;">${escape(sender.title)}</span></div>
</div>`;
}

function renderText({ subject, runAnchor, finding, top, changedItems, pulse, method, sender }) {
  const lines = [];
  lines.push(subject);
  lines.push("");
  lines.push(`Steam Attrition Weekly — data through run ${runAnchor}`);
  lines.push("");
  lines.push(finding);
  lines.push("");
  lines.push("TOP OF THE QUEUE");
  if (top.length === 0) {
    lines.push("  (No buildings meet the Critical definition this week.)");
  } else {
    for (const b of top) {
      const p = b._pctile;
      lines.push(`  * ${b.address || b.bbl || "unknown"} [CRITICAL]${p != null ? `  ${p}th pctile ml_risk` : ""}`);
      lines.push(`      ${driverLine(b)}`);
    }
  }
  lines.push("");
  lines.push("WHAT CHANGED SINCE LAST MONDAY");
  for (const c of changedItems) lines.push(`  - ${c.line}`);
  lines.push("");
  lines.push("PORTFOLIO");
  lines.push(`  High ${pulse.high} · Med ${pulse.medium} · Low ${pulse.low} · Uncertain ${pulse.uncertain}`);
  lines.push(`  Critical ${pulse.critical} · portfolio ${pulse.total}`);
  lines.push("");
  lines.push("---");
  lines.push(method);
  lines.push("");
  lines.push(sender.name);
  lines.push(sender.title);
  return lines.join("\n");
}

function escape(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}
