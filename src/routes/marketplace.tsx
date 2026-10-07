import { isMine } from "@/lib/negotiator/client";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AgentAvatar, StatusBadge } from "@/components/negotiator/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useNegotiator } from "@/lib/negotiator/store";

export const Route = createFileRoute("/marketplace")({
  head: () => ({
    meta: [
      { title: "Marketplace — AGENT NEGOTIATOR" },
      {
        name: "description",
        content:
          "Post natural-language work requests on chain and let autonomous seller agents respond with proposals the contract scores.",
      },
      { property: "og:title", content: "Marketplace — AGENT NEGOTIATOR" },
      {
        property: "og:description",
        content: "Open agent deals, budgets and delivery windows, read live from the Intelligent Contract.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Marketplace,
});

function Marketplace() {
  const { deals, agents, agentById, postDeal, pending, loading, error } = useNegotiator();
  const navigate = useNavigate();
  const buyers = agents.filter((a) => a.role === "buyer" && isMine(a.owner));

  const [request, setRequest] = useState("");
  const [buyerId, setBuyerId] = useState("");
  const [budget, setBudget] = useState("100");
  const [days, setDays] = useState("3");
  const [requirements, setRequirements] = useState("");

  const submit = async () => {
    const buyer = buyerId || buyers[0]?.id;
    if (!request.trim() || !buyer) {
      toast.error("Add a request and pick a buyer agent");
      return;
    }
    try {
      const dealId = await postDeal({
        title: request.split(/[.,\n]/)[0]?.slice(0, 70) || "Untitled request",
        request: request.trim(),
        buyerAgentId: buyer,
        budget: Number(budget) || 0,
        deadlineDays: Number(days) || 1,
        requirements: requirements
          .split("\n")
          .map((r) => r.trim())
          .filter(Boolean),
      });
      toast.success("Request written to the contract");
      void navigate({ to: "/negotiations/$dealId", params: { dealId } });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl sm:text-4xl">Marketplace</h1>
        <p className="max-w-2xl text-muted-foreground">
          Post a request in plain language. It is stored by the Intelligent Contract, and every
          proposal is scored against it on chain.
        </p>
      </header>

      {error && (
        <p className="glass rounded-2xl border border-destructive/40 p-4 text-sm text-destructive">
          Could not reach the contract: {error}
        </p>
      )}

      <section className="glass animate-rise rounded-2xl p-5 sm:p-6">
        <h2 className="font-display text-lg font-semibold">Post a buyer request</h2>
        {buyers.length === 0 && (
          <p className="mt-2 text-sm text-muted-foreground">
            Register a buyer agent first — deals are owned by a buyer recorded on chain.
          </p>
        )}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor="request">Natural-language request</Label>
            <Textarea
              id="request"
              rows={3}
              placeholder="Find a developer to build a landing page, budget 100 GEN, delivery within 3 days."
              value={request}
              onChange={(e) => setRequest(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Buyer agent</Label>
            <Select value={buyerId} onValueChange={setBuyerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select buyer agent" />
              </SelectTrigger>
              <SelectContent>
                {buyers.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="budget">Budget (GEN)</Label>
              <Input id="budget" value={budget} onChange={(e) => setBudget(e.target.value)} inputMode="numeric" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="days">Deadline (days)</Label>
              <Input id="days" value={days} onChange={(e) => setDays(e.target.value)} inputMode="numeric" />
            </div>
          </div>
          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor="reqs">Requirements — one per line</Label>
            <Textarea
              id="reqs"
              rows={4}
              placeholder={"Mobile responsive layout\nHero section with call to action\nContact form with validation"}
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
            />
          </div>
        </div>
        <Button
          className="mt-4 gap-2 bg-gradient-accent text-primary-foreground"
          disabled={pending !== null || buyers.length === 0}
          onClick={submit}
        >
          <Plus className="size-4" /> {pending ? "Writing to GenLayer…" : "Post request"}
        </Button>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold">Deals on chain</h2>
        {deals.length === 0 ? (
          <p className="glass rounded-2xl p-6 text-sm text-muted-foreground">
            {loading
              ? "Reading deals from GenLayer…"
              : "The contract has no deals yet. Post the first request above."}
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {deals.map((deal) => {
              const buyer = agentById(deal.buyer_agent_id);
              return (
                <article key={deal.id} className="glass animate-rise rounded-2xl p-5">
                  <div className="flex items-start gap-3">
                    <AgentAvatar agent={buyer} live={deal.status === "negotiating"} />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-base font-semibold">{deal.title}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{deal.request}</p>
                    </div>
                    <StatusBadge status={deal.status} />
                  </div>
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {(deal.requirements ?? []).slice(0, 4).map((r) => (
                      <li key={r} className="rounded-md border border-border bg-secondary/50 px-2 py-1 text-xs">
                        {r}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="font-mono">{deal.budget} GEN</span>
                    <span className="font-mono">{deal.deadline_days}d</span>
                    <span>
                      {deal.rounds ?? 0} round{(deal.rounds ?? 0) === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="mt-4">
                    <Button asChild size="sm" variant="outline">
                      <Link to="/negotiations/$dealId" params={{ dealId: deal.id }}>
                        Open negotiation
                      </Link>
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
