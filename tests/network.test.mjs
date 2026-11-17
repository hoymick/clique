import test from "node:test";
import assert from "node:assert/strict";
import { buildSync } from "esbuild";
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
mkdirSync(".sites-runtime", { recursive: true });
buildSync({
  entryPoints: ["src/chain.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  packages: "external",
  outfile: ".sites-runtime/chain-tests.cjs",
});
const { forNetwork } = require("../.sites-runtime/chain-tests.cjs");
const { Keypair, PublicKey } = require("@solana/web3.js");
const main = forNetwork("mainnet");
const dev = forNetwork("devnet");
const mint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

test("network clients use separate real/test collateral and explorer clusters", () => {
  assert.notEqual(main, dev);
  assert.equal(main.collateralMint, mint);
  assert.equal(
    dev.collateralMint,
    "3WQ8hCqTNwjrh8WzE2XyoZoUrd1miPcwWfMkmFPUMEWZ",
  );
  assert.equal(
    main.explorer("receipt", true),
    "https://explorer.solana.com/tx/receipt",
  );
  assert.match(dev.explorer("receipt", true), /cluster=devnet$/);
});

test("mainnet rejects browser test keys and test faucets before touching storage or network", async () => {
  assert.throws(() => main.connectTestWallet(), /cannot connect to mainnet/);
  await assert.rejects(main.faucet(), /no mainnet faucet/);
  await assert.rejects(main.balances(), /Connect your wallet/);
});

test("mainnet connection requires an installed external wallet", async () => {
  globalThis.window = {};
  try {
    await assert.rejects(main.connectExternalWallet(), /Phantom/);
  } finally {
    delete globalThis.window;
  }
});

test("mainnet transaction uses real USDC, checks cluster, and stops at rejected wallet approval", async () => {
  const owner = Keypair.generate().publicKey;
  const handlers = {};
  let prompts = 0;
  let networkCalls = [];
  let genesis = "wrong-network";
  const provider = {
    isPhantom: true,
    publicKey: owner,
    connect: async () => ({ publicKey: owner }),
    signTransaction: async (tx) => {
      prompts++;
      assert(tx.feePayer.equals(owner));
      assert(
        tx.instructions.some((ix) =>
          ix.keys.some((k) => k.pubkey.equals(new PublicKey(mint))),
        ),
      );
      throw new Error("User rejected wallet approval");
    },
    on: (event, fn) => {
      handlers[event] = fn;
    },
    removeListener: (event) => {
      delete handlers[event];
    },
  };
  const originalFetch = globalThis.fetch;
  globalThis.window = { phantom: { solana: provider } };
  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), "https://solana-rpc.publicnode.com");
    const request = JSON.parse(options.body);
    networkCalls.push(request.method);
    let result;
    if (request.method === "getLatestBlockhash")
      result = {
        context: { slot: 1 },
        value: {
          blockhash: Keypair.generate().publicKey.toBase58(),
          lastValidBlockHeight: 999999999,
        },
      };
    else if (request.method === "getGenesisHash") result = genesis;
    else throw Error("Unexpected RPC: " + request.method);
    return new Response(
      JSON.stringify({ jsonrpc: "2.0", id: request.id, result }),
      { headers: { "content-type": "application/json" } },
    );
  };
  const proposal = {
    title: "Will this mainnet test require approval?",
    target: 10,
    commitHours: 1,
    marketHours: 1,
    rules: {
      source: "https://example.org",
      yes: "YES if the published condition is met.",
      no: "NO otherwise or if evidence is missing.",
    },
  };
  try {
    assert.equal(await main.connectExternalWallet(), owner.toBase58());
    await assert.rejects(
      main.createProposal(proposal),
      /RPC network does not match/,
    );
    assert.equal(prompts, 0);
    genesis = "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d";
    await assert.rejects(
      main.createProposal(proposal),
      /User rejected wallet approval/,
    );
    assert.equal(prompts, 1);
    assert(!networkCalls.includes("sendTransaction"));
    provider.publicKey = Keypair.generate().publicKey;
    await assert.rejects(main.createProposal(proposal), /account changed/);
    assert.equal(prompts, 1);
    handlers.accountChanged();
    await assert.rejects(main.balances(), /Connect your wallet/);
  } finally {
    main.disconnectTestWallet();
    globalThis.fetch = originalFetch;
    delete globalThis.window;
  }
});

test("mainnet saved-vault reads avoid paid broad indexing and reject missing shared accounts", async () => {
  const originalFetch = globalThis.fetch;
  const ids = [];
  globalThis.localStorage = {
    getItem: () => JSON.stringify(ids),
    setItem: () => {},
  };
  const calls = [];
  globalThis.fetch = async (_url, options) => {
    const request = JSON.parse(options.body);
    calls.push(request.method);
    assert.equal(request.method, "getAccountInfo");
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        id: request.id,
        result: { context: { slot: 1 }, value: null },
      }),
      { headers: { "content-type": "application/json" } },
    );
  };
  try {
    assert.deepEqual(await main.fetchVaults(), []);
    assert.deepEqual(calls, []);
    const missing = Keypair.generate().publicKey.toBase58();
    await assert.rejects(main.fetchVaults(missing), /not a Clique mainnet/);
    ids.push(missing);
    assert.deepEqual(await main.fetchVaults(), []);
    assert(!calls.includes("getProgramAccounts"));
    globalThis.fetch = async () => {
      throw new Error("RPC unavailable");
    };
    await assert.rejects(main.fetchVaults(), /RPC unavailable/);
  } finally {
    globalThis.fetch = originalFetch;
    delete globalThis.localStorage;
  }
});

test('devnet shared links directly check an address absent from the indexed list', async()=>{
  const originalFetch=globalThis.fetch;const calls=[];
  globalThis.fetch=async(_url,options)=>{
    const req=JSON.parse(options.body);calls.push(req.method);
    return new Response(JSON.stringify({jsonrpc:'2.0',id:req.id,result:req.method==='getProgramAccounts'?[]:{context:{slot:1},value:null}}),{headers:{'content-type':'application/json'}});
  };
  try {await assert.rejects(dev.fetchVaults(Keypair.generate().publicKey.toBase58()),/not a Clique devnet/);assert.deepEqual(calls,['getProgramAccounts','getAccountInfo']);}
  finally {globalThis.fetch=originalFetch;}
});
