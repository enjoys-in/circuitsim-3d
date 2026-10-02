import type { Circuit } from "../../domain";

const HASH_KEY = "c";

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const b64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function encodeCircuit(circuit: Circuit): string {
  return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(circuit)));
}

export function decodeCircuit(encoded: string): Circuit | null {
  try {
    const data = JSON.parse(new TextDecoder().decode(base64UrlToBytes(encoded))) as Circuit;
    return Array.isArray(data?.instances) && Array.isArray(data?.nets) ? data : null;
  } catch {
    return null;
  }
}

export function buildShareUrl(circuit: Circuit): string {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#${HASH_KEY}=${encodeCircuit(circuit)}`;
}

// Reads a circuit shared via the URL hash (#c=...), or null if absent/invalid.
export function readSharedCircuit(): Circuit | null {
  const encoded = new URLSearchParams(window.location.hash.replace(/^#/, "")).get(HASH_KEY);
  return encoded ? decodeCircuit(encoded) : null;
}

export function clearShareHash(): void {
  history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
}
