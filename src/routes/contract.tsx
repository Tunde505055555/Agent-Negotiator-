import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, FileCode2, Lock } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { GENLAYER_CONTRACT } from "@/lib/negotiator/contract";
import contractSource from "../../contracts/agent_negotiator.py?raw";

const METHODS = [
  { name: "register_agent", kind: "write", blurb: "Stores an agent identity, mandate, constraints and strategy." },
  { name: "post_deal", kind: "write", blurb: "Publishes a natural-language request with budget and requirements." },
  {
    name: "submit_proposal",
    kind: "write",
    blurb: "Evaluates a proposal against the buyer's constraints using comparative consensus.",
  },
  {
    name: "generate_counteroffer",
    kind: "write",
    blurb: "Produces the next offer from the agent's strategy and the negotiation history.",
  },
  {
    name: "verify_agreement",
    kind: "write",
    blurb: "Reviews the agreed terms for internal consistency and hidden conditions.",
  },
  {
    name: "challenge_agreement",
    kind: "write",
    blurb: "Re-reviews a decision with a fresh quorum using the contract's own recorded history; upholds or overturns it.",
  },
  { name: "find_deals", kind: "write", blurb: "Semantic search over the contract's open deal catalog." },
  { name: "list_agents / list_deals", kind: "view", blurb: "Read-only state accessors for the frontend." },
];

export const Route = createFileRoute("/contract")({
  head: () => ({
    meta: [
      { title: "Intelligent Contract — AGENT NEGOTIATOR" },
      {
        name: "description",
        content:
          "The GenLayer Intelligent Contract (Python v0.3.0) that evaluates proposals, generates counteroffers and verifies agreements through validator consensus.",
      },
      { property: "og:title", content: "Intelligent Contract — AGENT NEGOTIATOR" },
      {
        property: "og:description",
        content: "Read the full GenLayer contract source powering autonomous agent negotiation.",
      },
    ],
  }),
  component: ContractPage,
});

function ContractPage() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(contractSource);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="space-y-8">
      <section className="glass rounded-2xl p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[10px] uppercase tracking-widest text-success">
            <Lock className="size-3" /> Deployed · locked
          </span>
          <span className="text-xs text-muted-foreground">{GENLAYER_CONTRACT.network}</span>
        </div>
        <p className="mt-3 break-all font-mono text-sm text-primary select-all" aria-readonly="true">
          {GENLAYER_CONTRACT.address}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          This address is fixed in the build and cannot be changed from the interface.
        </p>
      </section>

      <header className="space-y-2">
        <h1 className="text-3xl sm:text-4xl">The Intelligent Contract</h1>
        <p className="max-w-2xl text-muted-foreground">
          Paste this into GenLayer Studio to deploy. It uses{" "}
          <code className="font-mono text-primary">gl.eq_principle.prompt_comparative</code> so validators reach
          consensus on natural-language judgements, and{" "}
          <code className="font-mono text-primary">gl.nondet.web.render</code> for evidence checks.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2">
        {METHODS.map((m) => (
          <div key={m.name} className="glass animate-rise rounded-2xl p-4">
            <div className="flex items-center gap-2">
              <code className="font-mono text-sm text-primary">{m.name}</code>
              <span className="rounded-md border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                {m.kind}
              </span>
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">{m.blurb}</p>
          </div>
        ))}
      </section>

      <section className="glass overflow-hidden rounded-2xl">
        <div className="flex items-center gap-2 border-b border-border p-3">
          <FileCode2 className="size-4 text-primary" />
          <span className="font-mono text-xs">agent_negotiator.py</span>
          <span className="rounded-md border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
            v0.3.0
          </span>
          <Button size="sm" variant="outline" className="ml-auto gap-1.5" onClick={copy}>
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? "Copied" : "Copy source"}
          </Button>
        </div>
        <pre className="max-h-[70vh] overflow-auto p-4 text-xs leading-relaxed">
          <code className="font-mono">{contractSource}</code>
        </pre>
      </section>
    </div>
  );
}
