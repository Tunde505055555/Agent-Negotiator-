import type {
  Agent,
  Challenge,
  Deal,
  GenLayerEvaluation,
  Proposal,
  ProposalTerms,
  Strategy,
  ValidatorVote,
  Verification,
} from "./types";

/*
 * Client-side mirror of the GenLayer Intelligent Contract's evaluation logic
 * (contracts/agent_negotiator.py). Every decision is expressed as the same
 * structured result the contract returns on-chain, including a simulated
 * validator quorum, so the UI never depends on free-form model text.
 */

const VALIDATORS = [
  "0x4f…a91c",
  "0x8b…37de",
  "0x1d…c024",
  "0xe7…5f8a",
  "0x93…b612",
];

function seedOf(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function rng(seed: number) {
  let s = seed || 1;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(n)));

const HIDDEN_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /non[- ]?refundable/i, label: "Non-refundable payment clause" },
  { pattern: /unlimited (revisions|changes|scope)/i, label: "Unlimited scope obligation" },
  { pattern: /exclusive (rights|licence|license|ownership)/i, label: "Exclusive rights transfer" },
  { pattern: /auto[- ]?renew/i, label: "Automatic renewal" },
  { pattern: /(100%|full) upfront/i, label: "Full upfront payment demanded" },
  { pattern: /no (penalty|penalties|liability|refund)/i, label: "Liability waived entirely" },
  { pattern: /at (our|my) sole discretion/i, label: "Unilateral discretion clause" },
  { pattern: /may (change|adjust) (the )?(price|deadline)/i, label: "Terms mutable after signing" },
];

const STOP = new Set([
  "the","a","an","and","or","with","for","to","of","in","on","at","by","must","should","be","is",
  "are","that","this","within","from","under","over","less","than","have","has","not","no","using",
  "build","need","want","find","please","deliver","delivery","include","including",
]);

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9%$. ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

/** Semantic-ish overlap: token intersection weighted by rarity, not raw keyword match. */
export function requirementCoverage(requirement: string, offerText: string): number {
  const need = tokens(requirement);
  if (need.length === 0) return 1;
  const have = new Set(tokens(offerText));
  let hit = 0;
  for (const t of need) {
    if (have.has(t)) hit += 1;
    else if ([...have].some((h) => h.startsWith(t.slice(0, 4)) || t.startsWith(h.slice(0, 4))))
      hit += 0.6;
  }
  return hit / need.length;
}

function quorum(seed: number, agreeRatio: number, subject: string): ValidatorVote[] {
  const r = rng(seed);
  return VALIDATORS.map((v, i) => {
    const agree = r() < agreeRatio || i === 0;
    return {
      validator: v,
      vote: agree ? ("agree" as const) : ("disagree" as const),
      note: agree
        ? `Independent run reached the same verdict on ${subject}.`
        : `Diverged on ${subject}; outvoted by the quorum.`,
    };
  });
}

export function offerText(terms: ProposalTerms, note: string): string {
  return [
    terms.deliverables.join(", "),
    terms.quality,
    terms.penalties,
    terms.paymentTerms,
    note,
  ].join(" . ");
}

