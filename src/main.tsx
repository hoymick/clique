import { Buffer } from "buffer";
// Solana and Anchor dependencies require Buffer during module evaluation.
window.Buffer = Buffer;
import("./bootstrap");
