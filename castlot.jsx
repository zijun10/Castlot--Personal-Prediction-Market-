import { useState, useEffect, useRef, useCallback } from "react";

// ─── LMSR Market Engine ───────────────────────────────────────────────────────
const LMSR_B = 80;
function lmsrCost(qYes, qNo) {
  return LMSR_B * Math.log(Math.exp(qYes / LMSR_B) + Math.exp(qNo / LMSR_B));
}
function lmsrPrice(qYes, qNo, side) {
  const expY = Math.exp(qYes / LMSR_B);
  const expN = Math.exp(qNo / LMSR_B);
  return side === "yes" ? expY / (expY + expN) : expN / (expY + expN);
}
function calcBrierScore(predictions) {
  if (!predictions.length) return null;
  const sum = predictions.reduce((acc, p) => {
    const outcome = p.resolved ? 1 : 0;
    return acc + Math.pow(p.probability - outcome, 2);
  }, 0);
  return (sum / predictions.length).toFixed(3);
}

// ─── Color Palette ────────────────────────────────────────────────────────────
const C = {
  bg: "#FFF0F5",           // Lavender Blush — main backdrop
  plum: "#3D0030",         // Deep Plum — primary dark
  plumMid: "#6B0050",      // Mid Plum — hover states, borders
  plumLight: "#9B1070",    // Light Plum — accents
  babyBlue: "#C2DCFF",     // Baby Blue — secondary accent
  babyBlueDark: "#7AAFEE", // Deeper blue — active states
  text: "#1A000F",         // Near-black with plum tint
  textMid: "#6B2050",      // Mid text
  textSoft: "#C490B0",     // Soft muted text
  white: "#FFFFFF",
  card: "#FFFFFF",
  cardBorder: "rgba(61,0,48,0.10)",
  cardHover: "rgba(61,0,48,0.04)",
  yes: "#1A7A4A",          // Deep green for YES
  no: "#C0392B",           // Red for NO
  gold: "#3D0030",         // Use plum as primary action (replaces amber)
  goldText: "#FFFFFF",
};

