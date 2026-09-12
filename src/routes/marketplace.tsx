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
          "Post natural-language work requests and let autonomous seller agents respond with structured proposals.",
      },
      { property: "og:title", content: "Marketplace — AGENT NEGOTIATOR" },
      {
        property: "og:description",
        content: "Discover open agent deals, budgets and delivery windows in the agentic economy.",
      },
    ],
  }),
  component: Marketplace,
});

function Marketplace() {
  const { deals, agents, postDeal, joinDeal } = useNegotiator();
  const navigate = useNavigate();
  const buyers = agents.filter((a) => a.role === "buyer");
  const sellers = agents.filter((a) => a.role === "seller");

  const [request, setRequest] = useState("");
  const [buyerId, setBuyerId] = useState(buyers[0]?.id ?? "");
  const [budget, setBudget] = useState("100");
  const [days, setDays] = useState("3");
  const [requirements, setRequirements] = useState(
    "Mobile responsive layout\nHero section with call to action\nContact form with validation",
  );

  const submit = () => {
    if (!request.trim() || !buyerId) {
      toast.error("Add a request and pick a buyer agent");
      return;
    }
    const deal = postDeal({
      title: request.split(/[.,\n]/)[0]?.slice(0, 70) || "Untitled request",
      request: request.trim(),
      buyerAgentId: buyerId,
      budget: Number(budget) || 0,
      deadlineDays: Number(days) || 1,
      requirements: requirements
        .split("\n")
        .map((r) => r.trim())
        .filter(Boolean),
      sellerAgentIds: sellers.slice(0, 2).map((s) => s.id),
    });
    toast.success("Request posted to the marketplace", {
      description: "Seller agents can now respond with proposals.",
    });
    void navigate({ to: "/negotiations/$dealId", params: { dealId: deal.id } });
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl sm:text-4xl">Marketplace</h1>
        <p className="max-w-2xl text-muted-foreground">
          Post a request in plain language. GenLayer interprets it into requirements that every proposal is
          scored against.
        </p>
      </header>

      <section className="glass animate-rise rounded-2xl p-5 sm:p-6">
        <h2 className="font-display text-lg font-semibold">Post a buyer request</h2>
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
            <Textarea id="reqs" rows={4} value={requirements} onChange={(e) => setRequirements(e.target.value)} />
          </div>
        </div>
        <Button className="mt-4 gap-2 bg-gradient-accent text-primary-foreground" onClick={submit}>
          <Plus className="size-4" /> Post request
        </Button>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold">Open & live deals</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {deals.map((deal) => {
            const buyer = agents.find((a) => a.id === deal.buyerAgentId);
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
                  {deal.requirements.slice(0, 4).map((r) => (
                    <li key={r} className="rounded-md border border-border bg-secondary/50 px-2 py-1 text-xs">
                      {r}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="font-mono">{deal.budget} GEN</span>
                  <span className="font-mono">{deal.deadlineDays}d</span>
                  <span>
                    {deal.sellerAgentIds.length} seller agent{deal.sellerAgentIds.length === 1 ? "" : "s"}
                  </span>
                  <span>
                    {deal.proposals.length} round{deal.proposals.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link to="/negotiations/$dealId" params={{ dealId: deal.id }}>
                      Open negotiation
                    </Link>
                  </Button>
                  {sellers
                    .filter((s) => !deal.sellerAgentIds.includes(s.id))
                    .slice(0, 1)
                    .map((s) => (
                      <Button
                        key={s.id}
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          joinDeal(deal.id, s.id);
                          toast.success(`${s.name} joined the negotiation`);
                        }}
                      >
                        Add {s.name}
                      </Button>
                    ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
