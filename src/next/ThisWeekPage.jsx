import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { useBuildings } from "../data/useBuildings.js";
import { useEvents } from "../data/useEvents.js";
import { useStatusCounts } from "../data/useStatusCounts.js";
import { isCritical } from "../data/criticalFilter.js";
import CriticalQueue from "./CriticalQueue.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";
import LoginForm from "./LoginForm.jsx";
import { setToken as writeToken } from "./authToken.js";
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

// Monday of the week containing `iso` (UTC), formatted as "Mon Jul 6, 2026".
function fmtWeekOf(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  // getUTCDay: Sun=0, Mon=1, ...
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + diff));
  return monday.toLocaleDateString("en-US", {
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
        <span className="tw-subject">{event.subject}</span>
        {" "}
        <span className="tw-verb">{event.verb}</span>
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
  // While parting, LoginForm stays mounted (overlay) and the workbench
  // renders underneath with .tw-page--entering so opacity fades up during
  // the same window the login collapses. Cleared when LoginForm finishes.
  const [parting, setParting] = useState(false);

  // sessionStorage is per-tab — storage event only fires for localStorage (cross-tab).
  // Token is read correctly on mount; re-login navigates to /legacy which sets it there.

  const { buildings, loading: bldgLoading, error: bldgError } = useBuildings(token);
  const { events: eventsData, loading: evtLoading }            = useEvents(token);
  const { counts: statusCounts }                               = useStatusCounts(buildings, token);

  // Expired session → clear token, re-render into LoginForm in place.
  useEffect(() => {
    if (bldgError === "UNAUTHORIZED") {
      writeToken(null);
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
      {/* Workbench (topbar + body). During parting, wrapped in .tw-workbench--entering
          so it fades up beneath the LoginForm overlay's collapse. */}
      {token && (
      <div className={`tw-workbench${parting ? " tw-workbench--entering" : ""}`}>
      {/* Local topbar retired 2026-08-19 — surface identity + run stamp
          + ⌘K + sign out are all in the global ProvenanceStrip (D34/D37).
          Page opens on its title + Compose action as the first block. */}
      <div className="tw-body-inner">
        <div className="tw-page-heading">
          <h1 className="tw-page-title">This Week</h1>
          <p className="tw-page-subtitle">
            pipeline run {fmtRunDate(runDate)}
          </p>
          <div className="tw-command-row">
            <button
              type="button"
              className="tw-ask-btn"
              onClick={() => {
                window.dispatchEvent(new KeyboardEvent("keydown", {
                  key: "k", metaKey: true, bubbles: true,
                }));
              }}
              aria-label="Open command palette"
            >
              <span className="tw-ask-placeholder">Ask or filter…</span>
              <span className="tw-ask-kbd">⌘K</span>
            </button>
            <Link to="/rankings" className="tw-portfolio-btn">
              Portfolio
            </Link>
            <Link to="/digest" className="tw-compose-btn">
              Compose weekly digest
            </Link>
          </div>
          <hr className="tw-heading-rule" />
        </div>
          {/* ── Delta feed ───────────────────────────────────────────
              Section label dropped — surface title carries it (Fable answer,
              2026-08-19 landing-framing). Right-stat floats as a small meta
              line above the feed. */}
          <section className="tw-section">
            {!evtLoading && eventsData && (
              <div className="tw-feed-meta">
                {feedEvents.length} event{feedEvents.length !== 1 ? "s" : ""} · 1 run · {buildings.length.toLocaleString()} scanned
              </div>
            )}

            {evtLoading && <div className="tw-placeholder">Loading events…</div>}

            {!evtLoading && (firstRun || feedEvents.length === 0) && (
              <div className="tw-placeholder">
                Run {fmtRunDate(runDate)} · no changes since the previous run.
                <br />
                Queue and pulse below reflect the current run. First diffed run populates this feed.
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
              <span>Your queue</span>
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
                <CriticalQueue buildings={buildings} hasM6={true} statusCounts={statusCounts} runDate={runDate} limit={5} />
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
              : <PulseBar pulse={pulse} runDate={runDate} />
            }
          </section>
        </div>
      </div>
      )}

      {(!token || parting) && (
        <div className="tw-login-overlay">
          <LoginForm
            onLogin={(tok) => { setParting(true); setToken(tok); }}
            onPartingEnd={() => setParting(false)}
          />
        </div>
      )}
    </div>
  );
}

function PulseBar({ pulse, runDate }) {
  const { critical, high, medium, low, uncertain, total } = pulse;
  // Critical is a subset of the tier space computed differently; the bar
  // partitions the diagnostic tiers only, so critical folds into high visually.
  const barTotal = high + medium + low + uncertain;
  const pct = (n) => barTotal > 0 ? (n / barTotal) * 100 : 0;
  return (
    <div className="tw-pulse">
      <div className="tw-pulse-bar">
        <i style={{ width: `${pct(high)}%`,      background: "#E05545" }} />
        <i style={{ width: `${pct(medium)}%`,    background: "#D19A3D" }} />
        <i style={{ width: `${pct(low)}%`,       background: "#4C8A68" }} />
        <i style={{ width: `${pct(uncertain)}%`, background: "#7A828D" }} />
      </div>
      <div className="tw-pulse-stats">
        High <b>{high.toLocaleString()}</b>
        {" · "}Med <b>{medium.toLocaleString()}</b>
        {" · "}Low <b>{low.toLocaleString()}</b>
        {" · "}Uncertain <b>{uncertain.toLocaleString()}</b>
        <br />
        Critical <b>{critical.toLocaleString()}</b>
        {" · "}<b>{total.toLocaleString()}</b> buildings scanned
      </div>
      <div className="tw-pulse-vint">
        Pipeline {fmtRunDate(runDate)}<br />XGB v1 · UNVAL
      </div>
    </div>
  );
}
