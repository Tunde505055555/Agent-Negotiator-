import { AlertTriangle, CalendarClock, Coins, ShieldCheck } from "lucide-react";

import { ActionBadge, AgentAvatar, Meter } from "./primitives";
import { ConsensusPanel } from "./ConsensusPanel";
import type { Agent, Proposal } from "@/lib/negotiator/types";

export function ProposalCard({
  proposal,
  agent,
  expanded = false,
  actions,
}: {
  proposal: Proposal;
  agent: Agent | undefined;
  expanded?: boolean;
  actions?: React.ReactNode;
}) {
  const ev = proposal.evaluation;
  return (
    <article className="glass animate-rise rounded-2xl p-4 sm:p-5">
      <header className="flex flex-wrap items-center gap-3">
        <AgentAvatar agent={agent} size={38} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-sm font-semibold">{agent?.name ?? "Unknown agent"}</span>
            <ActionBadge action={proposal.action} />
            <span className="text-xs text-muted-foreground">Round {proposal.round}</span>
          </div>
          <p className="truncate text-xs text-muted-foreground">{agent?.identity}</p>
        </div>
        {ev && (
          <div className="text-right">
            <div className="font-display text-lg font-semibold">{ev.negotiation_score}</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Score</div>
          </div>
        )}
      </header>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Stat icon={<Coins className="size-4" />} label="Price" value={`${proposal.terms.price} GEN`} />
        <Stat
          icon={<CalendarClock className="size-4" />}
          label="Deadline"
          value={`${proposal.terms.deadlineDays} day${proposal.terms.deadlineDays === 1 ? "" : "s"}`}
        />
        <Stat
          icon={<ShieldCheck className="size-4" />}
          label="Payment"
          value={proposal.terms.paymentTerms || "—"}
        />
      </div>

      {proposal.terms.deliverables.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {proposal.terms.deliverables.map((d) => (
            <li key={d} className="rounded-md border border-border bg-secondary/50 px-2 py-1 text-xs">
              {d}
            </li>
          ))}
        </ul>
      )}

      {proposal.note && <p className="mt-3 text-sm text-muted-foreground">{proposal.note}</p>}

      {ev && (
        <div className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <Meter label="Fairness" value={ev.fairness_score} tone="success" />
            <Meter label="Risk" value={ev.risk_score} tone="destructive" />
            <Meter label="Confidence" value={ev.confidence} />
          </div>

          {ev.hidden_conditions.length > 0 && (
            <div className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-medium">Hidden or unreasonable conditions detected</p>
                <p className="mt-1">{ev.hidden_conditions.join(" · ")}</p>
              </div>
            </div>
          )}

          <p className="text-sm">
            <span className="text-muted-foreground">GenLayer verdict: </span>
            <span className="font-medium uppercase tracking-wide">{ev.proposal_status}</span>
            {" — "}
            {ev.reason}
          </p>

          {expanded && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <TermList title="Requirements satisfied" items={ev.requirements_satisfied} tone="success" />
                <TermList title="Requirements not satisfied" items={ev.requirements_failed} tone="destructive" />
              </div>
              <ConsensusPanel
                validators={ev.validators}
                confidence={ev.confidence}
                subject="proposal evaluation"
              />
            </>
          )}
        </div>
      )}

      {actions && <div className="mt-4 flex flex-wrap gap-2">{actions}</div>}
    </article>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/40 p-3">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 truncate font-display text-sm font-semibold">{value}</div>
    </div>
  );
}

export function TermList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "success" | "destructive";
}) {
  return (
    <div className="rounded-xl border border-border p-3">
      <h5 className="text-[11px] uppercase tracking-widest text-muted-foreground">{title}</h5>
      {items.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">None</p>
      ) : (
        <ul className="mt-2 space-y-1 text-xs">
          {items.map((i) => (
            <li
              key={i}
              className={tone === "success" ? "text-success" : "text-destructive"}
            >
              {tone === "success" ? "✓" : "✕"} {i}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
