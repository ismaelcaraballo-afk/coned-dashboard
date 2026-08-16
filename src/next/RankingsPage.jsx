import { useState, useEffect } from "react";
import { useBuildings } from "../data/useBuildings.js";
import RankingsTable from "./RankingsTable.jsx";
import "./RankingsPage.css";

/**
 * M3 container harness — /rankings.
 *
 * Reads the session token established by the existing login flow.
 * Auth UI belongs to M9 (This Week landing composition); until then,
 * users log in via /legacy (writes sessionStorage.coned_token), then
 * navigate here. Frozen-legacy rule forbids importing the legacy Login
 * component, so this page renders a pointer instead of a login form.
 */
export default function RankingsPage() {
  const [token, setToken] = useState(
    () => sessionStorage.getItem("coned_token") || null
  );

  useEffect(() => {
    const onStorage = () => setToken(sessionStorage.getItem("coned_token"));
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const { buildings, loading, error } = useBuildings(token);

  return (
    <div className="sc-scope rankings-page">
      <header className="rankings-header">
        <div className="rankings-meta">
          <span>ConEd Steam Attrition · M3</span>
          <span>Rankings container · atom in situ</span>
          <span>Preview build</span>
        </div>
        <h1>Rankings</h1>
        <p className="rankings-lede">
          Sorted by <code>ml_risk</code> (percentile, desc). Score cell
          renders per §Components; tier from <code>diagnostic_risk</code>;
          divergence marker on two-tier promotions only (L3 v1.1).
        </p>
      </header>

      {!token && (
        <div className="rankings-empty">
          Sign in at <a href="/legacy">/legacy</a> first — the M3 route
          reads that session. Standalone auth arrives with M9.
        </div>
      )}

      {token && loading && (
        <div className="rankings-empty">Loading buildings…</div>
      )}

      {token && error && (
        <div className="rankings-empty rankings-empty--error">
          {error === "UNAUTHORIZED"
            ? <>Session expired. <a href="/legacy">Log in again.</a></>
            : `Failed to load: ${error}`}
        </div>
      )}

      {token && !loading && !error && buildings.length > 0 && (
        <RankingsTable buildings={buildings} limit={100} />
      )}
    </div>
  );
}
