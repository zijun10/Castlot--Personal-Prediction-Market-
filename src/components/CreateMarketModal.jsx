import { useState, useEffect, useRef, useCallback } from "react";
import { C } from "../theme.js";
import { CATEGORIES } from "../mockData.js";

// ─── Create Market Modal ──────────────────────────────────────────────────────
export default function CreateMarketModal({ onClose, onCreate, userFP }) {
  const [step, setStep] = useState(1);
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [processing, setProcessing] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [category, setCategory] = useState("career");
  const [resolutionDate, setResolutionDate] = useState("");
  const [error, setError] = useState("");
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingRef = useRef(false);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Already stopped
      }
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    recordingRef.current = false;
    setRecording(false);
  }, []);

  // Sync recordingRef with recording state
  useEffect(() => {
    recordingRef.current = recording;
  }, [recording]);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              interimTranscript += transcript;
            }
          }

          // Only add final transcripts to the main transcript, show interim separately
          if (finalTranscript) {
            setTranscript(prev => prev + finalTranscript);
          }
          // Interim results are shown in real-time but not saved until final
        };

        recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          if (event.error === 'no-speech') {
            // Don't show error for no-speech, just continue
            return;
          } else if (event.error === 'not-allowed') {
            setError('Microphone permission denied. Please enable microphone access.');
            stopRecording();
          } else if (event.error !== 'aborted') {
            setError('Speech recognition error. Please try typing instead.');
            stopRecording();
          }
        };

        recognition.onend = () => {
          if (recordingRef.current) {
            // Restart recognition if still recording
            try {
              recognition.start();
            } catch (e) {
              // Already started or error
            }
          }
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Already stopped
        }
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, [stopRecording]);

  const startRecording = async () => {
    setError('');
    
    // Check for Speech Recognition API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition && recognitionRef.current) {
      try {
        // Clear transcript if starting fresh (optional - comment out if you want to append)
        // setTranscript('');
        recognitionRef.current.start();
        recordingRef.current = true;
        setRecording(true);
      } catch (e) {
        setError('Could not start recording. Please check microphone permissions.');
      }
    } else {
      // Fallback: Use MediaRecorder and show message
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          stream.getTracks().forEach(track => track.stop());
          // Note: Without speech recognition, we can't convert to text automatically
          setError('Speech recognition not available in this browser. Please type your text instead.');
        };

        mediaRecorder.start();
        mediaRecorderRef.current = mediaRecorder;
        recordingRef.current = true;
        setRecording(true);
        setError('Recording audio (speech-to-text not available - please type your text)');
      } catch (err) {
        setError('Microphone access denied. Please enable microphone permissions and try again.');
      }
    }
  };

  const toggleRecording = () => {
    if (recording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

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
              <button onClick={toggleRecording} style={{
                width: 64, height: 64, borderRadius: "50%", border: "none",
                background: recording ? C.no : C.babyBlue,
                cursor: "pointer", fontSize: 24,
                boxShadow: recording ? "0 0 24px rgba(192,57,43,0.35)" : "0 4px 16px rgba(194,220,255,0.7)",
                transition: "all 0.3s", animation: recording ? "pulse 1.5s infinite" : "none"
              }}>🎙️</button>
              <div style={{ fontSize: 12, color: C.textSoft, marginTop: 8 }}>
                {recording ? "Recording... (tap to stop)" : "Tap to voice record"}
              </div>
              {recording && transcript && (
                <div style={{ fontSize: 11, color: C.plum, marginTop: 4, fontStyle: "italic" }}>
                  Live transcription active...
                </div>
              )}
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
