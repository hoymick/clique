import { Buffer } from "buffer";
// Solana and Anchor dependencies require Buffer during module evaluation.
window.Buffer = Buffer;
import("./bootstrap").catch(() => {
  const root = document.getElementById("root");
  if (!root) return;

  const message = document.createElement("p");
  message.textContent = "Clique could not load. Reload to try again.";
  const button = document.createElement("button");
  button.textContent = "Reload Clique";
  button.onclick = () => location.reload();
  root.replaceChildren(message, button);
});
