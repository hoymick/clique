import test from "node:test";
import assert from "node:assert/strict";
import { installHttpConfirmation } from "../src/confirmation.mjs";

for (const level of ["confirmed", "finalized"]) {
  test(`HTTP confirmation accepts ${level} status`, async () => {
    const connection = {
      getSignatureStatuses: async (signatures, options) => {
        assert.deepEqual(signatures, ["test-signature"]);
        assert.equal(options.searchTransactionHistory, true);
        return {
          context: { slot: 7 },
          value: [{ confirmationStatus: level, err: null }],
        };
      },
    };
    installHttpConfirmation(connection);
    assert.deepEqual(await connection.confirmTransaction("test-signature"), {
      context: { slot: 7 },
      value: { err: null },
    });
  });
}

test("HTTP confirmation preserves onchain failure instead of reporting success", async () => {
  const failure = { InstructionError: [0, { Custom: 6001 }] };
  const connection = {
    getSignatureStatuses: async () => ({
      context: { slot: 9 },
      value: [{ err: failure }],
    }),
  };
  installHttpConfirmation(connection);
  assert.deepEqual(
    (await connection.confirmTransaction("failed-signature")).value.err,
    failure,
  );
});

test("expired transactions retain the receipt needed to check before retrying", async () => {
  const connection = {
    getSignatureStatuses: async () => ({ context: { slot: 8 }, value: [null] }),
    getBlockHeight: async () => 101,
  };
  installHttpConfirmation(connection);
  await assert.rejects(
    connection.confirmTransaction({
      signature: "expired-receipt",
      lastValidBlockHeight: 100,
    }),
    /Transaction expired.*expired-receipt/,
  );
});

test("confirmation timeout preserves its signature and does not pretend to fail onchain", async () => {
  const connection = {
    getSignatureStatuses: async () => {
      throw new Error("Should not poll after deadline");
    },
  };
  installHttpConfirmation(connection, 0);
  await assert.rejects(
    connection.confirmTransaction("pending-receipt"),
    /may still confirm.*pending-receipt/,
  );
});
