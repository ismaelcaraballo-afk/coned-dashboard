import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useBuildings } from "../data/useBuildings.js";
import RankingsTable from "./RankingsTable.jsx";
import "./RankingsPage.css";

/**
 * M3 container harness — /rankings.
 *
 * Reads the session token established by the LoginForm on /this-week.
 * Unauthed visitors and expired sessions bounce to /this-week where the
 * workflow-native login surface lives (D20).
 */
export default function RankingsPage() {
  const [token, setToken] = useState(
    () => sessionStorage.getItem("coned_token") || null
  );

  const { buildings, loading, error }  = useBuildings(token);

  useEffect(() => {
    if (error === "UNAUTHORIZED") {
      sessionStorage.removeItem("coned_token");
      setToken(null);
    }
  }, [error]);

  if (!token) return <Navigate to="/this-week" replace />;

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

      {loading && (
        <div className="rankings-empty">Loading buildings…</div>
      )}

      {error && error !== "UNAUTHORIZED" && (
        <div className="rankings-empty rankings-empty--error">
          {`Failed to load: ${error}`}
        </div>
      )}

      {!loading && !error && buildings.length > 0 && (
        <RankingsTable buildings={buildings} limit={100} />
      )}
    </div>
  );
}
