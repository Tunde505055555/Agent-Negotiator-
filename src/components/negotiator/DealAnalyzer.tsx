import { BadgeCheck, ShieldAlert, ShieldX } from "lucide-react";

import { ConsensusPanel } from "./ConsensusPanel";
import { Meter, ScoreDial } from "./primitives";
import { TermList } from "./ProposalCard";
import type { Deal } from "@/lib/negotiator/types";

export function DealAnalyzer({ deal }: { deal: Deal }) {
  const agreement = deal.agreement;
  if (!agreement) {
    return (
      <div className="glass rounded-2xl p-6 text-sm text-muted-foreground">
        The Deal Analyzer unlocks once the agents reach an agreement. Keep negotiating — every round is
        scored as it lands.
      </div>
    );
  }

  const ev = agreement.evaluation;
  const verification = deal.verification;
  const riskLevel = ev.risk_score > 60 ? "High" : ev.risk_score > 35 ? "Medium" : "Low";
  const VerifyIcon =
    verification?.status === "VERIFIED" ? BadgeCheck : verification?.status === "REJECTED" ? ShieldX : ShieldAlert;

  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <h3 className="font-display text-lg font-semibold">Deal Analyzer</h3>
            <p className="text-sm text-muted-foreground">
              Structured output returned by the Intelligent Contract.
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <Field label="Final price" value={`${ev.price} GEN`} />
              <Field label="Deadline" value={`${ev.deadline} days`} />
              <Field label="Risk level" value={riskLevel} />
              <Field label="Confidence" value={`${ev.confidence}%`} />
            </dl>
          </div>
          <ScoreDial value={ev.negotiation_score} label="Negotiation score" />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Meter label="Fairness score" value={ev.fairness_score} tone="success" />
          <Meter label="Risk score" value={ev.risk_score} tone="destructive" />
          <Meter label="Confidence" value={ev.confidence} />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <TermList title="Requirements satisfied" items={ev.requirements_satisfied} tone="success" />
          <TermList title="Requirements not satisfied" items={ev.requirements_failed} tone="destructive" />
        </div>

        <div className="mt-4 rounded-xl border border-border bg-secondary/40 p-4">
          <h4 className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Why the agreement was accepted
          </h4>
          <p className="mt-2 text-sm">{ev.reason}</p>
          <p className="mt-3 font-mono text-xs text-muted-foreground">{ev.final_terms}</p>
        </div>
      </div>

      {verification && (
        <div className="glass rounded-2xl p-5">
          <div className="flex flex-wrap items-center gap-3">
            <VerifyIcon
              className={
                verification.status === "VERIFIED"
                  ? "size-5 text-success"
                  : verification.status === "REJECTED"
                    ? "size-5 text-destructive"
                    : "size-5 text-warning"
              }
            />
            <h3 className="font-display text-lg font-semibold">Deal verification</h3>
            <span className="rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-widest">
              {verification.status}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{verification.reason}</p>
          <div className="mt-4">
            <ConsensusPanel
              validators={verification.validators}
              confidence={verification.confidence}
              subject="final agreement review"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-display text-base font-semibold">{value}</dd>
    </div>
  );
}
