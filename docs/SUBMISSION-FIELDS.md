# Clique — submission fields

## Name
Clique

## Tagline
Your community funds the first market.

## Short description
Clique helps communities bootstrap prediction-market liquidity on Solana devnet. Propose a YES/NO question with signed settlement terms, gather commitments toward a target, and launch after funding closes. Backers claim LP shares when the market launches, or eligible refunds when it cannot.

## Problem
A community can care about a question without one person being willing to supply all its starting liquidity. Clique coordinates the funding before trading begins and gives contributors an explicit launch-or-refund path.

## How it works
Creators set a question, funding target, deadlines, evidence source and YES/NO settlement rules. Community members review and commit test mUSDC. PREDICT’s commitment vault holds the contributions, enforces its funding rules and seeds a pm-AMM market when launched. Contributors then claim LP shares. An eligible unsuccessful vault returns commitments through the protocol’s refund instruction.

## Why pm-AMM is central
The core product is built around PREDICT’s commitment vault and launch mechanism. The commitment ratio sets the initial YES/NO price, and the pooled commitments become the market’s liquidity. A generic constant-product AMM does not provide this complete funding-to-outcome-market lifecycle on its own. Clique also records settlement terms in a creator-signed memo alongside vault initialization and verifies the original transaction before displaying those terms as verified.

## What works today
The deployed app reads the devnet dataset, creates browser test wallets and requests faucet mUSDC. The interface includes proposals, commitment review, launch, LP claims and refunds through the SDK, plus a separate complete browser-local simulation. Twenty-three automated tests, a production build and the maximum-size transaction serialization check pass. The live devnet create/commit/launch/LP-claim/refund lifecycle is verified with public transaction receipts and account-state postchecks. See DEVNET-VERIFICATION.json.

## Links
- App: https://clique.hoymick240.workers.dev
- Source: https://github.com/hoymick/clique
- Judge guide: https://clique.hoymick240.workers.dev/submission/
- Walkthrough: https://clique.hoymick240.workers.dev/submission/clique-walkthrough.mp4

## Traction
No real-user adoption, application transaction volume, trades or protocol fees are claimed. Seeded demo statistics are simulated. A faucet mint is not product traction.

## Limits
Devnet is the default, with optional mainnet through Phantom. Mainnet reads and mock-wallet checks pass; no real mainnet transactions were verified. Resolution remains creator-controlled; signed terms are inspectable but do not enforce correct resolution. LP capital can lose value. Launch is manually triggered. This build ends at LP claiming; it does not include an in-app trading or LP-withdrawal screen. Nine dependency audit findings remain, with observed browser reachability documented separately.

## Next steps
Test with real communities, add support for more external wallets, and explore resolution adapters and LP management.

## Fields the entrant must supply
Enter your actual team member names and contact details in the submission form. Review any event declarations and terms yourself. This packet does not claim a submission has been made or accepted.
