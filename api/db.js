import pg from "pg";

const { Pool } = pg;

// Fail fast in production if DATABASE_URL is not wired up
if (!process.env.DATABASE_URL && process.env.NODE_ENV === "production") {
  throw new Error("FATAL: DATABASE_URL must be set in production");
}

const _rawPoolMax = parseInt(process.env.DB_POOL_MAX ?? "5", 10);
const _poolMax = Number.isFinite(_rawPoolMax) && _rawPoolMax > 0 ? _rawPoolMax : 5;

const _connString = process.env.DATABASE_URL ?? "postgresql://localhost:5432/coned_dashboard";
// Local Postgres (docker-compose, Homebrew) does not run SSL — skip it for localhost URLs.
const _isLocalDb = /@(localhost|127\.0\.0\.1)[:/]/.test(_connString) || !/@/.test(_connString);

const pool = new Pool({
  connectionString: _connString,
  // Set DATABASE_CA_CERT env var (base64-encoded Railway CA bundle) to enable full TLS verification.
  ssl: _isLocalDb
    ? false
    : process.env.DATABASE_CA_CERT
      ? { rejectUnauthorized: true, ca: Buffer.from(process.env.DATABASE_CA_CERT, "base64").toString() }
      : { rejectUnauthorized: false },
  // Tune via DB_POOL_MAX env var; default 5 works for single-dyno Railway deployments
  max: _poolMax,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on("error", (err) => {
  console.error("[db] idle client error:", err.message);
});

const VALID_STATUSES = new Set([
  "Unreviewed",
  "In review",
  "Contacted",
  "Confirmed at-risk",
  "False positive",
  "Dismissed",
]);

// Guard: status values are interpolated into DDL — must contain no SQL special chars
for (const s of VALID_STATUSES) {
  if (!/^[A-Za-z ()-]+$/.test(s)) throw new Error(`Invalid status value for DDL: ${s}`);
}

export { pool, VALID_STATUSES };

export async function initSchema() {
  // Build CHECK constraint from VALID_STATUSES so they can never drift apart
  const statusLiteral = [...VALID_STATUSES].map((s) => `'${s}'`).join(",");

  // Table DDL in a transaction — concurrent startup (Railway deploy overlap) must not
  // leave the table half-created. Indexes run outside the transaction because
  // CREATE INDEX CONCURRENTLY cannot run inside one.
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`
      CREATE TABLE IF NOT EXISTS building_status_events (
        id         SERIAL      PRIMARY KEY,
        bbl        TEXT        NOT NULL,
        status     TEXT        NOT NULL CHECK (status IN (${statusLiteral})),
        note       TEXT        CHECK (note IS NULL OR length(note) <= 2000),
        actor      TEXT        NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  // CONCURRENTLY avoids an exclusive lock; safe to run after table exists
  await pool.query(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bse_bbl_ts
      ON building_status_events(bbl, created_at DESC, id DESC)
  `);

  await pool.query(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bse_actor
      ON building_status_events(actor)
  `);

  // Watchlist: one row per actor (HMAC-pseudonymized token), addresses stored as JSONB.
  // UPSERT on save — no append-only audit trail needed here, just current state.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS watchlists (
      actor       TEXT        PRIMARY KEY,
      addresses   JSONB       NOT NULL DEFAULT '[]',
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  console.log("[db] schema ready");
}

export async function saveWatchlist(actor, addresses) {
  await pool.query(
    `INSERT INTO watchlists (actor, addresses, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (actor) DO UPDATE SET addresses = $2::jsonb, updated_at = NOW()`,
    [actor, JSON.stringify(addresses)]
  );
}

export async function loadWatchlist(actor) {
  const { rows } = await pool.query(
    `SELECT addresses FROM watchlists WHERE actor = $1`,
    [actor]
  );
  return rows[0]?.addresses ?? [];
}

// Current status for a BBL — fetched independently from history so paginated
// reads with offset>0 still return an accurate current field (not history[0]).
export async function getCurrentStatus(bbl) {
  const { rows } = await pool.query(
    `SELECT status, note, actor, created_at
     FROM building_status_events
     WHERE bbl = $1
     ORDER BY created_at DESC, id DESC
     LIMIT 1`,
    [bbl]
  );
  return rows[0] ?? null;
}

// Full history for a BBL, newest first — paginated (default 100, max 500)
export async function getStatusHistory(bbl, limit = 100, offset = 0) {
  const { rows } = await pool.query(
    `SELECT id, status, note, actor, created_at
     FROM building_status_events
     WHERE bbl = $1
     ORDER BY created_at DESC, id DESC
     LIMIT $2 OFFSET $3`,
    [bbl, limit, offset]
  );
  return rows;
}

// Append a new status event — never updates, never deletes
export async function appendStatus(bbl, status, note, actor) {
  const { rows } = await pool.query(
    `INSERT INTO building_status_events (bbl, status, note, actor)
     VALUES ($1, $2, $3, $4)
     RETURNING id, bbl, status, note, actor, created_at`,
    [bbl, status, note ?? null, actor]
  );
  return rows[0];
}

// Bulk: latest status per BBL — LATERAL forces per-BBL index scan instead of DISTINCT ON seqscan.
// Also returns first_event_at (earliest touch) so the queue can render W5 carry-over ages.
export async function getBulkCurrentStatus(bbls) {
  if (!bbls.length) return {};
  const { rows } = await pool.query(
    `SELECT b.bbl, e.status, e.actor, e.created_at, f.first_event_at
     FROM unnest($1::text[]) AS b(bbl)
     CROSS JOIN LATERAL (
       SELECT status, actor, created_at
       FROM building_status_events
       WHERE bbl = b.bbl
       ORDER BY created_at DESC, id DESC
       LIMIT 1
     ) e
     CROSS JOIN LATERAL (
       SELECT MIN(created_at) AS first_event_at
       FROM building_status_events
       WHERE bbl = b.bbl
     ) f`,
    [bbls]
  );
  return Object.fromEntries(rows.map((r) => [r.bbl, r]));
}
