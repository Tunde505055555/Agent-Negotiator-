/**
 * GenLayer network access layer.
 *
 * Every call in this file goes to the deployed Intelligent Contract at
 * CONTRACT_ADDRESS on GenLayer Studio. Nothing here evaluates proposals,
 * scores deals or invents validator results: reads return contract state and
 * writes are real transactions whose results are read back from the chain.
 */
import { abi, createAccount, createClient, generatePrivateKey } from "genlayer-js";
import { studionet } from "genlayer-js/chains";


import { CONTRACT_ADDRESS } from "./contract";

const KEY_STORAGE = "agent-negotiator-genlayer-key";

export const STUDIO_ENDPOINT =
  (import.meta.env["VITE_GENLAYER_RPC"] as string | undefined) ??
  studionet.rpcUrls.default.http[0]!;

function loadPrivateKey(): `0x${string}` {
  const existing = localStorage.getItem(KEY_STORAGE);
  if (existing && /^0x[0-9a-fA-F]{64}$/.test(existing)) return existing as `0x${string}`;
  const fresh = generatePrivateKey();
  localStorage.setItem(KEY_STORAGE, fresh);
  return fresh;
}

type Client = ReturnType<typeof createClient>;

let cached: { client: Client; address: string } | null = null;

/** Lazily creates the browser-side GenLayer client. Never runs during SSR. */
export function getGenLayer(): { client: Client; address: string } {
  if (typeof window === "undefined") {
    throw new Error("The GenLayer client is only available in the browser.");
  }
  if (cached) return cached;
  const account = createAccount(loadPrivateKey());
  const client = createClient({
    chain: studionet as never,
    endpoint: STUDIO_ENDPOINT,
    account,
  });
  cached = { client, address: account.address };
  return cached;
}

export function signerAddress(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return getGenLayer().address;
  } catch {
    return null;
  }
}

function asText(value: unknown): string {
  if (typeof value === "string") return value;
  if (value == null) return "";
  return String(value);
}

/** Calls a @gl.public.view method and returns its raw string return value. */
export async function readContract(functionName: string, args: unknown[] = []): Promise<string> {
  const { client } = getGenLayer();
  const result = await client.readContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    functionName,
    args: args as never[],
  });
  return asText(result);
}

/** Calls a view method and parses its JSON payload. */
export async function readJson<T>(functionName: string, args: unknown[] = []): Promise<T> {
  return JSON.parse(await readContract(functionName, args)) as T;
}

/**
 * Calls a view method that may raise (e.g. "no verification for this deal")
 * and returns null instead of throwing.
 */
export async function readJsonOrNull<T>(
  functionName: string,
  args: unknown[] = [],
): Promise<T | null> {
  try {
    return await readJson<T>(functionName, args);
  } catch {
    return null;
  }
}

export interface WriteResult {
  hash: string;
  status: string;
  /** The value the contract method returned, decoded from the leader receipt. */
  returned: string | null;
  error: string | null;
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Decodes the calldata-encoded return value carried by a transaction receipt. */
function decodeReturned(receipt: unknown): string | null {
  const leader = (
    receipt as { consensus_data?: { leader_receipt?: { result?: string }[] } } | undefined
  )?.consensus_data?.leader_receipt?.[0];
  if (!leader?.result) return null;
  try {
    let bytes = base64ToBytes(leader.result);
    // The first byte carries the execution status; the payload follows.
    if (bytes.length > 1 && bytes[0] !== undefined && bytes[0] < 2) bytes = bytes.slice(1);
    const decoded = abi.calldata.decode(bytes);
    return typeof decoded === "string" ? decoded : JSON.stringify(decoded);
  } catch {
    return null;
  }
}

/** Sends a real transaction to a @gl.public.write method and waits for it. */
export async function writeContract(
  functionName: string,
  args: unknown[] = [],
): Promise<WriteResult> {
  const { client } = getGenLayer();
  const hash = (await client.writeContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    functionName,
    args: args as never[],
    value: BigInt(0),
  })) as string;

  const receipt = (await client.waitForTransactionReceipt({
    hash: hash as never,
    status: "ACCEPTED" as never,
    interval: 4000,
    retries: 200,
  })) as
    | {
        statusName?: string;
        consensus_data?: { leader_receipt?: { error?: string | null }[] };
      }
    | undefined;

  const error = receipt?.consensus_data?.leader_receipt?.[0]?.error ?? null;
  if (error) throw new Error(String(error));

  return {
    hash,
    status: receipt?.statusName ?? "ACCEPTED",
    returned: decodeReturned(receipt),
    error: null,
  };
}


export function explorerTxUrl(hash: string): string {
  const base = studionet.blockExplorers?.default.url;
  return base ? `${base}/tx/${hash}` : hash;
}
