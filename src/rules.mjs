export const RULES_PREFIX = "CLIQUE_RULES_V1:";
export function validateRules(r) {
  if (
    !r ||
    typeof r.source !== "string" ||
    typeof r.yes !== "string" ||
    typeof r.no !== "string"
  )
    return false;
  try {
    const u = new URL(r.source);
    if (u.protocol !== "https:" || u.username || u.password) return false;
  } catch {
    return false;
  }
  if (r.yes.trim().length < 15 || r.no.trim().length < 15) return false;
  return (
    new TextEncoder().encode(
      RULES_PREFIX +
        JSON.stringify({
          v: 1,
          source: r.source.trim(),
          yes: r.yes.trim(),
          no: r.no.trim(),
        }),
    ).length <= 450
  );
}
export function encodeRules(r) {
  if (!validateRules(r))
    throw new Error(
      "Add an HTTPS source and specific YES / NO rules. Keep the combined rules within 450 bytes.",
    );
  return (
    RULES_PREFIX +
    JSON.stringify({
      v: 1,
      source: r.source.trim(),
      yes: r.yes.trim(),
      no: r.no.trim(),
    })
  );
}
export function decodeRules(memo) {
  if (typeof memo !== "string" || !memo.startsWith(RULES_PREFIX)) return null;
  try {
    const r = JSON.parse(memo.slice(RULES_PREFIX.length));
    return r.v === 1 && validateRules(r)
      ? { source: r.source, yes: r.yes, no: r.no }
      : null;
  } catch {
    return null;
  }
}
