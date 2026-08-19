import { useState, useEffect } from "react";
import { useParams, Navigate } from "react-router-dom";
import { useBuildings } from "../data/useBuildings.js";
import {
  toReportProps,
  computePercentileMap,
  normalizeBbl,
} from "./reportAdapter.jsx";
import ReportActions from "./ReportActions.jsx";
import "./ReportPage.css";
import "./ReportPage.print.css";

/**
 * M5 — Spec 3 Reasoning report at /report/:bbl.
 *
 * Screen render is the source DOM for the PDF (Puppeteer captures this route
 * with emulateMediaType('print')). One layout, two outputs.
 *
 * R1: values echo the case-file header (M4). R2: page one is argument.
 * R3: grayscale-safe by construction. R4: caveats travel with claims.
 * R5: signature block; DRAFT watermark until reviewed (M6-gated).
 */

const DEFAULT_MODEL_META = null;

export default function ReportPage() {
  const { bbl: bblParam } = useParams();
  const normalized = normalizeBbl(bblParam);

  const [token, setToken] = useState(
    () => sessionStorage.getItem("coned_token") || null
  );
  useEffect(() => {
    const onStorage = () => setToken(sessionStorage.getItem("coned_token"));
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const { buildings, loading, error } = useBuildings(token);
  const [modelMeta, setModelMeta] = useState(DEFAULT_MODEL_META);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetch("/api/model_meta", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((m) => { if (!cancelled) setModelMeta(m); })
      .catch(() => { if (!cancelled) setModelMeta(null); });
    return () => { cancelled = true; };
  }, [token]);

  if (!normalized) {
    return (
      <div className="rp-scope">
        <div className="rp-empty">Invalid BBL: <code>{bblParam}</code></div>
      </div>
    );
  }

  if (!token) return <Navigate to="/this-week" replace />;

  if (loading) {
    return <div className="rp-scope"><div className="rp-empty">Loading…</div></div>;
  }

  if (error === "UNAUTHORIZED") {
    sessionStorage.removeItem("coned_token");
    return <Navigate to="/this-week" replace />;
  }

  if (error) {
    return (
      <div className="rp-scope">
        <div className="rp-empty rp-empty--error">
          {`Failed to load: ${error}`}
        </div>
      </div>
    );
  }

  const building = buildings.find((b) => normalizeBbl(b.bbl) === normalized);
  if (!building) {
    return (
      <div className="rp-scope">
        <div className="rp-empty">
          No building record for BBL <code>{normalized}</code>.
        </div>
      </div>
    );
  }

  const pctMap = computePercentileMap(buildings);
  const props = toReportProps(building, modelMeta, pctMap);

  return <ReportSheet {...props} />;
}

function ReportSheet({ meta, identity, finding, caveat, narrative, exhibits, method, signature }) {
  const tierClass = tierColorClass(finding.tier.word);
  const stateClass = tierColorClass(finding.queueState.word);

  return (
    <div className="rp-scope">
      {signature.draft && <div className="rp-watermark" aria-hidden="true">DRAFT</div>}

      <article className="rp-sheet">
        <section className="rp-page rp-page--one">
          {/* ── Header ────────────────────────────────────────────────── */}
          <header className="rp-head">
            <div className="rp-head-left">
              <div className="rp-kicker">Steam Attrition · Reasoning Report</div>
              <h1 className="rp-address">{identity.address}</h1>
            </div>
            <div className="rp-head-right">
              <div>Generated <b>{meta.generated}</b> · Data <b>{meta.dataVintage}</b></div>
              <div>Model <b>{meta.modelLine}</b> · Report <b>{meta.reportId}</b></div>
              <div>Status at generation <b>{meta.statusAtGeneration}</b></div>
            </div>
          </header>

          <ReportActions bbl={identity.bbl} address={identity.address} reportId={meta.reportId} />

          <div className="rp-idline">
            {identity.bbl && <span>BBL {formatBbl(identity.bbl)}</span>}
            {identity.use && <span>{identity.use}</span>}
            {identity.builtYear && <span>Built {identity.builtYear}</span>}
            {identity.floorSqft && <span>{identity.floorSqft.toLocaleString()} ft²</span>}
            {identity.scClass && <span>{identity.scClass}</span>}
            {identity.cluster && <span>Cluster: {identity.cluster}</span>}
          </div>

          {/* ── Finding band ─────────────────────────────────────────── */}
          <section className="rp-finding" aria-label="Finding band">
            <div className="rp-f-col">
              <div className="rp-f-label">Queue position · ML</div>
              <div className="rp-f-main">
                {finding.queue.pctileLabel}
                <span className="rp-f-suffix">pctile</span>
              </div>
              <div className="rp-f-sub">
                {finding.queue.rank
                  ? `#${finding.queue.rank} of ${finding.queue.total.toLocaleString()}${
                      finding.queue.tieCount > 1 ? ` · tied w/ ${finding.queue.tieCount - 1}` : ""
                    }`
                  : "unranked"}
              </div>
            </div>
            <div className="rp-f-col">
              <div className="rp-f-label">Rule tier · Diagnostic</div>
              <div className="rp-f-main">
                <span className={`rp-tierword ${tierClass}`}>{finding.tier.word}</span>
              </div>
              <div className="rp-f-sub">{finding.tier.sub}</div>
            </div>
            <div className="rp-f-col">
              <div className="rp-f-label">Queue state</div>
              <div className="rp-f-main">
                <span className={`rp-tierword ${stateClass}`}>{finding.queueState.word}</span>
              </div>
              <div className="rp-f-sub">{finding.queueState.sub}</div>
            </div>
          </section>
          <div className="rp-caveat-line">{caveat}</div>

          {/* ── Narrative ────────────────────────────────────────────── */}
          <div className="rp-sec-label">Finding</div>
          <div className="rp-narr">
            {narrative.map((slot) => (
              <p key={slot.key}>{slot.html}</p>
            ))}
          </div>

          {/* ── Exhibits ─────────────────────────────────────────────── */}
          <div className="rp-sec-label">Exhibits</div>
          <div className="rp-exhibits">
            <ExhibitA data={exhibits.A} />
            <ExhibitB data={exhibits.B} />
            <ExhibitC data={exhibits.C} />
            <ExhibitD data={exhibits.D} />
          </div>

          {/* ── Method + signature ───────────────────────────────────── */}
          <div className="rp-sec-label">Method, in brief</div>
          <div className="rp-method">{method.body}</div>

          <div className="rp-sign">
            <div className="rp-sig-block">
              <div>Prepared by <b>{signature.preparedBy}</b></div>
              <div>Reviewed <span className="rp-sig-line">____________________</span> date <span className="rp-sig-line">________</span></div>
            </div>
            <div className="rp-disclaimer">{signature.disclaimer}</div>
          </div>
        </section>
      </article>
    </div>
  );
}

// ── Exhibit sub-components ─────────────────────────────────────────────────

function ExhibitA({ data }) {
  return (
    <div className="rp-exhibit">
      <h4>A <span>· {data.title}</span></h4>
      <table className="rp-ex-table">
        <tbody>
          {data.drivers.length === 0 && (
            <tr><td className="rp-ex-empty" colSpan={3}>No drivers available.</td></tr>
          )}
          {data.drivers.map((d, i) => (
            <tr key={`${d.feature}-${i}`}>
              <td className="rp-ex-f">{d.feature}</td>
              <td className="rp-ex-v">{d.valueLabel}</td>
              <td className={`rp-ex-c ${d.positive ? "pos" : "neg"}`}>
                <span
                  className={`rp-bar ${d.positive ? "rp-bar--pos" : "rp-bar--neg"}`}
                  style={{ width: `${Math.max(4, d.barPct * 56)}px` }}
                  aria-hidden="true"
                />
                <span className="rp-bar-label">{d.signed}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ExhibitB({ data }) {
  return (
    <div className="rp-exhibit">
      <h4>B <span>· {data.title}</span></h4>
      {data.trend && <TrendChart trend={data.trend} />}
      <div className="rp-ex-math">
        <div>{data.buildingLabel}</div>
        <div>{data.capLabel}</div>
      </div>
      <div className="rp-ex-note">{data.note}</div>
    </div>
  );
}

function TrendChart({ trend }) {
  const W = 260, H = 90, padX = 22, padY = 14;
  const { points, max, min } = trend;
  const span = max - min || 1;
  const xs = points.map((_, i) => padX + (i * (W - padX * 2)) / (points.length - 1));
  const ys = points.map((p) =>
    p.value == null ? null : H - padY - ((p.value - min) / span) * (H - padY * 2)
  );
  const line = xs
    .map((x, i) => (ys[i] == null ? null : `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`))
    .filter(Boolean)
    .join(" ");
  return (
    <svg className="rp-trend-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Three-year normalized steam trend">
      <line x1={padX} y1={H - padY} x2={W - padX} y2={H - padY} className="rp-trend-axis" />
      <path d={line} className="rp-trend-line" fill="none" />
      {points.map((p, i) =>
        ys[i] == null ? null : (
          <circle key={p.year} cx={xs[i]} cy={ys[i]} r={i === points.length - 1 ? 3 : 2} className="rp-trend-dot" />
        )
      )}
      {points.map((p, i) => (
        <text key={`x-${p.year}`} x={xs[i]} y={H - 3} className="rp-trend-xlabel" textAnchor="middle">
          '{String(p.year).slice(-2)}
        </text>
      ))}
      <text x={W - padX} y={padY - 4} className="rp-trend-ylabel" textAnchor="end">
        max {trend.maxLabel}
      </text>
    </svg>
  );
}

function ExhibitC({ data }) {
  return (
    <div className="rp-exhibit">
      <h4>C <span>· {data.title}</span></h4>
      <div className="rp-ex-math">
        <div className="rp-ex-row"><span>emissions</span><b>{data.emissionsLabel}</b></div>
        <div className="rp-ex-row"><span>2030 cap (office)</span><b>{data.capLabel}</b></div>
        <div className="rp-ex-row rp-ex-rule"><span>over cap × ${data.rate}/MT</span><b>{data.penaltyLabel}</b></div>
      </div>
      <div className="rp-ex-note">{data.note}</div>
    </div>
  );
}

function ExhibitD({ data }) {
  return (
    <div className="rp-exhibit">
      <h4>D <span>· {data.title}</span></h4>
      <div className="rp-ex-math">
        <div>Usage HDD-normalized to the Central Park 30-yr average.</div>
        <div>Δ '23→'24 normalized: <b>{data.normalizedDelta}</b></div>
        <div>Tier thresholds: {data.thresholds}</div>
        <div>History: <b>{data.history}</b>{data.trend ? ` · trend ${data.trend}` : ""}</div>
      </div>
      <div className="rp-ex-note">{data.note}</div>
    </div>
  );
}

// ── helpers ────────────────────────────────────────────────────────────────

// Map tier/state word to a color class name (grayscale-safe: also carried
// by weight + all-caps, per R3).
function tierColorClass(word) {
  const w = String(word ?? "").toLowerCase();
  if (w === "critical") return "crit";
  if (w === "high") return "high";
  if (w === "medium" || w === "med") return "med";
  if (w === "low") return "low";
  return "";
}

// Fable format: "1-01296-0021". Split 10-digit BBL into 1-5-4.
function formatBbl(bbl) {
  const d = String(bbl).replace(/\D/g, "");
  if (d.length !== 10) return bbl;
  return `${d.slice(0, 1)}-${d.slice(1, 6)}-${d.slice(6)}`;
}
