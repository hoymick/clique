# Clique

[Live app](https://clique-markets.tinyether2.chatgpt.site) · [Judge guide and video](https://clique-markets.tinyether2.chatgpt.site/submission/) · [Submission description](docs/SUBMISSION.md)

Community-funded prediction markets on Solana. Propose a YES/NO question, gather commitments toward a liquidity target, launch after funding closes, and claim LP shares or an eligible refund.

## Visual direction

Matches hackathons.solana.com's observed Geist / Geist Mono typography and palette: `#060607`, `#f7f7f5`, `#16ff93`, `#7dffc0`, and `#a63eff`. Fonts are bundled locally. Clique is an independent hackathon project, not an official Solana Foundation product.

## Run

Node 22+ recommended.

```sh
npm ci
npm run dev
npm run build
npm test
```

## Environments

**Demo (default):** complete browser-local simulation with explicitly labelled sample markets and funds. Get started gives 1,000 demo USDC. The wallet can add more simulated funds. Propose a market, commit on YES/NO, and expand **Test the full journey** to close the demo funding window. Funded vaults can launch and contributors can claim LP shares; underfunded vaults can refund. Demo records survive refresh in localStorage. Custom demo proposals cannot be shared across devices.

**Solana devnet:** actual `@pm-amm/sdk` calls, not a simulated fallback. Network selector switches to this independent dataset. Only vaults using the `CLQ: ` name prefix and the devnet mock-USDC mint are listed. The title, funding target, deadlines, authority, commitments, launch and claim state are read from chain. Devnet topics are displayed as Community. No offchain metadata backend is used.

Implemented operations:

- Create a commitment vault (`send.createVault`)
- Commit on YES or NO (`send.vaultCommit`)
- Launch after funding closes (`send.launchVaultMarket`)
- Claim LP shares (`send.claimCommitter`)
- Claim eligible refunds (`send.refundCommit`)
- Read vaults and wallet positions; request faucet mUSDC; link to public Explorer receipts

Uses an explicitly devnet-only browser test wallet. Keys stay on the visitor's browser and must never receive mainnet assets. Clearing site data removes access to that wallet. No production wallet custody or mainnet mode is implemented.

## Protocol semantics

Binary commitment vaults create liquidity-provider positions. YES/NO commitments determine the opening price; they do not directly mint outcome tokens. Commitments are locked during funding. Launch requires meeting the target, closing the funding window, and at least 300 seconds remaining before market expiry. Launch is permissionless and is not automatically submitted by a background keeper. If a vault cannot launch under protocol rules, eligible contributors can request a refund. The onchain program remains the final authority on eligibility.

LP value can decrease. PREDICT's USDC swap fees go to protocol / creator, not automatically to LPs. Resolution is creator-controlled; Clique does not implement an oracle or dispute mechanism. This first version ends at LP claiming; it does not provide a trading screen or LP withdrawal interface.

## Devnet configuration

- RPC: `https://api.devnet.solana.com`
- Program: `GV1FMGHRYBjQLaghE5fnGuYCuCcpdt3GD5xEX3TwN16y`
- mUSDC mint: `3WQ8hCqTNwjrh8WzE2XyoZoUrd1miPcwWfMkmFPUMEWZ`
- SDK: `@pm-amm/sdk@0.2.0`
- Faucet: `https://pm-amm-devnet.vercel.app/api/faucet`
- Test SOL: `https://faucet.solana.com/`

Confirmation uses HTTPS signature polling instead of WebSockets. No private RPC credentials are bundled.

## Validation and known limits

- TypeScript and production build checked.
- Thirteen tests cover signed-rule serialization / validation as well as deadline / launch / refund boundaries, replay prevention, amount precision and UTF-8 question length.
- Browser demo exercised through creation, commitment review, launch, LP claim and refund.
- Live devnet transaction verification **not completed**: the mUSDC faucet supplied zero SOL and the public RPC returned `410 Gone` for `requestAirdrop`, directing callers to the official SOL faucet. The inspected eligible proof-of-work pools were also unfunded. Creating a vault requires test SOL. Do not represent the demo receipts as onchain activity.
- `scripts/devnet-smoke.cjs` uses a generated, ephemeral test key and attempts a create / commit / launch / LP-claim / refund flow. It never reads a user's wallet. Pass a funded test-only key path as the first argument; successful results write only public addresses and transaction signatures to `DEVNET-VERIFICATION.json`.

Reference: https://predict-pm-amm.dev/hackathon.md and https://predict-pm-amm.dev/llms.txt.

## Signed settlement rules

Every new Clique vault records an HTTPS outcome source, a YES condition, and a NO / missing-data fallback in a creator-signed Solana Memo instruction in the same transaction as `initializeVault`. The combined memo is limited to 450 UTF-8 bytes. Readers require the original authority signature and a matching initialize-vault instruction before displaying those rules as verified. This makes the original terms auditable; it does not enforce honest creator resolution or add an oracle. Rules from arbitrary later memos are not accepted.

`node scripts/check-rules-tx.cjs` verifies that the maximum-size question plus rules fits a signed Solana transaction (1003 bytes, under 1232). The devnet account-history lookup is bounded to 500 signatures; a vault whose original transaction cannot be reached will not accept new commitments through Clique until its rules can be verified.

## License

Application source is MIT licensed. Bundled Geist font files retain their SIL Open Font License in `public/fonts/OFL.txt`. The optional proof-of-work funding helper is a minimal port of the MIT-licensed [Ellipsis Labs faucet CLI](https://github.com/jarry-xiao/proof-of-work-faucet); it uses only explicitly generated test keys.

## Walkthrough media

A 104-second, 1080p product walkthrough is available on the judge page. It uses actual interface captures, captions and original synthesized ambient audio, and explicitly labels simulated activity. To regenerate from the captures, run `python scripts/render-demo.py --font-root /path/to/Geist-TTF-files --work-dir /tmp/clique-video`; Pillow, NumPy and ffmpeg are required. The render is not a claim that live devnet transactions have passed.
