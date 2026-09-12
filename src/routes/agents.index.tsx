import { createFileRoute, Link } from "@tanstack/react-router";
import { Bot, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AgentAvatar } from "@/components/negotiator/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { acceptanceRate, avgScore, useNegotiator } from "@/lib/negotiator/store";
import { STRATEGIES, type AgentRole, type Strategy } from "@/lib/negotiator/types";
import { useWallet } from "@/lib/wallet";

export const Route = createFileRoute("/agents/")({
  head: () => ({
    meta: [
      { title: "Agents — AGENT NEGOTIATOR" },
      {
        name: "description",
        content:
          "Create buyer and seller agents with objectives, budgets, constraints and negotiation strategies.",
      },
      { property: "og:title", content: "Agents — AGENT NEGOTIATOR" },
      {
        property: "og:description",
        content: "Design autonomous negotiators: identity, wallet, mandate, constraints and strategy.",
      },
    ],
  }),
  component: AgentsPage,
});

function AgentsPage() {
  const { agents, createAgent } = useNegotiator();
  const { address } = useWallet();

  const [name, setName] = useState("");
  const [role, setRole] = useState<AgentRole>("buyer");
  const [identity, setIdentity] = useState("");
  const [objective, setObjective] = useState("");
  const [budget, setBudget] = useState("100");
  const [strategy, setStrategy] = useState<Strategy>("balanced");
  const [preferences, setPreferences] = useState("Fast turnaround\nClear scope");
  const [constraints, setConstraints] = useState("Milestone-based payment\nNo exclusive rights transfer");
  const [wallet, setWallet] = useState("");

  const submit = () => {
    if (!name.trim()) {
      toast.error("Give your agent a name");
      return;
    }
    const agent = createAgent({
      name: name.trim().toUpperCase(),
      role,
      identity: identity.trim() || "Autonomous negotiation agent",
      wallet: wallet.trim() || address || "0x0000…unlinked",
      objective: objective.trim() || "Close favourable deals within mandate",
      budget: Number(budget) || 0,
      preferences: preferences.split("\n").map((p) => p.trim()).filter(Boolean),
      constraints: constraints.split("\n").map((p) => p.trim()).filter(Boolean),
      strategy,
    });
    toast.success(`${agent.name} deployed`, {
      description: `${role === "buyer" ? "Buyer" : "Seller"} agent registered with the ${strategy} strategy.`,
    });
    setName("");
    setIdentity("");
    setObjective("");
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl sm:text-4xl">Agents</h1>
        <p className="max-w-2xl text-muted-foreground">
          Every agent carries an identity, a wallet, a mandate and hard constraints. Those constraints are what
          GenLayer checks each proposal against.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <section className="glass animate-rise h-fit rounded-2xl p-5 sm:p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <Bot className="size-4 text-primary" /> Create an agent
          </h2>
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" placeholder="ORION-4" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as AgentRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buyer">Buyer agent</SelectItem>
                    <SelectItem value="seller">Seller agent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="identity">Identity</Label>
              <Input
                id="identity"
                placeholder="Procurement agent for a design studio"
                value={identity}
                onChange={(e) => setIdentity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wallet">Wallet</Label>
              <Input
                id="wallet"
                placeholder={address ?? "Connect MetaMask or paste an address"}
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
                className="font-mono text-xs"
              />
              {address && !wallet && (
                <button
                  className="text-xs text-primary hover:underline"
                  onClick={() => setWallet(address)}
                  type="button"
                >
                  Use connected wallet
                </button>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="objective">Objective</Label>
              <Textarea
                id="objective"
                rows={2}
                placeholder="Acquire launch-ready assets at the lowest defensible cost"
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="budget">{role === "buyer" ? "Budget (GEN)" : "Target price (GEN)"}</Label>
                <Input id="budget" value={budget} onChange={(e) => setBudget(e.target.value)} inputMode="numeric" />
              </div>
              <div className="space-y-2">
                <Label>Strategy</Label>
                <Select value={strategy} onValueChange={(v) => setStrategy(v as Strategy)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STRATEGIES.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {STRATEGIES.find((s) => s.id === strategy)?.blurb}
            </p>
            <div className="space-y-2">
              <Label htmlFor="prefs">Preferences — one per line</Label>
              <Textarea id="prefs" rows={3} value={preferences} onChange={(e) => setPreferences(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cons">Hard constraints — one per line</Label>
              <Textarea id="cons" rows={3} value={constraints} onChange={(e) => setConstraints(e.target.value)} />
            </div>
            <Button className="w-full gap-2 bg-gradient-accent text-primary-foreground" onClick={submit}>
              <Plus className="size-4" /> Deploy agent
            </Button>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-xl font-semibold">Registered agents</h2>
          {agents.map((agent) => (
            <Link
              key={agent.id}
              to="/agents/$agentId"
              params={{ agentId: agent.id }}
              className="glass animate-rise block rounded-2xl p-5 transition-transform hover:-translate-y-0.5 hover:glow"
            >
              <div className="flex items-start gap-3">
                <AgentAvatar agent={agent} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-base font-semibold">{agent.name}</h3>
                    <span className="rounded-md border border-border px-2 py-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                      {agent.role}
                    </span>
                    <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] uppercase tracking-wider text-primary">
                      {agent.strategy.replace("_", " ")}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{agent.identity}</p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">{agent.wallet}</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-lg font-semibold">{avgScore(agent)}</p>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Avg score</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                <Cell label="Deals" value={String(agent.stats.dealsCompleted)} />
                <Cell label="Won" value={String(agent.stats.negotiationsWon)} />
                <Cell label="Accepted" value={`${acceptanceRate(agent)}%`} />
                <Cell label="Streak" value={String(agent.stats.streak)} />
              </div>
            </Link>
          ))}
        </section>
      </div>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/40 p-2.5">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="font-display text-sm font-semibold">{value}</p>
    </div>
  );
}
