export type Rules = {
  source: string;
  yes: string;
  no: string;
  signature?: string;
};
export type Position = { yes: number; no: number; claimed: boolean };
export type Market = {
  id: string;
  title: string;
  category: string;
  description: string;
  creator: string;
  authority?: string;
  source?: string;
  commitEnd: number;
  marketEnd: number;
  yes: number;
  no: number;
  target: number;
  backers: number;
  launched: boolean;
  marketAddress?: string;
  demo: boolean;
  rules?: Rules;
  positions?: Record<string, Position>;
};
export type Mode = "demo" | "devnet" | "mainnet";
export type Proposal = {
  title: string;
  target: number;
  commitHours: number;
  marketHours: number;
  category: string;
  rules: Rules;
};