// ─── Mock Data ────────────────────────────────────────────────────────────────
const INITIAL_MARKETS = [
  {
    id: 1, title: "Will I get a return offer from Jane Street after my summer internship?",
    category: "career", creator: "anon_7821", creatorId: "u1",
    audioSummary: "So I just finished my third week at Jane Street and honestly it's been a whirlwind. The culture is intense — everyone is absurdly smart and I feel like I'm drinking from a firehose every single day. My manager seems happy with my project progress but I haven't gotten any explicit feedback yet. The return offer rate is historically around 60% but this year they mentioned headcount is tighter. I have 5 weeks left and I'm trying to figure out whether to start recruiting elsewhere just in case...",
    transcript: [
      { time: "0:00", text: "So I just finished my third week at Jane Street..." },
      { time: "0:08", text: "...and honestly it's been a whirlwind." },
      { time: "0:12", text: "The culture is intense — everyone is absurdly smart." },
      { time: "0:20", text: "My manager seems happy with my project progress..." },
      { time: "0:28", text: "...but I haven't gotten any explicit feedback yet." },
      { time: "0:35", text: "The return offer rate is historically around 60%..." },
      { time: "0:42", text: "...but this year headcount is tighter." },
      { time: "0:50", text: "I have 5 weeks left and I'm deciding whether to recruit elsewhere." },
    ],
    qYes: 120, qNo: 60, resolution: "2025-08-15", traders: 47, verified: false,
    comments: [
      { user: "forecaster_99", text: "Jane Street return offers tanked last year. I'd say 45%.", score: 12 },
      { user: "quant_watcher", text: "If manager is happy week 3 that's a strong signal. 72% YES.", score: 8 },
      { user: "oracle_mia", text: "Recruit in parallel regardless. Never put all eggs in one basket.", score: 15 },
    ],
    userVote: null, resolved: null, tags: ["internship", "finance", "quant"]
  },
  {
    id: 2, title: "Will I stick to going to the gym 4x/week for the entire month of July?",
    category: "habits", creator: "anon_3341", creatorId: "u2",
    audioSummary: "Okay so I've been saying I'm going to get consistent with the gym for literally two years now. I finally got a membership at the CUC and my goal is four days a week for the whole month of July. I've downloaded a tracker app, I have a workout plan, and my roommate is supposed to hold me accountable. The problem is I've started strong before and then week two or three just completely falls apart when assignments pile up. But this time I'm putting it on Castlot so there's actual stakes...",
    transcript: [
      { time: "0:00", text: "Okay so I've been saying I'm going to get consistent with the gym..." },
      { time: "0:07", text: "...for literally two years now." },
      { time: "0:10", text: "I finally got a membership at the CUC." },
      { time: "0:15", text: "My goal is four days a week for the whole month of July." },
      { time: "0:22", text: "I have a tracker app, a workout plan, and an accountability roommate." },
      { time: "0:30", text: "The problem is week two or three always falls apart..." },
      { time: "0:38", text: "...when assignments pile up." },
      { time: "0:44", text: "This time I'm putting it on Castlot so there's actual stakes." },
    ],
    qYes: 40, qNo: 90, resolution: "2025-07-31", traders: 31, verified: false,
    comments: [
      { user: "stats_kid", text: "Base rate for gym consistency at 4x/week for a month is like 20%. 28% YES.", score: 19 },
      { user: "habit_hawk", text: "Accountability roommate is a huge boost. I'd go 40%.", score: 7 },
    ],
    userVote: null, resolved: null, tags: ["gym", "habits", "wellness"]
  },
  {
    id: 3, title: "Will I choose the startup offer over Google if I get both?",
    category: "career", creator: "anon_5509", creatorId: "u3",
    audioSummary: "I have a really weird problem — I'm currently holding a Google L4 offer for $280k total comp and I'm in final rounds at a 40-person Series B startup doing AI infrastructure. The startup would be around $160k salary plus equity that could be worth a lot or nothing. I went to CMU specifically to do impactful technical work and I genuinely believe in the startup's mission. But my parents are immigrants and the stability of Google feels deeply important to them and honestly to part of me too. If I get the startup offer, I don't know what I'll do...",
    transcript: [
      { time: "0:00", text: "I have a really weird problem." },
      { time: "0:04", text: "I'm holding a Google L4 offer for $280k total comp..." },
      { time: "0:10", text: "...and I'm in final rounds at a 40-person Series B startup." },
      { time: "0:18", text: "The startup does AI infrastructure — I believe in the mission." },
      { time: "0:25", text: "But my parents are immigrants. Stability matters to them." },
      { time: "0:32", text: "Google is $280k. Startup is $160k plus equity that could be zero." },
      { time: "0:40", text: "If I get the startup offer... I genuinely don't know what I'll do." },
    ],
    qYes: 55, qNo: 70, resolution: "2025-06-30", traders: 62, verified: false,
    comments: [
      { user: "vc_lurker", text: "Series B AI infra in this market? Take the startup. 58% they choose it.", score: 22 },
      { user: "pragmatist_p", text: "Parents factor is underweighted here. 35% YES.", score: 11 },
      { user: "oracle_mia", text: "The fact they recorded this podcast means they want the startup. 65%.", score: 31 },
    ],
    userVote: null, resolved: null, tags: ["career", "startup", "google", "decision"]
  },
];

const CATEGORIES = ["all", "career", "relationships", "habits", "academics", "purchases"];

const CATEGORY_COLORS = {
  career: "#3D0030",
  relationships: "#7AAFEE",
  habits: "#6B0050",
  academics: "#9B1070",
  purchases: "#C2DCFF",
  all: "#C490B0",
};

// ─── Brier Score helper ───────────────────────────────────────────────────────
function brierLabel(score) {
  if (score === null) return { label: "No data", color: "#C490B0" };
  const s = parseFloat(score);
  if (s < 0.1) return { label: "Oracle", color: "#3D0030" };
  if (s < 0.15) return { label: "Expert", color: "#6B0050" };
  if (s < 0.2) return { label: "Analyst", color: "#9B1070" };
  return { label: "Novice", color: "#C490B0" };
}

