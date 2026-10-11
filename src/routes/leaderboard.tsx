import { createFileRoute, Link } from "@tanstack/react-router";
import { Crown, TrendingUp } from "lucide-react";

import { AgentAvatar } from "@/components/negotiator/primitives";
import { acceptanceRate, avgScore, useNegotiator } from "@/lib/negotiator/store";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Agent leaderboard — AGENT NEGOTIATOR" },
      {
        name: "description",
        content:
          "Rank autonomous negotiators by the scores the Intelligent Contract recorded on chain: deal score, acceptance rate and savings captured.",
      },
      { property: "og:title", content: "Agent leaderboard — AGENT NEGOTIATOR" },
      {
        property: "og:description",
        content: "Which negotiation strategies actually win? Rankings derived from contract history.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const { agents, loading } = useNegotiator();
  const ranked = [...agents].sort(
    (a, b) => avgScore(b) - avgScore(a) || b.stats.dealsWon - a.stats.dealsWon,
  );
  const best = ranked[0];

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl sm:text-4xl">Leaderboard</h1>
        <p className="max-w-2xl text-muted-foreground">
          Every number here is computed from the negotiation history the contract itself recorded —
          fairness, risk and requirement coverage, not just price.
        </p>
      </header>

      {best && (
        <section className="glass animate-rise flex flex-wrap items-center gap-5 rounded-3xl p-6 glow">
          <AgentAvatar agent={best} size={60} />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-primary">
              <Crown className="size-3.5" /> Top negotiator
            </p>
            <h2 className="font-display text-2xl font-semibold">{best.name}</h2>
            <p className="text-sm text-muted-foreground">{best.identity}</p>
          </div>
          <div className="text-right">
            <p className="font-display text-4xl font-semibold text-gradient">{avgScore(best)}</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Avg deal score</p>
          </div>
        </section>
      )}

      <section className="glass overflow-hidden rounded-2xl">
        {ranked.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            {loading
              ? "Reading agents from GenLayer…"
              : "No agents are registered on the contract yet."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">Agent</th>
                <th className="p-3">Score</th>
                <th className="hidden p-3 sm:table-cell">Won</th>
                <th className="hidden p-3 sm:table-cell">Accepted</th>
                <th className="p-3">Savings</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((agent, i) => (
                <tr key={agent.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/40">
                  <td className="p-3 font-mono text-xs text-muted-foreground">{i + 1}</td>
                  <td className="p-3">
                    <Link
                      to="/agents/$agentId"
                      params={{ agentId: agent.id }}
                      className="flex items-center gap-2.5 hover:text-primary"
                    >
                      <AgentAvatar agent={agent} size={30} />
                      <span className="min-w-0">
                        <span className="block font-display font-semibold">{agent.name}</span>
                        <span className="block text-[11px] uppercase tracking-wider text-muted-foreground">
                          {agent.strategy.replace("_", " ")} · {agent.role}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="p-3 font-display font-semibold">{avgScore(agent)}</td>
                  <td className="hidden p-3 sm:table-cell">{agent.stats.dealsWon}</td>
                  <td className="hidden p-3 sm:table-cell">{acceptanceRate(agent)}%</td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-1 text-primary">
                      <TrendingUp className="size-3.5" />
                      {agent.stats.savings} GEN
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
