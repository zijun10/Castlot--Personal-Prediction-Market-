// ─── LMSR Market Engine ───────────────────────────────────────────────────────
export const LMSR_B = 80;

export function lmsrCost(qYes, qNo) {
  return LMSR_B * Math.log(Math.exp(qYes / LMSR_B) + Math.exp(qNo / LMSR_B));
}

export function lmsrPrice(qYes, qNo, side) {
  const expY = Math.exp(qYes / LMSR_B);
  const expN = Math.exp(qNo / LMSR_B);
  return side === "yes" ? expY / (expY + expN) : expN / (expY + expN);
}
