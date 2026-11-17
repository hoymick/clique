# Cloudflare hosting

Clique deploys as a separate Cloudflare Worker named `clique`, serving Vite's `dist` directory with SPA fallback. It does not use Porti's Worker, database, or secrets.

## Workers & Pages Git connection

Use the existing Cloudflare account, choose **Create application → Import a repository**, and select `hoymick/clique`.

- Production branch: `main`
- Root directory: `/`
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Node.js: 22
- No database, private keys or runtime secrets are required.

Wrangler's configuration controls asset routing. Preview URLs are disabled. The production workers.dev URL is enabled; a private GitHub repository does not restrict access to the deployed website. If private website access is wanted, configure Cloudflare Access before sharing its URL.

## CLI deployment

```sh
npm ci
npx wrangler login
npm run deploy:cloudflare
```

Select the existing account when prompted. The command prints the actual deployment URL; do not assume a workers.dev account subdomain. Keep authentication tokens out of Git and the browser bundle.

## Verification

```sh
npm test
node scripts/check-rules-tx.cjs
npm run check:cloudflare
```

After deployment, verify the homepage, `/submission/`, the walkthrough video, fonts, demo mode, and that Solana devnet is selected by default. Deployment does not send a Solana transaction. Mainnet remains optional and requires Phantom approval.

The build restores the walkthrough and cover from the existing Clique site with pinned SHA-256 checks. An unavailable or changed asset fails the build, avoiding a deployed broken video. Once downloaded, matching local assets are reused.
