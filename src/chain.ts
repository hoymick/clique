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
type Network = "devnet" | "mainnet";
type ExternalProvider = {
  isPhantom?: boolean;
  publicKey?: { toString(): string };
  connect(): Promise<{ publicKey: { toString(): string } }>;
  signTransaction<T extends Transaction | VersionedTransaction>(
    tx: T,
  ): Promise<T>;
  on?(event: string, listener: () => void): void;
  removeListener?(event: string, listener: () => void): void;
};
function createChain(network: Network) {
  const MEMO = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
  const rulesCache = new Map<string, Rules>();
  const RPC =
    network === "mainnet"
      ? "https://solana-rpc.publicnode.com"
      : "https://api.devnet.solana.com";
  const PROGRAM = new PublicKey("GV1FMGHRYBjQLaghE5fnGuYCuCcpdt3GD5xEX3TwN16y");
  const MINT = new PublicKey(
    network === "mainnet"
      ? "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
      : "3WQ8hCqTNwjrh8WzE2XyoZoUrd1miPcwWfMkmFPUMEWZ",
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
  let session: {
    client: PmAmmClient;
    publicKey: PublicKey;
    cleanup?: () => void;
  } | null = null;
  const reader = PmAmmClient.readOnly(connection, PROGRAM, MINT);
  const explorer = (address: string, tx = false) =>
    `https://explorer.solana.com/${tx ? "tx" : "address"}/${address}${network === "devnet" ? "?cluster=devnet" : ""}`;
  function connectTestWallet() {
    if (network !== "devnet")
      throw new Error("Browser test wallets cannot connect to mainnet.");
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
      publicKey: kp.publicKey,
    };
    return kp.publicKey.toBase58();
  }
  async function connectExternalWallet(onChange: () => void = () => {}) {
    const provider = (
      window as unknown as { phantom?: { solana?: ExternalProvider } }
    ).phantom?.solana;
    if (!provider?.isPhantom)
      throw new Error(
        "Install or open Phantom, then connect from its browser. Clique never asks for a seed phrase.",
      );
    const response = await provider.connect();
    const publicKey = new PublicKey(response.publicKey.toString());
    disconnectTestWallet();
    const invalidate = () => {
      disconnectTestWallet();
      onChange();
    };
    const check = () => {
      if (
        !provider.publicKey ||
        provider.publicKey.toString() !== publicKey.toBase58()
      )
        throw new Error("Wallet account changed. Reconnect before signing.");
    };
    const checkNetwork = async () => {
      const expected =
        network === "mainnet"
          ? "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d"
          : "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";
      if ((await connection.getGenesisHash()) !== expected)
        throw new Error(
          "RPC network does not match the selected network. Signing stopped.",
        );
    };
    const externalWallet = {
      publicKey,
      signTransaction: async <T extends Transaction | VersionedTransaction>(
        tx: T,
      ): Promise<T> => {
        check();
        await checkNetwork();
        const signed = await provider.signTransaction(tx);
        check();
        return signed;
      },
      signAllTransactions: async <T extends Transaction | VersionedTransaction>(
        txs: T[],
      ): Promise<T[]> => {
        const signed: T[] = [];
        for (const tx of txs) {
          check();
          await checkNetwork();
          signed.push(await provider.signTransaction(tx));
          check();
        }
        return signed;
      },
    };
    provider.on?.("accountChanged", invalidate);
    provider.on?.("disconnect", invalidate);
    session = {
      publicKey,
      client: PmAmmClient.fromProvider(
        new AnchorProvider(connection, externalWallet, {
          commitment: "confirmed",
        }),
        PROGRAM,
        MINT,
      ),
      cleanup: () => {
        provider.removeListener?.("accountChanged", invalidate);
        provider.removeListener?.("disconnect", invalidate);
      },
    };
    return publicKey.toBase58();
  }
  function disconnectTestWallet() {
    session?.cleanup?.();
    session = null;
  }
  function active() {
    if (!session)
      throw new Error("Connect your wallet on the selected network first.");
    return session;
  }
  async function balances() {
    const { publicKey } = active();
    const [sol, usdc] = await Promise.all([
      connection.getBalance(publicKey),
      connection
        .getTokenAccountBalance(getAssociatedTokenAddressSync(MINT, publicKey))
        .then((r) => r.value.uiAmount || 0)
        .catch((e) => {
          if (String(e).includes("could not find account")) return 0;
          throw e;
        }),
    ]);
    return { sol: sol / 1e9, usdc };
  }
  async function faucet() {
    if (network !== "devnet")
      throw new Error("There is no mainnet faucet. Mainnet uses real USDC.");
    const { publicKey } = active();
    const r = await fetch("https://pm-amm-devnet.vercel.app/api/faucet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wallet: publicKey.toBase58(),
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
  const savedVaultsKey = `clique-${network}-saved-vaults-v1`;
  function savedVaults(): string[] {
    try {
      const ids = JSON.parse(localStorage.getItem(savedVaultsKey) || "[]");
      return Array.isArray(ids)
        ? ids.filter((id): id is string => typeof id === "string").slice(0, 20)
        : [];
    } catch {
      return [];
    }
  }
  function rememberVault(id: string) {
    localStorage.setItem(
      savedVaultsKey,
      JSON.stringify(
        [id, ...savedVaults().filter((x) => x !== id)].slice(0, 20),
      ),
    );
  }
  async function fetchVaults(extraAddress?: string): Promise<Market[]> {
    let all;
    if (network === "mainnet") {
      const ids = [
        ...new Set([...(extraAddress ? [extraAddress] : []), ...savedVaults()]),
      ].slice(0, 20);
      all = await Promise.all(
        ids.map(async (id) => {
          const publicKey = new PublicKey(id);
          const account = await reader.fetchVault(publicKey);
          if (
            !account ||
            !account.collateralMint.equals(MINT) ||
            !decode(account.name).startsWith("CLQ: ")
          ) {
            if (id === extraAddress)
              throw new Error(
                "This address is not a Clique mainnet USDC vault. Check the network and vault address.",
              );
            return null;
          }
          return { publicKey, account };
        }),
      );
      all = all.filter((row) => row !== null);
      if (extraAddress) rememberVault(extraAddress);
    } else all = await reader.fetchAllVaults();
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
        description: `A community-funded prediction market on Solana ${network}. Commitments set the opening YES / NO price and become liquidity-provider shares if the market launches.`,
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
  async function fetchPosition(id: string): Promise<Position | null> {
    const { client, publicKey } = active();
    const p = await client.fetchCommitPosition(new PublicKey(id), publicKey);
    return p
      ? {
          yes: p.yesAmount.toNumber() / 1e6,
          no: p.noAmount.toNumber() / 1e6,
          claimed: p.claimed,
        }
      : null;
  }
  async function createProposal(p: Proposal) {
    const { client, publicKey } = active();
    const id = Keypair.generate().publicKey.toBuffer().readUIntLE(0, 6);
    const vault = client.vaultPda(id);
    const ix = await client.ix.initializeVault({
      authority: publicKey,
      vaultId: id,
      name: "CLQ: " + p.title.trim(),
      commitDurationSecs: Math.round(p.commitHours * 3600),
      marketDurationSecs: Math.round(p.marketHours * 3600),
      minTotal: Math.round(p.target * 1e6),
    });
    const memo = new TransactionInstruction({
      programId: MEMO,
      keys: [{ pubkey: publicKey, isSigner: true, isWritable: false }],
      data: Buffer.from(encodeRules(p.rules)),
    });
    const signature = await client.sendIxs([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 250000 }),
      ix,
      memo,
    ]);
    rulesCache.set(vault.toBase58(), { ...p.rules, signature });
    if (network === "mainnet") {
      try {
        rememberVault(vault.toBase58());
      } catch {
        /* A confirmed transaction must still return its receipt if storage is full. */
      }
    }
    return { vaultPda: vault.toBase58(), signature };
  }
  async function fetchRules(
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

  async function commit(id: string, side: "yes" | "no", amount: number) {
    return active().client.send.vaultCommit(new PublicKey(id), side, amount);
  }
  async function launch(id: string) {
    return active().client.send.launchVaultMarket(new PublicKey(id));
  }
  async function refund(id: string) {
    return active().client.send.refundCommit(new PublicKey(id));
  }
  async function claim(id: string, market: string) {
    return active().client.send.claimCommitter(
      new PublicKey(id),
      new PublicKey(market),
    );
  }
  function readableError(e: unknown) {
    const s = e instanceof Error ? e.message : String(e);
    if (/Confirmation timed out|Transaction expired/.test(s)) return s;
    if (/429|rate.limit/i.test(s))
      return `Solana ${network} is busy. Wait a moment, then refresh. Your funds have not been simulated.`;
    if (/Failed to fetch|fetch failed|NetworkError|timeout/i.test(s))
      return `Could not reach Solana ${network}. Check your connection and try again. Demo mode remains available.`;
    if (/insufficient.*lamport|insufficient.*fund|0x1\b/i.test(s))
      return network === "mainnet"
        ? "Your wallet needs mainnet SOL for fees and real USDC for commitments."
        : "Your test wallet needs devnet SOL or mUSDC. Use Get test funds, then try again.";
    return s.slice(0, 240);
  }

  return {
    network,
    collateralMint: MINT.toBase58(),
    connectExternalWallet,
    connectTestWallet,
    disconnectTestWallet,
    balances,
    faucet,
    fetchVaults,
    fetchPosition,
    createProposal,
    fetchRules,
    commit,
    launch,
    refund,
    claim,
    explorer,
    readableError,
  };
}
const clients = {
  devnet: createChain("devnet"),
  mainnet: createChain("mainnet"),
};
export function forNetwork(network: Network) {
  return clients[network];
}
