import { useState, useRef, useEffect } from "react";
import "./LoginForm.css";

/**
 * LoginForm — auth surface with harmonic-composition cover.
 *
 * The cover is a math-as-art motif (sum of sinusoids, not tied to model
 * output) that lives in the login moment only. The rest of the product
 * echoes the same wave motif at lower volume (topbar divider, motion easing).
 *
 * POST /api/auth/login contract unchanged from D20 — same 429 handling,
 * same onLogin(token) callback, sessionStorage.coned_token.
 */

// ── Harmonic composition ────────────────────────────────────────────────────
// Pure math: 5 sinusoids summed. Irrational-ish frequency ratios prevent
// perfect repetition — gives the "textural, non-periodic" bird-song feel.
// Amplitude envelope (sin(πt)) tapers edges so the wave settles into the
// horizontal at both ends. Fixed constants, deterministic output.

const HARMONIC_W = 1600;
const HARMONIC_H = 260;
const CENTER_Y   = HARMONIC_H / 2;
const N_POINTS   = 260;

// Cap concurrent pulses so fast typing doesn't accumulate dozens of live
// paths. Older pulses are evicted when the ceiling is exceeded.
const MAX_PULSES = 16;

const HARMONICS = [
  { amp: 1.00, freq: 1.618, phase: 0     },
  { amp: 0.62, freq: 2.72,  phase: 1.31  },
  { amp: 0.38, freq: 4.31,  phase: 2.55  },
  { amp: 0.24, freq: 7.24,  phase: 0.72  },
  { amp: 0.14, freq: 11.09, phase: 1.98  },
];

function harmonicPath(phaseShift = 0) {
  const totalAmp = HARMONICS.reduce((s, h) => s + h.amp, 0);
  const scaleY = (CENTER_Y * 0.82) / totalAmp;
  const pts = [];
  for (let i = 0; i < N_POINTS; i++) {
    const t = i / (N_POINTS - 1);
    let y = 0;
    for (const h of HARMONICS) {
      y += h.amp * Math.sin(h.freq * t * Math.PI * 2 + h.phase + phaseShift);
    }
    y *= Math.sin(t * Math.PI); // edge taper
    pts.push([t * HARMONIC_W, CENTER_Y - y * scaleY]);
  }
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    d += ` L ${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}`;
  }
  return d;
}

// Three overlapping lines per pulse (primary + 2 ghosts). Each keystroke
// triggers one full draw-in → hold → fade-out cycle. Durations kept close
// so each pulse reads as ONE event.
const LINE_META = [
  { basePhase: 0,    opacity: 0.55, delay: 0,   dur: 1600 },
  { basePhase: 0.55, opacity: 0.30, delay: 60,  dur: 1900 },
  { basePhase: 1.15, opacity: 0.18, delay: 120, dur: 2100 },
];

// Precompute 6 phase-shifted variations so consecutive pulses draw
// visibly-different wave shapes. Rotated through by pulse.id % 6.
const PULSE_VARIATIONS = [0, 0.42, 0.87, 1.28, 1.74, 2.19].map((shift) =>
  LINE_META.map((meta) => ({
    ...meta,
    d: harmonicPath(meta.basePhase + shift),
  }))
);

const PULSE_LIFETIME_MS = 2200;

// ── Component ───────────────────────────────────────────────────────────────

export default function LoginForm({ onLogin, surfaceLede }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [parting, setParting] = useState(false);
  // Each entry is a live pulse. Keystrokes push a new pulse; each renders
  // its 3 lines through draw → hold → fade, then gets pruned.
  const [pulses, setPulses] = useState(() => [{ id: 0 }]);
  const nextPulseId = useRef(1);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    const t = setTimeout(() => {
      setPulses((prev) => prev.filter((p) => p.id !== 0));
    }, PULSE_LIFETIME_MS);
    return () => clearTimeout(t);
  }, []);

  function addPulse() {
    const id = nextPulseId.current++;
    setPulses((prev) => {
      const next = [...prev, { id }];
      return next.length > MAX_PULSES ? next.slice(next.length - MAX_PULSES) : next;
    });
    setTimeout(() => {
      setPulses((prev) => prev.filter((p) => p.id !== id));
    }, PULSE_LIFETIME_MS);
  }

  function handlePasswordChange(e) {
    setPassword(e.target.value);
    addPulse();
  }

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!password) {
      setError("Enter the password to continue.");
      return;
    }

    setLoading(true);
    setError("");
    let partingStarted = false;

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const bodyText = await res.text();
      if (!bodyText) throw new Error("Server unavailable — try again in a moment.");
      const data = JSON.parse(bodyText);

      if (!res.ok) {
        if (res.status === 429) {
          const retryAfter = res.headers.get("retry-after");
          const seconds = retryAfter ? parseInt(retryAfter, 10) : NaN;
          if (!isNaN(seconds) && seconds > 0) {
            const minutes = Math.ceil(seconds / 60);
            throw new Error(
              `Too many attempts — try again in ~${minutes} minute${minutes > 1 ? "s" : ""}.`
            );
          }
          throw new Error("Too many attempts — try again shortly.");
        }
        throw new Error(data.error || "Authentication failed.");
      }

      sessionStorage.setItem("coned_token", data.token);
      if (prefersReducedMotion) {
        onLogin(data.token);
      } else {
        partingStarted = true;
        setParting(true);
        setTimeout(() => onLogin(data.token), 420);
      }
    } catch (err) {
      setError(err.message || "Authentication failed.");
      inputRef.current?.focus();
      inputRef.current?.select();
    } finally {
      // Hold loading through the 420ms parting animation on success so the
      // button doesn't flash back to "Sign in →" mid-exit. Local flag —
      // parting state is async and stale in this closure.
      if (!partingStarted) setLoading(false);
    }
  }

  return (
    <div className={`lf-shell${parting ? " lf-shell--parting" : ""}`}>
      {/* Harmonic cover */}
      <div className="lf-cover" aria-hidden="true">
        <svg
          className="lf-cover-svg"
          viewBox={`0 0 ${HARMONIC_W} ${HARMONIC_H}`}
          preserveAspectRatio="none"
          role="presentation"
        >
          {pulses.map((pulse) => {
            const variation = PULSE_VARIATIONS[pulse.id % PULSE_VARIATIONS.length];
            return variation.map((line, i) => (
              <path
                key={`${pulse.id}-${i}`}
                d={line.d}
                pathLength="1"
                className="lf-cover-line"
                style={{
                  stroke: "var(--sc-bench-text)",
                  strokeOpacity: line.opacity,
                  animationDelay: `${line.delay}ms`,
                  animationDuration: `${line.dur}ms`,
                }}
              />
            ));
          })}
        </svg>
      </div>

      {/* Form — simple, no card, sits above the wave */}
      <div className="lf-wrap">
        {surfaceLede && <p className="lf-lede">{surfaceLede}</p>}

        <form className="lf-form" onSubmit={handleSubmit} noValidate>
          <label className="lf-label" htmlFor="lf-password">Password</label>
          <div className="lf-row">
            <input
              id="lf-password"
              ref={inputRef}
              type="password"
              className="lf-field"
              value={password}
              onChange={handlePasswordChange}
              disabled={loading}
              autoComplete="current-password"
              spellCheck={false}
            />
            <button
              type="submit"
              className="lf-go"
              disabled={loading || !password}
            >
              {loading ? "…" : "Sign in →"}
            </button>
          </div>

          {error && <div className="lf-error" role="alert">{error}</div>}

          <p className="lf-helper">
            Shared password. Sessions expire hourly.
          </p>
        </form>
      </div>
    </div>
  );
}
