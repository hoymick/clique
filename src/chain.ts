import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  VersionedTransaction,
  TransactionInstruction,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import { AnchorProvider } from "@anchor-lang/core";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { installHttpConfirmation } from "./confirmation.mjs";
import { PmAmmClient } from "@pm-amm/sdk";
import { Buffer } from "buffer";
import bs58 from "bs58";
import { encodeRules, decodeRules } from "./rules.mjs";
import type { Market, Position, Proposal, Rules } from "./types";
const MEMO = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
const rulesCache = new Map<string, Rules>();
export const RPC = "https://api.devnet.solana.com";
export const PROGRAM = new PublicKey(
  "GV1FMGHRYBjQLaghE5fnGuYCuCcpdt3GD5xEX3TwN16y",
);
export const MINT = new PublicKey(
  "3WQ8hCqTNwjrh8WzE2XyoZoUrd1miPcwWfMkmFPUMEWZ",
);
const connection = new Connection(RPC, {
  commitment: "confirmed",
  confirmTransactionInitialTimeout: 45000,
  disableRetryOnRateLimit: true,
  fetch: (url, options) =>
    fetch(url, { ...options, signal: AbortSignal.timeout(20000) }),
});
installHttpConfirmation(connection);
function wallet(kp: Keypair) {
  const sign = <T extends Transaction | VersionedTransaction>(tx: T): T => {
    if (tx instanceof VersionedTransaction) tx.sign([kp]);
    else tx.partialSign(kp);
    return tx;
  };
  return {
    publicKey: kp.publicKey,
    payer: kp,
    signTransaction: async <T extends Transaction | VersionedTransaction>(
      tx: T,
    ) => sign(tx),
    signAllTransactions: async <T extends Transaction | VersionedTransaction>(
      txs: T[],
    ) => txs.map(sign),
  };
}
let session: { client: PmAmmClient; keypair: Keypair } | null = null;
const readKey = Keypair.generate();
export const reader = PmAmmClient.fromProvider(
  new AnchorProvider(connection, wallet(readKey), { commitment: "confirmed" }),
  PROGRAM,
  MINT,
);
export const explorer = (address: string, tx = false) =>
  `https://explorer.solana.com/${tx ? "tx" : "address"}/${address}?cluster=devnet`;
export function connectTestWallet() {
  let kp: Keypair;
  const saved = localStorage.getItem("clique-devnet-wallet-v1");
  if (saved) {
    try {
      kp = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(saved)));
    } catch {
      throw new Error(
        "Saved test wallet could not be read. Clear Clique site data to create a new one.",
      );
    }
  } else {
    kp = Keypair.generate();
    localStorage.setItem(
      "clique-devnet-wallet-v1",
      JSON.stringify([...kp.secretKey]),
    );
  }
  session = {
    client: PmAmmClient.fromProvider(
      new AnchorProvider(connection, wallet(kp), { commitment: "confirmed" }),
      PROGRAM,
      MINT,
    ),
    keypair: kp,
  };
  return kp.publicKey.toBase58();
}
export function disconnectTestWallet() {
  session = null;
}
function active() {
  if (!session) throw new Error("Connect your devnet test wallet first.");
  return session;
}
export async function balances() {
  const { keypair } = active();
  const [sol, usdc] = await Promise.all([
    connection.getBalance(keypair.publicKey),
    connection
      .getTokenAccountBalance(
        getAssociatedTokenAddressSync(MINT, keypair.publicKey),
      )
      .then((r) => r.value.uiAmount || 0)
      .catch((e) => {
        if (String(e).includes("could not find account")) return 0;
        throw e;
      }),
  ]);
  return { sol: sol / 1e9, usdc };
}
export async function faucet() {
  const { keypair } = active();
  const r = await fetch("https://pm-amm-devnet.vercel.app/api/faucet", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      wallet: keypair.publicKey.toBase58(),
    }),
    signal: AbortSignal.timeout(30000),
  });
  const b = await r.json();
  if (!r.ok || !b.ok)
    throw new Error(b.error || "The faucet is unavailable. Try again later.");
  if (b.signature) {
    const confirmation = await connection.confirmTransaction(
      b.signature,
      "confirmed",
    );
    if (confirmation.value.err)
      throw new Error(
        "Test-fund transaction failed. Check its receipt: " +
          explorer(b.signature, true),
      );
  }
  return { signature: b.signature, amount: b.amount };
}
const decode = (n: number[]) =>
  new TextDecoder().decode(Uint8Array.from(n)).replace(/\0/g, "").trim();
