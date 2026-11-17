// Test-only integration exercise. Ephemeral generated keys never leave this process.
const {
  Connection,
  Keypair,
  PublicKey,
  TransactionInstruction,
  ComputeBudgetProgram,
} = require("@solana/web3.js");
const { AnchorProvider, Wallet } = require("@anchor-lang/core");
const { PmAmmClient } = require("@pm-amm/sdk");
const { getAssociatedTokenAddressSync } = require("@solana/spl-token");
const fs = require("node:fs");
async function main() {
  const keyPath = process.argv[2];
  const kp = keyPath
    ? Keypair.fromSecretKey(
        Uint8Array.from(JSON.parse(fs.readFileSync(keyPath))),
      )
    : Keypair.generate();
  const conn = new Connection("https://api.devnet.solana.com", {
    commitment: "confirmed",
    disableRetryOnRateLimit: true,
    fetch: (url, options) =>
      fetch(url, { ...options, signal: AbortSignal.timeout(20000) }),
  });
  const { installHttpConfirmation } = await import("../src/confirmation.mjs");
  installHttpConfirmation(conn);
  const client = PmAmmClient.fromProvider(
    new AnchorProvider(conn, new Wallet(kp), { commitment: "confirmed" }),
    new PublicKey("GV1FMGHRYBjQLaghE5fnGuYCuCcpdt3GD5xEX3TwN16y"),
    new PublicKey("3WQ8hCqTNwjrh8WzE2XyoZoUrd1miPcwWfMkmFPUMEWZ"),
  );
  console.log("Checking devnet RPC");
  await conn.getLatestBlockhash();
  console.log("Test wallet:", kp.publicKey.toBase58());
  const tokenAddress = getAssociatedTokenAddressSync(
    client.collateralMint,
    kp.publicKey,
  );
  const tokenAccount = await conn.getAccountInfo(tokenAddress);
  const existingUsdc = tokenAccount
    ? Number((await conn.getTokenAccountBalance(tokenAddress)).value.amount) /
      1e6
    : 0;
  // Builder funding is needed to create and launch markets. Player drips are
  // deliberately smaller and cannot cover this complete lifecycle.
  if (existingUsdc < 60) {
    console.log("Requesting builder test funds");
    const fr = await fetch("https://pm-amm-devnet.vercel.app/api/faucet", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ wallet: kp.publicKey.toBase58() }),
      signal: AbortSignal.timeout(30000),
    });
    const f = await fr.json();
    if (!fr.ok || !f.ok) throw new Error(f.error || "Faucet unavailable");
    const confirmation = await conn.confirmTransaction(
      f.signature,
      "confirmed",
    );
    if (confirmation.value.err)
      throw new Error(
        "Faucet transaction failed: " + JSON.stringify(confirmation.value.err),
      );
    console.log(
      "Faucet reported test SOL:",
      f.sol,
      "; balance:",
      await conn.getBalance(kp.publicKey),
    );
  } else console.log("Using existing test mUSDC; no repeat faucet request.");
  const lamports = await conn.getBalance(kp.publicKey);
  fs.writeFileSync("DEVNET-FUNDING-STATUS.json", JSON.stringify({
    network: "solana-devnet",
    checkedAt: new Date().toISOString(),
    wallet: kp.publicKey.toBase58(),
    lamports,
    sol: lamports / 1e9,
    persistentSigner: !!keyPath,
  }, null, 2) + "\n");
  if (lamports < 60000000)
    throw new Error(
      "Fund the test wallet with at least 0.06 devnet SOL before running the complete flow: " +
        kp.publicKey.toBase58(),
    );
  const { encodeRules } = await import("../src/rules.mjs");
  async function createVault(input) {
    const vaultId = Keypair.generate().publicKey.toBuffer().readUIntLE(0, 6);
    const ix = await client.ix.initializeVault({
      authority: kp.publicKey,
      vaultId,
      name: input.name,
      commitDurationSecs: input.commitDurationSecs,
      marketDurationSecs: input.marketDurationSecs,
      minTotal: Math.round(input.minTotalUsdc * 1e6),
    });
    const memo = new TransactionInstruction({
      programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
      keys: [{ pubkey: kp.publicKey, isSigner: true, isWritable: false }],
      data: Buffer.from(
        encodeRules({
          source: "https://github.com/hoymick/clique",
          yes: "YES if the documented devnet integration checks pass by the trading deadline.",
          no: "NO otherwise, including no public verification receipt by the deadline.",
        }),
      ),
    });
    const signature = await client.sendIxs([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 250000 }),
      ix,
      memo,
    ]);
    return {
      vaultId,
      vaultPda: client.vaultPda(vaultId).toBase58(),
      signature,
    };
  }
  console.log("Creating funded and underfunded test vaults");
  const funded = await createVault({
    name: "CLQ: Will this test market launch?",
    commitDurationSecs: 60,
    marketDurationSecs: 3600,
    minTotalUsdc: 50,
  });
  const failed = await createVault({
    name: "CLQ: Will this test vault be refunded?",
    commitDurationSecs: 60,
    marketDurationSecs: 3600,
    minTotalUsdc: 100,
  });
  const commits = [];
  commits.push(
    await client.send.vaultCommit(new PublicKey(funded.vaultPda), "yes", 25),
  );
  commits.push(
    await client.send.vaultCommit(new PublicKey(funded.vaultPda), "no", 25),
  );
  commits.push(
    await client.send.vaultCommit(new PublicKey(failed.vaultPda), "yes", 10),
  );
  const account = await client.fetchVault(new PublicKey(failed.vaultPda));
  const wait = Math.max(
    0,
    account.commitEndTs.toNumber() * 1000 - Date.now() + 2000,
  );
  console.log("Committed. Waiting for protocol funding deadline.");
  for (let left = wait; left > 0; left -= 30000)
    await new Promise((r) => setTimeout(r, Math.min(30000, left)));
  const launched = await client.send.launchVaultMarket(
    new PublicKey(funded.vaultPda),
  );
  console.log("Launch confirmed");
  const claim = await client.send.claimCommitter(
    new PublicKey(funded.vaultPda),
    new PublicKey(launched.marketPda),
  );
  console.log("LP claim confirmed");
  const refund = await client.send.refundCommit(new PublicKey(failed.vaultPda));
  console.log("Refund confirmed");
  const position = await client.fetchCommitPosition(
    new PublicKey(funded.vaultPda),
    kp.publicKey,
  );
  if (!position?.claimed) throw new Error("LP claim was not recorded");
  const report = {
    network: "solana-devnet",
    checkedAt: new Date().toISOString(),
    publicTestWallet: kp.publicKey.toBase58(),
    fundedVault: funded.vaultPda,
    refundedVault: failed.vaultPda,
    market: launched.marketPda,
    signatures: {
      createFunded: funded.signature,
      createUnderfunded: failed.signature,
      commits,
      launch: launched.signature,
      claim,
      refund,
    },
    checks: [
      "create",
      "YES commit",
      "NO commit",
      "launch",
      "claim LP shares",
      "refund",
    ],
  };
  fs.writeFileSync(
    "DEVNET-VERIFICATION.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    "All six onchain checks passed; public receipts saved to DEVNET-VERIFICATION.json.",
  );
}
main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
