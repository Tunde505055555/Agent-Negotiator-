import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Gavel, PlayCircle, Send, ShieldQuestion } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DealAnalyzer } from "@/components/negotiator/DealAnalyzer";
import { ProposalCard } from "@/components/negotiator/ProposalCard";
import { AgentAvatar, StatusBadge } from "@/components/negotiator/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useNegotiator } from "@/lib/negotiator/store";

export const Route = createFileRoute("/negotiations/$dealId")({
  head: () => ({
    meta: [
      { title: "Negotiation room — AGENT NEGOTIATOR" },
      {
        name: "description",
        content:
          "Replay every round of an agent-to-agent negotiation, inspect validator consensus, accept terms or challenge the verdict.",
      },
      { property: "og:title", content: "Negotiation room — AGENT NEGOTIATOR" },
      {
        property: "og:description",
        content: "Round-by-round replay of autonomous negotiation with on-chain style consensus.",
      },
    ],
  }),
  component: NegotiationRoom,
});

function NegotiationRoom() {
  const { dealId } = Route.useParams();
  const { deals, agents, agentById, submitProposal, acceptProposal, rejectProposal, challengeDeal } =
    useNegotiator();
  const deal = deals.find((d) => d.id === dealId);
  if (!deal) throw notFound();

  const sellers = agents.filter((a) => a.role === "seller");
  const [replay, setReplay] = useState<number | null>(null);
  const [claim, setClaim] = useState("");

  const [agentId, setAgentId] = useState(deal.sellerAgentIds[0] ?? sellers[0]?.id ?? "");
  const [price, setPrice] = useState(String(deal.budget));
  const [deadline, setDeadline] = useState(String(deal.deadlineDays));
  const [note, setNote] = useState("");

  const visible = replay === null ? deal.proposals : deal.proposals.slice(0, replay);
  const buyer = agentById(deal.buyerAgentId);
  const last = deal.proposals[deal.proposals.length - 1];

  const send = () => {
    if (!agentId) {
      toast.error("Pick an agent to negotiate as");
      return;
    }
    submitProposal({
      dealId: deal.id,
      agentId,
      action: "offer",
      terms: {
        price: Number(price) || 0,
        deadlineDays: Number(deadline) || deal.deadlineDays,
        deliverables: deal.requirements,
        quality: "Production ready",
        penalties: "5% per late day, capped at 20%",
        paymentTerms: "50% upfront, 50% on delivery",
      },
      note: note.trim() || "Proposal submitted for GenLayer evaluation.",
      autoCounter: true,
    });
    setNote("");
    setReplay(null);
    toast.success("Proposal evaluated by GenLayer validators");
  };

  return (
    <div className="space-y-8">
      <Link
        to="/marketplace"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Marketplace
      </Link>

      <header className="glass animate-rise space-y-4 rounded-3xl p-6">
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl">{deal.title}</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{deal.request}</p>
          </div>
          <StatusBadge status={deal.status} />
        </div>
        <div className="grid gap-3 text-xs sm:grid-cols-4">
          <Cell label="Budget" value={`${deal.budget} GEN`} />
          <Cell label="Deadline" value={`${deal.deadlineDays} days`} />
          <Cell label="Rounds" value={String(deal.proposals.length)} />
          <Cell label="Competing agents" value={String(deal.sellerAgentIds.length)} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {buyer && (
            <span className="flex items-center gap-2 rounded-full border border-border bg-secondary/40 px-2.5 py-1 text-xs">
              <AgentAvatar agent={buyer} size={22} /> {buyer.name} · buyer
            </span>
          )}
          {deal.sellerAgentIds.map((id) => {
            const a = agentById(id);
            return a ? (
              <span
                key={id}
                className="flex items-center gap-2 rounded-full border border-border bg-secondary/40 px-2.5 py-1 text-xs"
              >
                <AgentAvatar agent={a} size={22} /> {a.name} · seller
              </span>
            ) : null;
          })}
        </div>
        <div>
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground">Requirements</h2>
          <ul className="mt-2 flex flex-wrap gap-2 text-xs">
            {deal.requirements.map((r) => (
              <li key={r} className="rounded-md border border-border px-2 py-1">
                {r}
              </li>
            ))}
          </ul>
        </div>
      </header>

      {deal.agreement && <DealAnalyzer deal={deal} />}

      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-display text-xl font-semibold">Negotiation replay</h2>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setReplay(1)}
              disabled={deal.proposals.length === 0}
            >
              <PlayCircle className="size-4" /> Replay from round 1
            </Button>
            {replay !== null && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setReplay(Math.min(deal.proposals.length, replay + 1))}
                  disabled={replay >= deal.proposals.length}
                >
                  Next round
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setReplay(null)}>
                  Show all
                </Button>
              </>
            )}
          </div>
        </div>

        {visible.length === 0 ? (
          <p className="glass rounded-2xl p-6 text-sm text-muted-foreground">
            No proposals yet. Submit the first offer below and GenLayer validators will evaluate it.
          </p>
        ) : (
          visible.map((p) => (
            <ProposalCard
              key={p.id}
              proposal={p}
              agent={agentById(p.agentId)}
              expanded
              actions={
                deal.status === "negotiating" || deal.status === "open" ? (
                  <div className="flex gap-2">
                    <Button size="sm" className="gap-1.5" onClick={() => acceptProposal(deal.id, p.id)}>
                      <Gavel className="size-4" /> Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => rejectProposal(deal.id, p.id, deal.buyerAgentId)}
                    >
                      Reject
                    </Button>
                  </div>
                ) : undefined
              }
            />
          ))
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="glass rounded-2xl p-5">
          <h2 className="font-display text-lg font-semibold">Submit a proposal</h2>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label>Negotiate as</Label>
              <Select value={agentId} onValueChange={setAgentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} · {a.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="price">Price (GEN)</Label>
                <Input id="price" value={price} onChange={(e) => setPrice(e.target.value)} inputMode="numeric" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deadline">Deadline (days)</Label>
                <Input
                  id="deadline"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  inputMode="numeric"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Natural-language terms</Label>
              <Textarea
                id="note"
                rows={4}
                placeholder="I can deliver all requirements in 10 days, revisions included, milestone payments."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <Button className="w-full gap-2 bg-gradient-accent text-primary-foreground" onClick={send}>
              <Send className="size-4" /> Send to GenLayer
            </Button>
          </div>
        </section>

        <section className="glass rounded-2xl p-5">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <ShieldQuestion className="size-4 text-primary" /> Challenge the verdict
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Disagree with the contract's decision? File a claim and a fresh validator quorum re-reviews the last
            evaluation, upholding or overturning it.
          </p>
          <div className="mt-4 space-y-3">
            <Textarea
              rows={4}
              placeholder="The evaluation ignored that the offer excludes source files, which is a hard requirement."
              value={claim}
              onChange={(e) => setClaim(e.target.value)}
            />
            <Button
              variant="outline"
              className="w-full"
              disabled={!last}
              onClick={() => {
                if (!claim.trim()) {
                  toast.error("Describe the basis of your challenge");
                  return;
                }
                challengeDeal(deal.id, claim.trim());
                setClaim("");
                toast.success("Challenge reviewed by a new validator quorum");
              }}
            >
              File challenge
            </Button>
          </div>
          {deal.challenge && (
            <div className="mt-4 rounded-xl border border-border bg-secondary/40 p-4 text-sm">
              <p className="font-display font-semibold">
                {deal.challenge.final_decision === "OVERTURNED" ? "Decision overturned" : "Decision upheld"}
              </p>
              <p className="mt-1 text-muted-foreground">{deal.challenge.reason}</p>
              <p className="mt-2 font-mono text-xs text-muted-foreground">
                confidence {Math.round(deal.challenge.confidence * 100)}%
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/40 p-3">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="font-display text-base font-semibold">{value}</p>
    </div>
  );
}
