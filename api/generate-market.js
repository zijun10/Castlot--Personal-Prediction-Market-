// Turns a user's narration into a structured binary market — or rejects it.
// Runs server-side so the Anthropic key never ships to the browser, and so
// underspecified narrations ("idk should I text him") are refused instead of
// becoming markets with no resolution criteria.

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const CATEGORIES = ["career", "relationships", "habits", "academics", "purchases"];

const MARKET_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "accepted", "rejection_reasons", "market_question", "podcast_summary",
    "transcript", "tags", "suggested_category", "suggested_resolution_date",
  ],
  properties: {
    accepted: { type: "boolean" },
    rejection_reasons: {
      type: "array",
      items: { type: "string" },
      description: "Empty when accepted. When rejected: specific, user-fixable gaps.",
    },
    market_question: { type: "string", description: "Empty string when rejected." },
    podcast_summary: { type: "string" },
    transcript: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["time", "text"],
        properties: { time: { type: "string" }, text: { type: "string" } },
      },
    },
    tags: { type: "array", items: { type: "string" } },
    suggested_category: { type: "string", enum: CATEGORIES },
    suggested_resolution_date: {
      type: "string",
      description: "ISO date (YYYY-MM-DD) when inferable from the narration; empty string otherwise.",
    },
  },
};

const SYSTEM = `You convert a college student's narrated life dilemma into a binary prediction market for Castlot, and you are the quality gate.

ACCEPT only when all four hold:
1. The outcome is about the narrator's own life and within their observation ("Will I..."), not world events or other people's private choices.
2. It resolves to an unambiguous YES or NO — a neutral friend hearing the narration would agree on the outcome.
3. The narration contains or clearly implies verifiable resolution criteria (what counts as YES).
4. A resolution timeframe is stated or confidently inferable (a date, "by finals", "end of the month").

REJECT anything underspecified. "idk should I text him" has no resolution criteria and no date — reject it and say exactly what is missing. Do not invent criteria or dates the narrator never implied; a market built on invented criteria is worse than no market. Rejection reasons must be short, concrete, and actionable, phrased to the narrator ("Add when this will be decided by", "Say what would count as YES — sending the text? getting a reply?").

When accepting: market_question is a clean "Will I ...?" question; podcast_summary is 2-3 sentences, third person, no identifying details; transcript is 5-6 segments with plausible "M:SS" timestamps; tags are 3 lowercase single words. Today's date is provided in the user message — the suggested resolution date must be after it.`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(501).json({ error: "AI market generation is not configured yet." });
  }

  const transcript = (req.body?.transcript ?? "").trim();
  if (!transcript) return res.status(400).json({ error: "transcript is required" });
  if (transcript.length > 8000) return res.status(400).json({ error: "transcript too long" });

  const anthropic = new Anthropic();
  const today = new Date().toISOString().split("T")[0];

  const response = await anthropic.beta.messages.create({
    model: "claude-opus-5",
    max_tokens: 2048,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM,
    output_config: { format: { type: "json_schema", schema: MARKET_SCHEMA } },
    messages: [{
      role: "user",
      content: `Today's date: ${today}\n\nNarration:\n"""${transcript}"""`,
    }],
  });

  if (response.stop_reason === "refusal") {
    return res.status(200).json({
      accepted: false,
      rejection_reasons: ["This narration couldn't be processed. Try rephrasing it."],
    });
  }

  const result = JSON.parse(response.content.find(b => b.type === "text").text);

  // Server-side backstop: the model's acceptance still has to survive checks
  // the schema can't express.
  const problems = [];
  if (result.accepted) {
    if (!/^will i\b.*\?$/i.test(result.market_question.trim())) {
      problems.push("The question must be a binary “Will I ...?” about your own life.");
    }
    if (result.suggested_resolution_date &&
        !(new Date(result.suggested_resolution_date) > new Date(today))) {
      problems.push("The resolution date has to be in the future.");
    }
  }
  const accepted = result.accepted && problems.length === 0;
  const rejection_reasons = accepted ? [] : [...result.rejection_reasons, ...problems];

  // Metric: every attempt is logged so rejection rate is queryable
  // (select * from generation_stats).
  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY
    );
    await supabase.from("market_generation_log").insert({
      accepted,
      rejection_reasons,
      transcript_chars: transcript.length,
    });
  } catch (e) {
    console.error("generation log insert failed:", e);
  }

  if (!accepted) return res.status(200).json({ accepted: false, rejection_reasons });

  return res.status(200).json({
    accepted: true,
    market: {
      marketQuestion: result.market_question,
      podcastSummary: result.podcast_summary,
      transcript: result.transcript,
      tags: result.tags,
      suggestedCategory: result.suggested_category,
      suggestedResolutionDate: result.suggested_resolution_date || null,
    },
  });
}
