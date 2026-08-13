// ─── Brier Score ──────────────────────────────────────────────────────────────
export function calcBrierScore(predictions) {
  if (!predictions.length) return null;
  const sum = predictions.reduce((acc, p) => {
    const outcome = p.resolved ? 1 : 0;
    return acc + Math.pow(p.probability - outcome, 2);
  }, 0);
  return (sum / predictions.length).toFixed(3);
}

export function brierLabel(score) {
  if (score === null) return { label: "No data", color: "#C490B0" };
  const s = parseFloat(score);
  if (s < 0.1) return { label: "Oracle", color: "#3D0030" };
  if (s < 0.15) return { label: "Expert", color: "#6B0050" };
  if (s < 0.2) return { label: "Analyst", color: "#9B1070" };
  return { label: "Novice", color: "#C490B0" };
}
