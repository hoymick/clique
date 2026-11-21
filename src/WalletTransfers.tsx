import { useRef, useState } from "react";
import { forNetwork } from "./chain";

type Props = {
  network: "devnet" | "mainnet";
  address: string;
  busy: boolean;
  setBusy: (message: string) => void;
  refresh: () => Promise<void>;
};

export function WalletTransfers({network, address, busy, setBusy, refresh}: Props) {
  const chain = forNetwork(network);
  const [panel, setPanel] = useState<"deposit" | "withdraw" | null>(null);
  const [asset, setAsset] = useState<"SOL" | "USDC">("SOL");
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [review, setReview] = useState(false);
  const [message, setMessage] = useState("");
  const [receipt, setReceipt] = useState("");
  const sending = useRef(false);
  const token = network === "mainnet" ? "USDC" : "mUSDC";
  const symbol = asset === "SOL" ? "SOL" : token;

  function open(next: "deposit" | "withdraw") {
    setPanel(next);
    setReview(false);
    setMessage("");
  }

  async function submit() {
    if (sending.current || busy) return;
    setMessage("");
    if (!review) {
      try {
        chain.reviewWithdrawal(asset, amount, recipient);
        setReview(true);
      } catch (error) { setMessage(chain.readableError(error)); }
      return;
    }
    sending.current = true;
    setBusy("Sending withdrawal");
    setReceipt("");
    try {
      const signature = await chain.withdraw(asset, amount, recipient, address);
      setReceipt(signature);
      setAmount("");
      setRecipient("");
      setMessage("Withdrawal confirmed.");
      try { await refresh(); } catch { setMessage("Withdrawal confirmed. Refresh your balance."); }
    } catch (error) { setMessage(chain.readableError(error)); }
    finally { sending.current = false; setBusy(""); setReview(false); }
  }

  return <section aria-label="Wallet transfers">
    <div className="share-actions">
      <button className="button secondary" disabled={busy} onClick={() => open("deposit")}>Deposit</button>
      <button className="button secondary" disabled={busy} onClick={() => open("withdraw")}>Withdraw</button>
    </div>
    {panel === "deposit" && <div className="share-box">
      <strong>Deposit on Solana {network}</strong>
      <p>Send {network === "devnet" ? "devnet SOL" : "SOL"} or {token} to this wallet on Solana {network}.</p>
      <label>Receiving address<input readOnly value={address} onFocus={e => e.currentTarget.select()}/></label>
      <button className="button secondary" onClick={async () => {
        try { await navigator.clipboard.writeText(address); setMessage("Address copied."); }
        catch { setMessage("Select and copy the receiving address."); }
      }}>Copy receiving address</button>
    </div>}
    {panel === "withdraw" && <div className="share-box">
      <strong>{review ? "Review withdrawal" : "Withdraw"} · Solana {network}</strong>
      {review ? <><p>{amount} {symbol} to <strong>{recipient}</strong></p>
        <p>Network fees are paid in SOL.{asset === "USDC" && " Creating a recipient token account may also require SOL."}</p>
        <button className="button secondary" disabled={busy} onClick={() => setReview(false)}>Edit</button></> :
        <><label>Asset <select disabled={busy} value={asset} onChange={e => setAsset(e.target.value as typeof asset)}>
          <option value="SOL">SOL</option><option value="USDC">{token}</option></select></label>
          <label>Recipient wallet<input disabled={busy} value={recipient} onChange={e => setRecipient(e.target.value.trim())}/></label>
          <label>Amount in {symbol}<input disabled={busy} inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value.trim())}/></label></>}
      <button className="button primary" disabled={busy} onClick={submit}>{review ? "Confirm withdrawal" : "Review withdrawal"}</button>
    </div>}
    {message && <p role="status">{message}</p>}
    {receipt && <a href={chain.explorer(receipt,true)} target="_blank" rel="noreferrer">View confirmed withdrawal</a>}
  </section>;
}