export async function fetchVaults(): Promise<Market[]> {
  const all = await reader.fetchAllVaults();
  return all
    .filter(
      (x) =>
        x.account.collateralMint.equals(MINT) &&
        decode(x.account.name).startsWith("CLQ: "),
    )
    .map(({ publicKey, account: a }) => ({
      id: publicKey.toBase58(),
      title: decode(a.name).slice(5),
      category: "Community",
      description:
        "A community-funded prediction market on Solana devnet. Commitments set the opening YES / NO price and become liquidity-provider shares if the market launches.",
      creator:
        a.authority.toBase58().slice(0, 4) +
        "…" +
        a.authority.toBase58().slice(-4),
      authority: a.authority.toBase58(),
      commitEnd: a.commitEndTs.toNumber() * 1000,
      marketEnd: a.marketEndTs.toNumber() * 1000,
      yes: a.yesTotal.toNumber() / 1e6,
      no: a.noTotal.toNumber() / 1e6,
      target: a.minTotal.toNumber() / 1e6,
      backers: a.commitCount,
      launched: a.launched,
      marketAddress: a.launched ? a.market.toBase58() : undefined,
      rules: rulesCache.get(publicKey.toBase58()),
      demo: false,
    }));
}
export async function fetchPosition(id: string): Promise<Position | null> {
  const { client, keypair } = active();
  const p = await client.fetchCommitPosition(
    new PublicKey(id),
    keypair.publicKey,
  );
  return p
    ? {
        yes: p.yesAmount.toNumber() / 1e6,
        no: p.noAmount.toNumber() / 1e6,
        claimed: p.claimed,
      }
    : null;
}
export async function createProposal(p: Proposal) {
  const { client, keypair } = active();
  const id = Keypair.generate().publicKey.toBuffer().readUIntLE(0, 6);
  const vault = client.vaultPda(id);
  const ix = await client.ix.initializeVault({
    authority: keypair.publicKey,
    vaultId: id,
    name: "CLQ: " + p.title.trim(),
    commitDurationSecs: Math.round(p.commitHours * 3600),
    marketDurationSecs: Math.round(p.marketHours * 3600),
    minTotal: Math.round(p.target * 1e6),
  });
  const memo = new TransactionInstruction({
    programId: MEMO,
    keys: [{ pubkey: keypair.publicKey, isSigner: true, isWritable: false }],
    data: Buffer.from(encodeRules(p.rules)),
  });
  const signature = await client.sendIxs([
    ComputeBudgetProgram.setComputeUnitLimit({ units: 250000 }),
    ix,
    memo,
  ]);
  rulesCache.set(vault.toBase58(), { ...p.rules, signature });
  return { vaultPda: vault.toBase58(), signature };
}
export async function fetchRules(
  id: string,
  authority: string,
): Promise<Rules | null> {
  if (rulesCache.has(id)) return rulesCache.get(id)!;
  const vault = new PublicKey(id);
  let before: string | undefined;
  let oldest: string | undefined;
  for (let page = 0; page < 5; page++) {
    const rows = await connection.getSignaturesForAddress(
      vault,
      { limit: 100, before },
      "confirmed",
    );
    if (!rows.length) break;
    oldest = rows[rows.length - 1].signature;
    if (rows.length < 100) break;
    before = oldest;
    if (page === 4)
      throw new Error(
        "Could not reach the vault creation transaction within the history limit.",
      );
  }
  if (!oldest) return null;
  const tx = await connection.getParsedTransaction(oldest, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });
  if (!tx || tx.meta?.err) return null;
  const signed = tx.transaction.message.accountKeys.some(
    (k) => k.signer && k.pubkey.toBase58() === authority,
  );
  if (!signed) return null;
  const digest = new Uint8Array(
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode("global:initialize_vault"),
    ),
  ).slice(0, 8);
  const created = tx.transaction.message.instructions.some((ix) => {
    if (
      ix.programId.toBase58() !== PROGRAM.toBase58() ||
      !("data" in ix) ||
      !("accounts" in ix) ||
      !ix.accounts.some((k) => k.equals(vault))
    )
      return false;
    const d = bs58.decode(ix.data);
    return digest.every((v, i) => v === d[i]);
  });
  if (!created) return null;
  const memos = tx.transaction.message.instructions
    .filter((ix) => ix.programId.equals(MEMO) && "parsed" in ix)
    .map((ix) => ("parsed" in ix ? decodeRules(ix.parsed) : null))
    .filter(Boolean);
  if (memos.length !== 1) return null;
  const rules = { ...memos[0], signature: oldest } as Rules;
  rulesCache.set(id, rules);
  return rules;
}

export async function commit(id: string, side: "yes" | "no", amount: number) {
  return active().client.send.vaultCommit(new PublicKey(id), side, amount);
}
export async function launch(id: string) {
  return active().client.send.launchVaultMarket(new PublicKey(id));
}
export async function refund(id: string) {
  return active().client.send.refundCommit(new PublicKey(id));
}
export async function claim(id: string, market: string) {
  return active().client.send.claimCommitter(
    new PublicKey(id),
    new PublicKey(market),
  );
}
export function readableError(e: unknown) {
  const s = e instanceof Error ? e.message : String(e);
  if (/Confirmation timed out|Transaction expired/.test(s)) return s;
  if (/429|rate.limit/i.test(s))
    return "Solana devnet is busy. Wait a moment, then refresh. Your funds have not been simulated.";
  if (/Failed to fetch|fetch failed|NetworkError|timeout/i.test(s))
    return "Could not reach Solana devnet. Check your connection and try again. Demo mode remains available.";
  if (/insufficient.*lamport|insufficient.*fund|0x1\b/i.test(s))
    return "Your test wallet needs devnet SOL or mUSDC. Use Get test funds, then try again.";
  return s.slice(0, 240);
}
