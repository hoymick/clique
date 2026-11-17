// Mirror the existing walkthrough into every deployment; verify exact bytes.
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const assets = {
  "clique-walkthrough.mp4": "09b878769d0c0230ece8418a189c6e9bfba13e0684c8c22cf21aaa62b7bc1766",
  "cover.jpg": "31bee1523dd33c5f3d5ed643242f42906b57d72fa97b7ef3563afea4702aa7f3"
};
const root = new URL('../public/submission/', import.meta.url);
await mkdir(root, { recursive: true });
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
for (const [name, expected] of Object.entries(assets)) {
  const target = new URL(name, root);
  try { if (digest(await readFile(target)) === expected) continue; } catch {}
  const response = await fetch(`https://clique-markets.tinyether2.chatgpt.site/submission/${name}`, {signal: AbortSignal.timeout(60000)});
  if (!response.ok) throw new Error(`Walkthrough download failed: ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (digest(bytes) !== expected) throw new Error(`Walkthrough integrity check failed: ${name}`);
  await writeFile(target, bytes);
  console.log(`Restored ${name}`);
}
