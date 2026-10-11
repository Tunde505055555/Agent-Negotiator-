/**
 * Command-line proof that this repository talks to the deployed GenLayer
 * Intelligent Contract — no browser, no UI state, no simulation.
 *
 *   bun run verify:contract            # read-only: list_agents, list_deals, get_agent, get_deal
 *   bun run verify:contract -- --write # also sends a real register_agent tx and reads it back
 *
 * Uses the same contract address as the app (src/lib/negotiator/contract.ts).
 */
import { createAccount, createClient, generatePrivateKey } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

import { CONTRACT_ADDRESS } from "../src/lib/negotiator/contract";

const address = CONTRACT_ADDRESS as `0x${string}`;
const endpoint = process.env["VITE_GENLAYER_RPC"] ?? studionet.rpcUrls.default.http[0]!;
const account = createAccount(generatePrivateKey());
const client = createClient({ chain: studionet as never, endpoint, account });

async function read(functionName: string, args: unknown[] = []): Promise<string> {
  const result = await client.readContract({ address, functionName, args: args as never[] });
  return typeof result === "string" ? result : String(result);
}

async function main() {
  console.log(`Contract : ${address}`);
  console.log(`RPC      : ${endpoint}`);

  const agentIds = JSON.parse(await read("list_agents")) as string[];
  const dealIds = JSON.parse(await read("list_deals")) as string[];
  console.log(`\nlist_agents -> ${agentIds.length} agent(s) on chain`);
  console.log(`list_deals  -> ${dealIds.length} deal(s) on chain`);

  if (agentIds[0]) console.log(`\nget_agent(${agentIds[0]}) ->`, await read("get_agent", [agentIds[0]]));
  if (dealIds[0]) console.log(`\nget_deal(${dealIds[0]}) ->`, await read("get_deal", [dealIds[0]]));

  if (!process.argv.includes("--write")) return;

  const id = `ag_cli_${Date.now().toString(36)}`;
  console.log(`\nSending register_agent(${id}) as ${account.address} ...`);
  const hash = await client.writeContract({
    address,
    functionName: "register_agent",
    args: [
      id,
      JSON.stringify({
        id,
        name: "CLI-VERIFIER",
        role: "seller",
        identity: "verify-contract script",
        wallet: account.address,
        objective: "Prove the repository writes to the deployed contract",
        budget: 0,
        preferences: [],
        constraints: [],
        strategy: "balanced",
      }),
    ] as never[],
    value: BigInt(0),
  });
  console.log(`tx hash  : ${hash}`);
  await client.waitForTransactionReceipt({
    hash: hash as never,
    status: "ACCEPTED" as never,
    interval: 4000,
    retries: 200,
  });
  console.log(`accepted. get_agent(${id}) ->`, await read("get_agent", [id]));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
