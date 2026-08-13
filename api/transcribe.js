// Server-side ASR: Whisper via the OpenAI API. Replaces the Chrome-only Web
// Speech API. The client sends base64 audio (webm/ogg/mp4 from MediaRecorder);
// we return the transcript text.

export const config = { api: { bodyParser: { sizeLimit: "8mb" } } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  if (!process.env.OPENAI_API_KEY) {
    return res.status(501).json({ error: "Transcription is not configured yet. Please type your dilemma instead." });
  }

  const { audio, mimeType } = req.body ?? {};
  if (!audio) return res.status(400).json({ error: "audio (base64) is required" });

  const bytes = Buffer.from(audio, "base64");
  if (bytes.length > 25 * 1024 * 1024) {
    return res.status(400).json({ error: "audio too large (25MB max)" });
  }

  const type = mimeType || "audio/webm";
  const ext = type.includes("mp4") ? "mp4" : type.includes("ogg") ? "ogg" : "webm";
  const form = new FormData();
  form.append("file", new Blob([bytes], { type }), `narration.${ext}`);
  form.append("model", "whisper-1");
  form.append("language", "en");

  const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: form,
  });

  if (!r.ok) {
    const detail = await r.text();
    console.error("whisper error:", r.status, detail.slice(0, 300));
    return res.status(502).json({ error: "Transcription failed. Try again or type instead." });
  }

  const data = await r.json();
  return res.status(200).json({ text: (data.text ?? "").trim() });
}
