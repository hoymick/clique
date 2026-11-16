// Minimal Node port of the MIT-licensed Ellipsis devnet proof-of-work faucet CLI.
// Only generated devnet keys are used. Source: github.com/jarry-xiao/proof-of-work-faucet
const {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
} = require("@solana/web3.js");
const { createHash } = require("node:crypto");
const fs = require("node:fs");
const keyPath = process.argv[2];
if (!keyPath) throw new Error("Pass an explicit test-only key path.");
async function main() {
  const conn = new Connection("https://api.devnet.solana.com", {
    commitment: "confirmed",
    disableRetryOnRateLimit: true,
  });
  const { installHttpConfirmation } = await import("../src/confirmation.mjs");
  installHttpConfirmation(conn);
  const payer = fs.existsSync(keyPath)
    ? Keypair.fromSecretKey(
        Uint8Array.from(JSON.parse(fs.readFileSync(keyPath))),
      )
    : Keypair.generate();
  if (!fs.existsSync(keyPath))
    fs.writeFileSync(keyPath, JSON.stringify([...payer.secretKey]), {
      mode: 0o600,
    });
  const pid = new PublicKey("PoWSNH2hEZogtCg1Zgm51FnkmJperzYDgPK4fvs8taL");
  const specs = await conn.getProgramAccounts(pid, {
    filters: [{ dataSize: 17 }],
  });
  const candidates = [];
  for (const x of specs) {
    const d = x.account.data[8],
      amount = Number(x.account.data.readBigUInt64LE(9));
    if (d < 1 || d > 3 || amount < 20000000 || amount > 500000000) continue;
    const [source] = PublicKey.findProgramAddressSync(
      [Buffer.from("source"), x.pubkey.toBuffer()],
      pid,
    );
    const balance = await conn.getBalance(source);
    if (balance >= amount)
      candidates.push({ spec: x.pubkey, source, d, amount });
  }
  console.log(
    "Eligible devnet PoW faucets:",
    candidates.map((c) => ({ difficulty: c.d, reward: c.amount / 1e9 })),
  );
  candidates.sort((a, b) => a.d - b.d || a.amount - b.amount);
  if (!candidates.length)
    throw new Error("No funded difficulty-3 faucet is available.");
  const target = 80000000;
  let total = await conn.getBalance(payer.publicKey);
  let rounds = 0;
  while (total < target && rounds < 5) {
    const c = candidates[0];
    let mined;
    let count = 0;
    const deadline = Date.now() + 180000;
    while (Date.now() < deadline) {
      const kp = Keypair.generate();
      count++;
      if (kp.publicKey.toBase58().startsWith("A".repeat(c.d))) {
        mined = kp;
        break;
      }
      if (count % 2000 === 0) await new Promise((r) => setImmediate(r));
    }
    if (!mined)
      throw new Error("Proof-of-work search reached its time budget.");
    const [receipt] = PublicKey.findProgramAddressSync(
      [Buffer.from("receipt"), mined.publicKey.toBuffer(), Buffer.from([c.d])],
      pid,
    );
    const disc = createHash("sha256")
      .update("global:airdrop")
      .digest()
      .subarray(0, 8);
    const ix = new TransactionInstruction({
      programId: pid,
      keys: [
        { pubkey: payer.publicKey, isSigner: true, isWritable: true },
        { pubkey: mined.publicKey, isSigner: true, isWritable: false },
        { pubkey: receipt, isSigner: false, isWritable: true },
        { pubkey: c.spec, isSigner: false, isWritable: false },
        { pubkey: c.source, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: disc,
    });
    const latest = await conn.getLatestBlockhash();
    const tx = new Transaction({ feePayer: payer.publicKey, ...latest }).add(
      ix,
    );
    tx.sign(payer, mined);
    const sig = await conn.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
    });
    const r = await conn.confirmTransaction(
      { ...latest, signature: sig },
      "confirmed",
    );
    if (r.value.err) throw new Error(JSON.stringify(r.value.err));
    total = await conn.getBalance(payer.publicKey);
    rounds++;
    console.log(
      "PoW devnet reward confirmed:",
      sig,
      "; test SOL balance:",
      total / 1e9,
    );
  }
  if (total < target)
    throw new Error("Not enough devnet SOL for the full test.");
  console.log("Test wallet funded:", payer.publicKey.toBase58());
}
main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
