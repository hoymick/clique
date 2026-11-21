# Clique

[Live app](https://clique.hoymick240.workers.dev) · [Judge guide and video](https://clique.hoymick240.workers.dev/submission/) · [Submission description](docs/SUBMISSION.md)

Community-funded prediction markets on Solana devnet and mainnet. Propose a YES/NO question, gather commitments toward a liquidity target, launch after funding closes, and claim LP shares or an eligible refund.

## Visual direction

A playful blue-and-white theme inspired by the Pudgy Penguins reference: locally bundled Lilita One display headings and Nunito body text, sky-white `#f3fbff`, bright blue `#477af8`, navy `#082950` and yellow `#ffe58f`. Original smiling conversation-bubble badge, outlined pill buttons and rounded market cards. Clique keeps its own identity and has no affiliation with Pudgy Penguins or Solana Foundation.

## Run

Node 22+ recommended.

```sh
npm ci
npm run dev
npm run build
npm test
```

## Environments

**Demo:** complete browser-local simulation with explicitly labelled sample markets and funds. Get started gives 1,000 demo USDC. The wallet can add more simulated funds. Propose a market, commit on YES/NO, and expand **Test the full journey** to close the demo funding window. Funded vaults can launch and contributors can claim LP shares; underfunded vaults can refund. Demo records survive refresh in localStorage. Custom demo proposals cannot be shared across devices.

**Solana devnet (default):** actual `@pm-amm/sdk` calls, not a simulated fallback. The app opens on this independent dataset; the network selector offers a separate simulation. `?mode=demo` opens the simulation directly. Only vaults using the `CLQ: ` name prefix and the devnet mock-USDC mint are listed. The title, funding target, deadlines, authority, commitments, launch and claim state are read from chain. Devnet topics are displayed as Community. No offchain metadata backend is used.

Implemented operations:

- Create a commitment vault (`send.createVault`)
- Commit on YES or NO (`send.vaultCommit`)
- Launch after funding closes (`send.launchVaultMarket`)
- Claim LP shares (`send.claimCommitter`)
- Claim eligible refunds (`send.refundCommit`)
- Read vaults and wallet positions; request faucet mUSDC; link to public Explorer receipts

Uses an explicitly devnet-only browser test wallet. Keys stay on the visitor's browser and must never receive mainnet assets. Clearing site data removes access to that wallet. Mainnet uses Phantom, with private keys kept in the extension and individual wallet approval. Browser test keys and faucets are rejected on mainnet.

## Mainnet

Select **Solana mainnet · real funds** in the network menu, then **Connect Phantom**. Mainnet uses real Circle USDC and SOL. Devnet remains the default; `?mode=mainnet` opens mainnet explicitly. Each network has an independent reader, signing session and signed-rules cache. Switching clears displayed wallets, balances, positions, markets and receipts; share links include their network.

Mainnet supports the same create/commit/launch/LP-claim/refund SDK flow through Phantom. Every signing request validates the connected account and RPC genesis hash before wallet approval. Keys are never requested, generated or saved by Clique for mainnet. Mainnet has no faucet. The USDC mint is the protocol's documented mainnet collateral. Mainnet RPC uses PublicNode (`https://solana-rpc.publicnode.com`); its cluster is verified before signing. Only Clique-prefixed vaults are shown. Mainnet discovery opens shared vault addresses or links, and saves up to 20 addresses locally. Account state and rules are fetched onchain; global mainnet indexing is not included.

**Verification:** mainnet program deployment, genesis hash and vault reading were checked. Rejection, network mismatch and signing-boundary behavior were tested using a mocked provider. **No real mainnet transaction was sent or verified.** The eight published lifecycle receipts are devnet-only. This release has not received an independent security audit; creator-controlled resolution and LP-loss risks still apply.

Phantom injection currently requires its browser extension or in-app browser. Other wallets and mobile deep links are not included.

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
- Twenty-seven tests cover signed-rule serialization / validation as well as deadline / launch / refund boundaries, replay prevention, amount precision, UTF-8 question length, confirmation outcomes, network isolation, mainnet wallet requirements, rejection handling and cluster checks.
- Browser demo exercised through creation, commitment review, launch, LP claim and refund.
- **Live devnet lifecycle verified on 17 November 2026:** creation, YES and NO commitments, permissionless launch, LP claim and refund all confirmed successfully. [Public receipts](DEVNET-VERIFICATION.json) include postchecks for LP shares, returned funds and creator-signed settlement rules. These are developer integration transactions, not user traction.
- `scripts/devnet-smoke.cjs` uses a generated, ephemeral test key and attempts a create / commit / launch / LP-claim / refund flow. It never reads a user's wallet. Pass a funded test-only key path as the first argument; successful results write only public addresses and transaction signatures to `DEVNET-VERIFICATION.json`.

Reference: https://predict-pm-amm.dev/hackathon.md and https://predict-pm-amm.dev/llms.txt.

## Signed settlement rules

Every new Clique vault records an HTTPS outcome source, a YES condition, and a NO / missing-data fallback in a creator-signed Solana Memo instruction in the same transaction as `initializeVault`. The combined memo is limited to 450 UTF-8 bytes. Readers require the original authority signature and a matching initialize-vault instruction before displaying those rules as verified. This makes the original terms auditable; it does not enforce honest creator resolution or add an oracle. Rules from arbitrary later memos are not accepted.

`node scripts/check-rules-tx.cjs` verifies that the maximum-size question plus rules fits a signed Solana transaction (1003 bytes, under 1232). The devnet account-history lookup is bounded to 500 signatures; a vault whose original transaction cannot be reached will not accept new commitments through Clique until its rules can be verified.

## License

Application source is MIT licensed. Bundled Lilita One and Nunito retain their SIL Open Font Licenses in `public/fonts/LilitaOne-OFL.txt` and `public/fonts/Nunito-OFL.txt`. Earlier Geist assets retain their license in `public/fonts/OFL.txt`. The optional proof-of-work funding helper is a minimal port of the MIT-licensed [Ellipsis Labs faucet CLI](https://github.com/jarry-xiao/proof-of-work-faucet); it uses only explicitly generated test keys.

## Walkthrough media

A refreshed 103-second, 1080p product walkthrough is available on the judge page. It uses actual interface captures, captions and original synthesized ambient audio, and explicitly labels simulated activity. To regenerate from the captures, run `python scripts/render-demo.py --font-root /usr/share/fonts/truetype/dejavu --work-dir /tmp/clique-video`; Pillow, NumPy and ffmpeg are required. The interface walkthrough is simulated; separately verified live devnet transactions are linked from the judge guide.

## Dependency review — 17 November 2026

See [DEPENDENCY-REVIEW.md](docs/DEPENDENCY-REVIEW.md). The UUID override uses the patched CommonJS-compatible 11.x release. Nine transitive audit findings remain; this testnet release is not a mainnet security assessment.

## Submission packet

[Ready-to-paste submission fields](docs/SUBMISSION-FIELDS.md) and [final verification status](docs/FINAL-VERIFICATION.md). The integration test requests builder funding and reuses existing mUSDC when a funded test key is supplied, avoiding unnecessary faucet claims.

## Cloudflare hosting

See [Cloudflare setup](docs/CLOUDFLARE.md) for Workers & Pages deployment from this repository or `npm run deploy:cloudflare` from an authenticated CLI.

## Share, save and follow

- Share a question through a network-specific link. Custom demo proposals stay in their originating browser; use devnet for cross-device funding.
- Watchlist stores up to 100 questions per network in this browser. Saving never commits funds.
- Activity stores up to 200 actions made here, filtered by network and connected wallet. Onchain entries require confirmed transaction signatures and link to Explorer. Simulated activity is labelled.
- Mobile navigation, accessible focus indicators, responsive dialogs and reduced-motion support are included.

Clearing site data clears local watchlists and activity. Past or external wallet transactions are not imported.
