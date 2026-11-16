import type { Market } from "./types";
export function seedMarkets(): Market[] {
  const now = Date.now();
  const base = {
    demo: true,
    launched: false,
    marketEnd: now + 10 * 86400000,
    positions: {},
  };
  return [
    {
      ...base,
      id: "sample-sol",
      title: "Will SOL reach $250 before the end of 2026?",
      category: "Crypto",
      description:
        "A market for the next chapter of Solana. Pool liquidity to turn this community question into a tradable YES / NO market.",
      creator: "sol.collective",
      source: "Example market · settlement rules are illustrative",
      commitEnd: now + 34 * 3600000,
      yes: 4320,
      no: 2520,
      target: 10000,
      backers: 86,
    },
    {
      ...base,
      id: "sample-ai",
      title: "Will an open-source AI lead the leaderboard?",
      category: "AI",
      description:
        "Back an open question about open intelligence. This is an illustrative demo proposal, not a live claim about an AI benchmark.",
      creator: "openmind",
      commitEnd: now + 8 * 3600000,
      yes: 1540,
      no: 920,
      target: 3000,
      backers: 42,
    },
    {
      ...base,
      id: "sample-mobile",
      title: "Will Solana Mobile announce a new device in 2027?",
      category: "Solana",
      description:
        "Give the mobile community a market of its own. This sample demonstrates the funding experience.",
      creator: "mobile.clique",
      commitEnd: now + 58 * 3600000,
      yes: 840,
      no: 360,
      target: 5000,
      backers: 24,
    },
    {
      ...base,
      id: "sample-btc",
      title: "Will Bitcoin outperform gold this quarter?",
      category: "Crypto",
      description:
        "A launched example showing what happens after a community reaches its funding target. Demo only.",
      creator: "macro.club",
      commitEnd: now - 86400000,
      yes: 3200,
      no: 1800,
      target: 5000,
      backers: 63,
      launched: true,
    },
    {
      ...base,
      id: "sample-sports",
      title: "Will the underdog win the next championship?",
      category: "Sports",
      description:
        "This example missed its funding target. Contributors would be able to reclaim their commitments.",
      creator: "sideline",
      commitEnd: now - 3600000,
      yes: 460,
      no: 320,
      target: 2000,
      backers: 17,
    },
    {
      ...base,
      id: "sample-culture",
      title: "Will a crypto film win a major festival award?",
      category: "Culture",
      description:
        "A question for the culture. Fund the liquidity together before anyone starts trading.",
      creator: "onchain.culture",
      commitEnd: now + 77 * 3600000,
      yes: 530,
      no: 360,
      target: 1500,
      backers: 19,
    },
  ];
}
export function loadDemo() {
  try {
    const saved = JSON.parse(localStorage.getItem("clique-demo-v1") || "null");
    if (saved?.markets?.length && Number.isFinite(saved.balance)) return saved;
  } catch {}
  return { markets: seedMarkets(), balance: 1000, connected: false };
}
