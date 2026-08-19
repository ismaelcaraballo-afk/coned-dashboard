import { useState, useEffect } from "react";
import { useParams, Navigate } from "react-router-dom";
import { useBuildings } from "../data/useBuildings.js";
import {
  toReportProps,
  computePercentileMap,
  normalizeBbl,
} from "./reportAdapter.js";
import "./ReportPage.css";
import "./ReportPage.print.css";

/**
 * M5 — Spec 3 Reasoning report at /report/:bbl.
 *
 * Screen render is the source DOM for the PDF (Puppeteer captures this route
 * with emulateMediaType('print')). One layout, two outputs. Graceful
 * degradation per roadmap §M5: if PDF mechanics slip, browser print-to-PDF
 * of this route is the deliverable.
 *
 * R1: values echo the case-file header (M4). R2: page one is argument,
 * page two exhibits only — enforced via print CSS page-break rules.
 * R3: grayscale-safe by construction (no color-only distinctions).
 * R4: caveats travel with claims (narrative slots carry exhibit cites).
 * R5: DRAFT watermark until reviewed — review flow deferred (needs M6).
 *
 * TODO(M4-merge): swap toReportProps to consume caseFileAdapter output so
 * the R1 projection is a code-level guarantee, not a mirrored derivation.
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
    fetch("/api/model_meta", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((m) => {
        if (!cancelled) setModelMeta(m);
      })
      .catch(() => {
        if (!cancelled) setModelMeta(null);
      });
    return () => {
      cancelled = true;
    };
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

  const pctByAddr = computePercentileMap(buildings);
  const props = toReportProps(building, modelMeta, pctByAddr);

  return <ReportSheet {...props} />;
}

function ReportSheet({ identity, finding, narrative, exhibits, method, signature }) {
  return (
    <div className="rp-scope">
      {signature.draft && <div className="rp-watermark" aria-hidden="true">DRAFT</div>}

      <article className="rp-sheet">
        {/* Page one: argument (R2). */}
        <section className="rp-page rp-page--one">
          <header className="rp-header">
            <div className="rp-header-left">
              <div className="rp-eyebrow">Reasoning report · v1</div>
              <h1 className="rp-address">{identity.address}</h1>
              <div className="rp-id-meta">
                {identity.bbl && <span>BBL {identity.bbl}</span>}
                {identity.use && <span>{identity.use}</span>}
                {identity.cluster && <span>Cluster {identity.cluster}</span>}
              </div>
            </div>
            <div className="rp-header-right">
              <div className="rp-run-stamp">
                {method.runDate ? `Run ${method.runDate}` : "Run date pending"}
              </div>
            </div>
          </header>

          <section className="rp-finding" aria-label="Finding band">
            <div className="rp-finding-percentile">{finding.percentile}</div>
            <div className="rp-finding-tier">
              {finding.tier}
              {finding.diverged && <span className="rp-diverged"> · promoted</span>}
            </div>
            <div className="rp-finding-coverage">{finding.coverageNote}</div>
          </section>

          <section className="rp-narrative" aria-label="Cited narrative">
            {narrative.slots.map((slot) => (
              <p key={slot.key} className="rp-narrative-slot">
                {slot.body}
                <sup className="rp-cite" aria-label={`Exhibit ${slot.cite}`}>
                  {slot.cite}
                </sup>
              </p>
            ))}
          </section>

          <footer className="rp-method-brief">
            <p className="rp-method-line">{method.aucLine}</p>
            <p className="rp-method-link">
              Methodology:{" "}
              <a href={method.methodologyLink}>
                {method.methodologyVersion ?? "methodology page"}
              </a>
            </p>
          </footer>

          <section className="rp-signature" aria-label="Signature block">
            <div className="rp-sig-row">
              <span className="rp-sig-label">Prepared by</span>
              <span className="rp-sig-line">{signature.preparedBy ?? "____________________"}</span>
            </div>
            <div className="rp-sig-row">
              <span className="rp-sig-label">Reviewed by</span>
              <span className="rp-sig-line">{signature.reviewedBy ?? "____________________"}</span>
            </div>
            <div className="rp-sig-bureau">Pursuit × ConEd Steam Ops</div>
          </section>
        </section>

        {/* Page two: exhibits only (R2). */}
        <section className="rp-page rp-page--two">
          <h2 className="rp-exhibits-heading">Exhibits</h2>

          <div className="rp-exhibit" id="exhibit-A">
            <h3>A · {exhibits.A.title}</h3>
            <div className="rp-exhibit-body">{exhibits.A.value}</div>
          </div>

          <div className="rp-exhibit" id="exhibit-B">
            <h3>B · {exhibits.B.title}</h3>
            <div className="rp-exhibit-body">
              <div>Building: {exhibits.B.buildingLine}</div>
              <div>Cap-equivalent: {exhibits.B.capLine}</div>
            </div>
          </div>

          <div className="rp-exhibit" id="exhibit-C">
            <h3>C · {exhibits.C.title}</h3>
            <ol className="rp-drivers">
              {exhibits.C.drivers.length === 0 && (
                <li className="rp-empty-inline">No drivers available.</li>
              )}
              {exhibits.C.drivers.map((d, i) => (
                <li key={`${d.feature ?? d.name ?? i}`} className="rp-driver-row">
                  <span className="rp-driver-name">{d.feature ?? d.name ?? "—"}</span>
                  <span className="rp-driver-value">
                    {Number.isFinite(d.value) ? d.value.toLocaleString() : "—"}
                  </span>
                  <span className="rp-driver-contrib">
                    {Number.isFinite(d.contribution)
                      ? (d.contribution > 0 ? "+" : "") + d.contribution.toFixed(2)
                      : "—"}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div className="rp-exhibit" id="exhibit-D">
            <h3>D · {exhibits.D.title}</h3>
            <div className="rp-exhibit-body">
              Hybrid chain per {exhibits.D.chainRef}. Model-side encoding:{" "}
              <code>ll97_penalty_2024_log</code>. The over-cap boolean is a
              modifier, not a base feature.
            </div>
          </div>
        </section>
      </article>
    </div>
  );
}
