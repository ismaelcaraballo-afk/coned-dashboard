import { useMemo } from "react";
import ScoreCell from "./ScoreCell.jsx";
import { computePercentileMap, toScoreCellProps } from "./scoreCellAdapter.js";
import "./RankingsTable.css";

/**
 * M3 Rankings container — hosts ScoreCell per row.
 *
 * Ordered by ml_risk desc (S5 legacy rows fall to the bottom of the ml-scored
 * block per adapter; here we sort by percentile with est. last).
 *
 * Column set matches the anatomy §04 in-situ example: Address · Cluster ·
 * Score · Steam · LL97 '30. Additional columns land in W1/W4/W6 (Ismael's
 * PR #12) — this PR ships the minimum shape that proves the atom in situ.
 */
export default function RankingsTable({ buildings, limit = 100 }) {
  const rows = useMemo(() => {
    const pctByKey = computePercentileMap(buildings);
    return buildings
      .map((b) => ({
        b,
        cell: toScoreCellProps(b, pctByKey),
        pct: pctByKey.get(b.address) ?? -1,
      }))
      .sort((a, z) => z.pct - a.pct)
      .slice(0, limit);
  }, [buildings, limit]);

  return (
    <div className="sc-scope rankings-bench">
      <table className="rankings-table">
        <thead>
          <tr>
            <th>Address</th>
            <th>Cluster</th>
            <th>Score</th>
            <th className="num">Steam (M kBtu)</th>
            <th className="num">LL97 '30</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ b, cell }) => (
            <tr key={b.address}>
              <td className="addr">{b.address}</td>
              <td className="cluster">{b.cluster_name ?? "—"}</td>
              <td><ScoreCell {...cell} /></td>
              <td className="num">{formatMkBtu(b.steam)}</td>
              <td className="num">{formatMoney(b.ll97_penalty_2030)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatMkBtu(steam) {
  if (!Number.isFinite(steam)) return "—";
  return (steam / 1_000_000).toFixed(1);
}

function formatMoney(n) {
  if (!Number.isFinite(n) || n === 0) return "$0";
  return `$${Math.round(n).toLocaleString()}`;
}
