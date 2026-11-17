# Final verification — 17 November 2026

## Passed
- 18 automated tests, including HTTP transaction-confirmation success/failure/expiry/timeout.
- Maximum signed question-and-rules transaction: 1,003 bytes (Solana limit: 1,232).
- TypeScript and production build.
- Devnet is the default and only real transaction network.
- Browser-local simulation remains isolated and labelled.
- UUID transitive dependency patched; nine remaining audit nodes reviewed in DEPENDENCY-REVIEW.md.

## Live test result
The integration script was corrected to request the official **builder** faucet allocation, rather than the smaller player allocation. One builder funding attempt supplied mUSDC but returned zero SOL. The script stopped before creating any vault. There are no successful application lifecycle receipts from this test.

Public devnet-only test wallet: `5tDm6m8YHPj3ywNE181b8pTBgeJS7evNbNttbv3tXYSG`.

Minimum script prerequisite: 0.06 devnet SOL; 0.1 devnet SOL allows headroom. These are free test tokens, not real SOL. Request them from https://faucet.solana.com with **Devnet** selected. Do not buy SOL or send mainnet assets.

To rerun, supply the existing test-only signer file as the first argument to `node scripts/devnet-smoke.cjs`. The script reuses sufficient existing test mUSDC, avoiding repeated faucet claims. It writes DEVNET-VERIFICATION.json only after all six application checks complete successfully. Never commit or upload a private key as evidence.

## Status
The app and submission copy are prepared. The remaining external prerequisite is a funded devnet signing wallet. Full live verification and an actual hackathon submission are not complete.
