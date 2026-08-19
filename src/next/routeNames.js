// Route-name table. Single source of surface names for the ProvenanceStrip.
// Prevents per-topbar drift like "M10 · METHODOLOGY · REGISTER".
// Milestone tokens (M9, M10, R11) are intentionally excluded — they are
// build bookkeeping, not client-facing (Fable D40).

const STATIC = {
  "/":            "Root",
  "/this-week":   "Since last run",
  "/methodology": "Methodology",
  "/digest":      "Weekly Digest",
  "/rankings":    "Rankings",
  "/legacy":      "Legacy",
};

const DYNAMIC = [
  { pattern: /^\/case-file\/[^/]+$/, name: "Case file" },
  { pattern: /^\/report\/[^/]+$/,    name: "Report" },
];

export function routeName(pathname) {
  if (STATIC[pathname]) return STATIC[pathname];
  for (const { pattern, name } of DYNAMIC) {
    if (pattern.test(pathname)) return name;
  }
  return "";
}