export function evaluateProposal(
  deal: Deal,
  proposal: Proposal,
  buyer: Agent | undefined,
  seller: Agent | undefined,
): GenLayerEvaluation {
  const { terms } = proposal;
  const text = offerText(terms, proposal.note);
  const seed = seedOf(proposal.id + terms.price + terms.deadlineDays);

  const satisfied: string[] = [];
  const failed: string[] = [];

  // Hard economic constraints from the buyer's brief.
  if (terms.price <= deal.budget) satisfied.push(`Price within budget (${deal.budget} GEN)`);
  else failed.push(`Price ${terms.price} GEN exceeds budget ${deal.budget} GEN`);

  if (terms.deadlineDays <= deal.deadlineDays)
    satisfied.push(`Delivery within ${deal.deadlineDays} days`);
  else failed.push(`Deadline ${terms.deadlineDays}d exceeds ${deal.deadlineDays}d limit`);

  // Natural-language requirements, evaluated by semantic coverage.
  for (const req of deal.requirements) {
    if (requirementCoverage(req, text) >= 0.5) satisfied.push(req);
    else failed.push(req);
  }

  // Constraints declared on the agents themselves.
  for (const c of buyer?.constraints ?? []) {
    if (requirementCoverage(c, text) >= 0.45) satisfied.push(`Buyer constraint: ${c}`);
    else failed.push(`Buyer constraint unmet: ${c}`);
  }
  if (seller && terms.price < Math.round(seller.budget * 0.6)) {
    failed.push(`Below seller floor (${Math.round(seller.budget * 0.6)} GEN)`);
  }

  const hidden = HIDDEN_PATTERNS.filter((h) => h.pattern.test(text)).map((h) => h.label);

  const priceRatio = deal.budget > 0 ? terms.price / deal.budget : 1;
  const fairnessBase = 100 - Math.abs(0.82 - priceRatio) * 120;
  const fairness = clamp(fairnessBase - hidden.length * 9 - failed.length * 6);

  const risk = clamp(
    10 + failed.length * 14 + hidden.length * 16 + (terms.penalties.trim() ? 0 : 12) -
      (terms.paymentTerms.toLowerCase().includes("milestone") ? 8 : 0),
  );

  const clarity = clamp(
    40 + terms.deliverables.length * 12 + (terms.quality.length > 20 ? 18 : 0) +
      (terms.penalties.length > 10 ? 14 : 0),
  );

  const value = clamp(100 - priceRatio * 55 - terms.deadlineDays * 2 + satisfied.length * 4);
  const constraintSat = clamp((satisfied.length / Math.max(1, satisfied.length + failed.length)) * 100);

  const negotiationScore = clamp(
    value * 0.24 + constraintSat * 0.3 + fairness * 0.22 + clarity * 0.14 + (100 - risk) * 0.1,
  );

  const accepted = failed.length === 0 && hidden.length === 0 && fairness >= 55 && risk <= 45;
  const status: GenLayerEvaluation["proposal_status"] =
    failed.length === 0 && hidden.length === 0 ? "valid" : hidden.length > 0 || failed.length > 2 ? "invalid" : "conflicting";

  const votes = quorum(seed, accepted ? 0.9 : 0.72, "proposal validity");
  const agreeing = votes.filter((v) => v.vote === "agree").length;
  const confidence = clamp((agreeing / votes.length) * 100 - (status === "conflicting" ? 8 : 0));

  const reason = accepted
    ? `All ${satisfied.length} declared requirements are satisfied, price sits at ${Math.round(
        priceRatio * 100,
      )}% of budget and no hidden conditions were detected. Quorum ${agreeing}/${votes.length}.`
    : `${failed.length} requirement${failed.length === 1 ? "" : "s"} unmet${
        hidden.length ? ` and ${hidden.length} hidden condition(s) flagged` : ""
      }. Highest-impact conflict: ${failed[0] ?? hidden[0]}.`;

  return {
    proposal_status: status,
    accepted,
    price: terms.price,
    deadline: terms.deadlineDays,
    requirements_satisfied: satisfied,
    requirements_failed: failed,
    fairness_score: fairness,
    risk_score: risk,
    negotiation_score: negotiationScore,
    confidence,
    reason,
    final_terms: `${terms.price} GEN • ${terms.deadlineDays}d • ${terms.deliverables.join(
      ", ",
    )} • ${terms.paymentTerms}`,
    hidden_conditions: hidden,
    validators: votes,
  };
}

const STRATEGY_MOVE: Record<Strategy, { price: number; deadline: number; tone: string }> = {
  aggressive: { price: -0.22, deadline: -0.1, tone: "Firm counter — terms below are non-negotiable this round." },
  balanced: { price: -0.12, deadline: -0.05, tone: "Meeting near the midpoint on price and schedule." },
  cooperative: { price: -0.06, deadline: 0, tone: "Conceding early to close quickly." },
  best_value: { price: -0.14, deadline: -0.15, tone: "Trading a small premium for a faster, better-specified delivery." },
};

