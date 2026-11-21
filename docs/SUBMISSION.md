# Clique — community-funded prediction markets

**One sentence:** Clique lets a community give a prediction market its first liquidity, with a funding target, a deadline, signed settlement terms, and a clear launch-or-refund journey.

**Live app:** https://clique.hoymick240.workers.dev

**Public source:** https://github.com/hoymick/clique

**Judge guide and walkthrough:** https://clique.hoymick240.workers.dev/submission/

## The problem

A community can have a useful question and interested participants but no single person willing to provide all the starting liquidity. Clique collects commitments before trading begins. If a viable vault reaches its minimum by its funding deadline, anyone can launch the market; otherwise, backers can reclaim eligible commitments under the underlying protocol's rules.

## Why PREDICT

Commitment vaults are the core of the product. Clique calls PREDICT's initialize-vault, commit, launch, LP-claim and refund instructions. The initial YES/NO commitment ratio determines the market's opening price. On launch the committed pot becomes pm-AMM liquidity; backers become liquidity providers. Reimplementing this with a generic constant-product pool would require rebuilding both the funding lifecycle and outcome-token market mechanics.

## What we built

- Searchable, filterable community proposal discovery and personal commitment tracking.
- Explicitly separate browser-local demo and live Solana devnet datasets.
- Devnet browser test wallet and faucet, plus optional mainnet via Phantom, real USDC balances and network-correct Explorer receipts.
- A review step before commitments.
- Funding deadlines, minimum targets, permissionless launch, LP share claims and eligible refunds.
- Outcome source, YES condition and NO/missing-data fallback recorded in a creator-signed Memo instruction in the same transaction as vault creation. Readers verify the authority signature and initialize-vault instruction before accepting the memo.
- Responsive blue-and-white interface with rounded Lilita One / Nunito typography, outlined status stickers and an original Clique badge.

## What judges can try

1. The app opens on **Solana devnet**. Select **Demo mode** for the simulated walkthrough.
2. Select **Get started** to receive simulated USDC.
3. Propose a question with an HTTPS outcome source and explicit settlement rules.
4. Commit toward a small target; inspect the review screen.
5. Expand **Test the full journey** and close the demo funding window.
6. Launch the funded proposal and claim LP shares.
7. Repeat with a target above the committed amount to test refunds.
8. Switch to **Solana devnet** for the actual SDK integration. No sample activity is copied into this dataset.

## Verification and current limit

Domain tests, rules-validation tests, TypeScript checks and a maximum-size signed transaction serialization check are included. The demo journey has been exercised in a browser.

**Live devnet lifecycle verified on 17 November 2026.** All eight transaction receipts confirmed without errors: two vault creations, three YES/NO commitments, launch, LP claim and refund. Postchecks verified positive LP shares, the refunded position, a 950 mUSDC ending wallet balance, and creator-signed rules in the creation transaction. [Public verification evidence](../DEVNET-VERIFICATION.json). This is developer testing, not user adoption or trading volume.

The browser walkthrough video is labelled as a **simulation**. It demonstrates the product flow, not completed devnet transactions.

## Known limits

- Creator-controlled resolution: signed terms make the original rules inspectable but do not enforce honest resolution or add an oracle/dispute mechanism.
- Launch is permissionless but manually triggered; no unattended keeper is included.
- Mainnet discovery opens shared or locally saved vault addresses; there is no global mainnet index.
- Browser test keys are devnet-only. Optional mainnet funding uses Phantom approvals; its signing behavior is tested with a mock wallet, but real mainnet transactions have not been verified. Clique does not hold mainnet private keys.
- The current scope ends at LP claiming; no in-app trading or LP-withdrawal screen is provided.
- LP value can fall; capital committed to a launched market is not guaranteed to be recoverable at its initial value.
- No real-user adoption, volume or fee figures are claimed. This matters particularly for the PREDICT bounty's traction criterion.

## Roadmap

Add more external wallets, resolution adapters, LP management and an opt-in launch keeper. Validate demand with actual communities before making growth claims.

## Demo media

The 103-second walkthrough uses interface captures, captions and an original synthesized ambient soundtrack. Demo-fund scenes are labelled, and the judge guide links to the separate devnet receipts. The video, captures and render script are included in the source repository.
