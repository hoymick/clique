export function vaultState(m, now = Date.now()) {
  if (m.launched) return now >= m.marketEnd ? "ended" : "live";
  if (now < m.commitEnd) return "funding";
  if (m.yes + m.no < m.target || now + 300_000 >= m.marketEnd)
    return "refundable";
  return "ready";
}
export function progress(m) {
  return Math.min(100, Math.max(0, ((m.yes + m.no) / m.target) * 100));
}
export function validAmount(value, balance = Infinity) {
  const n = Number(value);
  return (
    /^\d+(\.\d{1,6})?$/.test(String(value)) &&
    Number.isFinite(n) &&
    n >= 1 &&
    n <= balance
  );
}
export function proposedShare(m, amount) {
  return (amount / (m.yes + m.no + amount)) * 100;
}
export function validateQuestion(s) {
  return (
    s.trim().length >= 10 &&
    new TextEncoder().encode("CLQ: " + s.trim()).length <= 64
  );
}
export function demoCommit(m, owner, side, amount, now = Date.now()) {
  if (vaultState(m, now) !== "funding")
    throw new Error("The funding window has closed.");
  if (!validAmount(amount))
    throw new Error("Commit at least 1 USDC, with up to 6 decimal places.");
  if (!["yes", "no"].includes(side)) throw new Error("Choose YES or NO.");
  const positions = { ...(m.positions || {}) };
  const position = positions[owner] || { yes: 0, no: 0, claimed: false };
  if (position.claimed)
    throw new Error("This position has already been claimed.");
  positions[owner] = { ...position, [side]: position[side] + amount };
  return { ...m, [side]: m[side] + amount, backers: m.backers + 1, positions };
}
export function demoRefund(m, owner, now = Date.now()) {
  if (vaultState(m, now) !== "refundable")
    throw new Error("Refunds are not available for this vault.");
  const p = m.positions?.[owner];
  if (!p || p.claimed || p.yes + p.no <= 0)
    throw new Error("No refundable commitment.");
  // Protocol vault totals record historic commitments. Position is marked claimed.
  return {
    ...m,
    positions: { ...m.positions, [owner]: { ...p, claimed: true } },
  };
}
