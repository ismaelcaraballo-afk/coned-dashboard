#!/usr/bin/env node
/**
 * M11+ (WoW reframe): merge STATUS events into public/events.json.
 *
 * Runs after generate_events.py --emit. Reads the events.json that Python wrote,
 * pulls building_status_events rows since prev_run_date from Postgres, converts
 * each to a STATUS event, and rewrites events.json.
 *
 * Rationale: the M7 events feed is honest but sparse on stable inputs
 * (see docs/notes/presentation-notes.md, 2026-08-18 WoW audit). The workflow
 * layer (M6 status writes) is what actually moves week-to-week — plumbing it
 * into the feed shifts "Since last run" toward reconciliation signal.
 *
 * Graceful: if DATABASE_URL is unset or DB unreachable, logs a note and exits 0.
 * Never fails the pipeline on DB issues.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname   = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT   = path.resolve(__dirname, "..");
const EVENTS_JSON = path.join(REPO_ROOT, "public", "events.json");
const ENRICHMENT  = path.join(REPO_ROOT, "public", "buildingEnrichment.json");

const MAX_INDIVIDUAL_STATUS_EVENTS = 20;

function daysAgo(iso, nowMs = Date.now()) {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  const days = Math.floor((nowMs - t) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

async function loadJSON(p) {
  const raw = await fs.readFile(p, "utf-8");
  return JSON.parse(raw);
}

async function writeJSONAtomic(p, data) {
  const tmp = `${p}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2));
  await fs.rename(tmp, p);
}

/** Build BBL → address map from enrichment file. Enrichment is keyed by address. */
function buildBblToAddress(enrichment) {
  const out = {};
  for (const [address, e] of Object.entries(enrichment)) {
    if (e && typeof e === "object" && e.bbl) {
      out[String(e.bbl)] = address;
    }
  }
  return out;
}

/**
 * Pure function — testable without DB. Given raw status rows since prev_run_date
 * and an address lookup, returns an array of STATUS events in events.json shape.
 * Rows expected: { bbl, status, actor, created_at }, newest first.
 */
export function buildStatusEvents(rows, bblToAddress, nowMs = Date.now()) {
  if (!rows.length) return [];

  // Dedupe: one event per BBL — the most recent transition wins.
  const seen = new Set();
  const latestPerBbl = [];
  for (const r of rows) {
    if (seen.has(r.bbl)) continue;
    seen.add(r.bbl);
    latestPerBbl.push(r);
  }

  const events = [];
  const individual = latestPerBbl.slice(0, MAX_INDIVIDUAL_STATUS_EVENTS);
  const overflow   = latestPerBbl.slice(MAX_INDIVIDUAL_STATUS_EVENTS);

  for (const r of individual) {
    const address = bblToAddress[String(r.bbl)] ?? null;
    const when    = daysAgo(r.created_at, nowMs);
    const actor   = r.actor ? `by ${r.actor}` : null;
    const evidenceParts = [actor, when].filter(Boolean);
    events.push({
      kind:        "STATUS",
      subject:     address ?? `BBL ${r.bbl}`,
      verb:        `moved to ${r.status}`,
      evidence:    evidenceParts.join(" · ") || null,
      consequence: "Open case file",
      address:     address,
      bbl:         String(r.bbl),
    });
  }

  if (overflow.length) {
    // Roll up the tail into one aggregate line — keeps the feed readable.
    const byStatus = {};
    for (const r of overflow) {
      byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    }
    const breakdown = Object.entries(byStatus)
      .sort((a, z) => z[1] - a[1])
      .map(([s, n]) => `${n} ${s}`)
      .join(" · ");
    events.push({
      kind:        "STATUS",
      subject:     `${overflow.length} more building${overflow.length !== 1 ? "s" : ""}`,
      verb:        "had status updates",
      evidence:    breakdown,
      consequence: "Review queue",
    });
  }

  return events;
}

async function fetchStatusRowsSince(sinceIso) {
  // Lazy-import pg so environments without it (or without DATABASE_URL) can still
  // run this script without a hard failure at load time.
  const { default: pg } = await import("pg");
  // Mirror db.js SSL policy: localhost → no TLS; DATABASE_CA_CERT set → full
  // verification; otherwise fall back to encrypted-but-unverified (Railway
  // default until the CA cert is provisioned).
  const ssl = process.env.DATABASE_URL?.includes("localhost")
    ? false
    : process.env.DATABASE_CA_CERT
      ? { rejectUnauthorized: true, ca: Buffer.from(process.env.DATABASE_CA_CERT, "base64").toString() }
      : { rejectUnauthorized: false };
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl,
    max: 2,
    connectionTimeoutMillis: 5_000,
  });
  try {
    const { rows } = await pool.query(
      `SELECT bbl, status, actor, created_at
         FROM building_status_events
        WHERE created_at > $1
        ORDER BY created_at DESC, id DESC`,
      [sinceIso]
    );
    return rows;
  } finally {
    await pool.end();
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log("[merge-status] DATABASE_URL unset — skipping STATUS merge");
    return;
  }

  let payload;
  try {
    payload = await loadJSON(EVENTS_JSON);
  } catch (err) {
    console.log(`[merge-status] cannot read ${EVENTS_JSON} (${err.code}) — skipping`);
    return;
  }

  const since = payload.prev_run_date;
  if (!since) {
    console.log("[merge-status] no prev_run_date — first run, skipping STATUS merge");
    return;
  }
  // Guard: a malformed prev_run_date passes the !since check but blows up in
  // Postgres with a cryptic type error. Require ISO date prefix at minimum.
  if (!/^\d{4}-\d{2}-\d{2}/.test(since)) {
    console.log(`[merge-status] prev_run_date "${since}" is not ISO-shaped — skipping`);
    return;
  }

  let rows;
  try {
    rows = await fetchStatusRowsSince(since);
  } catch (err) {
    console.log(`[merge-status] DB query failed: ${err.message} — skipping`);
    return;
  }

  if (!rows.length) {
    console.log(`[merge-status] no status events since ${since}`);
    return;
  }

  let enrichment = {};
  try {
    enrichment = await loadJSON(ENRICHMENT);
  } catch { /* enrichment is optional here — falls back to BBL as subject */ }
  const bblToAddress = buildBblToAddress(enrichment);

  const statusEvents = buildStatusEvents(rows, bblToAddress);
  if (!statusEvents.length) return;

  // Dedup across pipeline re-runs: if a prior run already merged a STATUS
  // event for this BBL, don't prepend a second copy. Compares by BBL, since
  // buildStatusEvents already collapses to one event per BBL per run.
  const existingStatusBbls = new Set(
    (payload.events ?? [])
      .filter((e) => e?.kind === "STATUS" && e?.bbl)
      .map((e) => String(e.bbl))
  );
  const fresh = statusEvents.filter((e) => !e.bbl || !existingStatusBbls.has(String(e.bbl)));
  if (!fresh.length) {
    console.log("[merge-status] all STATUS events already present in feed — nothing to merge");
    return;
  }

  // STATUS events go first — they're the primary weekly signal.
  payload.events = [...fresh, ...(payload.events ?? [])];
  await writeJSONAtomic(EVENTS_JSON, payload);

  console.log(`[merge-status] merged ${fresh.length} STATUS event(s) into ${EVENTS_JSON}`);
  for (const e of fresh) {
    console.log(`  [STATUS    ] ${e.subject} — ${e.verb}`);
  }
}

// Run as script; tests import buildStatusEvents.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error("[merge-status] fatal:", err);
    process.exit(1);
  });
}
