/**
 * Deployed GenLayer Intelligent Contract.
 *
 * This value is a compile-time constant and is intentionally NOT editable from
 * the UI: it is frozen, has no setter, and is never read from localStorage,
 * query params or user input. Every agent, deal, proposal, evaluation,
 * verification and challenge shown in this app is read from this address.
 */
export const GENLAYER_CONTRACT = Object.freeze({
  address: "0x84e7d426177A90F51E785b01CE12a480ed19d2eC",
  network: "GenLayer Studio",
  version: "v0.4.0",
  file: "agent_negotiator.py",
} as const);

export const CONTRACT_ADDRESS = GENLAYER_CONTRACT.address;

export function shortAddress(address: string = CONTRACT_ADDRESS): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
