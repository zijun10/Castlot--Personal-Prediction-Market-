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
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `You are a prediction market analyst for Castlot, a college student forecasting app.

Market: "${market.title}"
Current crowd probability: ${Math.round(lmsrPrice(market.qYes, market.qNo, "yes") * 100)}% YES
Category: ${market.category}
Days until resolution: ${Math.ceil((new Date(market.resolution) - new Date()) / 86400000)}

In 2-3 sentences, give a sharp, specific analysis of what's likely driving this probability and what information would most change it. Be direct and analytical, not generic. Speak like a sharp trader, not a therapist.`
          }]
        })
      });
      const data = await response.json();
      setInsight(data.content[0].text);
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
