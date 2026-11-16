import { defineConfig } from "vite";
export default defineConfig({
  build: { outDir: "dist", chunkSizeWarningLimit: 1000 },
  resolve: { dedupe: ["@solana/web3.js", "@anchor-lang/core"] },
  define: { "process.env": {} },
  server: { host: "0.0.0.0" },
});
