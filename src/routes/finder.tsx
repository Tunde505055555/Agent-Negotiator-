import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, Sparkles } from "lucide-react";
import { useState } from "react";

import { StatusBadge } from "@/components/negotiator/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { findDeals } from "@/lib/negotiator/engine";
import { useNegotiator } from "@/lib/negotiator/store";

const EXAMPLES = [
  "cheapest logo design under 100 GEN in 5 days",
  "reliable backend contractor with milestone payments",
  "fast turnaround video edit with source files",
];

export const Route = createFileRoute("/finder")({
  head: () => ({
    meta: [
      { title: "AI Deal Finder — AGENT NEGOTIATOR" },
      {
        name: "description",
        content:
          "Describe what you want in plain language and let the Intelligent Contract match you to the best live deals on the agent marketplace.",
      },
      { property: "og:title", content: "AI Deal Finder — AGENT NEGOTIATOR" },
      {
        property: "og:description",
        content: "Natural-language deal discovery across every open agent negotiation.",
      },
    ],
  }),
  component: FinderPage,
});

function FinderPage() {
  const { deals } = useNegotiator();
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");

  const results = submitted ? findDeals(submitted, deals) : [];

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl sm:text-4xl">AI Deal Finder</h1>
        <p className="max-w-2xl text-muted-foreground">
          Ask in plain language. The contract reads every open request semantically — no filters, no dropdowns.
        </p>
      </header>

      <section className="glass animate-rise rounded-3xl p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Find me the cheapest reliable option under 150 GEN"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setSubmitted(query)}
            />
          </div>
          <Button
            className="gap-2 bg-gradient-accent text-primary-foreground"
            onClick={() => setSubmitted(query)}
          >
            <Sparkles className="size-4" /> Find deals
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => {
                setQuery(ex);
                setSubmitted(ex);
              }}
              className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            >
              {ex}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        {!submitted ? (
          <p className="glass rounded-2xl p-6 text-sm text-muted-foreground">
            Results appear here, ranked by semantic match against each request, budget and deadline.
          </p>
        ) : results.length === 0 ? (
          <p className="glass rounded-2xl p-6 text-sm text-muted-foreground">
            No live deal matches that description yet. Try relaxing the budget or the timeline.
          </p>
        ) : (
          results.map(({ deal, score, notes }) => (
            <Link
              key={deal.id}
              to="/negotiations/$dealId"
              params={{ dealId: deal.id }}
              className="glass animate-rise block rounded-2xl p-5 transition-transform hover:-translate-y-0.5 hover:glow"
            >
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-display text-base font-semibold">{deal.title}</h2>
                <StatusBadge status={deal.status} />
                <span className="ml-auto font-display text-lg font-semibold text-gradient">{score}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{deal.request}</p>
              <p className="mt-2 text-xs text-primary">{notes.join(" · ")}</p>
              <div className="mt-3 flex flex-wrap gap-3 font-mono text-xs text-muted-foreground">
                <span>budget {deal.budget} GEN</span>
                <span>{deal.deadlineDays} days</span>
                <span>{deal.proposals.length} rounds</span>
              </div>
            </Link>
          ))
        )}
      </section>
    </div>
  );
}
