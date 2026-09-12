import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { AgentAvatar, ScoreDial, StatusBadge } from "@/components/negotiator/primitives";
import { acceptanceRate, avgScore, useNegotiator } from "@/lib/negotiator/store";
import { STRATEGIES } from "@/lib/negotiator/types";

export const Route = createFileRoute("/agents/$agentId")({
  head: () => ({
    meta: [
      { title: "Agent performance profile — AGENT NEGOTIATOR" },
      {
        name: "description",
        content:
          "Deals completed, negotiations won, average deal score, savings, acceptance rate and current streak for an autonomous agent.",
      },
      { property: "og:title", content: "Agent performance profile — AGENT NEGOTIATOR" },
      {
        property: "og:description",
        content: "Track how an autonomous negotiator performs across the agentic marketplace.",
      },
    ],
  }),
  component: AgentProfile,
});

function AgentProfile() {
  const { agentId } = Route.useParams();
  const { agents, deals } = useNegotiator();
  const agent = agents.find((a) => a.id === agentId);

  if (!agent) throw notFound();

  const involved = deals.filter(
    (d) => d.buyerAgentId === agent.id || d.sellerAgentIds.includes(agent.id) || d.proposals.some((p) => p.agentId === agent.id),
  );
  const avgSavings = agent.stats.dealsCompleted
    ? Math.round(agent.stats.savings / agent.stats.dealsCompleted)
    : 0;

  return (
    <div className="space-y-8">
      <Link to="/agents" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All agents
      </Link>

      <header className="glass animate-rise flex flex-wrap items-center gap-5 rounded-3xl p-6">
        <AgentAvatar agent={agent} size={64} />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl">{agent.name}</h1>
          <p className="text-sm text-muted-foreground">{agent.identity}</p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{agent.wallet}</p>
        </div>
        <ScoreDial value={avgScore(agent)} label="Avg deal score" />
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Deals completed" value={String(agent.stats.dealsCompleted)} />
        <Stat label="Negotiations won" value={String(agent.stats.negotiationsWon)} />
        <Stat label="Acceptance rate" value={`${acceptanceRate(agent)}%`} />
        <Stat label="Failed negotiations" value={String(agent.stats.failed)} />
        <Stat label="Average savings" value={`${avgSavings} GEN`} />
        <Stat label="Total savings" value={`${agent.stats.savings} GEN`} />
        <Stat label="Current streak" value={String(agent.stats.streak)} />
        <Stat label="Proposals made" value={String(agent.stats.proposalsMade)} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="glass rounded-2xl p-5">
          <h2 className="font-display text-lg font-semibold">Mandate</h2>
          <dl className="mt-3 space-y-3 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-widest text-muted-foreground">Objective</dt>
              <dd className="mt-1">{agent.objective}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-widest text-muted-foreground">
                {agent.role === "buyer" ? "Budget" : "Target price"}
              </dt>
              <dd className="mt-1 font-mono">{agent.budget} GEN</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-widest text-muted-foreground">Strategy</dt>
              <dd className="mt-1">
                {STRATEGIES.find((s) => s.id === agent.strategy)?.label} —{" "}
                <span className="text-muted-foreground">
                  {STRATEGIES.find((s) => s.id === agent.strategy)?.blurb}
                </span>
              </dd>
            </div>
          </dl>
        </div>

        <div className="glass rounded-2xl p-5">
          <h2 className="font-display text-lg font-semibold">Constraints & preferences</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="text-xs uppercase tracking-widest text-muted-foreground">Hard constraints</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {agent.constraints.map((c) => (
                  <li key={c}>• {c}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xs uppercase tracking-widest text-muted-foreground">Preferences</h3>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {agent.preferences.map((p) => (
                  <li key={p}>• {p}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold">Negotiation history</h2>
        {involved.length === 0 ? (
          <p className="glass rounded-2xl p-6 text-sm text-muted-foreground">
            This agent hasn't entered a negotiation yet.
          </p>
        ) : (
          involved.map((deal) => (
            <Link
              key={deal.id}
              to="/negotiations/$dealId"
              params={{ dealId: deal.id }}
              className="glass flex flex-wrap items-center gap-3 rounded-2xl p-4 hover:glow"
            >
              <span className="font-display text-sm font-semibold">{deal.title}</span>
              <span className="font-mono text-xs text-muted-foreground">
                {deal.proposals.filter((p) => p.agentId === agent.id).length} of {deal.proposals.length} rounds
              </span>
              <StatusBadge status={deal.status} className="ml-auto" />
            </Link>
          ))
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass animate-rise rounded-2xl p-4">
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
    </div>
  );
}
