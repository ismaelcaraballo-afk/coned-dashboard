import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { useBuildings } from "../data/useBuildings.js";
import { useEvents } from "../data/useEvents.js";
import { useStatusCounts } from "../data/useStatusCounts.js";
import { isCritical } from "../data/criticalFilter.js";
import CriticalQueue from "./CriticalQueue.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";
import LoginForm from "./LoginForm.jsx";
import "./ThisWeekPage.css";

// ── Portfolio pulse aggregation ───────────────────────────────────────────

function computePulse(buildings) {
  let critical = 0, high = 0, medium = 0, low = 0, uncertain = 0;
  for (const b of buildings) {
    const dr = b.diagnostic_risk;
    if (isCritical(b))            critical++;
    else if (dr === "High")        high++;
    else if (dr === "Medium")      medium++;
    else if (dr === "Low")         low++;
    else if (dr === "Uncertain" || dr == null) uncertain++;
  }
  return { critical, high, medium, low, uncertain, total: buildings.length };
}

// ── Date formatting ───────────────────────────────────────────────────────

function fmtRunDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    timeZone: "UTC",
  });
}

// ── Event kind display ────────────────────────────────────────────────────

const KIND_META = {
  TIER_UP:   { label: "Tier ↑", cls: "tw-kind--up"   },
  TIER_DOWN: { label: "Tier ↓", cls: "tw-kind--down" },
  PERMIT:    { label: "Permit", cls: ""               },
  DATA:      { label: "Data",   cls: ""               },
  DIVERGE:   { label: "Diverge",cls: ""               },
  STATUS:    { label: "Status", cls: ""               },
  MODEL:     { label: "Model",  cls: "tw-kind--model" },
};

