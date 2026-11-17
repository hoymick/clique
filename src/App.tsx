import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Plus,
  Search,
  ChevronDown,
  Check,
  CheckCircle2,
  X,
  Users,
  Clock3,
  ShieldCheck,
  ExternalLink,
  Wallet,
  RefreshCw,
  Loader2,
  SlidersHorizontal,
  Coins,
  ArrowLeft,
  Copy,
  Info,
  TrendingUp,
  Zap,
  Orbit,
  Globe2,
  Activity,
  Layers,
  Download,
} from "lucide-react";
import { validateRules } from "./rules.mjs";
import type { Market, Mode, Position, Proposal } from "./types";
import { loadDemo } from "./data";
import {
  vaultState,
  progress,
  validAmount,
  proposedShare,
  validateQuestion,
  demoCommit,
  demoRefund,
} from "./model.mjs";
import * as chains from "./chain";
const money = (n: number, decimals = 0) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: decimals }).format(n);
const short = (s: string) =>
  s.length > 16 ? s.slice(0, 5) + "…" + s.slice(-5) : s;
const categories = [
  "All topics",
  "Crypto",
  "Solana",
  "AI",
  "Sports",
  "Culture",
];
const stateLabels: Record<string, string> = {
  funding: "Funding",
  ready: "Ready to launch",
  live: "Live market",
  ended: "Market ended",
  refundable: "Refundable",
};
function timeLeft(end: number, now: number) {
  const s = Math.max(0, (end - now) / 1000);
  if (s <= 0) return "Funding closed";
  if (s < 3600) return `${Math.ceil(s / 60)}m left`;
  if (s < 86400)
    return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m left`;
  return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h left`;
}
function Mark({ small = false }: { small?: boolean }) {
  return (
    <img
      className={"mark " + (small ? "small" : "")}
      src="/clique-badge.svg"
      alt=""
      aria-hidden="true"
    />
  );
}
function TopicIcon({ category }: { category: string }) {
  return category === "Crypto" ? (
    <TrendingUp />
  ) : category === "AI" ? (
    <Orbit />
  ) : category === "Solana" ? (
    <Layers />
  ) : category === "Sports" ? (
    <Globe2 />
  ) : category === "Culture" ? (
    <Zap />
  ) : (
    <Users />
  );
}
function HeroArt() {
  return (
    <div className="hero-art" aria-hidden="true">
      <div className="art-noise" />
      <div className="art-grid" />
      <svg className="orbit-lines" viewBox="0 0 520 370">
        <defs>
          <linearGradient id="orbit-gradient">
            <stop stopColor="#477af8" stopOpacity=".8" />
            <stop offset="1" stopColor="#8dc9ff" stopOpacity=".5" />
          </linearGradient>
        </defs>
        <ellipse
          cx="258"
          cy="185"
          rx="206"
          ry="102"
          transform="rotate(-28 258 185)"
        />
        <ellipse
          cx="258"
          cy="185"
          rx="206"
          ry="102"
          transform="rotate(28 258 185)"
        />
        <ellipse cx="258" cy="185" rx="155" ry="155" />
        <path d="M125 95L258 185L390 101M258 185L355 295M258 185L109 261" />
      </svg>
      <div className="central-pool">
        <div className="pool-top">
          <Mark />
          <span>clique</span>
        </div>
        <div className="pool-line" />
        <span className="mono">MANY VOICES. ONE MARKET.</span>
      </div>
      <div className="art-node node-a">
        <Users size={19} />
      </div>
      <div className="art-node node-b">
        <TrendingUp size={18} />
      </div>
      <div className="art-node node-c">
        <Globe2 size={18} />
      </div>
      <div className="art-node node-d">
        <Zap size={17} />
      </div>
      <div className="art-caption caption-a">
        <span className="live-dot" />
        Conviction, pooled.
      </div>
      <div className="art-caption caption-b">
        <span>01 — FUND</span>
        <span>02 — LAUNCH</span>
      </div>
    </div>
  );
}
function Modal({
  children,
  onClose,
  wide = false,
  label,
}: {
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const els = ref.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]),a[href],input,select,textarea,[tabindex="0"]',
        );
        if (!els?.length) return;
        const first = els[0],
          last = els[els.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === ref.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={"modal " + (wide ? "wide" : "")}
      >
        <button
          className="icon-button close-modal"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>
        {children}
      </div>
    </div>
  );
}
export default function App() {
  const [demo, setDemo] = useState(loadDemo);
  const [mode, setMode] = useState<Mode>(() =>
    new URLSearchParams(location.search).get("mode") === "mainnet"
      ? "mainnet"
      : new URLSearchParams(location.search).get("mode") === "demo"
        ? "demo"
        : "devnet",
  );
  const chain = chains.forNetwork(mode === "mainnet" ? "mainnet" : "devnet");
  const networkLabel = mode === "mainnet" ? "Solana mainnet" : "Solana devnet";
  const tokenLabel = mode === "devnet" ? "mUSDC" : "USDC";
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const [liveMarkets, setLiveMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(false);
  const [chainError, setChainError] = useState("");
  const [now, setNow] = useState(Date.now());
  const [view, setView] = useState<"discover" | "positions">("discover");
  const [filter, setFilter] = useState("all");
  const [category, setCategory] = useState("All topics");
  const [search, setSearch] = useState("");
  const [vaultAddress, setVaultAddress] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [sort, setSort] = useState("trending");
  const [selected, setSelected] = useState<string | null>(null);
  const [modal, setModal] = useState<"wallet" | "create" | "how" | null>(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [liveBalance, setLiveBalance] = useState({ usdc: 0, sol: 0 });
  const [positions, setPositions] = useState<Record<string, Position>>({});
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{
    text: string;
    signature?: string;
  } | null>(null);
  const [amount, setAmount] = useState("100");
  const [side, setSide] = useState<"yes" | "no">("yes");
  const [review, setReview] = useState(false);
  const [form, setForm] = useState<Proposal>({
    title: "",
    target: 1000,
    commitHours: 24,
    marketHours: 168,
    category: "Crypto",
    rules: {
      source: "",
      yes: "",
      no: "NO if the YES condition is not met, including missing source data at the stated deadline.",
    },
  });
  const [receipt, setReceipt] = useState<{
    text: string;
    signature?: string;
  } | null>(null);
  const markets: Market[] = mode === "demo" ? demo.markets : liveMarkets;
  const connected = mode === "demo" ? demo.connected : !!walletAddress;
  const balance = mode === "demo" ? demo.balance : liveBalance.usdc;
  const market = markets.find((m) => m.id === selected);
  const activePosition = market
    ? mode === "demo"
      ? market.positions?.you
      : positions[market.id]
    : null;
  useEffect(() => {
    const id = new URLSearchParams(location.search).get("vault");
    if (id) {
      setMode(
        id.startsWith("sample-") || id.startsWith("demo-")
          ? "demo"
          : new URLSearchParams(location.search).get("mode") === "mainnet"
            ? "mainnet"
            : "devnet",
      );
      setSelected(id);
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("clique-demo-v1", JSON.stringify(demo));
    } catch {}
  }, [demo]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 7000);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    let cancelled = false;
    setError("");
    setReview(false);
    setReceipt(null);
    if (selected && mode !== "demo") {
      const m = liveMarkets.find((x) => x.id === selected);
      if (m?.authority)
        chain
          .fetchRules(m.id, m.authority)
          .then((r) => {
            if (r && !cancelled)
              setLiveMarkets((ms) =>
                ms.map((x) => (x.id === m.id ? { ...x, rules: r } : x)),
              );
          })
          .catch((e) => {
            if (!cancelled) setError(chain.readableError(e));
          });
    }
    if (selected && mode !== "demo" && walletAddress)
      chain
        .fetchPosition(selected)
        .then((p) => {
          if (cancelled) return;
          if (p) setPositions((v) => ({ ...v, [selected]: p }));
          else
            setPositions((v) => {
              const n = { ...v };
              delete n[selected];
              return n;
            });
        })
        .catch((e) => {
          if (!cancelled) setError(chain.readableError(e));
        });
    return () => {
      cancelled = true;
    };
  }, [selected, walletAddress, mode, market?.authority]);
  useEffect(() => {
    if (mode === "demo") return;
    void refreshLive();
    const t = setInterval(() => {
      if (!document.hidden && !busy) void refreshLive(true);
    }, 30000);
    return () => clearInterval(t);
  }, [mode, walletAddress, selected]);
  async function refreshLive(quiet = false) {
    const requestedMode = mode;
    if (!quiet) setLoading(true);
    try {
      const next = await chain.fetchVaults(selected || undefined);
      if (modeRef.current !== requestedMode) return;
      setLiveMarkets(next);
      setChainError("");
      if (walletAddress) {
        const results = await Promise.allSettled([
          chain.balances(),
          ...next.map((m) => chain.fetchPosition(m.id)),
        ]);
        if (modeRef.current !== requestedMode) return;
        if (results[0].status === "fulfilled")
          setLiveBalance(results[0].value as { usdc: number; sol: number });
        const p: Record<string, Position> = {};
        next.forEach((m, i) => {
          const r = results[i + 1];
          if (r.status === "fulfilled" && r.value)
            p[m.id] = r.value as Position;
        });
        setPositions(p);
      }
    } catch (e) {
      if (modeRef.current === requestedMode)
        setChainError(chain.readableError(e));
    } finally {
      if (modeRef.current === requestedMode) setLoading(false);
    }
  }
  function changeMode(next: Mode) {
    if (busy) return;
    const url = new URL(location.href);
    url.searchParams.set("mode", next);
    url.searchParams.delete("vault");
    history.replaceState(null, "", url);
    chain.disconnectTestWallet();
    setWalletAddress("");
    setPositions({});
    setLiveBalance({ sol: 0, usdc: 0 });
    setLiveMarkets([]);
    setToast(null);
    setLookupError("");
    setVaultAddress("");
    modeRef.current = next;
    setSelected(null);
    setModal(null);
    setReview(false);
    setError("");
    setChainError("");
    setReceipt(null);
    setMode(next);
    setCategory("All topics");
    setFilter("all");
  }
  function openMarket(m: Market) {
    setSelected(m.id);
    setAmount("100");
    setSide("yes");
    setReview(false);
    setError("");
  }
  function tell(text: string, signature?: string) {
    setToast({ text, signature });
  }
  async function connect() {
    setBusy("Connecting test wallet");
    setError("");
    try {
      if (mode === "demo") {
        setDemo((d: any) => ({ ...d, connected: true }));
        setModal(null);
        tell("Demo wallet ready. You have 1,000 simulated USDC to explore.");
      } else {
        const address =
          mode === "mainnet"
            ? await chain.connectExternalWallet(() => {
                setWalletAddress("");
                setPositions({});
                setLiveBalance({ sol: 0, usdc: 0 });
                setError(
                  "Wallet account changed or disconnected. Reconnect to continue.",
                );
              })
            : chain.connectTestWallet();
        setWalletAddress(address);
        setModal(null);
        tell(
          mode === "mainnet"
            ? "Phantom connected on mainnet. Transactions use real USDC and require wallet approval."
            : "Devnet test wallet connected. Get test funds to begin.",
        );
        try {
          setLiveBalance(await chain.balances());
        } catch (e) {
          setChainError(chain.readableError(e));
        }
      }
    } catch (e) {
      setError(chain.readableError(e));
    } finally {
      setBusy("");
    }
  }
  async function getFunds() {
    setBusy("Requesting test funds");
    setError("");
    try {
      if (mode === "demo") {
        setDemo((d: any) => ({ ...d, balance: d.balance + 1000 }));
        tell("Added 1,000 simulated USDC.");
      } else {
        const r = await chain.faucet();
        const nextBalance = await chain.balances();
        setLiveBalance(nextBalance);
        tell(
          nextBalance.sol < 0.005
            ? `${r.amount} test mUSDC received. You still need free devnet SOL for transaction fees; open Your wallet for the SOL faucet.`
            : `Test funds received: ${r.amount} mUSDC.`,
          r.signature,
        );
      }
    } catch (e) {
      setError(chain.readableError(e));
    } finally {
      setBusy("");
    }
  }
  async function commitFunds() {
    if (!market) return;
    if (!connected) {
      setModal("wallet");
      return;
    }
    if (!validAmount(amount, balance)) {
      setError(
        "Enter at least 1 USDC, up to your available balance, with no more than 6 decimals.",
      );
      return;
    }
    if (!review) {
      setReview(true);
      return;
    }
    setBusy("Confirming commitment");
    setError("");
    try {
      let sig;
      if (mode === "demo") {
        const updated = demoCommit(market, "you", side, Number(amount));
        setDemo((d: any) => ({
          ...d,
          balance: d.balance - Number(amount),
          markets: d.markets.map((m: Market) =>
            m.id === market.id ? updated : m,
          ),
        }));
      } else {
        sig = await chain.commit(market.id, side, Number(amount));
        const results = await Promise.allSettled([
          chain.balances(),
          chain.fetchPosition(market.id),
        ]);
        if (results[0].status === "fulfilled")
          setLiveBalance(results[0].value as { sol: number; usdc: number });
        if (results[1].status === "fulfilled" && results[1].value) {
          const p = results[1].value;
          setPositions((v) => ({ ...v, [market.id]: p }));
        }
        await refreshLive(true);
      }
      setReceipt({
        text: `${money(Number(amount), 6)} ${mode === "demo" ? "demo USDC" : tokenLabel} committed. You’re part of this clique.`,
        signature: sig,
      });
      setReview(false);
      tell("Commitment confirmed.", sig);
    } catch (e) {
      setError(chain.readableError(e));
    } finally {
      setBusy("");
    }
  }
  async function act(action: "launch" | "refund" | "claim") {
    if (!market) return;
    if (!connected) {
      setModal("wallet");
      return;
    }
    setBusy(
      action === "launch"
        ? "Launching market"
        : action === "refund"
          ? "Claiming refund"
          : "Claiming LP shares",
    );
    setError("");
    try {
      let sig;
      if (mode === "demo") {
        if (action === "launch") {
          if (vaultState(market, now) !== "ready")
            throw new Error("This vault is not ready to launch.");
          setDemo((d: any) => ({
            ...d,
            markets: d.markets.map((m: Market) =>
              m.id === market.id ? { ...m, launched: true } : m,
            ),
          }));
        } else if (action === "refund") {
          const updated = demoRefund(market, "you");
          const sum = activePosition!.yes + activePosition!.no;
          setDemo((d: any) => ({
            ...d,
            balance: d.balance + sum,
            markets: d.markets.map((m: Market) =>
              m.id === market.id ? updated : m,
            ),
          }));
        } else {
          if (!activePosition || activePosition.claimed)
            throw new Error("No unclaimed commitment.");
          setDemo((d: any) => ({
            ...d,
            markets: d.markets.map((m: Market) =>
              m.id === market.id
                ? {
                    ...m,
                    positions: {
                      ...m.positions,
                      you: { ...activePosition, claimed: true },
                    },
                  }
                : m,
            ),
          }));
        }
      } else {
        if (action === "launch") {
          const r = await chain.launch(market.id);
          sig = r.signature;
        } else if (action === "refund") sig = await chain.refund(market.id);
        else sig = await chain.claim(market.id, market.marketAddress!);
        await refreshLive();
        if (walletAddress)
          try {
            setLiveBalance(await chain.balances());
          } catch (e) {
            setChainError(chain.readableError(e));
          }
      }
      tell(
        action === "launch"
          ? "Market launched. Community liquidity is now active."
          : action === "refund"
            ? "Refund confirmed. Your commitment has been returned."
            : "Your liquidity-provider shares have been claimed.",
        sig,
      );
      setReceipt({
        text:
          action === "launch"
            ? "Your clique brought this market to life."
            : action === "refund"
              ? "Your commitment has been refunded."
              : "Your LP position is ready.",
        signature: sig,
      });
    } catch (e) {
      setError(chain.readableError(e));
    } finally {
      setBusy("");
    }
  }
  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!connected) {
      setError(
        mode === "mainnet"
          ? "Connect Phantom before proposing a mainnet market."
          : "Connect a test wallet before proposing a market.",
      );
      return;
    }
    if (!validateRules(form.rules)) {
      setError(
        "Add an HTTPS outcome source and specific YES / NO conditions. Keep the complete rules within 450 bytes.",
      );
      return;
    }
    if (
      !validateQuestion(form.title) ||
      !validAmount(form.target) ||
      form.target > 1000000
    ) {
      setError(
        "Use a question of at least 10 characters (59 UTF-8 bytes maximum) and a target between 1 and 1,000,000 USDC.",
      );
      return;
    }
    setBusy("Creating commitment vault");
    setError("");
    try {
      let id, sig;
      if (mode === "demo") {
        id = "demo-" + crypto.randomUUID();
        const end = Date.now() + form.commitHours * 3600000;
        const m: Market = {
          id,
          title: form.title.trim(),
          category: form.category,
          description:
            "A question proposed by you. Gather your clique, pool conviction, and give this market its first liquidity.",
          creator: "you",
          commitEnd: end,
          marketEnd: end + form.marketHours * 3600000,
          yes: 0,
          no: 0,
          target: form.target,
          backers: 0,
          launched: false,
          demo: true,
          rules: form.rules,
          positions: {},
        };
        setDemo((d: any) => ({ ...d, markets: [m, ...d.markets] }));
      } else {
        const r = await chain.createProposal(form);
        id = r.vaultPda;
        sig = r.signature;
        await refreshLive();
      }
      setModal(null);
      setSelected(id);
      setFilter("all");
      setView("discover");
      setSearch("");
      setCategory("All topics");
      setForm({
        title: "",
        target: 1000,
        commitHours: 24,
        marketHours: 168,
        category: "Crypto",
        rules: {
          source: "",
          yes: "",
          no: "NO if the YES condition is not met, including missing source data at the stated deadline.",
        },
      });
      tell("Your proposal is open for funding.", sig);
    } catch (e) {
      setError(chain.readableError(e));
    } finally {
      setBusy("");
    }
  }
  function advanceDemo() {
    if (!market || !market.demo) return;
    const remaining = market.marketEnd - market.commitEnd;
    setDemo((d: any) => ({
      ...d,
      markets: d.markets.map((m: Market) =>
        m.id === market.id
          ? {
              ...m,
              commitEnd: Date.now() - 1000,
              marketEnd: Date.now() + remaining,
            }
          : m,
      ),
    }));
    setNow(Date.now());
    tell("Demo funding window closed. You can now test launch or refund.");
  }
  const visible = markets
    .filter((m) => {
      const s = vaultState(m, now);
      const p = mode === "demo" ? m.positions?.you : positions[m.id];
      return (
        (view !== "positions" || !!p) &&
        (filter === "all" ||
          (filter === "funding" && ["funding", "ready"].includes(s)) ||
          (filter === "live" && s === "live") ||
          (filter === "refundable" && s === "refundable")) &&
        (category === "All topics" || m.category === category) &&
        (m.title.toLowerCase().includes(search.toLowerCase()) ||
          m.creator.toLowerCase().includes(search.toLowerCase()))
      );
    })
    .sort((a, b) =>
      sort === "closing"
        ? a.commitEnd - b.commitEnd
        : sort === "newest"
          ? b.commitEnd - a.commitEnd
          : (b.yes + b.no) / b.target - (a.yes + a.no) / a.target,
    );
  const total = markets.reduce((s, m) => s + m.yes + m.no, 0);
  const liveCount = markets.filter((m) => vaultState(m, now) === "live").length;
  const commitments = markets.reduce((s, m) => s + m.backers, 0);
  const myTotal = markets.reduce((s, m) => {
    const p = mode === "demo" ? m.positions?.you : positions[m.id];
    return s + (p && !p.claimed ? p.yes + p.no : 0);
  }, 0);
  return (
    <>
      <header className="header">
        <div className="nav-wrap">
          <a
            className="brand"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setView("discover");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            aria-label="Clique home"
          >
            <Mark />
            <span>
              clique<span className="brand-period">.</span>
            </span>
          </a>
          <nav aria-label="Main navigation">
            <button
              className={view === "discover" ? "nav-item active" : "nav-item"}
              onClick={() => {
                setView("discover");
                setFilter("all");
              }}
            >
              Discover
            </button>
            <button
              className={view === "positions" ? "nav-item active" : "nav-item"}
              onClick={() => {
                setView("positions");
                setFilter("all");
                setSearch("");
                document
                  .getElementById("markets")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              My commitments
            </button>
            <button className="nav-item" onClick={() => setModal("how")}>
              How it works <ArrowUpRight size={13} />
            </button>
          </nav>
          <div className="header-actions">
            <label
              className={"network " + (mode === "demo" ? "demo-network" : "")}
            >
              <span className="live-dot" />
              <select
                aria-label="Network mode"
                value={mode}
                disabled={!!busy}
                onChange={(e) => changeMode(e.target.value as Mode)}
              >
                <option value="demo">Demo mode</option>
                <option value="devnet">Solana devnet</option>
                <option value="mainnet">Solana mainnet · real funds</option>
              </select>
              <ChevronDown size={12} />
            </label>
            <button
              className="button purple wallet-button"
              onClick={() => setModal("wallet")}
            >
              <Wallet size={15} />
              <span>
                {connected
                  ? mode === "demo"
                    ? "Demo wallet"
                    : short(walletAddress)
                  : mode === "mainnet"
                    ? "Connect Phantom"
                    : "Get started"}
              </span>
            </button>
          </div>
        </div>
      </header>
      <main>
        <section className="hero container">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="eyebrow-dash" />
              COMMUNITY-POWERED MARKETS
            </div>
            <h1>
              Great questions.
              <br />
              <span>Stronger together.</span>
            </h1>
            <p>
              Back the questions worth asking. Pool liquidity with your clique
              and bring a new prediction market to life.
            </p>
            <div className="hero-actions">
              <button
                className="button primary"
                onClick={() => {
                  setError("");
                  setModal("create");
                }}
              >
                <Plus size={17} />
                Propose a market
              </button>
              <button className="text-button" onClick={() => setModal("how")}>
                See how it works <ArrowUpRight size={16} />
              </button>
            </div>
            <div className="hero-proof">
              <span className="solana-symbol">
                <i />
                <i />
                <i />
              </span>
              Built on Solana
              <span className="proof-divider" />
              Powered by PREDICT pm-AMM
            </div>
          </div>
          <HeroArt />
        </section>
        <section className="stats-bar container" aria-label="Market statistics">
          <div className="stats-intro">
            <span className="live-dot" />
            <span>
              {mode === "demo"
                ? "A preview of what we can build."
                : mode === "mainnet"
                  ? "Your saved mainnet vaults."
                  : "Your community, onchain."}
            </span>
            <small>
              {mode === "demo"
                ? "Illustrative markets · simulated funds"
                : mode === "mainnet"
                  ? "Solana mainnet · real USDC"
                  : "Solana devnet · test funds only"}
            </small>
          </div>
          <div className="stat">
            <strong>${money(total)}</strong>
            <span>Liquidity committed</span>
          </div>
          <div className="stat">
            <strong>{money(commitments)}</strong>
            <span>Commitments</span>
          </div>
          <div className="stat">
            <strong>{String(liveCount).padStart(2, "0")}</strong>
            <span>Markets launched</span>
          </div>
        </section>
        <section className="market-section container" id="markets">
          <div className="section-heading">
            <div>
              <div className="eyebrow small-eyebrow">FIND YOUR CLIQUE</div>
              <h2>
                {view === "positions"
                  ? "Your conviction, at work."
                  : "A question today. A market tomorrow."}
              </h2>
            </div>
            <span className="section-note">
              {view === "positions" ? (
                `${money(myTotal, 2)} ${mode === "demo" ? "demo USDC" : tokenLabel} committed`
              ) : (
                <>
                  <span className="live-dot" />
                  Good markets start with people.
                </>
              )}
            </span>
          </div>
          <div className="market-toolbar">
            <div
              className="market-tabs"
              role="tablist"
              aria-label="Market status"
            >
              {[
                ["all", "All markets"],
                ["funding", "Funding"],
                ["live", "Live"],
                ["refundable", "Refundable"],
              ].map(([v, t]) => (
                <button
                  key={v}
                  role="tab"
                  aria-selected={filter === v}
                  className={filter === v ? "selected" : ""}
                  onClick={() => setFilter(v)}
                >
                  {t}
                  {v === "all" && <span>{markets.length}</span>}
                </button>
              ))}
            </div>
            <label className="search">
              <Search size={16} />
              <input
                aria-label="Search markets"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Find your next conviction"
              />
              {search && (
                <button onClick={() => setSearch("")} aria-label="Clear search">
                  <X size={14} />
                </button>
              )}
            </label>
          </div>
          <div className="market-filters">
            <div className="topic-chips">
              {(mode === "demo" ? categories : ["All topics", "Community"]).map(
                (c) => (
                  <button
                    key={c}
                    className={category === c ? "selected" : ""}
                    onClick={() => setCategory(c)}
                  >
                    {c}
                  </button>
                ),
              )}
            </div>
            <label className="sort">
              <SlidersHorizontal size={13} />
              <select
                aria-label="Sort markets"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="trending">Closest to goal</option>
                <option value="closing">Closing soon</option>
                <option value="newest">Latest deadline</option>
              </select>
              <ChevronDown size={12} />
            </label>
          </div>
          {mode !== "demo" && (
            <div className="devnet-notice">
              <Info size={16} />
              <span>
                {mode === "mainnet"
                  ? "Mainnet uses real USDC and SOL. Resolution is creator-controlled and LP value can fall. This release has not been independently audited."
                  : "Live commitment vaults on Solana devnet. mUSDC has no monetary value."}
              </span>
              <button
                className="text-button"
                disabled={loading || !!busy}
                onClick={() => refreshLive()}
              >
                <RefreshCw size={13} className={loading ? "spin" : ""} />
                Refresh
              </button>
            </div>
          )}
          {mode === "mainnet" && (
            <form
              className="mainnet-lookup"
              onSubmit={async (e) => {
                e.preventDefault();
                if (busy) return;
                setBusy("Opening mainnet vault");
                setLookupError("");
                try {
                  const rows = await chain.fetchVaults(vaultAddress.trim());
                  setLiveMarkets(rows);
                  setSelected(vaultAddress.trim());
                  setVaultAddress("");
                } catch (e) {
                  setLookupError(chain.readableError(e));
                } finally {
                  setBusy("");
                }
              }}
            >
              <label htmlFor="mainnet-vault-address">
                Open a shared mainnet vault
              </label>
              <div className="inline-actions">
                <input
                  id="mainnet-vault-address"
                  placeholder="Paste the vault address"
                  value={vaultAddress}
                  onChange={(e) => setVaultAddress(e.target.value)}
                  required
                  autoComplete="off"
                />
                <button
                  className="button secondary"
                  disabled={!!busy || !vaultAddress.trim()}
                >
                  Open vault
                </button>
              </div>
              <small>
                Mainnet shows your saved vaults and shared links. Amounts and
                rules are read from the chain. Saved addresses stay in this
                browser.
              </small>
              {lookupError && (
                <div className="form-error" role="alert">
                  {lookupError}
                </div>
              )}
            </form>
          )}
          {chainError && mode !== "demo" && (
            <div className="error-banner" role="alert">
              {chainError}
              <button onClick={() => refreshLive()} disabled={loading}>
                Retry
              </button>
            </div>
          )}
          {loading && !markets.length ? (
            <div className="empty-state">
              <Loader2 className="spin" />
              <h3>Finding your markets…</h3>
              <p>Reading commitment vaults from {networkLabel}.</p>
            </div>
          ) : (
            <div className="market-grid">
              {visible.map((m) => {
                const s = vaultState(m, now);
                const pc = progress(m);
                const p = mode === "demo" ? m.positions?.you : positions[m.id];
                return (
                  <article
                    key={m.id}
                    className={
                      "market-card " + (s === "live" ? "live-card" : "")
                    }
                  >
                    <div className="card-top">
                      <div
                        className={
                          "topic-icon topic-" + m.category.toLowerCase()
                        }
                      >
                        <TopicIcon category={m.category} />
                      </div>
                      <span className={"status status-" + s}>
                        <span />
                        {stateLabels[s]}
                      </span>
                    </div>
                    <div className="card-category mono">
                      {m.category.toUpperCase()}
                      <span> / </span>
                      {s === "funding"
                        ? timeLeft(m.commitEnd, now)
                        : s === "live"
                          ? "OPEN FOR TRADING"
                          : s === "refundable"
                            ? "REFUND AVAILABLE"
                            : stateLabels[s].toUpperCase()}
                    </div>
                    <button
                      className="card-title"
                      onClick={() => openMarket(m)}
                    >
                      <h3>{m.title}</h3>
                    </button>
                    <div className="card-creator">
                      Proposed by <span>{m.creator}</span>
                    </div>
                    <div className="funding-values">
                      <strong>${money(m.yes + m.no)}</strong>
                      <span>of ${money(m.target)} goal</span>
                      <b>{Math.floor(pc)}%</b>
                    </div>
                    <div
                      className={
                        "progress " + (s === "refundable" ? "failed" : "")
                      }
                      role="progressbar"
                      aria-label="Funding progress"
                      aria-valuenow={Math.round(pc)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div style={{ width: pc + "%" }} />
                    </div>
                    <div className="card-bottom">
                      <div className="backers">
                        <div className="avatar-stack" aria-hidden="true">
                          {(m.demo ? [0, 1, 2] : []).map((v) => (
                            <span
                              key={v}
                              className={
                                "avatar avatar-" + ((v + m.title.length) % 5)
                              }
                            >
                              {["A", "K", "M"][v]}
                            </span>
                          ))}
                        </div>
                        <span>
                          {money(m.backers)} commits
                          {p && !p.claimed && <b> · You’re in</b>}
                        </span>
                      </div>
                      <button
                        className="card-arrow"
                        aria-label={"Open " + m.title}
                        onClick={() => openMarket(m)}
                      >
                        <ArrowUpRight size={20} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          {!loading &&
            visible.length === 0 &&
            !(mode !== "demo" && chainError) && (
              <div className="empty-state">
                <Orbit size={32} />
                <h3>
                  {view === "positions"
                    ? "Your clique starts with a commitment."
                    : search
                      ? "No markets match your search."
                      : "There’s room for your question."}
                </h3>
                <p>
                  {view === "positions"
                    ? "Back a funding market and follow its journey here."
                    : mode !== "demo"
                      ? mode === "mainnet"
                        ? "No saved mainnet vaults yet. Open a shared vault address above, or propose a market with Phantom."
                        : "Be the first to propose a Clique market on devnet."
                      : "Try another topic or propose a market of your own."}
                </p>
                <button
                  className="button secondary"
                  onClick={() => {
                    if (view === "positions") {
                      setView("discover");
                      setFilter("all");
                    } else if (search) {
                      setSearch("");
                      setCategory("All topics");
                      setFilter("all");
                    } else setModal("create");
                  }}
                >
                  {view === "positions"
                    ? "Explore markets"
                    : search
                      ? "Clear filters"
                      : "Propose a market"}
                  <ArrowRight size={15} />
                </button>
              </div>
            )}
        </section>
        <section className="how-strip container">
          <div className="how-intro">
            <Mark small />
            <h2>
              Conviction is better
              <br />
              with company.
            </h2>
            <p>
              You bring the question.
              <br />
              Your clique brings it to life.
            </p>
            <button className="text-button" onClick={() => setModal("how")}>
              The mechanics <ArrowUpRight size={15} />
            </button>
          </div>
          <div className="how-step">
            <span className="step-number">01 / PROPOSE</span>
            <div className="step-icon">
              <Plus />
            </div>
            <h3>Ask a better question.</h3>
            <p>
              Set a liquidity goal and a funding window for your YES / NO
              market.
            </p>
          </div>
          <div className="how-step">
            <span className="step-number">02 / GATHER</span>
            <div className="step-icon">
              <Users />
            </div>
            <h3>Find your people.</h3>
            <p>
              Commit together. Your YES / NO split sets the market’s opening
              price.
            </p>
          </div>
          <div className="how-step">
            <span className="step-number">03 / LAUNCH</span>
            <div className="step-icon">
              <ArrowUpRight />
            </div>
            <h3>Make it a market.</h3>
            <p>
              Reach the goal, launch after funding closes, and claim your LP
              shares.
            </p>
          </div>
        </section>
        <section className="final-cta container">
          <div>
            <span className="eyebrow small-eyebrow">
              THE NEXT MARKET STARTS WITH YOU
            </span>
            <h2>What’s your clique curious about?</h2>
          </div>
          <button
            className="button primary"
            onClick={() => {
              setError("");
              setModal("create");
            }}
          >
            Propose a market
            <ArrowUpRight size={17} />
          </button>
        </section>
      </main>
      <footer className="footer container">
        <a className="brand" href="#">
          <Mark small />
          <span>clique.</span>
        </a>
        <span>Shared conviction. Open possibilities.</span>
        <div>
          <a
            href="https://github.com/hoymick/clique"
            target="_blank"
            rel="noreferrer"
          >
            Source code <ArrowUpRight size={12} />
          </a>
          <a href="/submission/">
            Judge guide <ArrowUpRight size={12} />
          </a>
          <a
            href="https://predict-pm-amm.dev/"
            target="_blank"
            rel="noreferrer"
          >
            PREDICT docs <ArrowUpRight size={12} />
          </a>
          <a
            href="https://hackathons.solana.com/hackathons/perps-and-prediction-markets"
            target="_blank"
            rel="noreferrer"
          >
            Built for Solana <ArrowUpRight size={12} />
          </a>
        </div>
        <span className="footer-network">
          <span className="live-dot" />
          {mode === "demo" ? "Demo environment" : networkLabel}
        </span>
      </footer>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={19} />
          <div>
            {toast.text}
            {toast.signature && (
              <a
                href={chain.explorer(toast.signature, true)}
                target="_blank"
                rel="noreferrer"
              >
                View transaction <ExternalLink size={12} />
              </a>
            )}
          </div>
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast(null)}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {modal === "wallet" && (
        <Modal
          label="Your Clique wallet"
          onClose={() => {
            if (!busy) setModal(null);
          }}
        >
          <div className="modal-icon">
            <Wallet />
          </div>
          <span className="eyebrow small-eyebrow">YOUR SEAT AT THE TABLE</span>
          <h2>
            {connected ? "Your Clique wallet" : "Good questions need a clique."}
          </h2>
          <p className="modal-description">
            {mode === "demo"
              ? "Explore the complete funding experience with simulated USDC. No wallet extension or real money needed."
              : mode === "mainnet"
                ? "Connect Phantom to use your own mainnet wallet. Your private key stays in Phantom; each transaction requires your approval."
                : "Create a browser-based Solana devnet wallet. It signs test transactions only. Never send real funds to this address."}
          </p>
          {connected ? (
            <>
              <div className="wallet-summary">
                <span>
                  {mode === "demo" ? "Demo balance" : `${networkLabel} balance`}
                </span>
                <strong>
                  {money(balance, 2)}{" "}
                  <small>{mode === "demo" ? "demo USDC" : tokenLabel}</small>
                </strong>
                {mode !== "demo" && (
                  <>
                    <code>{short(walletAddress)}</code>
                    <span className="sol-balance">
                      {money(liveBalance.sol, 5)} SOL for{" "}
                      {mode === "mainnet" ? "mainnet" : "test"} transaction fees
                    </span>
                    {mode === "devnet" && liveBalance.sol < 0.005 && (
                      <div className="sol-faucet-note">
                        Copy your wallet address below, request free SOL on the
                        official faucet with Devnet selected, then refresh your
                        balance. Test mUSDC and devnet SOL have no monetary
                        value.
                        <a
                          href="https://faucet.solana.com/"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Get devnet SOL at the official faucet{" "}
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    )}
                    <div className="inline-actions">
                      <button
                        disabled={!!busy}
                        onClick={async () => {
                          setBusy("Refreshing balance");
                          setError("");
                          try {
                            setLiveBalance(await chain.balances());
                            tell(`${networkLabel} balance refreshed.`);
                          } catch (e) {
                            setError(chain.readableError(e));
                          } finally {
                            setBusy("");
                          }
                        }}
                      >
                        Refresh balance <RefreshCw size={12} />
                      </button>
                      <a
                        target="_blank"
                        rel="noreferrer"
                        href={chain.explorer(walletAddress)}
                      >
                        View wallet <ExternalLink size={12} />
                      </a>
                      <button
                        onClick={() =>
                          navigator.clipboard
                            .writeText(walletAddress)
                            .then(() => tell("Wallet address copied."))
                            .catch(() =>
                              setError(
                                "Could not copy. Use the address in Explorer.",
                              ),
                            )
                        }
                      >
                        Copy address <Copy size={12} />
                      </button>
                    </div>
                  </>
                )}
              </div>
              {mode !== "mainnet" && (
                <button
                  className="button primary full"
                  disabled={!!busy}
                  onClick={getFunds}
                >
                  {busy ? (
                    <Loader2 size={16} className="spin" />
                  ) : (
                    <Plus size={16} />
                  )}
                  {mode === "demo" ? "Get demo funds" : "Get test USDC"}
                </button>
              )}
              <button
                className="button secondary full"
                disabled={!!busy}
                onClick={() => {
                  if (mode === "demo")
                    setDemo((d: any) => ({ ...d, connected: false }));
                  else {
                    chain.disconnectTestWallet();
                    setWalletAddress("");
                    setPositions({});
                  }
                  setModal(null);
                  tell("Wallet disconnected.");
                }}
              >
                Disconnect
              </button>
            </>
          ) : (
            <button
              className="button primary full"
              disabled={!!busy}
              onClick={connect}
            >
              {busy ? (
                <Loader2 className="spin" size={16} />
              ) : (
                <Wallet size={16} />
              )}{" "}
              {mode === "demo"
                ? "Try with 1,000 demo USDC"
                : mode === "mainnet"
                  ? "Connect Phantom"
                  : "Create / connect test wallet"}
              <ArrowRight size={16} />
            </button>
          )}
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
          <div className="security-note">
            <ShieldCheck size={16} />
            <span>
              {mode === "demo"
                ? "Demo actions stay in this browser. Switch to Solana devnet for onchain commitments."
                : mode === "mainnet"
                  ? "Real USDC. Private keys stay in Phantom. Review the network, amount and recipient in every wallet request."
                  : "Your test key stays in this browser. Clearing site data removes access. This wallet is not suitable for real funds."}
            </span>
          </div>
          {mode === "demo" && (
            <button
              className="text-button switch-mode"
              onClick={() => changeMode("devnet")}
            >
              Use Solana devnet instead <ArrowUpRight size={14} />
            </button>
          )}
        </Modal>
      )}
      {modal === "how" && (
        <Modal wide label="How Clique works" onClose={() => setModal(null)}>
          <span className="eyebrow small-eyebrow">
            FROM A QUESTION TO A MARKET
          </span>
          <h2>
            Bring your conviction.
            <br />
            <span className="green">We’ll bring it together.</span>
          </h2>
          <div className="explain-grid">
            {[
              [
                "01",
                "Propose",
                "Choose a YES / NO question, a minimum liquidity target, and funding and market durations.",
              ],
              [
                "02",
                "Commit",
                "Backers commit on YES or NO. The split determines the opening price; these commitments fund liquidity, not a winner-takes-all bet.",
              ],
              [
                "03",
                "Launch",
                "Once the funding window closes, a vault that reaches its target can be launched by anyone while the launch window remains open.",
              ],
              [
                "04",
                "Claim or refund",
                "After launch, claim LP shares in proportion to your commitment. If a vault cannot launch under protocol rules, claim your commitment back.",
              ],
            ].map(([n, t, d]) => (
              <div key={n}>
                <span className="step-number">{n}</span>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            ))}
          </div>
          <div className="risk-note">
            <Info size={18} />
            <p>
              <strong>Know what you’re backing.</strong> Liquidity provision can
              lose value. Reaching the target does not guarantee a profit, and
              swap fees are not a promised LP yield. Market outcomes currently
              depend on the creator’s resolution authority; Clique does not add
              an oracle or dispute system.
            </p>
          </div>
          <div className="modal-footer">
            <span>
              {mode === "demo"
                ? "Demo markets use simulated funds."
                : mode === "mainnet"
                  ? "Mainnet uses real USDC and SOL. LP value can fall."
                  : "Devnet uses mUSDC with no monetary value."}
            </span>
            <a
              href="https://predict-pm-amm.dev/"
              target="_blank"
              rel="noreferrer"
            >
              Read the protocol docs <ArrowUpRight size={14} />
            </a>
          </div>
        </Modal>
      )}
      {modal === "create" && (
        <Modal
          label="Propose a market"
          onClose={() => {
            if (!busy) setModal(null);
          }}
        >
          <span className="eyebrow small-eyebrow">
            IT STARTS WITH A QUESTION
          </span>
          <h2>Gather your clique.</h2>
          <p className="modal-description">
            Set the goal. Invite your people. Give a new prediction market its
            first liquidity.
          </p>
          <form onSubmit={create}>
            <label className="field">
              Your YES / NO question
              <textarea
                required
                minLength={10}
                rows={2}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Will SOL reach $250 before the end of 2026?"
              />
              <small>
                {new TextEncoder().encode(form.title).length}/59 bytes · Keep
                the outcome objective and specific.
              </small>
            </label>
            <div className="form-row">
              <label className="field">
                Liquidity goal
                <div className="input-unit">
                  <span>$</span>
                  <input
                    required
                    type="number"
                    min="1"
                    max="1000000"
                    step="0.000001"
                    value={form.target}
                    onChange={(e) =>
                      setForm({ ...form, target: Number(e.target.value) })
                    }
                  />
                  <span>{tokenLabel}</span>
                </div>
              </label>
              <label className="field">
                Topic
                <select
                  disabled={mode !== "demo"}
                  value={mode !== "demo" ? "Community" : form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                >
                  {mode !== "demo" ? (
                    <option>Community</option>
                  ) : (
                    categories.slice(1).map((c) => <option key={c}>{c}</option>)
                  )}
                </select>
              </label>
            </div>
            <div className="form-row">
              <label className="field">
                Funding window
                <select
                  aria-label="Funding window"
                  value={form.commitHours}
                  onChange={(e) =>
                    setForm({ ...form, commitHours: Number(e.target.value) })
                  }
                >
                  <option value={1 / 12}>5 minutes · quick test</option>
                  <option value={1}>1 hour</option>
                  <option value={24}>24 hours</option>
                  <option value={72}>3 days</option>
                </select>
              </label>
              <label className="field">
                Trading duration
                <select
                  aria-label="Trading duration"
                  value={form.marketHours}
                  onChange={(e) =>
                    setForm({ ...form, marketHours: Number(e.target.value) })
                  }
                >
                  <option value={1}>1 hour</option>
                  <option value={24}>24 hours</option>
                  <option value={168}>7 days</option>
                </select>
              </label>
            </div>
            <div className="security-note">
              <Info size={16} />
              <span>
                The trading deadline is fixed relative to the funding deadline.
                Launch promptly after funding closes.{" "}
                {mode !== "demo"
                  ? "The creator is the onchain resolution authority. Onchain vaults are listed under Community."
                  : "This creates a simulated market in your browser."}
              </span>
            </div>
            <fieldset className="settlement-fields">
              <legend>Settlement rules · fixed when created</legend>
              <label className="field">
                Official outcome source
                <input
                  aria-label="Official outcome source"
                  type="url"
                  required
                  placeholder="https://…"
                  value={form.rules.source}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      rules: { ...form.rules, source: e.target.value },
                    })
                  }
                />
              </label>
              <label className="field">
                Resolve YES when
                <textarea
                  aria-label="YES settlement rule"
                  rows={2}
                  required
                  placeholder="State the exact condition, observation time in UTC, and evidence to use."
                  value={form.rules.yes}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      rules: { ...form.rules, yes: e.target.value },
                    })
                  }
                />
              </label>
              <label className="field">
                Resolve NO when / missing-data fallback
                <textarea
                  aria-label="NO settlement rule"
                  rows={2}
                  required
                  value={form.rules.no}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      rules: { ...form.rules, no: e.target.value },
                    })
                  }
                />
                <small>
                  Rules are recorded in a signed memo in the vault creation
                  transaction. Resolution remains creator-controlled.
                </small>
              </label>
            </fieldset>
            {!connected && (
              <button
                type="button"
                className="button secondary full"
                onClick={() => {
                  setError("");
                  setModal("wallet");
                }}
              >
                <Wallet size={15} />
                Connect a {mode === "demo" ? "demo" : "test"} wallet first
              </button>
            )}
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
            <button
              className="button primary full"
              type="submit"
              disabled={
                !!busy ||
                !connected ||
                !validateQuestion(form.title) ||
                !validateRules(form.rules)
              }
            >
              {busy ? (
                <Loader2 className="spin" size={16} />
              ) : (
                <Plus size={16} />
              )}{" "}
              {busy || "Create funding proposal"}
              <ArrowUpRight size={16} />
            </button>
            <div className="form-footnote">
              {mode === "demo"
                ? "Demo mode · no blockchain transaction"
                : `${networkLabel} · ${mode === "mainnet" ? "real" : "test"} SOL required for account creation`}
            </div>
          </form>
        </Modal>
      )}
      {market && !modal && (
        <Modal
          wide
          label={market.title}
          onClose={() => {
            if (!busy) setSelected(null);
          }}
        >
          <div className="detail-layout">
            <div className="detail-main">
              <div className="detail-top">
                <div
                  className={
                    "topic-icon topic-" + market.category.toLowerCase()
                  }
                >
                  <TopicIcon category={market.category} />
                </div>
                <span className={"status status-" + vaultState(market, now)}>
                  <span />
                  {stateLabels[vaultState(market, now)]}
                </span>
              </div>
              <span className="eyebrow small-eyebrow">
                {market.category.toUpperCase()} ·{" "}
                {market.demo ? "DEMO PROPOSAL" : "ONCHAIN PROPOSAL"}
              </span>
              <h2>{market.title}</h2>
              <div className="card-creator">
                Proposed by <span>{market.creator}</span>
              </div>
              <p className="detail-description">{market.description}</p>
              <div className="detail-raised">
                <strong>${money(market.yes + market.no, 2)}</strong>
                <span>committed of ${money(market.target)} goal</span>
                <b>{Math.floor(progress(market))}%</b>
              </div>
              <div className="progress">
                <div style={{ width: progress(market) + "%" }} />
              </div>
              <div className="detail-meta">
                <span>
                  <Users size={15} />
                  {market.backers} commitments
                </span>
                <span>
                  <Clock3 size={15} />
                  {timeLeft(market.commitEnd, now)}
                </span>
              </div>
              <div className="conviction">
                <div>
                  <span>Opening conviction</span>
                  <span>
                    YES{" "}
                    {market.yes + market.no
                      ? Math.round(
                          (market.yes / (market.yes + market.no)) * 100,
                        )
                      : 50}
                    % / NO{" "}
                    {market.yes + market.no
                      ? 100 -
                        Math.round(
                          (market.yes / (market.yes + market.no)) * 100,
                        )
                      : 50}
                    %
                  </span>
                </div>
                <div className="conviction-bar">
                  <i
                    style={{
                      width:
                        (market.yes + market.no
                          ? (market.yes / (market.yes + market.no)) * 100
                          : 50) + "%",
                    }}
                  />
                </div>
              </div>
              <div className="settlement-display">
                <h3>Settlement rules</h3>
                {market.rules ? (
                  <>
                    <a
                      href={market.rules.source}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Official source <ExternalLink size={12} />
                    </a>
                    <p>
                      <b>YES</b> {market.rules.yes}
                    </p>
                    <p>
                      <b>NO</b> {market.rules.no}
                    </p>
                    {market.rules.signature && (
                      <a
                        href={chain.explorer(market.rules.signature, true)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Verify original signed rules <ExternalLink size={12} />
                      </a>
                    )}
                  </>
                ) : (
                  <p>
                    {market.demo
                      ? "Illustrative demo market. Create a proposal to set explicit settlement rules."
                      : "No verified creation rules found yet. Commitments are disabled until the rules can be verified."}
                  </p>
                )}
              </div>
              <div className="detail-rules">
                <h3>
                  <ShieldCheck size={15} /> Before you commit
                </h3>
                <p>
                  Commitments become liquidity-provider shares after launch.
                  Your YES / NO choice influences the opening price; it does not
                  award you outcome tokens. LP value can decrease.
                </p>
                <dl>
                  <div>
                    <dt>Funding closes</dt>
                    <dd>
                      {new Date(market.commitEnd).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </dd>
                  </div>
                  <div>
                    <dt>Trading deadline</dt>
                    <dd>
                      {new Date(market.marketEnd).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </dd>
                  </div>
                  <div>
                    <dt>Outcome resolution</dt>
                    <dd>Creator-controlled</dd>
                  </div>
                </dl>
                {!market.demo && (
                  <a
                    href={chain.explorer(market.id)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Inspect vault on Explorer <ExternalLink size={13} />
                  </a>
                )}
              </div>
              <button
                className="text-button"
                onClick={() => {
                  if (market.demo && market.id.startsWith("demo-")) {
                    tell(
                      "This demo proposal is saved only in this browser. Create a devnet proposal to share it with others.",
                    );
                    return;
                  }
                  const u = new URL(location.href);
                  u.searchParams.set("vault", market.id);
                  u.searchParams.set("mode", mode);
                  navigator.clipboard
                    .writeText(u.toString())
                    .then(() => tell("Market link copied."))
                    .catch(() => tell("Could not copy this link."));
                }}
              >
                Share this question <Copy size={13} />
              </button>
            </div>
            <aside className="commit-panel">
              {receipt ? (
                <div className="receipt">
                  <div className="receipt-icon">
                    <Check size={25} />
                  </div>
                  <h3>You made it happen.</h3>
                  <p>{receipt.text}</p>
                  {receipt.signature && (
                    <a
                      href={chain.explorer(receipt.signature, true)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View transaction <ExternalLink size={13} />
                    </a>
                  )}
                  <button
                    className="button secondary full"
                    onClick={() => setReceipt(null)}
                  >
                    Back to proposal
                    <ArrowLeft size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="panel-heading">
                    <h3>
                      {review
                        ? "Review commitment"
                        : vaultState(market, now) === "funding"
                          ? "Back this market"
                          : stateLabels[vaultState(market, now)]}
                    </h3>
                    <span className="mini-network">
                      {mode === "demo" ? "DEMO" : "DEVNET"}
                    </span>
                  </div>
                  {activePosition && (
                    <div className="your-position">
                      <span>
                        Your commitment
                        {activePosition.claimed ? " · claimed" : ""}
                      </span>
                      <strong>
                        {money(activePosition.yes + activePosition.no, 2)}{" "}
                        {tokenLabel}
                      </strong>
                    </div>
                  )}
                  {vaultState(market, now) === "funding" ? (
                    <>
                      <p className="panel-description">
                        Your commitment helps launch this market. Choose the
                        opening conviction you back.
                      </p>
                      <div className="side-choices">
                        <button
                          disabled={!!busy || review}
                          className={side === "yes" ? "yes selected" : "yes"}
                          onClick={() => setSide("yes")}
                        >
                          YES {side === "yes" && <Check size={14} />}
                        </button>
                        <button
                          disabled={!!busy || review}
                          className={side === "no" ? "no selected" : "no"}
                          onClick={() => setSide("no")}
                        >
                          NO {side === "no" && <Check size={14} />}
                        </button>
                      </div>
                      <label className="amount-label">
                        Commitment amount
                        <div className="amount-field">
                          <span>$</span>
                          <input
                            aria-label="Commitment amount"
                            value={amount}
                            onChange={(e) => {
                              setAmount(e.target.value);
                              setError("");
                            }}
                            inputMode="decimal"
                            disabled={!!busy || review}
                          />
                          <span>{tokenLabel}</span>
                        </div>
                      </label>
                      {!review && (
                        <div className="quick-amounts">
                          {[25, 100, 250].map((a) => (
                            <button
                              key={a}
                              onClick={() => setAmount(String(a))}
                              disabled={!!busy}
                            >
                              ${a}
                            </button>
                          ))}
                          <button
                            disabled={!!busy || !connected}
                            onClick={() =>
                              setAmount(String(Math.floor(balance * 1e6) / 1e6))
                            }
                          >
                            MAX
                          </button>
                        </div>
                      )}
                      <div className="commit-summary">
                        <div>
                          <span>Available balance</span>
                          <span>
                            {connected ? money(balance, 2) : "—"} {tokenLabel}
                          </span>
                        </div>
                        <div>
                          <span>Share of pooled liquidity</span>
                          <span>
                            {validAmount(amount)
                              ? money(proposedShare(market, Number(amount)), 2)
                              : "0"}
                            %
                          </span>
                        </div>
                        <div>
                          <span>Network</span>
                          <span>
                            {mode === "demo" ? "Simulated" : networkLabel}
                          </span>
                        </div>
                      </div>
                      {review && (
                        <div className="review-note">
                          You are committing {money(Number(amount), 6)}{" "}
                          {mode === "demo" ? "simulated USDC" : tokenLabel} to
                          this vault. Funds stay committed until launch or an
                          eligible refund. Your eventual share changes as others
                          contribute.
                        </div>
                      )}
                      <button
                        className="button primary full"
                        disabled={
                          !!busy ||
                          (!market.demo && !market.rules) ||
                          (connected && !validAmount(amount, balance))
                        }
                        onClick={commitFunds}
                      >
                        {busy ? (
                          <Loader2 className="spin" size={16} />
                        ) : review ? (
                          <Check size={16} />
                        ) : (
                          <Wallet size={16} />
                        )}{" "}
                        {busy ||
                          (!connected
                            ? "Connect to commit"
                            : review
                              ? "Confirm commitment"
                              : "Review commitment")}{" "}
                        {!busy && <ArrowUpRight size={16} />}
                      </button>
                      {review && (
                        <button
                          className="text-button full back-edit"
                          onClick={() => setReview(false)}
                          disabled={!!busy}
                        >
                          <ArrowLeft size={14} />
                          Edit commitment
                        </button>
                      )}
                    </>
                  ) : vaultState(market, now) === "ready" ? (
                    <>
                      <p className="panel-description">
                        The funding window closed and the goal was reached.
                        Anyone can launch this vault before its launch window
                        expires.
                      </p>
                      <button
                        className="button primary full"
                        disabled={!!busy}
                        onClick={() => act("launch")}
                      >
                        {busy ? (
                          <Loader2 className="spin" size={16} />
                        ) : (
                          <ArrowUpRight size={16} />
                        )}
                        Launch market
                      </button>
                    </>
                  ) : vaultState(market, now) === "refundable" ? (
                    <>
                      <p className="panel-description">
                        This vault cannot launch under its current funding
                        conditions. Eligible backers can reclaim their unclaimed
                        commitments.
                      </p>
                      <button
                        className="button primary full"
                        disabled={
                          !!busy || !activePosition || activePosition.claimed
                        }
                        onClick={() => act("refund")}
                      >
                        {busy ? (
                          <Loader2 className="spin" size={16} />
                        ) : (
                          <Coins size={16} />
                        )}
                        Claim refund
                      </button>
                      {!activePosition && (
                        <small className="form-footnote">
                          You have no commitment in this vault.
                        </small>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="panel-description">
                        This community reached its goal. Backers can claim their
                        liquidity-provider shares.
                      </p>
                      <button
                        className="button primary full"
                        disabled={
                          !!busy || !activePosition || activePosition.claimed
                        }
                        onClick={() => act("claim")}
                      >
                        {busy ? (
                          <Loader2 className="spin" size={16} />
                        ) : (
                          <Layers size={16} />
                        )}
                        Claim LP shares
                      </button>
                      {!market.demo && market.marketAddress && (
                        <a
                          className="button secondary full"
                          href={chain.explorer(market.marketAddress)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Inspect launched market
                          <ExternalLink size={14} />
                        </a>
                      )}
                      {!activePosition && (
                        <small className="form-footnote">
                          You have no commitment in this vault.
                        </small>
                      )}
                    </>
                  )}
                  {error && (
                    <div className="form-error" role="alert">
                      {error}
                    </div>
                  )}
                  <div className="security-note">
                    <ShieldCheck size={15} />
                    <span>
                      {mode === "demo"
                        ? "Demo funds are simulated and stay in this browser."
                        : mode === "mainnet"
                          ? "Mainnet: real USDC and SOL. Approval is requested in Phantom."
                          : "Transactions use devnet mUSDC. No real funds."}
                    </span>
                  </div>
                </>
              )}
              {market.demo &&
                vaultState(market, now) === "funding" &&
                !review &&
                !receipt && (
                  <details className="demo-controls">
                    <summary>Test the full journey</summary>
                    <p>
                      Close this demo’s funding window to try launching a funded
                      market or refunding an underfunded one.
                    </p>
                    <button
                      className="button secondary full"
                      disabled={!!busy}
                      onClick={advanceDemo}
                    >
                      Close demo funding window
                      <Clock3 size={13} />
                    </button>
                  </details>
                )}
            </aside>
          </div>
        </Modal>
      )}
    </>
  );
}
