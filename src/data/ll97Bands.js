/**
 * LL97 penalty bands (2030 caps) — canonical constant.
 * Source of truth: system-v1.1.md §4.6.
 * Field: ll97_penalty_2030 (not 2024 — 2024 caps are too loose to discriminate).
 * Zero bucket labeled "Under 2030 cap" — names a state, not a dollar figure.
 */

export const LL97_BANDS = [
  { key: "under-cap",  label: "Under 2030 cap", min: 0,          max: 0 },
  { key: "1-50k",      label: "$1–50k",         min: 1,          max: 50_000 },
  { key: "50-250k",    label: "$50k–250k",      min: 50_000,     max: 250_000 },
  { key: "250k-1m",    label: "$250k–1M",       min: 250_000,    max: 1_000_000 },
  { key: "1m-plus",    label: "$1M+",           min: 1_000_000,  max: Infinity },
];

export function bandOf(penalty) {
  if (!Number.isFinite(penalty) || penalty <= 0) return LL97_BANDS[0];
  if (penalty < 50_000)    return LL97_BANDS[1];
  if (penalty < 250_000)   return LL97_BANDS[2];
  if (penalty < 1_000_000) return LL97_BANDS[3];
  return LL97_BANDS[4];
}

export function bandCounts(rows) {
  const counts = Object.fromEntries(LL97_BANDS.map((b) => [b.key, 0]));
  if (!rows?.length) return counts;
  for (const b of rows) {
    counts[bandOf(b.ll97_penalty_2030).key] += 1;
  }
  return counts;
}
