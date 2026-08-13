import { useState, useEffect, useRef } from "react";
import { lmsrPrice } from "../lmsr.js";
import { C } from "../theme.js";
import { CATEGORY_COLORS } from "../mockData.js";
import AudioWaveform from "./AudioWaveform.jsx";
import ProbabilityGauge from "./ProbabilityGauge.jsx";

// ─── Market Card (Story format) ───────────────────────────────────────────────
export default function MarketCard({ market, onTrade, onComment, userFP, currentUser }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [transcriptIdx, setTranscriptIdx] = useState(0);
  const [comment, setComment] = useState("");
  const [showComments, setShowComments] = useState(false);
  const intervalRef = useRef(null);

  const yesPct = Math.round(lmsrPrice(market.qYes, market.qNo, "yes") * 100);
  const noPct = 100 - yesPct;
  const daysLeft = Math.ceil((new Date(market.resolution) - new Date()) / 86400000);
  const catColor = CATEGORY_COLORS[market.category] || "#94A3B8";

  const togglePlay = () => {
    if (playing) {
      clearInterval(intervalRef.current);
      setPlaying(false);
    } else {
      setPlaying(true);
      intervalRef.current = setInterval(() => {
        setProgress(p => {
          if (p >= 100) { clearInterval(intervalRef.current); setPlaying(false); return 100; }
          const next = p + 0.5;
          const idx = Math.floor((next / 100) * market.transcript.length);
          setTranscriptIdx(Math.min(idx, market.transcript.length - 1));
          return next;
        });
      }, 80);
    }
  };

  useEffect(() => () => clearInterval(intervalRef.current), []);

  const handleSubmitComment = () => {
    if (!comment.trim()) return;
    onComment(market.id, comment);
    setComment("");
  };

  return (
    <div style={{
      background: C.white,
      borderRadius: 24, overflow: "hidden", border: `1px solid ${C.cardBorder}`,
      boxShadow: "0 4px 24px rgba(61,0,48,0.08)", marginBottom: 24,
      fontFamily: "'DM Sans', sans-serif"
    }}>
      {/* TOP: Audio Player (Instagram story top half) */}
      <div style={{
        padding: "28px 28px 20px", background: `linear-gradient(180deg, rgba(194,220,255,0.25) 0%, rgba(255,240,245,0.6) 100%)`,
        borderBottom: `1px solid ${C.cardBorder}`
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <span style={{
              background: (catColor === C.babyBlue || catColor === C.babyBlueDark) ? "rgba(122,175,238,0.15)" : "rgba(61,0,48,0.08)",
              color: catColor === C.babyBlue ? C.babyBlueDark : catColor,
              border: `1px solid ${catColor === C.babyBlue ? "rgba(122,175,238,0.4)" : "rgba(61,0,48,0.15)"}`,
              borderRadius: 20, padding: "3px 12px", fontSize: 11, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: 1.5
            }}>
              {market.category}
            </span>
            <div style={{ marginTop: 8, fontSize: 16, fontWeight: 700, color: C.text, lineHeight: 1.4, maxWidth: 420 }}>
              {market.title}
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 16 }}>
            <ProbabilityGauge yesPct={yesPct} />
          </div>
        </div>

        {/* Waveform + controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
          <button onClick={togglePlay} style={{
            width: 44, height: 44, borderRadius: "50%", border: "none",
            background: C.plum, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, boxShadow: "0 4px 16px rgba(61,0,48,0.3)",
            transition: "transform 0.15s"
          }}>
            {playing
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
            }
          </button>
          <div style={{ flex: 1 }}>
            <AudioWaveform isPlaying={playing} progress={progress} />
          </div>
        </div>

        {/* Spotify-style scrolling transcript */}
        <div style={{
          background: "rgba(61,0,48,0.04)", borderRadius: 12, padding: "12px 16px",
          minHeight: 64, overflow: "hidden", border: `1px solid rgba(61,0,48,0.07)`
        }}>
          {market.transcript.map((line, i) => (
            <div key={i} style={{
              fontSize: i === transcriptIdx ? 15 : 13,
              fontWeight: i === transcriptIdx ? 700 : 400,
              color: i === transcriptIdx ? C.plum : i < transcriptIdx ? "rgba(61,0,48,0.25)" : "rgba(61,0,48,0.35)",
              lineHeight: 1.6, transition: "all 0.4s ease",
              transform: i === transcriptIdx ? "scale(1.02)" : "scale(1)",
              transformOrigin: "left"
            }}>
              {line.text}
            </div>
          ))}
        </div>

        {/* Meta */}
        <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 12, color: C.textSoft }}>
          <span>👤 {market.creator}</span>
          <span>📅 {daysLeft}d left</span>
          <span>🔁 {market.traders} traders</span>
          {market.tags.map(t => <span key={t} style={{ color: "rgba(61,0,48,0.3)" }}>#{t}</span>)}
        </div>
      </div>

      {/* BOTTOM: Voting + Comments */}
      <div style={{ padding: "20px 28px 24px", background: C.white }}>
        {/* YES/NO Trade Buttons */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: C.textSoft, marginBottom: 10, letterSpacing: 1, textTransform: "uppercase" }}>
            Your forecast — 10 shares at the market price
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => onTrade(market.id, "yes")}
              disabled={market.userVote !== null || userFP < 10}
              style={{
                flex: 1, padding: "14px 0", borderRadius: 14, border: "2px solid",
                borderColor: market.userVote === "yes" ? C.yes : "rgba(26,122,74,0.3)",
                background: market.userVote === "yes" ? "rgba(26,122,74,0.1)" : "rgba(26,122,74,0.04)",
                color: C.yes, fontWeight: 800, fontSize: 15, cursor: market.userVote ? "default" : "pointer",
                transition: "all 0.2s", fontFamily: "'DM Sans', sans-serif"
              }}>
              ✓ YES &nbsp;<span style={{ fontWeight: 400, opacity: 0.6 }}>{yesPct}%</span>
            </button>
            <button onClick={() => onTrade(market.id, "no")}
              disabled={market.userVote !== null || userFP < 10}
              style={{
                flex: 1, padding: "14px 0", borderRadius: 14, border: "2px solid",
                borderColor: market.userVote === "no" ? C.no : "rgba(192,57,43,0.3)",
                background: market.userVote === "no" ? "rgba(192,57,43,0.1)" : "rgba(192,57,43,0.04)",
                color: C.no, fontWeight: 800, fontSize: 15, cursor: market.userVote ? "default" : "pointer",
                transition: "all 0.2s", fontFamily: "'DM Sans', sans-serif"
              }}>
              ✗ NO &nbsp;<span style={{ fontWeight: 400, opacity: 0.6 }}>{noPct}%</span>
            </button>
          </div>
          {market.userVote && (
            <div style={{ marginTop: 8, fontSize: 12, color: C.textSoft, textAlign: "center" }}>
              You bet {market.userVote.toUpperCase()} · Position locked until resolution
            </div>
          )}
        </div>

        {/* Comments */}
        <div>
          <button onClick={() => setShowComments(!showComments)} style={{
            background: "none", border: "none", color: C.textSoft,
            cursor: "pointer", fontSize: 13, padding: 0, marginBottom: 12,
            fontFamily: "'DM Sans', sans-serif"
          }}>
            💬 {market.comments.length} comments {showComments ? "▲" : "▼"}
          </button>
          {showComments && (
            <div>
              {market.comments.map((c, i) => (
                <div key={i} style={{
                  background: "rgba(194,220,255,0.2)", borderRadius: 10, padding: "10px 14px",
                  marginBottom: 8, borderLeft: `3px solid ${C.babyBlueDark}`
                }}>
                  <div style={{ fontSize: 12, color: C.plumMid, marginBottom: 4, fontWeight: 600 }}>{c.user}</div>
                  <div style={{ fontSize: 13, color: C.textMid, lineHeight: 1.5 }}>{c.text}</div>
                  <div style={{ fontSize: 11, color: C.textSoft, marginTop: 4 }}>↑ {c.score}</div>
                </div>
              ))}
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <input value={comment} onChange={e => setComment(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSubmitComment()}
                  placeholder="Add your forecast..."
                  style={{
                    flex: 1, background: "rgba(61,0,48,0.04)", border: `1px solid rgba(61,0,48,0.12)`,
                    borderRadius: 10, padding: "10px 14px", color: C.text, fontSize: 13,
                    outline: "none", fontFamily: "'DM Sans', sans-serif"
                  }} />
                <button onClick={handleSubmitComment} style={{
                  background: C.plum, border: "none", borderRadius: 10, padding: "0 16px",
                  color: C.white, fontWeight: 700, cursor: "pointer", fontSize: 13,
                  fontFamily: "'DM Sans', sans-serif"
                }}>Post</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
