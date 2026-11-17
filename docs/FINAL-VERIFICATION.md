# Final verification — 17 November 2026

The complete Clique funding lifecycle passed on **Solana devnet**. All transaction receipts confirmed without errors. These are developer integration transactions using free test tokens, not product traction.

## Verified onchain

| Check | Result |
| --- | --- |
| Create two vaults with signed rules | Confirmed |
| Commit YES and NO | 25 mUSDC on each side of the funded vault |
| Commit to the underfunded vault | 10 mUSDC |
| Launch after the funding deadline | Funded vault launched |
| Claim LP shares | Positive onchain LP share balance |
| Refund underfunded vault | Position marked claimed; 10 mUSDC returned |
| Ending test wallet balance | 950 mUSDC, from 1,000 initially |
| Settlement terms | Creator signer, initialization instruction and signed memo verified |

## Public receipts

[Machine-readable verification report](../DEVNET-VERIFICATION.json). The report includes every signature, account address, timestamp and postcheck.

- [Create funded vault](https://explorer.solana.com/tx/5PaL687fUAcKS6xYRH3ztxDP9JCvpbyt13coGnEzHKiDyp7mXroUazi6knu1NwW8mrJtF3Fd9B8VrGSet5XFx7Bn?cluster=devnet)
- [Create underfunded vault](https://explorer.solana.com/tx/MvXfiRJ93Sc5NecSyzFo1wEqtKTBGu9r5KaQTkhJZn3r21Gnd5LdgQfHmvSRV6JE7aoAYm12erRsiM75Ymo9BQH?cluster=devnet)
- [Launch](https://explorer.solana.com/tx/5uyRohEpj91i7n2qHntzwSbqUWrLBbLQYuLGVAAzLaBWLSvZt3VewHNmvssecPWoLSBRD5SVTLaSWvAXA2fz1hBT?cluster=devnet)
- [Claim LP shares](https://explorer.solana.com/tx/2MWuMyULWeMruZcyHVuJZfkua8YzivV9ARAHEbTVf3q4shnY9S3oSV6gsNmninTzsGHDuwg5XLbCzMmn8fYpqwow?cluster=devnet)
- [Refund](https://explorer.solana.com/tx/25MXVk6LZpgc7ABgQcDwsKAyAHTQ1Xj9GJtWXE1kDHRguG5wXTHJL3qjLqcBMTJqs9Liio4Hw5NKcg5YBLQ6xDiE?cluster=devnet)

## Automated and product checks

- 23 automated tests, including confirmation success, failure, expiry and timeout.
- Maximum signed question-and-rules transaction: 1,003 bytes (Solana limit: 1,232).
- TypeScript and production build.
- Devnet is the default. Optional mainnet uses Phantom, separate sessions, real USDC and genesis-hash verification before signing. Mainnet reads and mock-wallet checks passed; real mainnet transactions have not been verified.
- Browser simulation stays isolated and explicitly labelled.
- Nine transitive dependency audit nodes remain documented in DEPENDENCY-REVIEW.md.

## Submission status

The app, verified devnet receipts, labelled walkthrough and submission text are prepared. An actual hackathon submission has not been made. Additional wallet support, trading screens, LP withdrawals and an oracle/dispute system remain outside this build’s stated scope.
