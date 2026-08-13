import { useState } from "react";
import { C } from "./theme.js";
import { INITIAL_MARKETS, CATEGORIES } from "./mockData.js";
import { brierLabel } from "./brier.js";
import MarketCard from "./components/MarketCard.jsx";
import CreateMarketModal from "./components/CreateMarketModal.jsx";
import LeaderboardPanel from "./components/LeaderboardPanel.jsx";
import AIInsightPanel from "./components/AIInsightPanel.jsx";

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function Castlot() {
  const [markets, setMarkets] = useState(INITIAL_MARKETS);
  const [activeCategory, setActiveCategory] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [activeTab, setActiveTab] = useState("feed"); // feed | leaderboard | profile
  const [userFP, setUserFP] = useState(1000);
  const [notification, setNotification] = useState(null);
  const [aiInsightMarket, setAiInsightMarket] = useState(null);

  const currentUser = { id: "me", name: "you_anon", brier: "0.142", markets: 3 };

  const mockUsers = [
    { id: "u1", name: "oracle_mia", brier: "0.089", markets: 47 },
    { id: "u2", name: "quant_watcher", brier: "0.103", markets: 31 },
    { id: "u3", name: "stats_kid", brier: "0.118", markets: 28 },
    { id: "u4", name: "forecaster_99", brier: "0.133", markets: 22 },
    { id: "me", name: "you_anon", brier: "0.142", markets: 3 },
    { id: "u5", name: "habit_hawk", brier: "0.161", markets: 19 },
  ];

  const notify = (msg, color = C.plum) => {
    setNotification({ msg, color });
    setTimeout(() => setNotification(null), 2800);
  };

  const handleTrade = (marketId, side) => {
    if (userFP < 50) { notify("Not enough Foresight Points!", "#EF4444"); return; }
    setMarkets(prev => prev.map(m => {
      if (m.id !== marketId) return m;
      const newQYes = side === "yes" ? m.qYes + 10 : m.qYes;
      const newQNo = side === "no" ? m.qNo + 10 : m.qNo;
      return { ...m, qYes: newQYes, qNo: newQNo, userVote: side, traders: m.traders + 1 };
    }));
    setUserFP(p => p - 50);
    notify(`Position taken: ${side.toUpperCase()} · 50 FP staked`, side === "yes" ? C.yes : C.no);
  };

  const handleComment = (marketId, text) => {
    setMarkets(prev => prev.map(m => {
      if (m.id !== marketId) return m;
      return { ...m, comments: [...m.comments, { user: "you_anon", text, score: 0 }] };
    }));
  };

  const handleCreateMarket = (marketData) => {
    const newMarket = {
      id: Date.now(), ...marketData,
      creator: "anon_you", creatorId: "me",
      qYes: 50, qNo: 50, traders: 1,
      comments: [], userVote: null, resolved: null,
      tags: marketData.tags || [marketData.category]
    };
    setMarkets(prev => [newMarket, ...prev]);
    notify("Market published! 🚀 Crowd is watching.", C.yes);
  };

  const filteredMarkets = activeCategory === "all"
    ? markets
    : markets.filter(m => m.category === activeCategory);

  return (
    <div style={{
      minHeight: "100vh", background: C.bg,
      fontFamily: "'DM Sans', sans-serif", color: C.text
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(61,0,48,0.2); border-radius: 3px; }
        @keyframes pulse { 0%,100% { box-shadow: 0 0 16px rgba(192,57,43,0.4); } 50% { box-shadow: 0 0 32px rgba(192,57,43,0.8); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes wavePulse { from { transform: scaleY(0.6); } to { transform: scaleY(1.2); } }
        @keyframes slideDown { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.3) sepia(1) hue-rotate(300deg); }
      `}</style>

      {/* Notification Toast */}
      {notification && (
        <div style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          background: C.white, border: `1px solid ${notification.color}55`,
          borderRadius: 50, padding: "10px 24px", zIndex: 2000,
          color: notification.color, fontSize: 14, fontWeight: 700,
          boxShadow: "0 8px 30px rgba(61,0,48,0.15)", animation: "slideDown 0.3s ease"
        }}>
          {notification.msg}
        </div>
      )}

      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(255,240,245,0.9)", backdropFilter: "blur(20px)",
        borderBottom: `1px solid rgba(61,0,48,0.08)`
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, background: C.plum,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, boxShadow: "0 4px 14px rgba(61,0,48,0.25)"
              }}>⚡</div>
              <span style={{ fontSize: 22, fontWeight: 800, fontFamily: "'DM Serif Display', serif", letterSpacing: -1, color: C.plum }}>
                Castlot
              </span>
              <span style={{
                background: C.babyBlue, color: C.plum, fontSize: 10,
                padding: "2px 8px", borderRadius: 20, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase"
              }}>Beta · CMU</span>
            </div>

            <div style={{ display: "flex", gap: 4 }}>
              {["feed", "leaderboard", "profile"].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{
                  padding: "8px 16px", borderRadius: 10, border: "none",
                  background: activeTab === tab ? C.plum : "transparent",
                  color: activeTab === tab ? C.white : C.textSoft,
                  cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
                  textTransform: "capitalize", transition: "all 0.2s"
                }}>{tab}</button>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                background: C.babyBlue, border: `1px solid rgba(122,175,238,0.5)`,
                borderRadius: 20, padding: "6px 14px", fontSize: 13, fontWeight: 700, color: C.plum
              }}>⚡ {userFP} FP</div>
              <button onClick={() => setShowCreate(true)} style={{
                background: C.plum, border: "none", borderRadius: 12, padding: "10px 18px",
                color: C.white, fontWeight: 800, fontSize: 13, cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif", boxShadow: "0 4px 16px rgba(61,0,48,0.3)"
              }}>+ Create Market</button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 20px" }}>
        {activeTab === "feed" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 28, alignItems: "start" }}>
            {/* Left: Feed */}
            <div>
              {/* Category filters */}
              <div style={{ display: "flex", gap: 8, marginBottom: 28, overflowX: "auto", paddingBottom: 4 }}>
                {CATEGORIES.map(c => (
                  <button key={c} onClick={() => setActiveCategory(c)} style={{
                    padding: "8px 18px", borderRadius: 20, border: "1px solid",
                    borderColor: activeCategory === c ? C.plum : "rgba(61,0,48,0.12)",
                    background: activeCategory === c ? C.plum : C.white,
                    color: activeCategory === c ? C.white : C.textSoft,
                    cursor: "pointer", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap",
                    textTransform: "capitalize", fontFamily: "'DM Sans', sans-serif",
                    flexShrink: 0, boxShadow: activeCategory === c ? "0 2px 10px rgba(61,0,48,0.2)" : "none"
                  }}>{c === "all" ? "All Markets" : c}</button>
                ))}
              </div>

              {filteredMarkets.length === 0 && (
                <div style={{ textAlign: "center", padding: "60px 0", color: C.textSoft }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                  <div>No markets in this category yet. Create the first one!</div>
                </div>
              )}

              {filteredMarkets.map(m => (
                <div key={m.id} style={{ animation: "fadeIn 0.4s ease" }}>
                  <AIInsightPanel market={m} />
                  <MarketCard
                    market={m}
                    onTrade={handleTrade}
                    onComment={handleComment}
                    userFP={userFP}
                    currentUser={currentUser}
                  />
                </div>
              ))}
            </div>

            {/* Right: Sidebar */}
            <div style={{ position: "sticky", top: 84 }}>
              <LeaderboardPanel users={mockUsers} />

              {/* Campus Pulse */}
              <div style={{
                marginTop: 20, background: C.white,
                borderRadius: 20, padding: 24, border: `1px solid ${C.cardBorder}`,
                boxShadow: "0 4px 20px rgba(61,0,48,0.06)"
              }}>
                <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 800, color: C.plum, letterSpacing: -0.3, fontFamily: "'DM Serif Display', serif" }}>
                  📡 Campus Pulse
                </h3>
                <div style={{ fontSize: 13, color: C.textSoft, lineHeight: 1.7 }}>
                  <div style={{ marginBottom: 10 }}>
                    <span style={{ color: C.yes, fontWeight: 700 }}>RESOLVED:</span> "Will I get the Goldman interview?" → <span style={{ color: C.plum, fontWeight: 700 }}>YES ✓</span> — Crowd said 71%, calibration held.
                  </div>
                  <div>
                    <span style={{ color: C.babyBlueDark, fontWeight: 700 }}>TRENDING:</span> "Will I switch from CS to ECE?" — 38 traders in 3hr
                  </div>
                </div>
              </div>

              {/* FP Info */}
              <div style={{
                marginTop: 16, background: C.white, borderRadius: 16, padding: 20,
                border: `1px solid ${C.cardBorder}`, boxShadow: "0 4px 20px rgba(61,0,48,0.06)"
              }}>
                <div style={{ fontSize: 12, color: C.textSoft, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Your FP Balance</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: C.plum, fontFamily: "'DM Serif Display', serif" }}>{userFP}</div>
                <div style={{ fontSize: 12, color: C.textSoft, marginTop: 4 }}>Foresight Points · Resets weekly</div>
                <div style={{ marginTop: 12, height: 4, background: "rgba(61,0,48,0.08)", borderRadius: 2 }}>
                  <div style={{ width: `${(userFP / 1000) * 100}%`, height: "100%", background: C.plum, borderRadius: 2, transition: "width 0.5s" }} />
                </div>
                <div style={{ fontSize: 11, color: C.textSoft, marginTop: 6 }}>Each trade costs 50 FP</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "leaderboard" && (
          <div style={{ maxWidth: 700, margin: "0 auto", animation: "fadeIn 0.4s ease" }}>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, fontWeight: 700, marginBottom: 8, color: C.plum }}>
              Forecaster Rankings
            </h2>
            <p style={{ color: C.textSoft, marginBottom: 32, fontSize: 15 }}>
              Ranked by Brier score — the lower, the more calibrated your forecasts.
            </p>

            {mockUsers.map((u, i) => {
              const tier = brierLabel(u.brier);
              const isMe = u.id === "me";
              return (
                <div key={u.id} style={{
                  background: isMe ? C.babyBlue : C.white,
                  border: `1px solid ${isMe ? "rgba(122,175,238,0.6)" : C.cardBorder}`,
                  borderRadius: 16, padding: "20px 24px", marginBottom: 12,
                  display: "flex", alignItems: "center", gap: 20,
                  animation: `fadeIn ${0.2 + i * 0.08}s ease`,
                  boxShadow: isMe ? "0 4px 20px rgba(122,175,238,0.3)" : "0 2px 12px rgba(61,0,48,0.05)"
                }}>
                  <div style={{
                    fontSize: i < 3 ? 28 : 20, width: 40, textAlign: "center"
                  }}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 17, fontWeight: 700, color: isMe ? C.plum : C.text }}>
                      {u.name} {isMe && <span style={{ fontSize: 12, fontWeight: 400, color: C.textMid }}>(you)</span>}
                    </div>
                    <div style={{ fontSize: 13, color: C.textSoft, marginTop: 2 }}>
                      {u.markets} markets forecasted
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: tier.color }}>
                      {tier.label}
                    </div>
                    <div style={{ fontSize: 13, color: C.textSoft, marginTop: 2 }}>
                      Brier: {u.brier}
                    </div>
                  </div>
                  <div style={{ width: 80 }}>
                    <div style={{ height: 6, background: "rgba(61,0,48,0.08)", borderRadius: 3 }}>
                      <div style={{
                        width: `${Math.max(10, 100 - parseFloat(u.brier) * 400)}%`,
                        height: "100%", background: tier.color, borderRadius: 3,
                        transition: "width 1s ease"
                      }} />
                    </div>
                    <div style={{ fontSize: 10, color: C.textSoft, marginTop: 4 }}>accuracy</div>
                  </div>
                </div>
              );
            })}

            <div style={{
              marginTop: 32, background: C.babyBlue,
              borderRadius: 16, padding: 24, border: `1px solid rgba(122,175,238,0.4)`
            }}>
              <h3 style={{ margin: "0 0 12px", color: C.plum, fontFamily: "'DM Serif Display', serif" }}>How Brier Score Works</h3>
              <p style={{ color: C.textMid, fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                When you bet 70% YES on a market that resolves YES, your score improves. Bet 70% YES on something that resolves NO and you're penalized. 
                The math: score = (probability − outcome)². Lower is better. A score below 0.1 means you're genuinely calibrated — 
                what you call 70% happens roughly 70% of the time.
              </p>
            </div>
          </div>
        )}

        {activeTab === "profile" && (
          <div style={{ maxWidth: 700, margin: "0 auto", animation: "fadeIn 0.4s ease" }}>
            {/* Profile header */}
            <div style={{
              background: `linear-gradient(135deg, ${C.babyBlue} 0%, rgba(255,240,245,0.8) 100%)`,
              borderRadius: 24, padding: 32, border: `1px solid rgba(122,175,238,0.3)`, marginBottom: 24,
              boxShadow: "0 4px 24px rgba(61,0,48,0.08)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <div style={{
                  width: 72, height: 72, borderRadius: "50%", background: C.white,
                  border: `3px solid ${C.plum}`, display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 28, boxShadow: "0 4px 16px rgba(61,0,48,0.15)"
                }}>👤</div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "'DM Serif Display', serif", color: C.plum }}>you_anon</div>
                  <div style={{ color: C.textMid, fontSize: 14 }}>CMU · Class of 2026</div>
                  <div style={{ marginTop: 8 }}>
                    <span style={{
                      background: C.plum, borderRadius: 20,
                      padding: "4px 12px", fontSize: 12, color: C.white, fontWeight: 700
                    }}>Analyst Tier</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
              {[
                { label: "Brier Score", value: "0.142", note: "Lower = better", color: C.plum },
                { label: "Markets Traded", value: "3", note: "Min 20 to rank", color: C.babyBlueDark },
                { label: "FP Balance", value: userFP, note: "Resets weekly", color: C.yes },
              ].map(s => (
                <div key={s.label} style={{
                  background: C.white, borderRadius: 16, padding: 20,
                  border: `1px solid ${C.cardBorder}`, textAlign: "center",
                  boxShadow: "0 2px 12px rgba(61,0,48,0.05)"
                }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: s.color, fontFamily: "'DM Serif Display', serif" }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: C.textMid, marginTop: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: C.textSoft, marginTop: 2 }}>{s.note}</div>
                </div>
              ))}
            </div>

            {/* Category breakdown */}
            <div style={{
              background: C.white, borderRadius: 20, padding: 24,
              border: `1px solid ${C.cardBorder}`, marginBottom: 24,
              boxShadow: "0 2px 12px rgba(61,0,48,0.05)"
            }}>
              <h3 style={{ margin: "0 0 20px", fontFamily: "'DM Serif Display', serif", fontSize: 18, color: C.plum }}>Category Accuracy</h3>
              {[
                { cat: "career", score: 0.11, trades: 8 },
                { cat: "habits", score: 0.19, trades: 12 },
                { cat: "academics", score: 0.13, trades: 5 },
              ].map(c => (
                <div key={c.cat} style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ color: C.plum, fontSize: 13, fontWeight: 700, textTransform: "capitalize" }}>{c.cat}</span>
                    <span style={{ color: C.textSoft, fontSize: 12 }}>Brier {c.score} · {c.trades} trades</span>
                  </div>
                  <div style={{ height: 6, background: "rgba(61,0,48,0.08)", borderRadius: 3 }}>
                    <div style={{
                      width: `${100 - c.score * 400}%`, height: "100%",
                      background: C.plum, borderRadius: 3
                    }} />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ textAlign: "center", padding: "20px 0", color: C.textSoft, fontSize: 14 }}>
              Trade 17 more markets to display your public Brier score.
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateMarketModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreateMarket}
          userFP={userFP}
        />
      )}
    </div>
  );
}
