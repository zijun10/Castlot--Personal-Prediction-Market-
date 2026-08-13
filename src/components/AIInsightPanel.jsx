import { useState } from "react";
import { lmsrPrice } from "../lmsr.js";
import { C } from "../theme.js";

// ─── AI Insight Panel ─────────────────────────────────────────────────────────
export default function AIInsightPanel({ market }) {
  const [insight, setInsight] = useState("");
  const [loading, setLoading] = useState(false);
  const [shown, setShown] = useState(false);

  const fetchInsight = async () => {
    if (shown) return;
    setLoading(true); setShown(true);
    try {
      const response = await fetch("/api/insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: market.title,
          yesPct: lmsrPrice(market.qYes, market.qNo, "yes") * 100,
          category: market.category,
          daysLeft: Math.ceil((new Date(market.resolution) - new Date()) / 86400000),
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setInsight(data.insight);
    } catch {
      setInsight("Market analysis unavailable. Use base rates and available evidence to calibrate your position.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: "rgba(194,220,255,0.2)", borderRadius: 12, border: `1px solid rgba(122,175,238,0.35)`,
      padding: "14px 16px", marginBottom: 12
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 12, color: C.babyBlueDark, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>🤖 AI Analyst</div>
        {!shown && (
          <button onClick={fetchInsight} style={{
            background: C.babyBlue, border: `1px solid rgba(122,175,238,0.5)`,
            borderRadius: 8, padding: "4px 10px", color: C.plum, fontSize: 12,
            cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600
          }}>Get insight</button>
        )}
      </div>
      {loading && <div style={{ color: C.textSoft, fontSize: 13, marginTop: 8 }}>Analyzing...</div>}
      {insight && <div style={{ color: C.textMid, fontSize: 13, marginTop: 8, lineHeight: 1.6 }}>{insight}</div>}
    </div>
  );
}
