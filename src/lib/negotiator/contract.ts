/**
 * Deployed GenLayer Intelligent Contract.
 *
 * This value is a compile-time constant and is intentionally NOT editable from
 * the UI: it is frozen, has no setter, and is never read from localStorage,
 * query params or user input.
 */
export const GENLAYER_CONTRACT = Object.freeze({
  address: "0xE2D7988Fb0558a1D7c19374E7006925974BBC62d",
  network: "GenLayer Studio (localnet)",
  version: "v0.3.0",
  file: "agent_negotiator.py",
} as const);

export const CONTRACT_ADDRESS = GENLAYER_CONTRACT.address;

export function shortAddress(address: string = CONTRACT_ADDRESS): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