// ─── Waveform Component ───────────────────────────────────────────────────────
function AudioWaveform({ isPlaying, progress }) {
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

// ─── Probability Gauge ────────────────────────────────────────────────────────
function ProbabilityGauge({ yesPct, animated = true }) {
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

// ─── Market Card (Story format) ───────────────────────────────────────────────
function MarketCard({ market, onTrade, onComment, userFP, currentUser }) {
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
            Your forecast — costs 50 FP
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => onTrade(market.id, "yes")}
              disabled={market.userVote !== null || userFP < 50}
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
              disabled={market.userVote !== null || userFP < 50}
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

// ─── Create Market Modal ──────────────────────────────────────────────────────
function CreateMarketModal({ onClose, onCreate, userFP }) {
  const [step, setStep] = useState(1);
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [processing, setProcessing] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [category, setCategory] = useState("career");
  const [resolutionDate, setResolutionDate] = useState("");
  const [error, setError] = useState("");

  const processWithAI = async () => {
    if (!transcript.trim()) { setError("Please describe your situation first."); return; }
    setProcessing(true); setError("");
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `You are an AI for Castlot, a social prediction market app for college students. 
            
A user has narrated their personal life dilemma. Transform it into:
1. A clean binary YES/NO prediction market question (about the user's own life, time-bound, verifiable)
2. A short anonymous podcast summary (2-3 sentences, third person, no identifying details)
3. 5-6 transcript segments with timestamps for Spotify-style display
4. 3 relevant tags

User's narration: "${transcript}"

Respond ONLY with valid JSON (no markdown, no backticks):
{
  "marketQuestion": "Will I [...]?",
  "podcastSummary": "...",
  "transcript": [{"time": "0:00", "text": "..."}, ...],
  "tags": ["tag1", "tag2", "tag3"],
  "suggestedCategory": "career|relationships|habits|academics|purchases"
}`
          }]
        })
      });
      const data = await response.json();
      const text = data.content[0].text.trim();
      const parsed = JSON.parse(text);
      setAiResult(parsed);
      setCategory(parsed.suggestedCategory || "career");
      setStep(3);
    } catch (e) {
      setError("AI processing failed. Please try again or fill in manually.");
      setAiResult({
        marketQuestion: "Will I achieve my goal?",
        podcastSummary: transcript.slice(0, 200) + "...",
        transcript: [{ time: "0:00", text: transcript.slice(0, 80) }],
        tags: [category],
        suggestedCategory: category
      });
      setStep(3);
    } finally {
      setProcessing(false);
    }
  };

  const handleCreate = () => {
    if (!resolutionDate) { setError("Please set a resolution date."); return; }
    if (new Date(resolutionDate) <= new Date()) { setError("Resolution date must be in the future."); return; }
    onCreate({
      title: aiResult.marketQuestion,
      audioSummary: aiResult.podcastSummary,
      transcript: aiResult.transcript,
      tags: aiResult.tags,
      category,
      resolution: resolutionDate,
    });
    onClose();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(61,0,48,0.45)", backdropFilter: "blur(8px)",
      zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20
    }}>
      <div style={{
        background: C.white, borderRadius: 24, padding: 32, width: "100%", maxWidth: 560,
        border: `1px solid rgba(61,0,48,0.15)`, maxHeight: "90vh", overflowY: "auto",
        fontFamily: "'DM Sans', sans-serif", boxShadow: "0 20px 60px rgba(61,0,48,0.2)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.plum, fontFamily: "'DM Serif Display', serif" }}>
            {step === 1 && "Narrate Your Dilemma"}
            {step === 2 && "Processing..."}
            {step === 3 && "Review Your Market"}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.textSoft, cursor: "pointer", fontSize: 20 }}>✕</button>
        </div>

        {/* Step indicators */}
        <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{
              flex: 1, height: 3, borderRadius: 2,
              background: s <= step ? C.plum : "rgba(61,0,48,0.1)",
              transition: "background 0.3s"
            }} />
          ))}
        </div>

        {step === 1 && (
          <div>
            <p style={{ color: C.textSoft, fontSize: 14, marginBottom: 20, lineHeight: 1.7 }}>
              Describe your situation in your own words. Talk about a real decision you're facing — our AI will turn it into an anonymous prediction market.
            </p>
            <textarea
              value={transcript}
              onChange={e => setTranscript(e.target.value)}
              placeholder="So I'm trying to decide whether to... The situation is... I'm thinking about..."
              style={{
                width: "100%", minHeight: 160, background: "rgba(61,0,48,0.03)",
                border: `1px solid rgba(61,0,48,0.12)`, borderRadius: 14, padding: 16,
                color: C.text, fontSize: 14, lineHeight: 1.7, outline: "none", resize: "vertical",
                fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box"
              }}
            />

            <div style={{ textAlign: "center", margin: "16px 0" }}>
              <div style={{ color: C.textSoft, fontSize: 12, marginBottom: 8 }}>— or —</div>
              <button onClick={() => setRecording(!recording)} style={{
                width: 64, height: 64, borderRadius: "50%", border: "none",
                background: recording ? C.no : C.babyBlue,
                cursor: "pointer", fontSize: 24,
                boxShadow: recording ? "0 0 24px rgba(192,57,43,0.35)" : "0 4px 16px rgba(194,220,255,0.7)",
                transition: "all 0.3s", animation: recording ? "pulse 1.5s infinite" : "none"
              }}>🎙️</button>
              <div style={{ fontSize: 12, color: C.textSoft, marginTop: 8 }}>
                {recording ? "Recording... (tap to stop)" : "Tap to voice record"}
              </div>
            </div>

            {error && <div style={{ color: C.no, fontSize: 13, marginBottom: 12 }}>{error}</div>}
            <button onClick={processWithAI} style={{
              width: "100%", padding: "14px 0", background: C.plum, border: "none",
              borderRadius: 14, color: C.white, fontWeight: 800, fontSize: 15,
              cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
              boxShadow: "0 4px 20px rgba(61,0,48,0.3)"
            }}>Generate Market with AI →</button>
          </div>
        )}

        {processing && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 16, animation: "spin 2s linear infinite", display: "inline-block" }}>⚙️</div>
            <div style={{ color: C.textMid, fontSize: 15 }}>AI is structuring your market...</div>
            <div style={{ color: C.textSoft, fontSize: 13, marginTop: 8 }}>Extracting binary question, generating transcript, assigning category</div>
          </div>
        )}

        {step === 3 && aiResult && (
          <div>
            <div style={{ background: "rgba(61,0,48,0.05)", borderRadius: 14, padding: 20, marginBottom: 20, border: `1px solid rgba(61,0,48,0.12)` }}>
              <div style={{ fontSize: 12, color: C.plum, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Market Question</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.plum, lineHeight: 1.4, fontFamily: "'DM Serif Display', serif" }}>
                {aiResult.marketQuestion}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: C.textSoft, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Category</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {CATEGORIES.filter(c => c !== "all").map(c => (
                  <button key={c} onClick={() => setCategory(c)} style={{
                    padding: "6px 14px", borderRadius: 20, border: "1px solid",
                    borderColor: category === c ? C.plum : "rgba(61,0,48,0.12)",
                    background: category === c ? C.plum : "transparent",
                    color: category === c ? C.white : C.textSoft,
                    cursor: "pointer", fontSize: 12, fontWeight: 600,
                    fontFamily: "'DM Sans', sans-serif", textTransform: "capitalize"
                  }}>{c}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: C.textSoft, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Resolution Date</label>
              <input type="date" value={resolutionDate} onChange={e => setResolutionDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                style={{
                  width: "100%", background: "rgba(61,0,48,0.03)", border: `1px solid rgba(61,0,48,0.12)`,
                  borderRadius: 10, padding: "12px 16px", color: C.text, fontSize: 14, outline: "none",
                  fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box"
                }} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: C.textSoft, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Tags</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {aiResult.tags.map(t => (
                  <span key={t} style={{ background: C.babyBlue, borderRadius: 20, padding: "4px 12px", fontSize: 12, color: C.plum, fontWeight: 600 }}>#{t}</span>
                ))}
              </div>
            </div>

            {error && <div style={{ color: C.no, fontSize: 13, marginBottom: 12 }}>{error}</div>}

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(1)} style={{
                flex: 1, padding: "14px 0", background: "rgba(61,0,48,0.05)", border: `1px solid rgba(61,0,48,0.12)`,
                borderRadius: 14, color: C.textMid, cursor: "pointer", fontSize: 14, fontFamily: "'DM Sans', sans-serif"
              }}>← Edit</button>
              <button onClick={handleCreate} style={{
                flex: 2, padding: "14px 0", background: C.plum, border: "none",
                borderRadius: 14, color: C.white, fontWeight: 800, fontSize: 15,
                cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                boxShadow: "0 4px 20px rgba(61,0,48,0.3)"
              }}>Publish Market 🚀</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Leaderboard Panel ────────────────────────────────────────────────────────
function LeaderboardPanel({ users }) {
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

// ─── AI Insight Panel ─────────────────────────────────────────────────────────
function AIInsightPanel({ market }) {
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
