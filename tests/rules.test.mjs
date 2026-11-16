import { test } from "node:test";
import assert from "node:assert/strict";
import { validateRules, encodeRules, decodeRules } from "../src/rules.mjs";
const rules = {
  source: "https://solana.com/",
  yes: "YES if the official site announces the event by 18:00 UTC.",
  no: "NO otherwise, including no published result by the deadline.",
};
test("rules round-trip without a mutable remote metadata dependency", () =>
  assert.deepEqual(decodeRules(encodeRules(rules)), rules));
test("non-HTTPS, credential-bearing and malformed sources are rejected", () => {
  for (const source of [
    "http://example.com",
    "javascript:alert(1)",
    "https://name:secret@example.com",
    "not a URL",
  ])
    assert.equal(validateRules({ ...rules, source }), false);
});
test("empty or ambiguous short rules and oversize memos are rejected", () => {
  assert.equal(validateRules({ ...rules, yes: "yes" }), false);
  assert.equal(validateRules({ ...rules, no: "x".repeat(500) }), false);
  assert.throws(() => encodeRules({ ...rules, source: "" }));
});
test("unrelated and unsupported memos cannot be mistaken for Clique rules", () => {
  assert.equal(decodeRules("hello"), null);
  assert.equal(decodeRules('CLIQUE_RULES_V1:{"v":2}'), null);
  assert.equal(decodeRules("CLIQUE_RULES_V1:{"), null);
});
