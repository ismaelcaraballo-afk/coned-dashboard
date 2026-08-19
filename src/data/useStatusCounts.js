import { useState, useEffect } from "react";
import { isCritical } from "./criticalFilter.js";

/**
 * Fetches current status for all Critical buildings, returns counts
 * for the M6 CriticalQueue subtraction math:
 *   criticalTotal − contacted − dismissed = toReview
 */
export function useStatusCounts(buildings, token) {
  const [counts, setCounts]   = useState(null);
  const [ageByBbl, setAgeByBbl] = useState({});
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!token || !buildings.length) return;

    const criticalBbls = buildings
      .filter(isCritical)
      .map((b) => {
        const raw = typeof b.bbl === "string" ? b.bbl.replace(/[^0-9]/g, "") : "";
        return /^[1-5]\d{9}$/.test(raw) ? raw : null;
      })
      .filter(Boolean);

    if (!criticalBbls.length) {
      setCounts({ contacted: 0, dismissed: 0, toReview: 0, total: 0 });
      return;
    }

    // Server rejects arrays > 500 BBLs — cap before POSTing
    const bounded = criticalBbls.slice(0, 500);
    if (criticalBbls.length > 500) {
      console.warn(`[useStatusCounts] Critical BBL count ${criticalBbls.length} exceeds 500 — truncated`);
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch("/api/buildings/status/bulk", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ bbls: bounded }),
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((statusMap) => {
        if (cancelled) return;
        let contacted = 0, dismissed = 0;
        const ages = {};
        for (const [bbl, row] of Object.entries(statusMap)) {
          const { status, first_event_at } = row;
          if (status === "Contacted" || status === "In review" || status === "Confirmed at-risk") contacted++;
          else if (status === "Dismissed" || status === "False positive") dismissed++;
          if (first_event_at) ages[bbl] = first_event_at;
        }
        const total    = criticalBbls.length;
        const toReview = Math.max(0, total - contacted - dismissed);
        setCounts({ contacted, dismissed, toReview, total });
        setAgeByBbl(ages);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? "Failed to load status counts");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [buildings, token]);

  return { counts, ageByBbl, loading, error };
}
