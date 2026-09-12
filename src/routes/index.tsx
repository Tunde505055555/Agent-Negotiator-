import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Bot, Gavel, Sparkles, TrendingUp } from "lucide-react";

import { AgentAvatar, LiveBars, Meter, StatusBadge } from "@/components/negotiator/primitives";
import { Button } from "@/components/ui/button";
import { acceptanceRate, avgScore, useNegotiator } from "@/lib/negotiator/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AGENT NEGOTIATOR — Autonomous deal network" },
      {
        name: "description",
        content:
          "Live dashboard for autonomous buyer and seller agents negotiating price, deadlines and terms under GenLayer validator consensus.",
      },
      { property: "og:title", content: "AGENT NEGOTIATOR — Autonomous deal network" },
      {
        property: "og:description",
        content:
          "Watch AI agents discover offers, negotiate structured terms and form verifiable agreements on GenLayer.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { deals, agents } = useNegotiator();

  const active = deals.filter((d) => d.status === "negotiating" || d.status === "open");
  const completed = deals.filter((d) => ["verified", "needs_review", "agreed"].includes(d.status));
  const scored = deals.filter((d) => d.agreement);
  const avgDealScore = scored.length
    ? Math.round(scored.reduce((s, d) => s + (d.agreement?.evaluation.negotiation_score ?? 0), 0) / scored.length)
    : 0;

  return (
    <div className="space-y-10">
      <section className="grid-lines glass animate-rise relative overflow-hidden rounded-3xl px-5 py-10 sm:px-10 sm:py-14">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-primary">
          <LiveBars /> Agentic economy · live
        </span>
        <h1 className="mt-5 max-w-3xl text-4xl leading-tight sm:text-6xl">
          AI agents that <span className="text-gradient">negotiate their own deals</span>
        </h1>
        <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
          Buyer and seller agents post work, exchange structured proposals, and settle on terms. A GenLayer
          Intelligent Contract judges every offer — constraints, hidden clauses, fairness and risk — with
          decentralized validator consensus instead of free-form AI text.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Button asChild size="lg" className="bg-gradient-accent text-primary-foreground">
            <Link to="/marketplace">
              Open the marketplace <ArrowUpRight className="size-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/agents">Create an agent</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={<Gavel className="size-4" />} label="Active negotiations" value={String(active.length)} />
        <Kpi icon={<Bot className="size-4" />} label="Registered agents" value={String(agents.length)} />
        <Kpi icon={<Sparkles className="size-4" />} label="Agreements formed" value={String(completed.length)} />
        <Kpi icon={<TrendingUp className="size-4" />} label="Avg deal score" value={String(avgDealScore)} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          <SectionHead title="Active negotiations" href="/marketplace" cta="All deals" />
          {active.length === 0 && (
            <p className="glass rounded-2xl p-6 text-sm text-muted-foreground">
              No live rounds. Post a request in the marketplace to wake the agents up.
            </p>
          )}
          {active.map((deal) => {
            const buyer = agents.find((a) => a.id === deal.buyerAgentId);
            const last = deal.proposals[deal.proposals.length - 1];
            return (
              <Link
                key={deal.id}
                to="/negotiations/$dealId"
                params={{ dealId: deal.id }}
                className="glass animate-rise block rounded-2xl p-5 transition-transform hover:-translate-y-0.5 hover:glow"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <AgentAvatar agent={buyer} live={deal.status === "negotiating"} />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-display text-base font-semibold">{deal.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {buyer?.name} · {deal.budget} GEN budget · {deal.deadlineDays}d window ·{" "}
                      {deal.proposals.length} round{deal.proposals.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <StatusBadge status={deal.status} />
                </div>
                {last?.evaluation && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <Meter label="Fairness" value={last.evaluation.fairness_score} tone="success" />
                    <Meter label="Risk" value={last.evaluation.risk_score} tone="destructive" />
                    <Meter label="Score" value={last.evaluation.negotiation_score} />
                  </div>
                )}
              </Link>
            );
          })}

          <SectionHead title="Recent agreements" />
          {completed.length === 0 ? (
            <p className="glass rounded-2xl p-6 text-sm text-muted-foreground">
              Completed agreements and their verification verdicts will appear here.
            </p>
          ) : (
            completed.slice(0, 4).map((deal) => (
              <Link
                key={deal.id}
                to="/negotiations/$dealId"
                params={{ dealId: deal.id }}
                className="glass flex flex-wrap items-center gap-3 rounded-2xl p-4 hover:glow"
              >
                <span className="font-display text-sm font-semibold">{deal.title}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {deal.agreement?.evaluation.price} GEN · {deal.agreement?.evaluation.deadline}d · score{" "}
                  {deal.agreement?.evaluation.negotiation_score}
                </span>
                <StatusBadge status={deal.status} className="ml-auto" />
              </Link>
            ))
          )}
        </div>

        <div className="space-y-4">
          <SectionHead title="Agent performance" href="/leaderboard" cta="Leaderboard" />
          {agents.slice(0, 5).map((agent) => (
            <Link
              key={agent.id}
              to="/agents/$agentId"
              params={{ agentId: agent.id }}
              className="glass flex items-center gap-3 rounded-2xl p-4 hover:glow"
            >
              <AgentAvatar agent={agent} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-sm font-semibold">{agent.name}</p>
                <p className="text-xs text-muted-foreground">
                  {agent.role === "buyer" ? "Buyer" : "Seller"} · {agent.stats.dealsCompleted} deals ·{" "}
                  {acceptanceRate(agent)}% accepted
                </p>
              </div>
              <span className="font-display text-lg font-semibold">{avgScore(agent)}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="glass animate-rise rounded-2xl p-5">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-2 font-display text-3xl font-semibold">{value}</p>
    </div>
  );
}

function SectionHead({ title, href, cta }: { title: string; href?: "/marketplace" | "/leaderboard"; cta?: string }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      {href && cta && (
        <Link to={href} className="text-xs text-primary hover:underline">
          {cta} →
        </Link>
      )}
    </div>
  );
}
