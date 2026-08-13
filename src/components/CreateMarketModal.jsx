import { useState, useEffect, useRef } from "react";
import { C } from "../theme.js";
import { CATEGORIES } from "../mockData.js";

// ─── Create Market Modal ──────────────────────────────────────────────────────
// Voice → server-side Whisper transcription → Claude extraction with a strict
// schema. Underspecified dilemmas are rejected with actionable reasons instead
// of becoming unresolvable markets.

async function blobToBase64(blob) {
  const buf = await blob.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export default function CreateMarketModal({ onClose, onCreate, userFP }) {
  const [step, setStep] = useState(1);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [processing, setProcessing] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [category, setCategory] = useState("career");
  const [resolutionDate, setResolutionDate] = useState("");
  const [error, setError] = useState("");
  const [rejectionReasons, setRejectionReasons] = useState([]);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const startRecording = async () => {
    setError("");
    setRejectionReasons([]);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "";
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        const blob = new Blob(audioChunksRef.current, { type: mimeType || "audio/webm" });
        if (blob.size < 1000) return; // nothing recorded
        setTranscribing(true);
        try {
          const r = await fetch("/api/transcribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ audio: await blobToBase64(blob), mimeType: blob.type }),
          });
          const data = await r.json();
          if (!r.ok) throw new Error(data.error || "Transcription failed.");
          setTranscript(prev => (prev ? prev + " " : "") + data.text);
        } catch (e) {
          setError(e.message || "Transcription failed. Please type your dilemma instead.");
        } finally {
          setTranscribing(false);
        }
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setRecording(true);
    } catch (err) {
      setError("Microphone access denied. Please enable microphone permissions or type instead.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  };

  const toggleRecording = () => (recording ? stopRecording() : startRecording());

  const processWithAI = async () => {
    if (!transcript.trim()) { setError("Please describe your situation first."); return; }
    setProcessing(true); setError(""); setRejectionReasons([]);
    try {
      const r = await fetch("/api/generate-market", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "AI processing failed.");

      if (!data.accepted) {
        setRejectionReasons(data.rejection_reasons || ["This isn't specific enough to become a market yet."]);
        return;
      }

      setAiResult(data.market);
      setCategory(data.market.suggestedCategory || "career");
      if (data.market.suggestedResolutionDate) {
        setResolutionDate(data.market.suggestedResolutionDate);
      }
      setStep(3);
    } catch (e) {
      setError(e.message || "AI processing failed. Please try again.");
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
            {step === 3 && "Review Your Market"}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.textSoft, cursor: "pointer", fontSize: 20 }}>✕</button>
        </div>

        {/* Step indicators */}
        <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{
              flex: 1, height: 3, borderRadius: 2,
              background: s <= (processing ? 2 : step) ? C.plum : "rgba(61,0,48,0.1)",
              transition: "background 0.3s"
            }} />
          ))}
        </div>

        {step === 1 && !processing && (
          <div>
            <p style={{ color: C.textSoft, fontSize: 14, marginBottom: 20, lineHeight: 1.7 }}>
              Describe your situation in your own words. Talk about a real decision you're facing — our AI will turn it into an anonymous prediction market. Include <b>what would count as YES</b> and <b>when it'll be decided by</b>.
            </p>
            <textarea
              value={transcript}
              onChange={e => setTranscript(e.target.value)}
              placeholder="So I'm trying to decide whether to... I'll know by..."
              style={{
                width: "100%", minHeight: 160, background: "rgba(61,0,48,0.03)",
                border: `1px solid rgba(61,0,48,0.12)`, borderRadius: 14, padding: 16,
                color: C.text, fontSize: 14, lineHeight: 1.7, outline: "none", resize: "vertical",
                fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box"
              }}
            />

            <div style={{ textAlign: "center", margin: "16px 0" }}>
              <div style={{ color: C.textSoft, fontSize: 12, marginBottom: 8 }}>— or —</div>
              <button onClick={toggleRecording} disabled={transcribing} style={{
                width: 64, height: 64, borderRadius: "50%", border: "none",
                background: recording ? C.no : C.babyBlue,
                cursor: transcribing ? "wait" : "pointer", fontSize: 24,
                boxShadow: recording ? "0 0 24px rgba(192,57,43,0.35)" : "0 4px 16px rgba(194,220,255,0.7)",
                transition: "all 0.3s", animation: recording ? "pulse 1.5s infinite" : "none"
              }}>🎙️</button>
              <div style={{ fontSize: 12, color: C.textSoft, marginTop: 8 }}>
                {recording ? "Recording... (tap to stop)"
                  : transcribing ? "Transcribing your narration..."
                  : "Tap to voice record"}
              </div>
            </div>

            {rejectionReasons.length > 0 && (
              <div style={{
                background: "rgba(192,57,43,0.06)", border: "1px solid rgba(192,57,43,0.25)",
                borderRadius: 12, padding: "14px 16px", marginBottom: 14
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.no, marginBottom: 6 }}>
                  Not quite a market yet — add some detail:
                </div>
                {rejectionReasons.map((reason, i) => (
                  <div key={i} style={{ fontSize: 13, color: C.textMid, lineHeight: 1.6 }}>• {reason}</div>
                ))}
              </div>
            )}
            {error && <div style={{ color: C.no, fontSize: 13, marginBottom: 12 }}>{error}</div>}

            <button onClick={processWithAI} disabled={transcribing} style={{
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
            <div style={{ color: C.textSoft, fontSize: 13, marginTop: 8 }}>Checking it has real resolution criteria and a timeframe</div>
          </div>
        )}

        {step === 3 && aiResult && !processing && (
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
