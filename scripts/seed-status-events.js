// Seed local Postgres with a handful of status events against real Critical BBLs.
// Run: node --env-file-if-exists=.env scripts/seed-status-events.js
//
// Events span 3 / 7 / 14 / 21 days back so the W5 carry-over Age column shows
// a mix of "3d" / "1w" / etc. on /this-week.

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { pool } from "../api/db.js";
import { isCritical } from "../src/data/criticalFilter.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const buildings  = JSON.parse(readFileSync(join(root, "public/buildings.json"), "utf8"));
const enrichment = JSON.parse(readFileSync(join(root, "public/buildingEnrichment.json"), "utf8"));

const norm = (s) => (typeof s === "string" ? s.trim().toUpperCase() : "");

const merged = buildings.map((b) => ({ ...b, ...(enrichment[norm(b.address)] ?? {}) }));

const criticalWithBbl = merged
  .filter(isCritical)
  .map((b) => {
    const raw = typeof b.bbl === "string" ? b.bbl.replace(/[^0-9]/g, "") : "";
    return /^[1-5]\d{9}$/.test(raw) ? { bbl: raw, address: b.address, ml_risk: b.ml_risk } : null;
  })
  .filter(Boolean)
  .sort((a, z) => z.ml_risk - a.ml_risk);

console.log(`Found ${criticalWithBbl.length} Critical buildings with valid BBLs`);

// Seed pattern: pair each of the four ages with a status flow.
const seedPlan = [
  { daysBack: 21, status: "Confirmed at-risk", note: "Site visit confirmed idle steam load" },
  { daysBack: 14, status: "Contacted",         note: "Left voicemail with facilities manager" },
  { daysBack: 7,  status: "In review",         note: "Pulling billing history for last 12 months" },
  { daysBack: 3,  status: "Contacted",         note: "Emailed sustainability lead" },
];

const actor = "seed-script";
const picks = criticalWithBbl.slice(0, seedPlan.length);

if (picks.length < seedPlan.length) {
  console.warn(`Only ${picks.length} Critical BBLs available — seeding what we can`);
}

async function main() {
  // Clean prior seed rows so re-running is idempotent
  await pool.query(`DELETE FROM building_status_events WHERE actor = $1`, [actor]);
  console.log(`Cleared prior seed rows for actor="${actor}"`);

  for (let i = 0; i < picks.length; i++) {
    const { bbl, address } = picks[i];
    const { daysBack, status, note } = seedPlan[i];
    await pool.query(
      `INSERT INTO building_status_events (bbl, status, note, actor, created_at)
       VALUES ($1, $2, $3, $4, NOW() - ($5 || ' days')::interval)`,
      [bbl, status, note, actor, String(daysBack)]
    );
    console.log(`  ${bbl}  ${address.padEnd(40)}  ${status.padEnd(18)}  ${daysBack}d ago`);
  }

  const { rows: [{ count }] } = await pool.query(
    `SELECT COUNT(*) FROM building_status_events`
  );
  console.log(`\nTotal rows in building_status_events: ${count}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
