import { C } from "../theme.js";
import { brierLabel } from "../brier.js";

// ─── Leaderboard Panel ────────────────────────────────────────────────────────
export default function LeaderboardPanel({ users }) {
  return (
    <div style={{
      background: C.white, borderRadius: 20, padding: 24,
      border: `1px solid ${C.cardBorder}`, boxShadow: "0 4px 20px rgba(61,0,48,0.06)",
      fontFamily: "'DM Sans', sans-serif"
    }}>
      <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 800, color: C.plum, fontFamily: "'DM Serif Display', serif", letterSpacing: -0.5 }}>
        🏆 Campus Oracles
      </h3>
      {users.map((u, i) => {
        const tier = brierLabel(u.brier);
        return (
          <div key={u.id} style={{
            display: "flex", alignItems: "center", gap: 14, padding: "12px 0",
            borderBottom: i < users.length - 1 ? `1px solid rgba(61,0,48,0.07)` : "none"
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              background: i === 0 ? C.babyBlue : "rgba(61,0,48,0.06)",
              color: i === 0 ? C.plum : C.textSoft, fontSize: 13, fontWeight: 800
            }}>{i + 1}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{u.name}</div>
              <div style={{ fontSize: 11, color: C.textSoft }}>{u.markets} markets</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, color: tier.color, fontWeight: 700 }}>{tier.label}</div>
              <div style={{ fontSize: 11, color: C.textSoft }}>Brier: {u.brier}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
