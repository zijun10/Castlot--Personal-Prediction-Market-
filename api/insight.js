// AI analyst commentary for a market, served from behind the API-key boundary.
// (The old client-side call to the Anthropic API could never work — no key —
// and would have exposed it if it had one.)

import Anthropic from "@anthropic-ai/sdk";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(501).json({ error: "AI analysis is not configured yet." });
  }

  const { title, yesPct, category, daysLeft } = req.body ?? {};
  if (!title) return res.status(400).json({ error: "title is required" });

  const anthropic = new Anthropic();
  const response = await anthropic.beta.messages.create({
    model: "claude-opus-5",
    max_tokens: 1024,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low" },
    messages: [{
      role: "user",
      content: `You are a prediction market analyst for Castlot, a college student forecasting app.

Market: "${title}"
Current crowd probability: ${Math.round(yesPct)}% YES
Category: ${category}
Days until resolution: ${daysLeft}

In 2-3 sentences, give a sharp, specific analysis of what's likely driving this probability and what information would most change it. Be direct and analytical, not generic. Speak like a sharp trader, not a therapist.`,
    }],
  });

  if (response.stop_reason === "refusal") {
    return res.status(200).json({ insight: "Market analysis unavailable for this one. Use base rates and available evidence to calibrate your position." });
  }

  const text = response.content.find(b => b.type === "text")?.text ?? "";
  return res.status(200).json({ insight: text });
}
