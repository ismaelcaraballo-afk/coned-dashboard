// ProvenanceStrip — the one-line global chrome (~32px, mono, provenance-heavy).
//
// Layout left → right:
//   Product mark → surface name → spacer → run stamp + model chip + session
//   expiry → ⌘K → Sign out
//
// Owns WaveDivider so every surface has the same divider at the same
// y-position (the login parting's horizon-handoff target).
//
// Hidden pre-auth and via @media print (Report page's own letterhead
// carries provenance in the printed sheet).

import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthToken, setToken } from "./authToken.js";
import { routeName } from "./routeNames.js";
import WaveDivider from "./WaveDivider.jsx";
import "./ProvenanceStrip.css";

// Session hourly expiry — computed from the moment token is first seen this
// mount. Auth server enforces the real hour; this display is best-effort.
function useSessionExpiry(token) {
  const [start] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!token) return undefined;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [token]);
  if (!token) return null;
  const expiresAt = start + 60 * 60 * 1000;
  if (now >= expiresAt) return "expired";
  const d = new Date(expiresAt);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

function fmtRunStamp(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d)) return null;
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" });
  return `run ${date}, ${time}`;
}

export default function ProvenanceStrip() {
  const token = useAuthToken();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [meta, setMeta] = useState(null);
  const expiry = useSessionExpiry(token);

  useEffect(() => {
    if (!token) { setMeta(null); return; }
    let cancelled = false;
    fetch("/api/model_meta", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => { if (!cancelled) setMeta(json); })
      .catch(() => { if (!cancelled) setMeta(null); });
    return () => { cancelled = true; };
  }, [token]);

  // Legacy is a frozen surface — it keeps its own chrome. Root is the
  // stub landing (no chrome needed until it lands as a real surface M3+).
  if (!token) return null;
  if (pathname === "/legacy" || pathname === "/") return null;

  const surface = routeName(pathname) || "—";
  const runStamp = fmtRunStamp(meta?.run_date);
  const modelChip = meta?.model_version || null;

  function handleSignOut() {
    setToken(null);
    // Route back to the sign-in surface so the user isn't stranded on a
    // page whose data fetches would 401.
    navigate("/this-week");
  }

  function openPalette() {
    // The palette is a global keyboard shortcut in AppShell; mimic ⌘K here
    // so the button is a real trigger, not just a hint.
    const ev = new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true });
    window.dispatchEvent(ev);
  }

  return (
    <header className="ps-strip sc-scope" role="banner">
      <div className="ps-row">
        <span className="ps-mark">ConEd Steam Attrition</span>
        <span className="ps-sep">·</span>
        <span className="ps-surface">{surface}</span>

        <span className="ps-spacer" />

        {runStamp && <span className="ps-run">{runStamp}</span>}
        {modelChip && <span className="ps-chip">{modelChip}</span>}
        {expiry && (
          <span className="ps-session" title="Session expires at">
            session {expiry}
          </span>
        )}

        <button type="button" className="ps-cmdk" onClick={openPalette} aria-label="Open command palette">
          ⌘K
        </button>
        <button type="button" className="ps-signout" onClick={handleSignOut}>
          Sign out
        </button>
      </div>
      <WaveDivider />
    </header>
  );
}
