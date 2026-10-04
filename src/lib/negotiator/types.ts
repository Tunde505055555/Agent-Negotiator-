/**
 * Types mirroring exactly what the deployed Intelligent Contract stores and
 * returns. No field here is produced in the browser.
 */

export type AgentRole = "buyer" | "seller";

export type Strategy = "aggressive" | "balanced" | "cooperative" | "best_value";

export type Band = "very_low" | "low" | "medium" | "high" | "very_high";

export const STRATEGIES: { id: Strategy; label: string; blurb: string }[] = [
  { id: "aggressive", label: "Aggressive", blurb: "Pushes hard on price, concedes late." },
  { id: "balanced", label: "Balanced", blurb: "Trades price against deadline evenly." },
  { id: "cooperative", label: "Cooperative", blurb: "Concedes early to close fast." },
  { id: "best_value", label: "Best Value", blurb: "Optimises value per dollar, not price." },
];

export const BAND_LABEL: Record<Band, string> = {
  very_low: "Very low",
  low: "Low",
  medium: "Medium",
  high: "High",
  very_high: "Very high",
};

/** Agent record as stored on chain by register_agent. */
export interface ChainAgent {
  id: string;
  name: string;
  role: AgentRole;
  identity: string;
  wallet: string;
  objective: string;
  budget: number;
  preferences: string[];
  constraints: string[];
  strategy: Strategy;
}

/** Stats derived from the contract's own recorded history. */
export interface AgentStats {
  proposalsMade: number;
  proposalsAccepted: number;
  dealsWon: number;
  totalScore: number;
  scoredDeals: number;
  savings: number;
}

export interface Agent extends ChainAgent {
  stats: AgentStats;
}

/** Proposal payload submitted to submit_proposal. */
export interface ProposalTerms {
  agent_id: string;
  price: number;
  deadline: number;
  deliverables: string[];
  quality: string;
  penalties: string;
  payment_terms: string;
  note?: string;
  [key: string]: unknown;
}

/** Canonical consensus evaluation returned and stored by the contract. */
export interface Evaluation {
  proposal_status: "valid" | "conflicting" | "invalid";
  accepted: boolean;
  price: number;
  deadline: number;
  requirements_satisfied: string[];
  requirements_failed: string[];
  hidden_conditions: string[];
  conflicting_terms: string[];
  fairness_band: Band;
  risk_band: Band;
  negotiation_band: Band;
  confidence_band: Band;
  fairness_score: number;
  risk_score: number;
  negotiation_score: number;
  confidence: number;
  reason: string;
  final_terms: string;
}

export interface Verification {
  verification_status: "VERIFIED" | "NEEDS REVIEW" | "REJECTED";
  contradictions: string[];
  risk_band: Band;
  risk_level: Band;
  confidence_band: Band;
  confidence: number;
  reason: string;
}

export interface Challenge {
  challenge_status: "reviewed";
  original_decision: string;
  final_decision: "UPHELD" | "OVERTURNED";
  grounds: string[];
  confidence_band: Band;
  confidence: number;
  reason: string;
}

export interface EvidenceReview {
  evidence_status: "SATISFIED" | "PARTIAL" | "NOT SATISFIED" | "UNAVAILABLE";
  [key: string]: unknown;
}

export type HistoryEntry =
  | {
      type: "proposal";
      round: number;
      proposal_id: string;
      agent_id: string;
      proposal: ProposalTerms;
      evaluation: Evaluation;
    }
  | { type: "verification"; verification: Verification }
  | { type: "challenge"; challenge: Challenge }
  | { type: string; [key: string]: unknown };

export type DealStatus =
  | "open"
  | "negotiating"
  | "agreed"
  | "verified"
  | "needs_review"
  | "rejected";

/** Deal record as stored on chain by post_deal, plus its contract-read extras. */
export interface Deal {
  id: string;
  title: string;
  request: string;
  buyer_agent_id: string;
  budget: number;
  deadline_days: number;
  requirements: string[];
  status: DealStatus;
  rounds: number;
  last_proposal_id?: string;
  final_terms?: string;
  negotiation_score?: number;
  agreed_with_agent_id?: string;
  /** Contract-recorded negotiation history (get_history). */
  history: HistoryEntry[];
  /** get_verification, null until verify_agreement has run. */
  verification: Verification | null;
  /** get_challenge, null until challenge_agreement has run. */
  challenge: Challenge | null;
}

export interface ProposalRound {
  proposal_id: string;
  round: number;
  agent_id: string;
  proposal: ProposalTerms;
  evaluation: Evaluation;
}

export interface DealMatch {
  deal_id: string;
  compatibility_band: Band;
  compatibility: number;
  matched_requirements: string[];
  gaps: string[];
  reason: string;
}

export function proposalRounds(deal: Deal): ProposalRound[] {
  return deal.history
    .filter((h): h is Extract<HistoryEntry, { type: "proposal" }> => h["type"] === "proposal")
    .map((h) => ({
      proposal_id: h.proposal_id,
      round: h.round,
      agent_id: h.agent_id,
      proposal: h.proposal,
      evaluation: h.evaluation,
    }));
}
