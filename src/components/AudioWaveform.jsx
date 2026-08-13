import { C } from "../theme.js";

// ─── Waveform Component ───────────────────────────────────────────────────────
export default function AudioWaveform({ isPlaying, progress }) {
  const bars = 40;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, height: 40 }}>
      {Array.from({ length: bars }).map((_, i) => {
        const heightPct = 20 + Math.sin(i * 0.8) * 15 + Math.sin(i * 1.7) * 10 + Math.random() * 5;
        const filled = (i / bars) * 100 < progress;
        return (
          <div key={i} style={{
            width: 3, borderRadius: 2,
            height: `${heightPct}px`,
            background: filled ? C.plum : "rgba(61,0,48,0.15)",
            transition: "background 0.3s",
            animation: isPlaying && filled ? `wavePulse ${0.5 + Math.random() * 0.5}s ease-in-out infinite alternate` : "none",
          }} />
        );
      })}
    </div>
  );
}