function EventRow({ event }) {
  const meta = KIND_META[event.kind] ?? { label: event.kind, cls: "" };
  return (
    <div className="tw-event">
      <span className={`tw-kind ${meta.cls}`}>{meta.label}</span>
      <span className="tw-body">
        <strong>{event.subject}</strong>
        {" — "}
        {event.verb}
        {event.evidence && (
          <span className="tw-evidence"> · {event.evidence}</span>
        )}
      </span>
      {event.consequence && (
        <span className="tw-action">{event.consequence}</span>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export default function ThisWeekPage() {
  const [token, setToken] = useState(
    () => sessionStorage.getItem("coned_token") || null
  );

  // sessionStorage is per-tab — storage event only fires for localStorage (cross-tab).
  // Token is read correctly on mount; re-login navigates to /legacy which sets it there.

  const { buildings, loading: bldgLoading, error: bldgError } = useBuildings(token);
  const { events: eventsData, loading: evtLoading }            = useEvents(token);
  const { counts: statusCounts }                               = useStatusCounts(buildings, token);

  // Expired session → clear token, re-render into LoginForm in place.
  useEffect(() => {
    if (bldgError === "UNAUTHORIZED") {
      sessionStorage.removeItem("coned_token");
      setToken(null);
    }
  }, [bldgError]);

  const pulse = useMemo(() => computePulse(buildings), [buildings]);

  const runDate     = eventsData?.run_date     ?? null;
  const firstRun    = eventsData?.first_run    ?? true;
  const feedEvents  = useMemo(() => {
    if (!eventsData?.events) return [];
    // Filter out the plain DATA "quiet" event from the visible feed
    // if it has no affected count — DATA+quiet is informational only.
    return eventsData.events.filter(
      (e) => !(e.kind === "DATA" && e.consequence === null)
    );
  }, [eventsData]);

  return (
    <div className="sc-scope tw-page">
      {/* ── Topbar ─────────────────────────────────────────────────── */}
      {token && (
      <header className="tw-topbar">
        {/* Harmonic divider — quiet echo of the login cover. */}
        <svg
          className="tw-topbar-wave"
          viewBox="0 0 1200 6"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M 0 3 Q 60 1, 120 3 T 240 3 T 360 3 T 480 3 T 600 3 T 720 3 T 840 3 T 960 3 T 1080 3 T 1200 3"
            fill="none"
            stroke="var(--sc-bench-line)"
            strokeWidth="1"
          />
        </svg>
        <div className="tw-topbar-inner">
          <div className="tw-topbar-left">
            <span className="tw-eyebrow">ConEd Steam Attrition · M9</span>
            <h1 className="tw-page-title">This Week</h1>
          </div>
          <div className="tw-anchors">
            <div className="tw-anchor">
              <span className="tw-anchor-label">Pipeline run</span>
              <span className="tw-anchor-val">{fmtRunDate(runDate)}</span>
            </div>
            {token && (
              <>
                <kbd className="tw-cmdk-hint" title="Command palette">⌘K</kbd>
                <Link to="/digest" className="tw-compose-btn">
                  Compose weekly digest
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      )}

      {!token && (
        <LoginForm onLogin={setToken} />
      )}

      {token && (
        <div className="tw-body-inner">
          {/* ── Delta feed ─────────────────────────────────────────── */}
          <section className="tw-section">
            <div className="tw-section-label">
              <span>Since last run</span>
              {!evtLoading && eventsData && (
                <span className="tw-section-count">
                  {feedEvents.length} event{feedEvents.length !== 1 ? "s" : ""} · {eventsData.events?.find(e => e.kind === "DATA")?.subject ?? "—"} scanned
                </span>
              )}
            </div>

            {evtLoading && <div className="tw-placeholder">Loading events…</div>}

            {!evtLoading && (firstRun || feedEvents.length === 0) && (
              <div className="tw-placeholder">
                Event feed begins with the first diffed pipeline run. Nothing to show yet.
              </div>
            )}

            {!evtLoading && !firstRun && feedEvents.length > 0 && (
              <div className="tw-feed">
                {feedEvents.map((e) => (
                  <ErrorBoundary key={`${e.kind}-${e.subject}`} fallback={null}>
                    <EventRow event={e} />
                  </ErrorBoundary>
                ))}
              </div>
            )}
          </section>

          {/* ── Queue (M8) ─────────────────────────────────────────── */}
          <section className="tw-section">
            <div className="tw-section-label">
              <span>Your queue this week</span>
              <span className="tw-section-count">sorted by rank within Critical, then High</span>
            </div>

            {bldgLoading && <div className="tw-placeholder">Loading buildings…</div>}
            {bldgError && bldgError !== "UNAUTHORIZED" && (
              <div className="tw-placeholder tw-placeholder--err">
                {`Failed to load buildings: ${bldgError}`}
              </div>
            )}
            {!bldgLoading && !bldgError && (
              <ErrorBoundary label="CriticalQueue" fallback={<div className="tw-placeholder tw-placeholder--err">Queue failed to render.</div>}>
                <CriticalQueue buildings={buildings} hasM6={true} statusCounts={statusCounts} runDate={runDate} />
              </ErrorBoundary>
            )}
          </section>

          {/* ── Portfolio pulse ────────────────────────────────────── */}
          <section className="tw-section">
            <div className="tw-section-label">
              <span>Portfolio pulse</span>
              <span className="tw-section-count">{pulse.total.toLocaleString()} buildings · run {fmtRunDate(runDate)}</span>
            </div>

            {bldgLoading
              ? <div className="tw-placeholder">Loading…</div>
              : (
                <div className="tw-pulse">
                  <PulseTile label="Critical" value={pulse.critical} tier="high" />
                  <PulseTile label="High"     value={pulse.high}     tier="high" />
                  <PulseTile label="Medium"   value={pulse.medium}   tier="med" />
                  <PulseTile label="Low"      value={pulse.low}      tier="low" />
                  <PulseTile label="Uncertain" value={pulse.uncertain} tier="unc" />
                </div>
              )
            }
          </section>
        </div>
      )}
    </div>
  );
}

function PulseTile({ label, value, tier }) {
  return (
    <div className={`tw-pulse-tile tw-pulse-tile--${tier}`}>
      <span className="tw-pulse-val">{value.toLocaleString()}</span>
      <span className="tw-pulse-label">{label}</span>
    </div>
  );
}