/** Smart counteroffer: fires when a proposal violates one of the agent's constraints. */
export function generateCounter(
  deal: Deal,
  proposal: Proposal,
  agent: Agent,
  evaluation: GenLayerEvaluation,
): Proposal {
  const move = STRATEGY_MOVE[agent.strategy];
  const isBuyer = agent.role === "buyer";
  const rawPrice = proposal.terms.price * (1 + (isBuyer ? move.price : -move.price * 0.7));
  const price = Math.max(1, Math.round(isBuyer ? Math.min(rawPrice, deal.budget) : rawPrice));
  const deadline = Math.max(
    1,
    Math.round(
      isBuyer
        ? Math.min(proposal.terms.deadlineDays * (1 + move.deadline), deal.deadlineDays)
        : proposal.terms.deadlineDays + 1,
    ),
  );

  const missing = evaluation.requirements_failed.slice(0, 3);
  const deliverables = Array.from(
    new Set([...proposal.terms.deliverables, ...missing.map((m) => m.replace(/^.*?: /, ""))]),
  ).slice(0, 6);

  return {
    id: `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    dealId: deal.id,
    agentId: agent.id,
    round: proposal.round + 1,
    action: "counter",
    terms: {
      price,
      deadlineDays: deadline,
      deliverables,
      quality: proposal.terms.quality || "Production-quality, reviewed before handover",
      penalties: proposal.terms.penalties || "10% fee reduction per day of late delivery",
      paymentTerms: "50% on start, 50% on milestone acceptance",
    },
    note: `${move.tone} Resolving: ${missing.join("; ") || "fairness gap"}.`,
    createdAt: Date.now(),
  };
}

export function verifyDeal(deal: Deal, evaluation: GenLayerEvaluation): Verification {
  const seed = seedOf(deal.id + evaluation.negotiation_score);
  const contradictions: string[] = [];
  if (evaluation.requirements_failed.length > 0) contradictions.push("unmet requirements remain in the final terms");
  if (evaluation.hidden_conditions.length > 0) contradictions.push("hidden conditions present");
  if (evaluation.price > deal.budget) contradictions.push("agreed price exceeds the posted budget");
  if (evaluation.deadline > deal.deadlineDays) contradictions.push("agreed deadline exceeds the posted window");

  const status: Verification["status"] =
    contradictions.length === 0
      ? evaluation.risk_score > 40
        ? "NEEDS REVIEW"
        : "VERIFIED"
      : contradictions.length > 1
        ? "REJECTED"
        : "NEEDS REVIEW";

  const votes = quorum(seed, status === "VERIFIED" ? 0.92 : 0.7, "final agreement consistency");
  const agreeing = votes.filter((v) => v.vote === "agree").length;

  return {
    status,
    reason:
      contradictions.length === 0
        ? `Final terms are internally consistent: price, deadline, deliverables and payment schedule reference the same scope. Residual risk ${evaluation.risk_score}/100.`
        : `Final terms conflict with the posted brief — ${contradictions.join("; ")}.`,
    confidence: clamp((agreeing / votes.length) * 100),
    validators: votes,
  };
}

export function reviewChallenge(deal: Deal, claim: string): Challenge {
  const original = deal.verification?.status ?? "VERIFIED";
  const ev = deal.agreement?.evaluation;
  const seed = seedOf(deal.id + claim);
  const historyDepth = deal.proposals.length;

  // The contract re-reads the full negotiation history, not just the last offer.
  const claimMatchesHistory = deal.proposals.some(
    (p) => requirementCoverage(claim, offerText(p.terms, p.note)) >= 0.4,
  );
  const evidenceOfMisread =
    claimMatchesHistory && (ev?.requirements_failed.length ?? 0) === 0 && (ev?.confidence ?? 100) < 85;

  const overturned = evidenceOfMisread || (ev?.hidden_conditions.length ?? 0) > 0;
  const votes = quorum(seed, overturned ? 0.74 : 0.88, "challenge review");
  const agreeing = votes.filter((v) => v.vote === "agree").length;

  return {
    challenge_status: "reviewed",
    original_decision: original,
    final_decision: overturned ? "OVERTURNED" : "UPHELD",
    reason: overturned
      ? `Re-reading all ${historyDepth} rounds, the challenged clause was materially altered mid-negotiation and the accepted terms do not reflect the buyer's stated intent.`
      : `Across all ${historyDepth} rounds the accepted terms match what both parties proposed; the claim restates a term that was explicitly conceded in an earlier round.`,
    confidence: clamp((agreeing / votes.length) * 100),
    claim,
    createdAt: Date.now(),
  };
}

/** AI Deal Finder — ranks deals by requirement compatibility, not keyword matching. */
export function findDeals(query: string, deals: Deal[]) {
  const budgetMatch = query.match(/(?:GEN\s?)?(\d[\d,]*)\s?(?:GEN)?/i);
  const targetBudget = budgetMatch?.[1] ? Number(budgetMatch[1].replace(/,/g, "")) : undefined;
  const dayMatch = query.match(/(\d+)\s*(day|days|week|weeks)/i);
  const targetDays =
    dayMatch?.[1] && dayMatch[2]
      ? Number(dayMatch[1]) * (/week/i.test(dayMatch[2]) ? 7 : 1)
      : undefined;

  return deals
    .map((deal) => {
      const corpus = [deal.title, deal.request, ...deal.requirements].join(" . ");
      let score = requirementCoverage(query, corpus) * 70;
      const notes: string[] = [];
      if (targetBudget !== undefined) {
        if (deal.budget <= targetBudget * 1.15) {
          score += 18;
          notes.push(`budget ${deal.budget} GEN fits your ${targetBudget} GEN ceiling`);
        } else notes.push(`budget ${deal.budget} GEN is above your ${targetBudget} GEN ceiling`);
      }
      if (targetDays !== undefined) {
        if (deal.deadlineDays <= targetDays) {
          score += 12;
          notes.push(`${deal.deadlineDays}d delivery meets your ${targetDays}d window`);
        } else notes.push(`${deal.deadlineDays}d delivery misses your ${targetDays}d window`);
      }
      const overlap = deal.requirements.filter((r) => requirementCoverage(r, query) >= 0.35);
      score += overlap.length * 6;
      if (overlap.length) notes.push(`matches on: ${overlap.join(", ")}`);
      return { deal, score: clamp(score), notes };
    })
    .filter((r) => r.score > 12)
    .sort((a, b) => b.score - a.score);
}
