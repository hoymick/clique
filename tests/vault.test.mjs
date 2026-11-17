import { test } from "node:test";
import assert from "node:assert/strict";
import {
  vaultState,
  validAmount,
  progress,
  demoCommit,
  demoRefund,
  validateQuestion,
} from "../src/model.mjs";
const now = 1000000;
const vault = {
  yes: 60,
  no: 40,
  target: 100,
  commitEnd: now + 10000,
  marketEnd: now + 1000000,
  launched: false,
  backers: 2,
  positions: {},
};
test("a funded vault cannot launch before its funding deadline", () => {
  assert.equal(vaultState(vault, now), "funding");
  assert.equal(vaultState(vault, now + 10001), "ready");
});
test("underfunded vault refunds only after funding closes", () => {
  const v = { ...vault, target: 101 };
  assert.equal(vaultState(v, now), "funding");
  assert.equal(vaultState(v, now + 10001), "refundable");
});
test("launch window closes when fewer than 300 trading seconds remain", () => {
  assert.equal(
    vaultState({ ...vault, commitEnd: now - 1, marketEnd: now + 300000 }, now),
    "refundable",
  );
});
test("launched vault never becomes refundable through funding rules", () => {
  assert.equal(
    vaultState({ ...vault, launched: true, marketEnd: now - 1 }, now),
    "ended",
  );
});
test("amount precision, minimum, finite value and wallet balance are enforced", () => {
  for (const x of ["NaN", "Infinity", "-1", "0.9", "1.0000001", "1e2", ""])
    assert.equal(validAmount(x, 1000), false);
  assert.equal(validAmount("1.000001", 1000), true);
  assert.equal(validAmount("101", 100), false);
});
test("commit updates only the chosen side and the committer position", () => {
  const m = demoCommit(vault, "alice", "yes", 25, now);
  assert.equal(m.yes, 85);
  assert.equal(m.no, 40);
  assert.equal(m.positions.alice.yes, 25);
  assert.equal(vault.yes, 60);
  assert.equal(m.backers, 3);
  const repeated = demoCommit(m, "alice", "no", 10, now);
  assert.equal(repeated.backers, 3);
  assert.equal(repeated.positions.alice.no, 10);
  assert.throws(() => demoCommit(vault, "alice", "yes", 25, now + 11000));
});
test("refund cannot be replayed or claimed from a healthy vault", () => {
  const m = demoCommit({ ...vault, target: 1000 }, "alice", "no", 25, now);
  assert.throws(() => demoRefund(m, "alice", now));
  const r = demoRefund(m, "alice", now + 11000);
  assert.equal(r.positions.alice.claimed, true);
  assert.equal(r.yes, m.yes);
  assert.equal(r.no, m.no - 25);
  assert.equal(m.no, 65);
  assert.throws(() => demoRefund(r, "alice", now + 11000));
  assert.throws(() => demoRefund({ ...m, target: 100 }, "alice", now + 11000));
});
test("question limits account for UTF-8 bytes and protocol name prefix", () => {
  assert.equal(validateQuestion("Will SOL rise?"), true);
  assert.equal(validateQuestion("a".repeat(59)), true);
  assert.equal(validateQuestion("a".repeat(60)), false);
  assert.equal(validateQuestion("🌍".repeat(15)), false);
});
test("overfunding displays capped progress", () =>
  assert.equal(progress({ ...vault, yes: 400 }), 100));
