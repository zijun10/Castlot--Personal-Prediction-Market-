import { createClient } from "@supabase/supabase-js";
import { INITIAL_MARKETS } from "./mockData.js";

// ─── Supabase client ──────────────────────────────────────────────────────────
// Null when env vars are absent — the app then runs in local demo mode with
// mock data and client-side pricing (no real currency at stake).

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && anonKey ? createClient(url, anonKey) : null;

// Anonymous auth: every visitor gets a real auth.users row (and the 1000 FP
// signup grant) without an account. Requires "anonymous sign-ins" enabled in
// the Supabase dashboard.
export async function ensureSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) return session;
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return data.session;
}

// ─── Reads ────────────────────────────────────────────────────────────────────

const mockById = Object.fromEntries(INITIAL_MARKETS.map(m => [m.id, m]));

function rowToMarket(row) {
  const mock = mockById[row.id];
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    qYes: row.q_yes,
    qNo: row.q_no,
    traders: row.traders,
    resolution: row.resolution_date,
    status: row.status,
    resolved: row.outcome,
    audioSummary: row.audio_summary ?? mock?.audioSummary ?? "",
    transcript: Array.isArray(row.transcript) && row.transcript.length ? row.transcript : mock?.transcript ?? [],
    tags: Array.isArray(row.tags) && row.tags.length ? row.tags : mock?.tags ?? [],
    creator: row.creator_alias,
    creatorId: row.creator_id,
    // Comments are still client-side mock data (server comments are a later phase).
    comments: mock?.comments ?? [],
    userVote: null,
    verified: false,
  };
}

export async function fetchMarkets() {
  const { data, error } = await supabase
    .from("markets")
    .select("*")
    .order("created_at", { ascending: false })
    .order("id", { ascending: true });
  if (error) throw error;
  return data.map(rowToMarket);
}

export async function fetchBalance() {
  const { data, error } = await supabase.rpc("fp_balance");
  if (error) throw error;
  return data;
}

export async function fetchUserVotes() {
  const { data, error } = await supabase.from("positions").select("*");
  if (error) throw error;
  const votes = {};
  for (const p of data) {
    votes[p.market_id] = p.yes_shares >= p.no_shares ? "yes" : "no";
  }
  return votes;
}

// ─── Writes ───────────────────────────────────────────────────────────────────

export async function executeTrade(marketId, side, shares) {
  const { data, error } = await supabase.rpc("execute_trade", {
    p_market_id: marketId,
    p_side: side,
    p_shares: shares,
  });
  if (error) throw error;
  return data;
}

export async function createMarket({ title, category, resolution, audioSummary, transcript, tags }) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("markets")
    .insert({
      title,
      category,
      resolution_date: resolution,
      audio_summary: audioSummary,
      transcript: transcript ?? [],
      tags: tags ?? [],
      creator_id: user.id,
      creator_alias: "anon_you",
    })
    .select()
    .single();
  if (error) throw error;
  return rowToMarket(data);
}
