import { useState, useEffect, useMemo } from "react";
import { useParams, Navigate } from "react-router-dom";
import { useBuildings } from "../data/useBuildings.js";
import CaseFileHeader from "./CaseFileHeader.jsx";
import StatusWriter from "./StatusWriter.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";
import { buildCaseFileProps, computePercentileMap, normalizeBbl } from "./caseFileAdapter.jsx";
import { toReportProps } from "./reportAdapter.jsx";
import ReportActions from "./ReportActions.jsx";
import "./CaseFileContainer.css";
import "./ReportPage.css";

/**
 * M4 container harness — /case-file/:bbl.
 *
 * Renders CaseFileHeader (from the atom PR) against real building data,
 * live /api/model_meta, and current /api/buildings/:bbl/status.
 *
 * Unauthed visitors and expired sessions bounce to /this-week where the
 * LoginForm lives (D20).
 */
export default function CaseFileContainer() {
  const { bbl: urlBbl } = useParams();
  const [token, setToken] = useState(
    () => sessionStorage.getItem("coned_token") || null
  );
  const [modelMeta, setModelMeta] = useState(null);
  const [modelMetaErr, setModelMetaErr] = useState(null);
  const [currentStatus, setCurrentStatus] = useState(null);
  const [statusErr, setStatusErr] = useState(null);

  const { buildings, loading, error } = useBuildings(token);

  useEffect(() => {
    if (error === "UNAUTHORIZED") {
      sessionStorage.removeItem("coned_token");
      setToken(null);
    }
  }, [error]);

  if (!token) return <Navigate to="/this-week" replace />;

  // Fetch /api/model_meta once per token
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetch("/api/model_meta", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((m) => { if (!cancelled) setModelMeta(m); })
      .catch((e) => { if (!cancelled) setModelMetaErr(e.message); });
    return () => { cancelled = true; };
  }, [token]);

  // Find building by matching normalized BBL against the URL BBL
  const building = useMemo(() => {
    if (!urlBbl || buildings.length === 0) return null;
    return buildings.find((b) => normalizeBbl(b.bbl) === urlBbl) ?? null;
  }, [buildings, urlBbl]);

  // Fetch current status for this BBL (falls back to Unreviewed on 404/error)
  useEffect(() => {
    if (!token || !urlBbl) return;
    let cancelled = false;
    setCurrentStatus(null);
    setStatusErr(null);
    fetch(`/api/buildings/${urlBbl}/status`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => { if (!cancelled) setCurrentStatus(data.current ?? null); })
      .catch((e) => { if (!cancelled) setStatusErr(e.message); });
    return () => { cancelled = true; };
  }, [token, urlBbl]);

  const pctMap = useMemo(
    () => (buildings.length > 0 ? computePercentileMap(buildings) : null),
    [buildings]
  );

  const reportProps = useMemo(() => {
    if (!building || !pctMap) return null;
    return toReportProps(building, modelMeta, pctMap);
  }, [building, pctMap, modelMeta]);

  const props = useMemo(() => {
    if (!building || !pctMap) return null;
    const base = buildCaseFileProps({ building, modelMeta, currentStatus, pctMap });
    if (!reportProps) return base;
    return {
      ...base,
      narrative: {
        source: "Reasoning report auto-draft",
        drafted: reportProps.meta.generated,
        status: "Ready for review",
        body: (
          <div className="rp-narr">
            {reportProps.narrative.map((slot) => (
              <p key={slot.key}>{slot.html}</p>
            ))}
          </div>
        ),
      },
    };
  }, [building, pctMap, modelMeta, currentStatus, reportProps]);

  return (
    <div className="cfc-page sc-scope">
      {loading && <div className="cfc-empty">Loading buildings…</div>}

      {error && error !== "UNAUTHORIZED" && (
        <div className="cfc-empty cfc-empty--error">
          {`Failed to load: ${error}`}
        </div>
      )}

      {!loading && !error && !building && (
        <div className="cfc-empty">
          No building found for BBL <code>{urlBbl}</code>. Try one of these:
          {buildings.slice(0, 5).map((b) => {
            const bbl = normalizeBbl(b.bbl);
            return bbl ? (
              <div key={b.address} className="cfc-example">
                <a href={`/case-file/${bbl}`}>{b.address} · {bbl}</a>
              </div>
            ) : null;
          })}
        </div>
      )}

      {props && (
        <>
          {modelMetaErr && (
            <div className="cfc-warn">
              model_meta fetch failed: {modelMetaErr} — provenance line shows fallback copy.
            </div>
          )}
          {/* status read failures fall back to Unreviewed silently — no
              banner. Write failures still surface via StatusWriter. */}
          <ErrorBoundary
            label={`CaseFileHeader:${urlBbl}`}
            fallback={
              <div className="cfc-warn">
                Case file failed to render for BBL {urlBbl} — record is malformed. Check console for details.
              </div>
            }
          >
            <CaseFileHeader {...props} />
          </ErrorBoundary>
          <StatusWriter
            bbl={urlBbl}
            currentStatus={currentStatus?.status ?? null}
            token={token}
            onSaved={(newStatus) => setCurrentStatus({
              ...(currentStatus ?? {}),
              status: newStatus,
              created_at: new Date().toISOString(),
            })}
          />
          {reportProps && (
            <div className="cfc-report-actions">
              <ReportActions
                bbl={reportProps.identity.bbl}
                address={reportProps.identity.address}
                reportId={reportProps.meta.reportId}
              />
            </div>
          )}
          <div className="cfc-report-link">
            <a href={`/report/${urlBbl}`}>See the full reasoning →</a>
          </div>
        </>
      )}
    </div>
  );
}
