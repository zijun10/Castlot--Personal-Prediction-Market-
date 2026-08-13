import { useState } from "react";
import { C } from "../theme.js";

// ─── Landing / Auth Page ──────────────────────────────────────────────────────
// First screen when no session exists: pitch on the left, account card on the
// right (sign up / log in / continue as guest).

const STEPS = [
  { icon: "🎙️", title: "Narrate", text: "Talk through a real dilemma — 30 to 120 seconds. AI turns it into a clean YES/NO market." },
  { icon: "📈", title: "Let the crowd trade", text: "Classmates stake Foresight Points on your outcome. The price is the campus's honest probability." },
  { icon: "🏆", title: "Build reputation", text: "Markets resolve, Brier scores update. Calibration — not confidence — climbs the leaderboard." },
];

export default function Landing({ onSignUp, onSignIn, onGuest, existingUser, onEnter, onSwitch }) {
  const [mode, setMode] = useState("signup"); // signup | login
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    if (!email.trim() || !password) { setError("Email and password are required."); return; }
    if (mode === "signup" && !username.trim()) { setError("Pick a username — it's what the crowd sees."); return; }
    if (mode === "signup" && password.length < 6) { setError("Password needs at least 6 characters."); return; }
    setBusy(true);
    try {
      if (mode === "signup") await onSignUp(email.trim(), password, username.trim());
      else await onSignIn(email.trim(), password);
    } catch (e) {
      setError(e.message || "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const input = {
    width: "100%", boxSizing: "border-box", background: "rgba(61,0,48,0.04)",
    border: "1px solid rgba(61,0,48,0.14)", borderRadius: 12, padding: "13px 16px",
    color: C.text, fontSize: 14, outline: "none", fontFamily: "'DM Sans', sans-serif",
    marginBottom: 12,
  };

  return (
    <div style={{
      minHeight: "100vh", background: `linear-gradient(160deg, ${C.bg} 0%, rgba(194,220,255,0.45) 100%)`,
      fontFamily: "'DM Sans', sans-serif", color: C.text,
      display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700;800&display=swap');
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      <div style={{
        display: "grid", gridTemplateColumns: "minmax(0, 1.1fr) minmax(320px, 420px)",
        gap: 56, maxWidth: 1040, width: "100%", alignItems: "center",
        animation: "fadeIn 0.5s ease",
      }}>
        {/* Pitch */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, background: C.plum,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, boxShadow: "0 4px 14px rgba(61,0,48,0.25)",
            }}>⚡</div>
            <span style={{ fontSize: 30, fontWeight: 800, fontFamily: "'DM Serif Display', serif", letterSpacing: -1, color: C.plum }}>
              Castlot
            </span>
            <span style={{
              background: C.babyBlue, color: C.plum, fontSize: 10,
              padding: "3px 10px", borderRadius: 20, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase",
            }}>Beta · CMU</span>
          </div>

          <h1 style={{
            fontFamily: "'DM Serif Display', serif", fontSize: 44, lineHeight: 1.15,
            color: C.plum, margin: "0 0 16px", letterSpacing: -1,
          }}>
            Life gets confusing.<br />Castlot clears it up.
          </h1>
          <p style={{ fontSize: 16, color: C.textMid, lineHeight: 1.7, margin: "0 0 36px", maxWidth: 460 }}>
            A social prediction market for your real life. Narrate a dilemma,
            let the campus crowd trade probability on what you'll actually do,
            and find out who around you is genuinely calibrated.
          </p>

          {STEPS.map((s, i) => (
            <div key={s.title} style={{ display: "flex", gap: 16, marginBottom: 20, alignItems: "flex-start" }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                background: i === 0 ? C.plum : "rgba(61,0,48,0.06)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
              }}>{s.icon}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: C.plum, marginBottom: 2 }}>{s.title}</div>
                <div style={{ fontSize: 13, color: C.textMid, lineHeight: 1.6, maxWidth: 420 }}>{s.text}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Auth card */}
        <div style={{
          background: C.white, borderRadius: 24, padding: 32,
          border: `1px solid ${C.cardBorder}`, boxShadow: "0 20px 60px rgba(61,0,48,0.15)",
        }}>
          {existingUser ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>👋</div>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: C.plum, marginBottom: 4 }}>
                Welcome back
              </div>
              <div style={{ fontSize: 14, color: C.textMid, marginBottom: 24 }}>
                Signed in as <span style={{ fontWeight: 700, color: C.plum }}>{existingUser}</span>
              </div>
              <button onClick={onEnter} style={{
                width: "100%", padding: "14px 0", background: C.plum, border: "none",
                borderRadius: 12, color: C.white, fontWeight: 800, fontSize: 15,
                cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                boxShadow: "0 4px 20px rgba(61,0,48,0.3)", marginBottom: 14,
              }}>Enter Castlot →</button>
              <button onClick={onSwitch} style={{
                background: "none", border: "none", color: C.textSoft, fontWeight: 600,
                cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif",
                textDecoration: "underline", padding: 0,
              }}>Not you? Sign out</button>
            </div>
          ) : (
          <>
          <div style={{ display: "flex", gap: 6, marginBottom: 24, background: "rgba(61,0,48,0.05)", borderRadius: 12, padding: 4 }}>
            {[["signup", "Create account"], ["login", "Log in"]].map(([m, label]) => (
              <button key={m} onClick={() => { setMode(m); setError(""); }} style={{
                flex: 1, padding: "10px 0", borderRadius: 9, border: "none",
                background: mode === m ? C.white : "transparent",
                color: mode === m ? C.plum : C.textSoft,
                fontWeight: 700, fontSize: 13, cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                boxShadow: mode === m ? "0 2px 8px rgba(61,0,48,0.12)" : "none",
                transition: "all 0.2s",
              }}>{label}</button>
            ))}
          </div>

          {mode === "signup" && (
            <input value={username} onChange={e => setUsername(e.target.value)}
              placeholder="Username (what the crowd sees)" style={input} autoComplete="username" />
          )}
          <input value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Email" type="email" style={input} autoComplete="email" />
          <input value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && submit()}
            placeholder={mode === "signup" ? "Password (6+ characters)" : "Password"}
            type="password" style={input}
            autoComplete={mode === "signup" ? "new-password" : "current-password"} />

          {error && <div style={{ color: C.no, fontSize: 13, marginBottom: 12, lineHeight: 1.5 }}>{error}</div>}

          <button onClick={submit} disabled={busy} style={{
            width: "100%", padding: "14px 0", background: C.plum, border: "none",
            borderRadius: 12, color: C.white, fontWeight: 800, fontSize: 15,
            cursor: busy ? "wait" : "pointer", fontFamily: "'DM Sans', sans-serif",
            boxShadow: "0 4px 20px rgba(61,0,48,0.3)", opacity: busy ? 0.7 : 1,
            marginBottom: 14,
          }}>
            {busy ? "One sec..." : mode === "signup" ? "Start forecasting → 1,000 FP" : "Log in"}
          </button>

          <div style={{ textAlign: "center", fontSize: 13, color: C.textSoft }}>
            or{" "}
            <button onClick={onGuest} style={{
              background: "none", border: "none", color: C.babyBlueDark, fontWeight: 700,
              cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif",
              textDecoration: "underline", padding: 0,
            }}>continue as guest</button>
          </div>

          <div style={{ fontSize: 11, color: C.textSoft, marginTop: 18, lineHeight: 1.6, textAlign: "center" }}>
            New accounts get 1,000 Foresight Points. Markets are anonymous —
            your username only ever shows on the leaderboard.
          </div>
          </>
          )}
        </div>
      </div>
    </div>
  );
}
