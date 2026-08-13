import { C } from "../theme.js";

// ─── Probability Gauge ────────────────────────────────────────────────────────
export default function ProbabilityGauge({ yesPct, animated = true }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const dash = (yesPct / 100) * circ;
  return (
    <div style={{ position: "relative", width: 128, height: 128 }}>
      <svg width="128" height="128" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="64" cy="64" r={r} fill="none" stroke="rgba(61,0,48,0.10)" strokeWidth="10" />
        <circle cx="64" cy="64" r={r} fill="none" stroke={C.plum} strokeWidth="10"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: animated ? "stroke-dasharray 0.8s cubic-bezier(0.34,1.56,0.64,1)" : "none" }} />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center"
      }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: C.plum, fontFamily: "'DM Serif Display', serif" }}>
          {yesPct}%
        </div>
        <div style={{ fontSize: 10, color: C.textSoft, letterSpacing: 2, textTransform: "uppercase" }}>YES</div>
      </div>
    </div>
  );
}
