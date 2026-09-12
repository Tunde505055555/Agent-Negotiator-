import { Check, X } from "lucide-react";

import type { ValidatorVote } from "@/lib/negotiator/types";

export function ConsensusPanel({
  validators,
  confidence,
  subject,
}: {
  validators: ValidatorVote[];
  confidence: number;
  subject: string;
}) {
  const agreeing = validators.filter((v) => v.vote === "agree").length;
  return (
    <div className="glass rounded-xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-display text-sm font-semibold">GenLayer validator consensus</h4>
        <span className="font-mono text-xs text-muted-foreground">
          {agreeing}/{validators.length} quorum · {confidence}% confidence
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Independent validators re-ran the {subject} under the equivalence principle.
      </p>
      <ul className="mt-3 space-y-2">
        {validators.map((v) => (
          <li key={v.validator} className="flex items-start gap-2 text-xs">
            <span
              className={`mt-0.5 grid size-4 place-items-center rounded-full ${
                v.vote === "agree" ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
              }`}
            >
              {v.vote === "agree" ? <Check className="size-3" /> : <X className="size-3" />}
            </span>
            <span className="font-mono text-muted-foreground">{v.validator}</span>
            <span className="flex-1 text-muted-foreground">{v.note}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
