// WaveDivider — the quiet echo of the login harmonic motif, rendered as a
// static ~1px sine at the bottom of the ProvenanceStrip.
//
// Load-bearing motion: exposes --sc-divider-y (in vh from top) and
// --sc-divider-stroke (color) on .sc-scope so the login parting can
// terminate its horizon-line handoff at exactly this y-position. Consumers
// that need the y-position for animation should read the CSS custom prop,
// not hardcode a number.

const WIDTH = 1200;
const HEIGHT = 6;
const PATH_D =
  "M 0 3 Q 60 1, 120 3 T 240 3 T 360 3 T 480 3 T 600 3 T 720 3 T 840 3 T 960 3 T 1080 3 T 1200 3";

export default function WaveDivider() {
  return (
    <svg
      className="wd-svg"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d={PATH_D}
        fill="none"
        stroke="var(--sc-divider-stroke)"
        strokeWidth="1"
      />
    </svg>
  );
}
