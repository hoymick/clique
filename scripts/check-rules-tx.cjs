const {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  TransactionInstruction,
  ComputeBudgetProgram,
} = require("@solana/web3.js");
const { AnchorProvider, Wallet } = require("@anchor-lang/core");
const { PmAmmClient } = require("@pm-amm/sdk");
async function main() {
  const kp = Keypair.generate(),
    p = new AnchorProvider(
      new Connection("http://localhost:8899"),
      new Wallet(kp),
      {},
    );
  const c = PmAmmClient.fromProvider(
    p,
    new PublicKey("GV1FMGHRYBjQLaghE5fnGuYCuCcpdt3GD5xEX3TwN16y"),
    new PublicKey("3WQ8hCqTNwjrh8WzE2XyoZoUrd1miPcwWfMkmFPUMEWZ"),
  );
  const ix = await c.ix.initializeVault({
    authority: kp.publicKey,
    vaultId: 42,
    name: "CLQ: " + "a".repeat(59),
    commitDurationSecs: 60,
    marketDurationSecs: 300,
    minTotal: 1000000,
  });
  const memo = new TransactionInstruction({
    programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
    keys: [{ pubkey: kp.publicKey, isSigner: true, isWritable: false }],
    data: Buffer.alloc(450, 65),
  });
  const tx = new Transaction({
    feePayer: kp.publicKey,
    recentBlockhash: PublicKey.default.toBase58(),
  }).add(ComputeBudgetProgram.setComputeUnitLimit({ units: 250000 }), ix, memo);
  tx.sign(kp);
  const n = tx.serialize().length;
  if (n > 1232) throw Error("Rules exceed Solana transaction size: " + n);
  console.log(
    "Maximum question + rules transaction size:",
    n,
    "bytes (limit: 1232).",
  );
}
main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
