import { cn } from "@/lib/utils";
import type { Agent, DealStatus, ProposalAction } from "@/lib/negotiator/types";

const STATUS_MAP: Record<DealStatus, { label: string; className: string }> = {
  open: { label: "Open", className: "bg-primary/15 text-primary border-primary/30" },
  negotiating: {
    label: "Negotiating",
    className: "bg-accent/15 text-accent border-accent/30",
  },
  agreed: { label: "Agreed", className: "bg-success/15 text-success border-success/30" },
  verified: { label: "Verified", className: "bg-success/20 text-success border-success/40" },
  needs_review: { label: "Needs review", className: "bg-warning/15 text-warning border-warning/35" },
  rejected: { label: "Rejected", className: "bg-destructive/15 text-destructive border-destructive/35" },
  failed: { label: "Failed", className: "bg-muted text-muted-foreground border-border" },
};

export function StatusBadge({ status, className }: { status: DealStatus; className?: string }) {
  const cfg = STATUS_MAP[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-widest",
        cfg.className,
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {cfg.label}
    </span>
  );
}

const ACTION_MAP: Record<ProposalAction, { label: string; className: string }> = {
  offer: { label: "Offer", className: "text-primary border-primary/30 bg-primary/10" },
  counter: { label: "Counteroffer", className: "text-accent border-accent/30 bg-accent/10" },
  accept: { label: "Accepted", className: "text-success border-success/30 bg-success/10" },
  reject: { label: "Rejected", className: "text-destructive border-destructive/30 bg-destructive/10" },
  withdraw: { label: "Withdrawn", className: "text-muted-foreground border-border bg-muted/40" },
};

export function ActionBadge({ action }: { action: ProposalAction }) {
  const cfg = ACTION_MAP[action];
  return (
    <span
      className={cn(
        "rounded-md border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider",
        cfg.className,
      )}
    >
      {cfg.label}
    </span>
  );
}

export function AgentAvatar({
  agent,
  size = 40,
  live = false,
}: {
  agent: Agent | undefined;
  size?: number;
  live?: boolean;
}) {
  const initials = (agent?.name ?? "??")
    .replace(/[^A-Za-z0-9 -]/g, "")
    .split(/[ -]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("");

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-xl border border-border font-display text-sm font-semibold text-primary-foreground",
        live && "animate-pulse-ring",
      )}
      style={{
        width: size,
        height: size,
        backgroundImage:
          agent?.role === "buyer"
            ? "linear-gradient(140deg, oklch(0.82 0.16 185), oklch(0.66 0.15 232))"
            : "linear-gradient(140deg, oklch(0.72 0.18 320), oklch(0.62 0.19 288))",
      }}
      aria-hidden
    >
      {initials || "AG"}
    </span>
  );
}

export function ScoreDial({
  value,
  label,
  size = 92,
}: {
  value: number;
  label: string;
  size?: number;
}) {
  const angle = Math.max(0, Math.min(100, value)) * 3.6;
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative grid place-items-center rounded-full"
        style={{
          width: size,
          height: size,
          background: `conic-gradient(oklch(0.82 0.16 185) ${angle}deg, oklch(0.99 0 0 / 0.08) ${angle}deg)`,
        }}
      >
        <div className="grid size-[76%] place-items-center rounded-full bg-card">
          <span className="font-display text-xl font-semibold">{Math.round(value)}</span>
        </div>
      </div>
      <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
    </div>
  );
}

export function Meter({
  value,
  label,
  tone = "primary",
}: {
  value: number;
  label: string;
  tone?: "primary" | "warning" | "destructive" | "success";
}) {
  const toneClass = {
    primary: "bg-primary",
    warning: "bg-warning",
    destructive: "bg-destructive",
    success: "bg-success",
  }[tone];
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono">{Math.round(value)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all duration-700", toneClass)}
          style={{ width: `${Math.max(2, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

export function LiveBars({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-end gap-0.5", className)} aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-0.5 rounded-full bg-primary animate-ticker"
          style={{ height: 12 - i * 2, animationDelay: `${i * 180}ms` }}
        />
      ))}
    </span>
  );
}
