# Dependency review — 17 November 2026

Scope: the static browser app and local test scripts. No mainnet mode or hosted Node server is included.

## Patch applied

A scoped npm override updates Jayson’s UUID dependency from 8.3.2 to the patched CommonJS-compatible 11.x series (11.1.1 or later within that major). Jayson uses the unchanged v4 API. A JSON-RPC request/response exercise, application tests, transaction serialization and browser build were checked after the update.

Advisory: https://github.com/advisories/GHSA-w5hq-g745-h8pq

`npm audit --json` now reports **9 affected dependency nodes: 6 high and 3 moderate**, down from 13. These are dependency counts, including inherited findings, not nine distinct application exploits. Findings have not been suppressed.

## Remaining findings and observed reachability

| Dependency | Advisory / exposure | Current handling |
| --- | --- | --- |
| bigint-buffer | Native toBigIntLE buffer overflow; no patched version listed in GHSA-3gc7-fjrx-p6mg | Browser sourcemap contains only `bigint-buffer/dist/browser.js`, whose conversion uses JavaScript BigInt and no native binding. Node test scripts should still be treated as affected when native bindings are installed. |
| toml | Parser resource exhaustion and prototype pollution | Absent from browser build sourcemaps. Anchor's Node workspace utilities depend on it; Clique does not parse uploaded TOML. Do not use these utilities on untrusted documents. |
| stream-json | Parser/filter resource exhaustion and prototype pollution | Absent from browser build sourcemaps. Jayson Node utilities retain it; Clique uses the browser JSON-RPC client rather than a Node streaming server. |
| Solana / Anchor / PREDICT packages | Audit findings inherited through the packages above | Preserve protocol compatibility; revisit upstream fixes before any production-money release. |

Primary advisories:

- https://github.com/advisories/GHSA-3gc7-fjrx-p6mg
- https://github.com/advisories/GHSA-h895-cgqg-jf52
- https://github.com/advisories/GHSA-528h-pc64-c93x
- https://github.com/advisories/GHSA-hqr4-qq8f-hg3x
- https://github.com/advisories/GHSA-mjw6-4jj6-33hc

Evidence: a Vite production build with sourcemaps was inspected for dependency module paths. This narrows the observed browser exposure; it does not prove absence of all security defects. Browser test keys are unencrypted in localStorage and are exclusively for disposable devnet assets.

No forced SPL Token downgrade or incompatible parser-major override was applied merely to clear audit counts. Keep the app on devnet, never send real assets to its wallets, and complete live lifecycle verification once a test signing wallet has free devnet SOL.
