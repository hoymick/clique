# Hosted verification — 17 November 2026

Clique's public GitHub source was checked on GitHub's hosted Ubuntu runner with Node 22.

## Passing checks

- All 13 domain and signed-rules tests passed.
- Maximum question-and-rules transaction serialized to 1,003 bytes, below Solana's 1,232-byte limit.
- TypeScript checking and the Vite production build passed.
- The normal Build and verify workflow completed successfully: https://github.com/hoymick/clique/actions/runs/43986631919

## Live integration attempt

Run: https://github.com/hoymick/clique/actions/runs/43986632093

The runner reached Solana devnet and the PREDICT faucet. The faucet supplied no test SOL, and the disposable test wallet had a zero SOL balance. The lifecycle script stopped before vault creation because its funding prerequisite (at least 0.06 devnet SOL) was unmet. Create, commit, launch, LP claim and refund are therefore **not verified onchain by this run**.

The original test wallet, `nxPwUwqc7WUaEuojFGTLPQz4RnCmkc3QvpeEmBVM7M4`, also held zero lamports when checked at 2026-11-17T00:19:21.529Z. This is a timestamped observation, not a claim about later balances.

The disposable runner wallet's signing key was not persisted. Do not send funds to an address printed by a completed disposable-wallet run: a later run creates a different keypair. To complete verification, use a funded devnet-only signing wallet with `node scripts/devnet-smoke.cjs /path/to/test-key.json` in a trusted signing environment. Never commit a private key to the repository or include it in logs or artifacts.

The script writes DEVNET-VERIFICATION.json with public transaction signatures only after the complete lifecycle succeeds. No such success report was produced by this attempt.

## Additional observation

Dependency installation reported 13 audit findings (7 moderate and 6 high). These counts alone do not establish application exploitability; an advisory-level dependency review remains outstanding.

## Submission status

The published app, judge guide and labelled simulated walkthrough are available. Automated application checks pass. Full live devnet lifecycle verification remains blocked on a funded signing wallet. The video remains a simulation and must not be presented as live transaction evidence.
