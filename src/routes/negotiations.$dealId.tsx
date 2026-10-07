import { isMine } from "@/lib/negotiator/client";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BadgeCheck, Link2, PlayCircle, Repeat2, Send, ShieldQuestion } from "lucide-react";
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
import { BAND_LABEL, proposalRounds } from "@/lib/negotiator/types";

export const Route = createFileRoute("/negotiations/$dealId")({
  head: () => ({
    meta: [
      { title: "Negotiation room — AGENT NEGOTIATOR" },
      {
        name: "description",
        content:
          "Replay every round of an agent-to-agent negotiation recorded on GenLayer, inspect the consensus verdict, verify the agreement or challenge it.",
      },
      { property: "og:title", content: "Negotiation room — AGENT NEGOTIATOR" },
      {
        property: "og:description",
        content: "Round-by-round replay of autonomous negotiation, recorded by an Intelligent Contract.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NegotiationRoom,
});

function NegotiationRoom() {
  const { dealId } = Route.useParams();
  const {
    deals,
    agents,
    agentById,
    loading,
    pending,
    submitProposal,
    generateCounteroffer,
    verifyAgreement,
    challengeAgreement,
    attachEvidence,
  } = useNegotiator();

  const deal = deals.find((d) => d.id === dealId);

  const [replay, setReplay] = useState<number | null>(null);
  const [claim, setClaim] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [agentId, setAgentId] = useState("");
  const [price, setPrice] = useState("");
  const [deadline, setDeadline] = useState("");
  const [note, setNote] = useState("");

  if (loading && !deal) {
    return <p className="glass rounded-2xl p-6 text-sm text-muted-foreground">Reading the deal from GenLayer…</p>;
  }
  if (!deal) {
    return (
      <div className="glass rounded-2xl p-6">
        <p className="text-sm text-muted-foreground">
          The contract has no deal with id <span className="font-mono">{dealId}</span>.
        </p>
        <Link to="/marketplace" className="mt-3 inline-block text-sm text-primary">
          Back to the marketplace
        </Link>
      </div>
    );
  }

  const sellers = agents.filter((a) => a.role === "seller" && isMine(a.owner));
  const rounds = proposalRounds(deal);
  const visible = replay === null ? rounds : rounds.slice(0, replay);
  const buyer = agentById(deal.buyer_agent_id);
  const last = rounds[rounds.length - 1];
  const competing = [...new Set(rounds.map((r) => r.agent_id))];
  const open = deal.status === "open" || deal.status === "negotiating";
  const busy = pending !== null;

  const send = async () => {
    const seller = agentId || sellers[0]?.id;
    if (!seller) {
      toast.error("Register a seller agent first");
      return;
    }
    try {
      await submitProposal({
        dealId: deal.id,
        agentId: seller,
        price: Number(price) || deal.budget,
        deadlineDays: Number(deadline) || deal.deadline_days,
        deliverables: deal.requirements ?? [],
        quality: "Production ready",
        penalties: "5% per late day, capped at 20%",
        paymentTerms: "50% upfront, 50% on delivery",
        note: note.trim(),
      });
      setNote("");
      setReplay(null);
      toast.success("Validators evaluated the proposal on chain");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-8">
      <Link
        to="/marketplace"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Marketplace
      </Link>

      {pending && (
        <div className="glass rounded-2xl border border-primary/30 p-4 text-sm">
          <span className="font-display font-semibold">{pending}</span>
          <p className="mt-1 text-muted-foreground">
            Waiting for the transaction to be accepted by the GenLayer validator network.
          </p>
        </div>
      )}

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
          <Cell label="Deadline" value={`${deal.deadline_days} days`} />
          <Cell label="Rounds" value={String(deal.rounds ?? rounds.length)} />
          <Cell label="Competing agents" value={String(competing.length)} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {buyer && (
            <span className="flex items-center gap-2 rounded-full border border-border bg-secondary/40 px-2.5 py-1 text-xs">
              <AgentAvatar agent={buyer} size={22} /> {buyer.name} · buyer
            </span>
          )}
          {competing.map((id) => {
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
        {(deal.requirements ?? []).length > 0 && (
          <div>
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground">Requirements</h2>
            <ul className="mt-2 flex flex-wrap gap-2 text-xs">
              {(deal.requirements ?? []).map((r) => (
                <li key={r} className="rounded-md border border-border px-2 py-1">
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}
      </header>

      <DealAnalyzer deal={deal} />

      {deal.status === "agreed" && !deal.verification && (
        <Button
          className="gap-2"
          disabled={busy}
          onClick={async () => {
            try {
              await verifyAgreement(deal.id);
              toast.success("Agreement reviewed on chain");
            } catch (e) {
              toast.error((e as Error).message);
            }
          }}
        >
          <BadgeCheck className="size-4" /> Verify the agreement on chain
        </Button>
      )}

      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-display text-xl font-semibold">Negotiation replay</h2>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setReplay(1)}
              disabled={rounds.length === 0}
            >
              <PlayCircle className="size-4" /> Replay from round 1
            </Button>
            {replay !== null && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setReplay(Math.min(rounds.length, replay + 1))}
                  disabled={replay >= rounds.length}
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
            The contract has recorded no proposals for this deal yet. Submit the first offer below and
            the validator network will evaluate it.
          </p>
        ) : (
          visible.map((r) => (
            <ProposalCard
              key={r.proposal_id}
              round={r}
              agent={agentById(r.agent_id)}
              expanded
              actions={
                open && !r.evaluation.accepted && buyer ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    disabled={busy}
                    onClick={async () => {
                      try {
                        await generateCounteroffer(deal.id, r.proposal_id, buyer.id);
                        toast.success("Counteroffer generated by the contract");
                      } catch (e) {
                        toast.error((e as Error).message);
                      }
                    }}
                  >
                    <Repeat2 className="size-4" /> Counter as {buyer.name}
                  </Button>
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
                  <SelectValue placeholder="Select a seller agent" />
                </SelectTrigger>
                <SelectContent>
                  {sellers.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} · {a.strategy}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="price">Price (GEN)</Label>
                <Input
                  id="price"
                  value={price}
                  placeholder={String(deal.budget)}
                  onChange={(e) => setPrice(e.target.value)}
                  inputMode="numeric"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deadline">Deadline (days)</Label>
                <Input
                  id="deadline"
                  value={deadline}
                  placeholder={String(deal.deadline_days)}
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
            <Button
              className="w-full gap-2 bg-gradient-accent text-primary-foreground"
              disabled={busy || !open}
              onClick={send}
            >
              <Send className="size-4" /> Send to GenLayer
            </Button>
            {!open && (
              <p className="text-xs text-muted-foreground">
                This deal is closed on chain and no longer accepts proposals.
              </p>
            )}
          </div>
        </section>

        <section className="glass space-y-6 rounded-2xl p-5">
          <div>
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <ShieldQuestion className="size-4 text-primary" /> Challenge the verdict
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              File a claim and the contract re-reviews its recorded history, upholding or overturning
              the decision.
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
                disabled={busy || !last}
                onClick={async () => {
                  if (!claim.trim()) {
                    toast.error("Describe the basis of your challenge");
                    return;
                  }
                  try {
                    await challengeAgreement(deal.id, claim.trim());
                    setClaim("");
                    toast.success("Challenge reviewed on chain");
                  } catch (e) {
                    toast.error((e as Error).message);
                  }
                }}
              >
                File challenge
              </Button>
            </div>
            {deal.challenge && (
              <div className="mt-4 rounded-xl border border-border bg-secondary/40 p-4 text-sm">
                <p className="font-display font-semibold">
                  {deal.challenge.final_decision === "OVERTURNED"
                    ? "Decision overturned"
                    : "Decision upheld"}
                </p>
                <p className="mt-1 text-muted-foreground">{deal.challenge.reason}</p>
                <p className="mt-2 font-mono text-xs text-muted-foreground">
                  {BAND_LABEL[deal.challenge.confidence_band]} confidence · {deal.challenge.confidence}%
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-border pt-5">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <Link2 className="size-4 text-primary" /> Attach delivery evidence
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              The contract fetches the URL itself and judges whether it satisfies the agreed
              deliverables.
            </p>
            <div className="mt-4 flex gap-2">
              <Input
                placeholder="https://…"
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
              />
              <Button
                variant="outline"
                disabled={busy}
                onClick={async () => {
                  if (!evidenceUrl.trim()) {
                    toast.error("Add the URL of the delivered work");
                    return;
                  }
                  try {
                    const review = await attachEvidence(deal.id, evidenceUrl.trim());
                    setEvidenceUrl("");
                    toast.success(`Evidence reviewed: ${review?.evidence_status ?? "recorded"}`);
                  } catch (e) {
                    toast.error((e as Error).message);
                  }
                }}
              >
                Submit
              </Button>
            </div>
          </div>
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
