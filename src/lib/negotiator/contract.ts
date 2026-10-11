/**
 * Deployed GenLayer Intelligent Contract.
 *
 * This value is a compile-time constant and is intentionally NOT editable from
 * the UI: it is frozen, has no setter, and is never read from localStorage,
 * query params or user input. Every agent, deal, proposal, evaluation,
 * verification and challenge shown in this app is read from this address.
 */
export const GENLAYER_CONTRACT = Object.freeze({
  address: "0xB0Ed22B96A22B97Fa3526deBC18357De4921783A",
  network: "GenLayer Studio",
  version: "v0.5.0",
  file: "agent_negotiator.py",
} as const);

export const CONTRACT_ADDRESS = GENLAYER_CONTRACT.address;

export function shortAddress(address: string = CONTRACT_ADDRESS): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
